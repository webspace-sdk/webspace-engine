import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { migrateChannelToSocket, discordBridgesForPresences } from "./phoenix-utils";

// Permissions that will be assumed if the user becomes the creator.
const HUB_CREATOR_PERMISSIONS = [
  "update_hub",
  "update_hub_promotion",
  "update_roles",
  "close_hub",
  "mute_users",
  "kick_users"
];
const VALID_PERMISSIONS =
  HUB_CREATOR_PERMISSIONS +
  ["tweet", "spawn_camera", "spawn_drawing", "spawn_and_move_media", "pin_objects", "spawn_emoji", "fly"];

export default class HubChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._signedIn = !!this.store.state.credentials.token;
    this._permissions = {};
    this._blockedSessionIds = new Set();
  }

  get signedIn() {
    return this._signedIn;
  }

  // Returns true if this current session has the given permission.
  can(permission) {
    if (!VALID_PERMISSIONS.includes(permission)) throw new Error(`Invalid permission name: ${permission}`);
    return this._permissions && this._permissions[permission];
  }

  // Returns true if the current session has the given permission, *or* will get the permission
  // if they sign in and become the creator.
  canOrWillIfCreator(permission) {
    return this.can(permission); // TODO JEL remove
  }

  canEnterRoom(hub) {
    if (!hub) return false;
    if (this.canOrWillIfCreator("update_hub")) return true;

    const roomEntrySlotCount = Object.values(this.presence.state).reduce((acc, { metas }) => {
      const meta = metas[metas.length - 1];
      const usingSlot = meta.presence === "room" || (meta.context && meta.context.entering);
      return acc + (usingSlot ? 1 : 0);
    }, 0);

    // This now exists in room settings but a default is left here to support old reticulum servers
    const DEFAULT_ROOM_SIZE = 24;
    return roomEntrySlotCount < (hub.room_size !== undefined ? hub.room_size : DEFAULT_ROOM_SIZE);
  }

  // Migrates this hub channel to a new phoenix channel and presence
  async migrateToSocket(socket, params) {
    this.channel = await migrateChannelToSocket(this.channel, socket, params);
  }

  bind = (channel, hubId) => {
    this.channel = channel;
    this.hubId = hubId;
  };

  setPermissionsFromToken = token => {
    // Note: token is not verified.
    this._permissions = jwtDecode(token);
    this.dispatchEvent(new CustomEvent("permissions_updated", { detail: { permsToken: token } }));

    // Refresh the token 1 minute before it expires. Refresh at most every 60s.
    const nextRefresh = new Date(this._permissions.exp * 1000 - 60 * 1000) - new Date();
    setTimeout(async () => await this.fetchPermissions(), Math.max(nextRefresh, 60000));
  };

  sendObjectSpawnedEvent = objectType => {
    if (!this.channel) {
      console.warn("No phoenix channel initialized before object spawn.");
      return;
    }

    const spawnEvent = {
      object_type: objectType
    };

    this.channel.push("events:object_spawned", spawnEvent);
  };

  updateScene = url => {
    if (!this._permissions.update_hub) return "unauthorized";
    this.channel.push("update_scene", { url });
  };

  updateHub = settings => {
    if (!this._permissions.update_hub) return "unauthorized";
    this.channel.push("update_hub", settings);
  };

  closeHub = () => {
    if (!this._permissions.close_hub) return "unauthorized";
    this.channel.push("close_hub", {});
  };

  subscribe = subscription => {
    this.channel.push("subscribe", { subscription });
  };

  // If true, will tell the server to not send us any NAF traffic
  allowNAFTraffic = allow => {
    this.channel.push(allow ? "unblock_naf" : "block_naf", {});
  };

  unsubscribe = subscription => {
    return new Promise(resolve => this.channel.push("unsubscribe", { subscription }).receive("ok", resolve));
  };

  sendMessage = (body, type = "chat") => {
    if (!body) return;
    this.channel.push("message", { body, type });
  };

  getHost = () => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("get_host")
        .receive("ok", res => {
          resolve(res);
        })
        .receive("error", reject);
    });
  };

  discordBridges = () => {
    if (!this.presence || !this.presence.state) return [];
    return discordBridgesForPresences(this.presence.state);
  };

  pin = (id, gltfNode, fileId, fileAccessToken, promotionToken) => {
    const payload = { id, gltf_node: gltfNode };
    if (fileId && promotionToken) {
      payload.file_id = fileId;
      payload.file_access_token = fileAccessToken;
      payload.promotion_token = promotionToken;
    }
    return new Promise((resolve, reject) => {
      this.channel
        .push("pin", payload)
        .receive("ok", resolve)
        .receive("error", reject);
    });
  };

  unpin = (id, fileId) => {
    const payload = { id };
    if (fileId) {
      payload.file_id = fileId;
    }
    this.channel.push("unpin", payload);
  };

  fetchPermissions = () => {
    if (!this.channel) return;

    return new Promise((resolve, reject) => {
      this.channel
        .push("refresh_perms_token")
        .receive("ok", res => {
          this.setPermissionsFromToken(res.perms_token);
          resolve({ permsToken: res.perms_token, permissions: this._permissions });
        })
        .receive("error", reject);
    });
  };

  mute = sessionId => this.channel.push("mute", { session_id: sessionId });
  addOwner = sessionId => this.channel.push("add_owner", { session_id: sessionId });
  removeOwner = sessionId => this.channel.push("remove_owner", { session_id: sessionId });

  sendReliableNAF = (clientId, dataType, data) => this.sendNAF(true, clientId, dataType, data);
  sendUnreliableNAF = (clientId, dataType, data) => this.sendNAF(false, clientId, dataType, data);
  sendNAF = (reliable, clientId, dataType, data) => {
    const payload = { dataType, data };
    const { channel } = this;

    if (clientId) {
      payload.clientId = clientId;
    }

    const isOpen = channel.socket.connectionState() === "open";

    if (isOpen || reliable) {
      const hasFirstSync =
        payload.dataType === "um" ? payload.data.d.find(r => r.isFirstSync) : payload.data.isFirstSync;

      if (hasFirstSync) {
        if (isOpen) {
          channel.push("naf", payload);
        } else {
          // Memory is re-used, so make a copy
          channel.push("naf", AFRAME.utils.clone(payload));
        }
      } else {
        // Optimization: Strip isFirstSync and send payload as a string to reduce server parsing.
        // The server will not parse messages without isFirstSync keys when sent to the nafr event.
        //
        // The client must assume any payload that does not have a isFirstSync key is not a first sync.
        const nafrPayload = AFRAME.utils.clone(payload);
        if (nafrPayload.dataType === "um") {
          for (let i = 0; i < nafrPayload.data.d.length; i++) {
            delete nafrPayload.data.d[i].isFirstSync;
          }
        } else {
          delete nafrPayload.data.isFirstSync;
        }

        channel.push("nafr", { naf: JSON.stringify(nafrPayload) });
      }
    }
  };

  hide = sessionId => {
    NAF.connection.adapter.block(sessionId);
    this.channel.push("block", { session_id: sessionId });
    this._blockedSessionIds.add(sessionId);
  };

  unhide = sessionId => {
    if (!this._blockedSessionIds.has(sessionId)) return;
    NAF.connection.adapter.unblock(sessionId);
    NAF.connection.entities.completeSync(sessionId);
    this.channel.push("unblock", { session_id: sessionId });
    this._blockedSessionIds.delete(sessionId);
  };

  isHidden = sessionId => this._blockedSessionIds.has(sessionId);

  kick = async sessionId => {
    const permsToken = await this.fetchPermissions();
    NAF.connection.adapter.kick(sessionId, permsToken);
    this.channel.push("kick", { session_id: sessionId });
  };

  requestSupport = () => this.channel.push("events:request_support", {});
  favorite = () => this.channel.push("favorite", {});
  unfavorite = () => this.channel.push("unfavorite", {});
  leave = () => {
    this.channel.leave();
    this.channel = null;
  };

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
    }
  };
}

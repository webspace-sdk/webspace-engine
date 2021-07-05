import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { Presence } from "phoenix";

export default class HubChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._permissions = {};
    this._blockedSessionIds = new Set();
  }

  // Returns true if this current session has the given permission for the currently connected hub.
  can(permission) {
    if (!this.hubId) return false;
    return window.APP.hubMetadata.can(permission, this.hubId);
  }

  canEnterRoom(hub) {
    if (!hub) return false;
    return true;
    // TODO JEL figure out limits

    /*if (this.can("update_hub_meta")) return true;
    const roomEntrySlotCount = Object.values(this.presence.state).reduce((acc, { metas }) => {
      const meta = metas[metas.length - 1];
      const usingSlot = meta.presence === "room" || (meta.context && meta.context.entering);
      return acc + (usingSlot ? 1 : 0);
    }, 0);

    // This now exists in room settings but a default is left here to support old reticulum servers
    const DEFAULT_ROOM_SIZE = 24;
    return roomEntrySlotCount < (hub.room_size !== undefined ? hub.room_size : DEFAULT_ROOM_SIZE);*/
  }

  bind = (channel, hubId) => {
    this.leave();
    this.channel = channel;
    this.presence = new Presence(channel);
    this.hubId = hubId;
  };

  setPermissionsFromToken = token => {
    // Note: token is not verified.
    this._permissions = jwtDecode(token);
    this.dispatchEvent(new CustomEvent("permissions_updated", { detail: { permsToken: token } }));

    // Refresh the token 1 minute before it expires. Refresh at most every 60s.
    if (this._refreshTimeout) clearTimeout(this._refreshTimeout);
    const nextRefresh = new Date(this._permissions.exp * 1000 - 60 * 1000) - new Date();
    this._refreshTimeout = setTimeout(async () => await this.fetchPermissions(), Math.max(nextRefresh, 60000));
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

  updateScene = () => {
    // TODO REMOVE call sites
  };

  updateHub = settings => {
    // TODO move call sites to space channel
    if (!this.channel) return;
    if (!this._permissions.update_hub_meta) return "unauthorized";
    this.channel.push("update_hub_meta", settings);
  };

  closeHub = async () => {
    // TODO REMOVE call sites
  };

  // If true, will tell the server to not send us any NAF traffic
  allowNAFTraffic = allow => {
    this.channel.push(allow ? "unblock_naf" : "block_naf", {});
  };

  setFileInactive = fileId => {
    this.channel.push("set_file_inactive", { file_id: fileId });
  };

  unsubscribe = subscription => {
    return new Promise(resolve => this.channel.push("unsubscribe", { subscription }).receive("ok", resolve));
  };

  sendMessage = (body, type = "chat", toSessionId) => {
    if (!this.channel) return;
    if (!body) return;
    const payload = { body, type };
    if (toSessionId) {
      payload.to_session_id = toSessionId;
    }
    this.channel.push("message", payload);
  };

  templateSynced = template_hash => {
    this.channel.push("hub_template_synced", { template_hash });
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

  sendReliableNAF = (clientId, dataType, data) => this.sendNAF(true, clientId, dataType, data);
  sendUnreliableNAF = (clientId, dataType, data) => this.sendNAF(false, clientId, dataType, data);
  sendNAF = (reliable, clientId, dataType, data) => {
    const payload = { dataType, data };
    const { channel } = this;
    if (!channel) return;

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
    if (!this.channel) return;
    NAF.connection.adapter.block(sessionId);
    this.channel.push("block", { session_id: sessionId });
    this._blockedSessionIds.add(sessionId);
  };

  unhide = sessionId => {
    if (!this.channel) return;
    if (!this._blockedSessionIds.has(sessionId)) return;
    NAF.connection.adapter.unblock(sessionId);
    NAF.connection.entities.completeSync(sessionId);
    this.channel.push("unblock", { session_id: sessionId });
    this._blockedSessionIds.delete(sessionId);
  };

  updateSpaceMemberRole = role => {
    if (!this.channel) return;
    this.channel.push("update_space_member_role", { role });
  };

  isHidden = sessionId => this._blockedSessionIds.has(sessionId);

  kick = async sessionId => {
    if (!this.channel) return;
    const permsToken = await this.fetchPermissions();
    NAF.connection.adapter.kick(sessionId, permsToken);
    this.channel.push("kick", { session_id: sessionId });
  };

  requestSupport = () => this.channel.push("events:request_support", {});
  favorite = () => this.channel.push("favorite", {});
  unfavorite = () => this.channel.push("unfavorite", {});
  leave = () => {
    if (this.channel) {
      this.channel.leave();
    }

    this.channel = null;
  };

  publishWorldTemplate = (name, collection, body, thumbFileId) => {
    return new Promise(res => {
      this.channel
        .push("publish_world_template", {
          name,
          collection,
          body,
          thumb_file_id: thumbFileId
        })
        .receive("ok", async ({ published_to_vox_id: publishedWorldTemplateId }) => {
          res(publishedWorldTemplateId);
        });
    });
  };

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
      this.channel = null;
    }
  };
}

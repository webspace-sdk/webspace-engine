import { EventTarget } from "event-target-shim";

export default class HubChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._permissions = {};
    this._blockedSessionIds = new Set();
  }

  bind = hubId => {
    this.leave();
    this.hubId = hubId;
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
    // TODO SHARED refactor
    if (!body) return;
    const payload = { body };
    if (toSessionId) {
      payload.to_session_id = toSessionId;
    }

    NAF.connection.broadcastCustomData(type, payload);
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

  kick = async (/*sessionId*/) => {
    // TODO SHARED
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

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
      this.channel = null;
    }
  };
}

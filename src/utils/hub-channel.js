import {EventTarget} from "event-target-shim";

export default class HubChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._permissions = {};
    this._blockedSessionIds = new Set();
    this.flushHubMetaTimeout = null;
  }

  bind = hubId => {
    this.hubId = hubId;
  };

  updateHubMeta = (hubId, hub, localFirst = false) => {
    if (this.hubId !== hubId) {
      console.warn("Cannot update hub other than this one");
      return;
    }

    const { hubMetadata, atomAccessManager } = window.APP;
    if (!atomAccessManager.hubCan("update_hub_meta")) return;

    if (localFirst) {
      // Update metadata locally and flush after delay
      hubMetadata.localUpdate(hubId, hub);
      clearTimeout(this.flushHubMetaTimeout);

      this.flushHubMetaTimeout = setTimeout(() => {
        this.broadcastMessage(hub, "update_hub_meta");
      }, 3000);
    } else {
      this.broadcastMessage(hub, "update_hub_meta");
    }
  };

  broadcastMessage = (body, type = "chat", toSessionId) => {
    if (!body) return;
    const payload = { body };
    if (toSessionId) {
      payload.to_session_id = toSessionId;
    }

    NAF.connection.broadcastCustomDataGuaranteed(type, payload);
  };

  sendMessage = (body, type = "chat", toSessionId) => {
    if (!body) return;
    const payload = { body };
    NAF.connection.sendCustomDataGuaranteed(type, payload, toSessionId);
  };

  mute = (/*sessionId*/) => {
    // TODO SHARED
  };

  hide = (/*sessionId*/) => {
    // TODO SHARED
    // NAF.connection.adapter.block(sessionId);
    // this._blockedSessionIds.add(sessionId);
  };

  unhide = (/*sessionId*/) => {
    // TODO SHARED
    // if (!this._blockedSessionIds.has(sessionId)) return;
    // NAF.connection.adapter.unblock(sessionId);
    // NAF.connection.entities.completeSync(sessionId);
    // this._blockedSessionIds.delete(sessionId);
  };

  kick = async (/*sessionId*/) => {
    // TODO SHARED
  };

  isHidden = sessionId => this._blockedSessionIds.has(sessionId);
}

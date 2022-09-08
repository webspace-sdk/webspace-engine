import { EventTarget } from "event-target-shim";

export default class HubChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._permissions = {};
    this._blockedSessionIds = new Set();
  }

  bind = hubId => {
    this.hubId = hubId;
  };

  updateHubMeta = (hubId, hub) => {
    if (this.hubId !== hubId) {
      console.warn("Cannot update hub other than this one");
      return;
    }

    const { atomAccessManager } = window.APP;
    if (!atomAccessManager.hubCan("update_hub_meta")) return;

    this.broadcastMessage(hub, "update_hub_meta");
  };

  unsubscribe = subscription => {
    return new Promise(resolve => this.channel.push("unsubscribe", { subscription }).receive("ok", resolve));
  };

  broadcastMessage = (body, type = "chat", toSessionId) => {
    // TODO SHARED refactor
    if (!body) return;
    const payload = { body };
    if (toSessionId) {
      payload.to_session_id = toSessionId;
    }

    NAF.connection.broadcastCustomDataGuaranteed(type, payload);
  };

  sendMessage = (body, type = "chat", toSessionId) => {
    // TODO SHARED refactor
    if (!body) return;
    const payload = { body };
    NAF.connection.sendCustomDataGuaranteed(type, payload, toSessionId);
  };

  mute = sessionId => this.channel.push("mute", { session_id: sessionId });

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

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
      this.channel = null;
    }
  };
}

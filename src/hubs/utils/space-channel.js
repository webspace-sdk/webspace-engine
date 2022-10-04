import { EventTarget } from "event-target-shim";

export default class SpaceChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
  }

  updateVoxMeta = (voxId, vox) => {
    const { atomAccessManager } = window.APP;
    if (!atomAccessManager.voxCan("edit_vox", voxId)) return;

    this.broadcastMessage(vox, "update_vox_meta");
  };

  broadcastMessage = (body, type, toSessionId) => {
    if (!body) return;
    const payload = { body };
    if (toSessionId) {
      payload.to_session_id = toSessionId;
    }

    NAF.connection.broadcastCustomDataGuaranteed(type, payload);
  };
}

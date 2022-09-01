import { EventTarget } from "event-target-shim";

const VALID_PERMISSIONS = [];

export default class DynaChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._signedIn = false;
    this._permissions = {};
  }

  get signedIn() {
    return this._signedIn;
  }

  // Returns true if this current session has the given permission.
  can(permission) {
    if (!VALID_PERMISSIONS.includes(permission)) throw new Error(`Invalid permission name: ${permission}`);
    return this._permissions && this._permissions[permission];
  }

  bind = channel => {
    this.leave();
    this.channel = channel;
  };

  getSpaceMetas(spaceIds) {
    return new Promise(res => {
      this.channel.push("get_space_metas", { space_ids: [...spaceIds] }).receive("ok", ({ spaces }) => res(spaces));
    });
  }

  updateSpace = (spaceId, newSpaceFields) => {
    // TODO SHARED
    if (!this.channel) return;
    const spaceMetadata = window.APP.spaceMetadata;
    const canUpdateSpaceMeta = spaceMetadata.can("update_space_meta", spaceId);
    if (!canUpdateSpaceMeta) return "unauthorized";
    if (newSpaceFields.roles && !canUpdateSpaceMeta) return "unauthorized";
    this.channel.push("update_space", { ...newSpaceFields, space_id: spaceId });
    spaceMetadata.localUpdate(spaceId, newSpaceFields);
  };

  leave = () => {
    if (this.channel) {
      this.channel.leave();
    }

    this.channel = null;
  };

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
    }
  };
}

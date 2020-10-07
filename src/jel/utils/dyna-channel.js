import { EventTarget } from "event-target-shim";
import { migrateChannelToSocket } from "../../hubs/utils/phoenix-utils";

const VALID_PERMISSIONS = [];

export default class DynaChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._signedIn = !!this.store.state.credentials.token;
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

  // Migrates this channel to a new phoenix channel and presence
  async migrateToSocket(socket, params) {
    this.channel = await migrateChannelToSocket(this.channel, socket, params);
  }

  bind = channel => {
    this.channel = channel;
  };

  getSpaceMetas(spaceIds) {
    return new Promise(res => {
      this.channel.push("get_space_metas", { space_ids: [...spaceIds] }).receive("ok", ({ spaces }) => res(spaces));
    });
  }

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

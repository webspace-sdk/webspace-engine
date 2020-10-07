import { EventTarget } from "event-target-shim";
import { migrateChannelToSocket } from "./phoenix-utils";

export default class RetChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this._signedIn = !!this.store.state.credentials.token;
  }

  get signedIn() {
    return this._signedIn;
  }

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
    this.channel.leave();
    this.channel = null;
  };

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
    }
  };
}

import { EventTarget } from "event-target-shim";

export default class AccountChannel extends EventTarget {
  constructor() {
    super();
  }

  bind = channel => {
    this.leave();
    this.channel = channel;

    const isCurrentlyActive = document.visibilityState !== "hidden" && document.hasFocus();

    // Initialize account channel presence active state to inactive if necessary.
    if (!isCurrentlyActive) {
      this.setInactive();
    }
  };

  setActive = () => {
    this.channel.push("set_active", {});
  };

  setInactive = () => {
    this.channel.push("set_inactive", {});
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

import { EventTarget } from "event-target-shim";

export default class AccountChannel extends EventTarget {
  constructor() {
    super();
    this.memberships = [];
  }

  bind = channel => {
    this.leave();
    this.channel = channel;

    channel.on("account_refresh", this.onAccountRefreshed);

    const isCurrentlyActive = document.visibilityState !== "hidden" && document.hasFocus();

    // Initialize account channel presence active state to inactive if necessary.
    if (!isCurrentlyActive) {
      this.setInactive();
    }
  };

  syncMemberships = newMemberships => {
    this.memberships.length = 0;
    this.memberships.push(...newMemberships);
  };

  setActive = () => {
    this.channel.push("set_active", {});
  };

  setInactive = () => {
    this.channel.push("set_inactive", {});
  };

  onAccountRefreshed = ({ memberships }) => {
    this.syncMemberships(memberships);
    this.dispatchEvent(new CustomEvent("account_refresh", { detail: { memberships: this.memberships } }));
  };

  updateMembership(spaceId, notifySpaceCopresence, notifyHubCopresence, notifyChatMode) {
    if (this.channel) {
      this.channel.push("update_membership", {
        membership: {
          space_id: spaceId,
          notify_space_copresence: notifySpaceCopresence,
          notify_hub_copresence: notifyHubCopresence,
          notify_chat_mode: notifyChatMode
        }
      });
    }
  }

  leave = () => {
    if (this.channel) {
      this.channel.leave();
      this.channel.off("account_refresh", this.onAccountRefreshed);
    }

    this.channel = null;
  };

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
    }
  };
}

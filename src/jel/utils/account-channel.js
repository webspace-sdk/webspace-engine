import { EventTarget } from "event-target-shim";

export default class AccountChannel extends EventTarget {
  constructor() {
    super();
    this.memberships = [];
    this.hubSettings = [];
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

  syncAccountInfo = ({ memberships, hub_settings }) => {
    this.memberships.length = 0;
    this.memberships.push(...memberships);

    this.hubSettings.length = 0;
    this.hubSettings.push(...hub_settings);
  };

  setActive = () => {
    if (this.channel) {
      this.channel.push("set_active", {});
    }
  };

  setInactive = () => {
    if (this.channel) {
      this.channel.push("set_inactive", {});
    }
  };

  subscribe = subscription => {
    this.channel.push("subscribe", { subscription });
  };

  onAccountRefreshed = accountInfo => {
    this.syncAccountInfo(accountInfo);
    this.dispatchEvent(new CustomEvent("account_refresh", { detail: accountInfo }));
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

  updateHubSettings(hubId, notifyJoins) {
    if (this.channel) {
      this.channel.push("update_hub_settings", {
        hub_settings: {
          hub_id: hubId,
          notify_joins: notifyJoins
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
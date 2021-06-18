import { EventTarget } from "event-target-shim";

export default class AccountChannel extends EventTarget {
  constructor(store) {
    super();
    this.memberships = [];
    this.hubSettings = [];
    this.store = store;
  }

  bind = channel => {
    this.leave();
    this.channel = channel;

    channel.on("account_refresh", this.onAccountRefreshed);
    channel.on("support_available", this.onSupportAvailable);
    channel.on("support_unavailable", this.onSupportUnavailable);
    channel.on("support_response", this.onSupportResponse);

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
    this.channel.push("subscribe", { device_id: this.store.state.credentials.deviceId, subscription });
  };

  joinMatrixRoom = roomId => {
    this.channel.push("join_matrix_room", { matrix_room_id: roomId });
  };

  getJoinableMatrixRooms = roomIds => {
    return new Promise(res => {
      this.channel
        .push("get_joinable_matrix_room_ids", { matrix_room_ids: roomIds })
        .receive("ok", ({ matrix_room_ids }) => res(matrix_room_ids));
    });
  };

  setMatrixRoomOrder = (roomId, order) => {
    this.channel.push("set_matrix_room_order", { matrix_room_id: roomId, order });
  };

  onAccountRefreshed = accountInfo => {
    this.syncAccountInfo(accountInfo);
    this.dispatchEvent(new CustomEvent("account_refresh", { detail: accountInfo }));
  };

  onSupportAvailable = () => {
    this.dispatchEvent(new CustomEvent("support_available", {}));
  };

  onSupportUnavailable = () => {
    this.dispatchEvent(new CustomEvent("support_unavailable", {}));
  };

  onSupportResponse = response => {
    this.dispatchEvent(new CustomEvent("support_response", { detail: response }));
  };

  updateMembership(spaceId, notifySpaceCopresence, notifyHubCopresence, notifyCurrentWorldChatMode) {
    if (this.channel) {
      this.channel.push("update_membership", {
        membership: {
          space_id: spaceId,
          notify_space_copresence: notifySpaceCopresence,
          notify_hub_copresence: notifyHubCopresence,
          notify_current_world_chat_mode: notifyCurrentWorldChatMode
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

  fetchVoxPermsToken = voxId => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("refresh_vox_perms_token", { vox_id: voxId })
        .receive("ok", res => {
          resolve({ permsToken: res.perms_token });
        })
        .receive("error", reject);
    });
  };

  leave = () => {
    if (this.channel) {
      this.channel.leave();
      this.channel.off("account_refresh", this.onAccountRefreshed);
    }

    this.channel = null;
  };

  getVoxMetas(voxIds) {
    return new Promise(res => {
      this.channel.push("get_vox_metas", { vox_ids: [...voxIds] }).receive("ok", ({ vox }) => res(vox));
    });
  }

  subscribeToVox = voxId => {
    this.channel.push("subscribe_to_vox", { vox_id: voxId });
  };

  unsubscribeFromVox = voxId => {
    this.channel.push("unsubscribe_from_vox", { vox_id: voxId });
  };

  markVoxEdited = voxId => {
    this.channel.push("mark_vox_edited", { vox_id: voxId });
  };

  publishVox = (voxId, collection, category, scale) => {
    return new Promise(res => {
      this.channel
        .push("publish_vox", { vox_id: voxId, collection, category, scale })
        .receive("ok", async ({ published_to_vox_id: publishedVoxId }) => {
          res(publishedVoxId);
        });
    });
  };

  updateVox = (voxId, newVoxFields) => {
    if (!this.channel) return;
    const { voxMetadata } = window.APP;
    const canUpdateVoxMeta = voxMetadata.can("edit_vox", voxId);
    if (!canUpdateVoxMeta) return "unauthorized";
    this.channel.push("update_vox", { ...newVoxFields, vox_id: voxId });
    voxMetadata.localUpdate(voxId, newVoxFields);
  };

  requestSupport = () => {
    if (!this.channel) return;

    const spaceId = window.APP.spaceChannel.spaceId;
    this.channel.push("support_response", { space_id: spaceId, response: "ok" });
  };

  denySupport = () => {
    if (!this.channel) return;

    const spaceId = window.APP.spaceChannel.spaceId;
    this.channel.push("support_response", { space_id: spaceId, response: "deny" });
  };

  disconnect = () => {
    if (this.channel) {
      this.channel.socket.disconnect();
    }
  };
}

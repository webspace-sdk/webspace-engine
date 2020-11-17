import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { Presence } from "phoenix";
import { migrateChannelToSocket, unbindPresence } from "./phoenix-utils";

const VALID_PERMISSIONS = ["create_hub", "view_nav", "edit_nav", "create_invite"];

export default class SpaceChannel extends EventTarget {
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
    const rebindPresence = unbindPresence(this.presence);
    this.channel = await migrateChannelToSocket(this.channel, socket, params);
    this.presence = rebindPresence(this.channel);
  }

  bind = (channel, spaceId) => {
    this.channel = channel;
    this.presence = new Presence(channel);
    this.spaceId = spaceId;
  };

  setPermissionsFromToken = token => {
    // Note: token is not verified.
    this._permissions = jwtDecode(token);
    this.dispatchEvent(new CustomEvent("permissions_updated", { detail: { permsToken: token } }));

    // Refresh the token 1 minute before it expires. Refresh at most every 60s.
    if (this._refreshTimeout) clearTimeout(this._refreshTimeout);
    const nextRefresh = new Date(this._permissions.exp * 1000 - 60 * 1000) - new Date();
    this._refreshTimeout = setTimeout(async () => await this.fetchPermissions(), Math.max(nextRefresh, 60000));
  };

  sendJoinedHubEvent = hub_id => {
    this.channel.push("events:joined_hub", { hub_id });
  };

  sendEnteredHubEvent = async () => {
    if (!this.channel) {
      console.warn("No phoenix channel initialized before room entry.");
      return;
    }

    let entryDisplayType = "Screen";

    if (navigator.getVRDisplays) {
      const vrDisplay = (await navigator.getVRDisplays()).find(d => d.isPresenting);

      if (vrDisplay) {
        entryDisplayType = vrDisplay.displayName;
      }
    }

    const entryEvent = {
      entryDisplayType,
      userAgent: navigator.userAgent
    };

    this.channel.push("events:entered_hub", entryEvent);
  };

  trashHubs(hub_ids) {
    this.channel.push("trash_hubs", { hub_ids });
  }

  restoreHubs(hub_ids) {
    this.channel.push("restore_hubs", { hub_ids });
  }

  removeHubs(hub_ids) {
    this.channel.push("remove_hubs", { hub_ids });
  }

  updateHub = (hubId, newHubFields) => {
    if (!this.channel) return;
    const hubMetadata = window.APP.hubMetadata;
    const canUpdateHubMeta = hubMetadata.can("update_hub_meta", hubId);
    const canUpdateHubRoles = hubMetadata.can("update_hub_roles", hubId);
    if (!canUpdateHubMeta) return "unauthorized";
    if (newHubFields.roles && !canUpdateHubRoles) return "unauthorized";
    this.channel.push("update_hub", { ...newHubFields, hub_id: hubId });
    hubMetadata.optimisticUpdate(hubId, newHubFields);
  };

  beginStreaming() {
    this.channel.push("events:begin_streaming", {});
  }

  endStreaming() {
    this.channel.push("events:end_streaming", {});
  }

  beginRecording() {
    this.channel.push("events:begin_recording", {});
  }

  endRecording() {
    this.channel.push("events:end_recording", {});
  }

  sendProfileUpdate = () => {
    if (this.channel) {
      this.channel.push("update_profile", { profile: this.store.state.profile });
    }
  };

  updateIdentity = identity => {
    if (this.channel) {
      this.channel.push("update_identity", { identity });
    }
  };

  sendAvatarColorUpdate = (r, g, b) => {
    this.sendPersonaUpdate({ avatar: { primary_color: { r, g, b } } });
  };

  sendPersonaUpdate = persona => {
    if (this.channel) {
      this.channel.push("update_persona", { persona });
    }
  };

  getCurrentHubFromPresence = () => {
    const sessionId = this.channel.socket.params().session_id;
    const metas = this.presence.state[sessionId].metas;
    return metas[metas.length - 1].hub_id;
  };

  getPresenceCurrentHubOccupantCount = () => {
    const currentHubId = this.getCurrentHubFromPresence();
    if (!currentHubId) return 0;

    let c = 0;

    for (const [, { metas }] of Object.entries(this.presence.state)) {
      const meta = metas[metas.length - 1];
      if (meta.hub_id === currentHubId) {
        c++;
      }
    }

    return c;
  };

  signIn = token => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("sign_in", { token })
        .receive("ok", ({ perms_token }) => {
          this.setPermissionsFromToken(perms_token);
          this._signedIn = true;
          resolve();
        })
        .receive("error", err => {
          if (err.reason === "invalid_token") {
            console.warn("sign in failed", err);
            // Token expired or invalid TODO purge from storage if possible
            resolve();
          } else {
            console.error("sign in failed", err);
            reject();
          }
        });
    });
  };

  signOut = () => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("sign_out")
        .receive("ok", async () => {
          this._signedIn = false;
          const params = this.channel.params();
          delete params.auth_token;
          delete params.perms_token;
          await this.fetchPermissions();
          resolve();
        })
        .receive("error", reject);
    });
  };

  getHosts = () => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("get_hosts")
        .receive("ok", res => {
          resolve(res);
        })
        .receive("error", reject);
    });
  };

  fetchPermissions = () => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("refresh_perms_token")
        .receive("ok", res => {
          this.setPermissionsFromToken(res.perms_token);
          resolve({ permsToken: res.perms_token, permissions: this._permissions });
        })
        .receive("error", reject);
    });
  };

  getHubMetas(hubIds) {
    return new Promise(res => {
      this.channel.push("get_hub_metas", { hub_ids: [...hubIds] }).receive("ok", ({ hubs }) => res(hubs));
    });
  }

  createInvite() {
    if (!this.channel) return Promise.resolve(null);

    return new Promise(res => {
      this.channel.push("create_invite", {}).receive("ok", ({ url }) => res(url));
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

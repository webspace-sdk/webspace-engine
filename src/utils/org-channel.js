import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { Presence } from "phoenix";
import { migrateChannelToSocket } from "./phoenix-utils";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

function isSameMonth(da, db) {
  return da.getFullYear() == db.getFullYear() && da.getMonth() == db.getMonth();
}

function isSameDay(da, db) {
  return isSameMonth(da, db) && da.getDate() == db.getDate();
}

// Permissions that will be assumed if the user becomes the creator.
const VALID_PERMISSIONS = [];

export default class OrgChannel extends EventTarget {
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
    let presenceBindings;

    // Unbind presence, and then set up bindings after reconnect
    if (this.presence) {
      presenceBindings = {
        onJoin: this.presence.caller.onJoin,
        onLeave: this.presence.caller.onLeave,
        onSync: this.presence.caller.onSync
      };

      this.presence.onJoin(function() {});
      this.presence.onLeave(function() {});
      this.presence.onSync(function() {});
    }

    this.channel = await migrateChannelToSocket(this.channel, socket, params);
    this.presence = new Presence(this.channel);

    if (presenceBindings) {
      this.presence.onJoin(presenceBindings.onJoin);
      this.presence.onLeave(presenceBindings.onLeave);
      this.presence.onSync(presenceBindings.onSync);
    }
  }

  bind = (channel, orgId) => {
    this.channel = channel;
    this.presence = new Presence(channel);
    this.orgId = orgId;
  };

  setPermissionsFromToken = token => {
    // Note: token is not verified.
    this._permissions = jwtDecode(token);
    this.dispatchEvent(new CustomEvent("permissions_updated", { detail: { permsToken: token } }));

    // Refresh the token 1 minute before it expires. Refresh at most every 60s.
    const nextRefresh = new Date(this._permissions.exp * 1000 - 60 * 1000) - new Date();
    setTimeout(async () => await this.fetchPermissions(), Math.max(nextRefresh, 60000));
  };

  sendEnteringEvent = async () => {
    this.channel.push("events:entering", {});
  };

  sendEnteringCancelledEvent = async () => {
    this.channel.push("events:entering_cancelled", {});
  };

  getEntryTimingFlags = () => {
    const entryTimingFlags = { isNewDaily: true, isNewMonthly: true, isNewDayWindow: true, isNewMonthWindow: true };
    const storedLastEnteredAt = this.store.state.activity.lastEnteredAt;

    if (!storedLastEnteredAt) {
      return entryTimingFlags;
    }

    const now = new Date();
    const lastEntered = new Date(storedLastEnteredAt);
    const msSinceLastEntered = now - lastEntered;

    // note that new daily and new monthly is based on client local time
    entryTimingFlags.isNewDaily = !isSameDay(now, lastEntered);
    entryTimingFlags.isNewMonthly = !isSameMonth(now, lastEntered);
    entryTimingFlags.isNewDayWindow = msSinceLastEntered > MS_PER_DAY;
    entryTimingFlags.isNewMonthWindow = msSinceLastEntered > MS_PER_MONTH;

    return entryTimingFlags;
  };

  sendEnteredEvent = async () => {
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

    // This is fairly hacky, but gets the # of initial occupants
    let initialOccupantCount = 0;

    if (NAF.connection.adapter && NAF.connection.adapter.publisher) {
      initialOccupantCount = NAF.connection.adapter.publisher.initialOccupants.length;
    }

    const entryTimingFlags = this.getEntryTimingFlags();

    const entryEvent = {
      ...entryTimingFlags,
      initialOccupantCount,
      entryDisplayType,
      userAgent: navigator.userAgent
    };

    this.channel.push("events:entered", entryEvent);
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
      this.channel.push("events:profile_updated", { profile: this.store.state.profile });
    }
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

  getHost = () => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("get_host")
        .receive("ok", res => {
          resolve(res);
        })
        .receive("error", reject);
    });
  };

  getTwitterOAuthURL = () => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("oauth", { type: "twitter" })
        .receive("ok", res => {
          resolve(res.oauth_url);
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

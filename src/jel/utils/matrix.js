import { EventTarget } from "event-target-shim";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

// Delay we wait before flushing a room rename since the user
// can keep typing in the UI.
const ROOM_RENAME_DELAY = 1000;

export default class Matrix extends EventTarget {
  constructor(store) {
    super();

    this.store = store;

    this.pendingRoomJoinPromises = new Map();
    this.pendingRoomJoinResolvers = new Map();
    this.roomNameChangeTimeouts = new Map();

    // Hub <-> room bimap
    this.hubIdToRoomId = new Map();
    this.roomIdToHubId = new Map();

    // Map of space ID -> spaceroom roomId
    this.spaceIdToRoomId = new Map();

    this.isInitialSyncFinished = false;

    this.initialSyncPromise = new Promise(res => {
      this.initialSyncFinished = res;
    });
  }

  async init(scene, sessionId, homeserver, loginToken, expectedUserId) {
    const { store } = this;
    const { accountChannel } = window.APP;

    const deviceId = store.state.context.deviceId;
    this.sessionId = sessionId;
    this.homeserver = homeserver;

    let accessToken = store.state.credentials.matrix_access_token;
    let userId = null;

    // Check validity of current access token
    if (accessToken) {
      await new Promise(res => {
        fetch(`https://${homeserver}/_matrix/client/r0/account/whoami`, {
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${accessToken}`
          }
        }).then(response => {
          if (response.status !== 200) {
            accessToken = null;
            res();
          } else {
            response.json().then(whoami => {
              const currentUserId = whoami["user_id"];

              if (currentUserId !== expectedUserId) {
                accessToken = null;
              } else {
                userId = whoami["user_id"];
              }

              res();
            });
          }
        });
      });
    }

    // If missing access token, use JWT to re-log in
    if (!accessToken) {
      const loginRes = await fetch(`https://${homeserver}/_matrix/client/r0/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "org.matrix.login.jwt", token: loginToken })
      });

      const { user_id, access_token: matrix_access_token } = await loginRes.json();
      store.update({ credentials: { matrix_access_token } });

      accessToken = matrix_access_token;
      userId = user_id;
    }

    console.log("Logged into matrix as", userId);

    // Set up neon in iframe
    await waitForDOMContentLoaded();

    this._neon = document.getElementById("neon");

    const neon = this._neon;

    await new Promise(res => {
      neon.addEventListener("load", res, { once: true });
      neon.setAttribute("src", "/neon/");
    });

    await waitForDOMContentLoaded(neon.contentDocument, neon.contentWindow);

    const res = new Promise((res, rej) => {
      // Inner client calls this and passes matrix client.
      neon.contentWindow.onPreClientStart = client => {
        this.client = client;

        this._attachMatrixEventHandlers();

        this.client.once("sync", async state => {
          if (state === "PREPARED") {
            this._joinMissingRooms();

            accountChannel.addEventListener("account_refresh", () => {
              // Memberships may have changed, so join missing space rooms.
              this._joinMissingRooms();
            });

            this._setDefaultPushRules();
            this._syncProfile();

            scene.addEventListener("space-presence-synced", () => this._syncProfile());

            this.initialSyncFinished();
            this.dispatchEvent(new CustomEvent("initial_sync_finished"));

            res();
          } else {
            rej();
          }
        });
      };
    });

    const { getLoadedSession, getLifecycle, getDispatcher } = neon.contentWindow;
    const innerSession = await getLoadedSession;
    this._neonLifecycle = await getLifecycle;
    this._neonDispatcher = await getDispatcher;

    if (!innerSession) {
      await this._neonLifecycle.setLoggedIn({
        homeserverUrl: `https://${homeserver}`,
        identityServerUrl: `https://${homeserver}`,
        userId,
        accessToken,
        deviceId
      });
    }

    return res;
  }

  updateRoomNameForHub(hubId, name) {
    const { client, roomNameChangeTimeouts, hubIdToRoomId } = this;

    const roomId = hubIdToRoomId.get(hubId);
    if (!roomId) return;

    const timeout = roomNameChangeTimeouts.get(roomId);

    if (timeout) {
      clearTimeout(timeout);
    }

    roomNameChangeTimeouts.set(
      roomId,
      setTimeout(() => {
        const room = client.getRoom(roomId);

        if (room && this._roomCan("state:m.room.name", roomId)) {
          client.setRoomName(roomId, name);
        }
      }, ROOM_RENAME_DELAY)
    );
  }

  roomForHubCan(permission, hubId) {
    const { hubIdToRoomId } = this;

    const roomId = hubIdToRoomId.get(hubId);
    if (!roomId) return false;

    return this._roomCan(permission, roomId);
  }

  async switchClientToRoomForHub({ hub_id: hubId }) {
    await this.switchClientToRoomForHubId(hubId);
  }

  async switchClientToRoomForHubId(hubId) {
    const { hubIdToRoomId } = this;

    const roomId = hubIdToRoomId.get(hubId);
    if (!roomId) return;

    await this.initialSyncPromise;

    this._neonDispatcher.dispatch({
      action: "view_room",
      room_id: roomId
    });
  }

  updateRoomOrderForHubId(hubId, order) {
    const { client, hubIdToRoomId } = this;
    const roomId = hubIdToRoomId.get(hubId);

    if (!roomId) return;

    const room = client.getRoom(roomId);
    if (!room) return;

    const spaceId = this._spaceIdForRoom(room);
    if (!spaceId) return;

    const spaceRoomId = this.spaceIdToRoomId.get(spaceId);
    if (!spaceRoomId) return;

    const spaceRoom = client.getRoom(spaceRoomId);
    if (!spaceRoom) return;

    const childRooms = spaceRoom.currentState.events.get("m.space_child");
    if (!childRooms) return;

    let currentOrder = null;

    for (const [
      childRoomId,
      {
        event: {
          content: { order }
        }
      }
    ] of childRooms.entries()) {
      if (childRoomId === roomId) {
        currentOrder = order;
      }
    }

    if (currentOrder !== `${order}`) {
      window.APP.accountChannel.setMatrixRoomOrder(roomId, order);
    }
  }

  logout() {
    return this._neonLifecycle.logout();
  }

  _roomCan(permission, roomId) {
    const { client } = this;

    const room = client.getRoom(roomId);
    if (!room) return false;

    if (permission.startsWith("state:")) {
      const stateEvent = permission.substring(6);
      return room.currentState.maySendStateEvent(stateEvent, client.credentials.userId);
    } else {
      console.warn("Checking non-implemented permission", permission);
      return false;
    }
  }

  async _syncProfile() {
    const { client, sessionId } = this;
    const matrixProfile = await client.getProfileInfo(client.credentials.userId);

    const spacePresences = window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state;
    const spacePresence = spacePresences && spacePresences[sessionId];
    const meta = spacePresence && spacePresence.metas[spacePresence.metas.length - 1];

    if (meta && meta.profile) {
      const { displayName } = meta.profile;

      if (displayName !== matrixProfile.displayname) {
        await client.setDisplayName(displayName);
      }
    }
  }

  async _setDefaultPushRules() {
    const { client } = this;

    const pushRules = await client.getPushRules();

    // Disable invite notifications, since server does this for you.
    for (const [scope, scopeRules] of Object.entries(pushRules)) {
      for (const [kind, kindRules] of Object.entries(scopeRules)) {
        for (const { rule_id, enabled } of kindRules) {
          if (rule_id === ".m.rule.invite_for_me" && enabled) {
            client.setPushRuleEnabled(scope, kind, rule_id, false);
          }
        }
      }
    }
  }

  async _joinMissingRooms() {
    const { memberships } = window.APP.accountChannel;

    // Join each Jel space's matrix room, then walk all the children
    // matrix rooms and join the ones marked auto_join=true
    for (const {
      space: { matrix_spaceroom_id }
    } of memberships) {
      if (!matrix_spaceroom_id) continue;

      const spaceRoom = await this._ensureRoomJoined(matrix_spaceroom_id);

      // Walk each child room (channels) and join them if auto_join = true
      const childRooms = spaceRoom.currentState.events.get("m.space_child");

      if (childRooms) {
        for (const [
          roomId,
          {
            event: {
              content: { via, auto_join }
            }
          }
        ] of childRooms.entries()) {
          if (!via || !auto_join) continue;

          this._ensureRoomJoined(roomId);
        }
      }
    }
  }

  _ensureRoomJoined(roomId) {
    const { client } = this;
    const room = client.getRoom(roomId);
    if (room && room.hasMembershipState(client.credentials.userId, "join")) return Promise.resolve(room);

    // Stash a promise that will be resolved once the join is complete.
    let promise = this.pendingRoomJoinPromises.get(roomId);

    if (!promise) {
      promise = new Promise(res => {
        this.pendingRoomJoinResolvers.set(roomId, res);
      });

      this.pendingRoomJoinPromises.set(roomId, promise);

      window.APP.accountChannel.joinMatrixRoom(roomId);
    }

    return promise;
  }

  _spaceIdForRoom(room) {
    if (this._jelTypeForRoom(room) === "jel.space") {
      return room.currentState.events.get("jel.space").get("").event.content.space_id;
    } else if (this._jelTypeForRoom(room) === "jel.hub") {
      for (const spaceId of room.currentState.events.get("jel.space.parent").keys()) {
        return spaceId;
      }
    }
  }

  _jelTypeForRoom(room) {
    return room.currentState.events.get("jel.type").get("").event.content.type;
  }

  _isHubRoomForCurrentSpace(room) {
    const { spaceId } = window.APP.spaceChannel;

    return this._spaceIdForRoom(room) === spaceId && this._jelTypeForRoom(room) === "jel.hub";
  }

  _isSpaceRoomForCurrentSpace(room) {
    const { spaceId } = window.APP.spaceChannel;

    return this._spaceIdForRoom(room) === spaceId && this._jelTypeForRoom(room) === "jel.space";
  }

  _attachMatrixEventHandlers() {
    const { client } = this;

    client.on("Room.myMembership", async room => {
      if (!client.isInitialSyncComplete()) return;

      if (room.hasMembershipState(client.credentials.userId, "join")) {
        const { roomId } = room;
        const pendingJoinPromiseResolver = this.pendingRoomJoinResolvers.get(roomId);

        if (pendingJoinPromiseResolver) {
          this.pendingRoomJoinPromises.delete(roomId);
          this.pendingRoomJoinResolvers.delete(roomId);
          pendingJoinPromiseResolver(room);
        }

        // If we just joined a room, the user may be waiting on the UI to update.
        const hubId = window.APP.hubChannel.hubId;
        const desiredRoomId = this.hubIdToRoomId.get(hubId);

        if (hubId && desiredRoomId === roomId) {
          this.switchClientToRoomForHubId(hubId);
        }

        console.log(`Matrix: joined room ${roomId}`);
      }
    });

    client.on("RoomState.events", ({ event }) => {
      if (event.type === "jel.hub") {
        this.hubIdToRoomId.set(event.content.hub_id, event.room_id);
        this.roomIdToHubId.set(event.room_id, event.content.hub_id);
      }

      if (event.type === "jel.space") {
        this.spaceIdToRoomId.set(event.content.space_id, event.room_id);
      }

      if (!client.isInitialSyncComplete()) return;

      // If a new room is added to a spaceroom we're in after initial sync,
      // we need to join it if it's auto_join.
      if (event.type === "m.space_child") {
        if (event.content.auto_join && event.content.via) {
          this._ensureRoomJoined(event.state_key);
        }
      }
    });
  }
}

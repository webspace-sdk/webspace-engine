import MatrixSdk from "matrix-js-sdk";
import { EventTarget } from "event-target-shim";

export default class Matrix extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this.pendingRoomJoinPromises = new Map();
    this.pendingRoomJoinResolvers = new Map();
    this.fireChannelsChangedEventAfterJoinsComplete = false;

    this.initialSyncPromise = new Promise(res => {
      this.initialSyncFinished = res;
    });
  }

  async init(homeserver, loginToken, expectedUserId) {
    const { store } = this;
    const { accountChannel } = window.APP;

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

    this.client = MatrixSdk.createClient({ baseUrl: `https://${homeserver}`, accessToken, userId });

    return new Promise((res, rej) => {
      this.client.startClient({ lazyLoadMembers: true }).then(() => {
        this.client.once("sync", async state => {
          if (state === "PREPARED") {
            this._attachMatrixEventHandlers();

            this.dispatchEvent(new CustomEvent("current_space_channels_changed", {}));

            this._joinMissingRooms();

            accountChannel.addEventListener("account_refresh", () => {
              // Memberships may have changed, so join missing space rooms.
              this._joinMissingRooms();
            });

            this.initialSyncFinished();

            res();
          } else {
            rej();
          }
        });
      });
    });
  }

  getChannelTreeDataForSpaceId(spaceId, titleControl) {
    const treeData = [];

    const { client } = this;
    if (!client) return treeData;

    for (const room of client.getVisibleRooms()) {
      if (!room.hasMembershipState(client.credentials.userId, "join")) continue;
      if (this._spaceIdForRoom(room) !== spaceId) continue;
      treeData.push({
        key: room.roomId,
        title: titleControl,
        url: null,
        atomId: room.roomId,
        isLeaf: true
      });
    }

    return treeData;
  }

  // For the given room ids, return objects that conform to the atom
  // metadata structure expected by the UI.
  async getAtomMetadataForRoomIds(roomIds) {
    const { client, initialSyncPromise } = this;

    // Don't return any atoms until initial sync finished.
    await initialSyncPromise;

    const atoms = [];

    for (const roomId of roomIds) {
      // Wait until room is joined.
      const promise = this.pendingRoomJoinPromises.get(roomId);
      if (promise) await promise;

      const room = client.getRoom(roomId);
      if (!room) continue;

      atoms.push({
        room_id: room.roomId
      });
    }

    return atoms;
  }

  async _joinMissingRooms() {
    const { memberships } = window.APP.accountChannel;

    // Join each Jel space's matrix room, then walk all the children
    // matrix rooms and join the ones marked auto_join=true
    for (const {
      space: { matrix_spaceroom_id }
    } of memberships) {
      const spaceRoom = await this._ensureRoomJoined(matrix_spaceroom_id);

      // Walk each child room (channels) and join them if auto_join = true
      const childRooms = spaceRoom.currentState.events.get("m.space_child");

      if (childRooms) {
        for (const [
          roomId,
          {
            event: { content }
          }
        ] of childRooms.entries()) {
          if (content.auto_join) {
            this._ensureRoomJoined(roomId);
          }
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
    return room.currentState.events.get("jel.space").get("").event.content.space_id;
  }

  _jelTypeForRoom(room) {
    return room.currentState.events.get("jel.type").get("").event.content.type;
  }

  _isChannelRoomForCurrentSpace(room) {
    const { spaceId } = window.APP.spaceChannel;

    return this._spaceIdForRoom(room) === spaceId && this._jelTypeForRoom(room) === "jel.channel";
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

        console.log(`Matrix: joined room ${roomId}`);

        if (this._isChannelRoomForCurrentSpace(room)) {
          // After all the in-flight joins complete, fire an event which will cause the UI to update with
          // new channel information.
          this.fireChannelsChangedEventAfterJoinsComplete = true;
        }

        if (this.fireChannelsChangedEventAfterJoinsComplete && this.pendingRoomJoinPromises.size === 0) {
          // Other membership changes are join, leave, ban, all should fire channel change.
          // Fire this only after all promises are done.
          this.fireChannelsChangedEventAfterJoinsComplete = false;
          this.dispatchEvent(new CustomEvent("current_space_channels_changed", {}));
        }
      }
    });

    client.on("RoomState.events", ({ event }) => {
      if (!client.isInitialSyncComplete()) return;

      // If a new room is added to a spaceroom we're in after initial sync,
      // we need to join it if it's auto_join.
      if (event.type === "m.space_child" && event.content.auto_join) {
        this._ensureRoomJoined(event.state_key);
      }
    });
  }
}

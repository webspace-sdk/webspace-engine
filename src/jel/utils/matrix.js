import MatrixSdk from "matrix-js-sdk";
import { EventTarget } from "event-target-shim";

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
      this._attachMatrixEventHandlers();

      this.client.startClient({ lazyLoadMembers: true }).then(() => {
        this.client.once("sync", async state => {
          if (state === "PREPARED") {
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

  updateRoomOrderForPlacement(hubId, targetHubId, direction /* -1 above, 1 below */) {
    const { client, hubIdToRoomId } = this;

    const roomId = hubIdToRoomId.get(hubId);
    const targetRoomId = hubIdToRoomId.get(targetHubId);

    if (!roomId || !targetRoomId) return;

    const room = client.getRoom(roomId);
    const targetRoom = client.getRoom(targetRoomId);

    if (!room || !targetRoom) return;

    const spaceId = this._spaceIdForRoom(room);
    const targetSpaceId = this._spaceIdForRoom(targetRoom);

    if (!spaceId || spaceId !== targetSpaceId) return;

    const spaceRoomId = this.spaceIdToRoomId.get(spaceId);
    if (!spaceRoomId) return;

    const spaceRoom = client.getRoom(spaceRoomId);
    if (!spaceRoom) return;

    // Sort the rooms for the tree based upon the space child state
    const childRooms = spaceRoom.currentState.events.get("m.space_child");
    if (!childRooms) return;

    const orderedRoomList = [];

    for (const [
      roomId,
      {
        event: {
          content: { order, via }
        }
      }
    ] of childRooms.entries()) {
      if (!via) continue;

      orderedRoomList.push({ roomId, order: parseInt(order) });
    }

    orderedRoomList.sort(({ order: orderX }, { order: orderY }) => {
      if (orderX < orderY) return -1;
      if (orderX > orderY) return 1;
      return 0;
    });

    let newOrder = null;

    for (let i = 0; i < orderedRoomList.length; i++) {
      const { roomId, order } = orderedRoomList[i];
      if (roomId !== targetRoomId) continue;

      // Grab the adjacent orders, and then the new order is the average of them, so
      // the channel will be placed between them.
      let orderFrom, orderTo;

      if (direction === -1) {
        // Move above
        if (i === 0) {
          // If this is being moved to the end, give it the max order + 2^18 to create a sizable
          // order gap between the last two entries. (Same as on dyna)
          orderFrom = orderTo = order - Math.pow(2, 18);
        } else {
          // New order will be average of the adjacent entries.
          orderFrom = order;
          orderTo = orderedRoomList[i - 1].order;
        }
      } else {
        // Move below
        if (i === orderedRoomList.length - 1) {
          // If this is being moved to the end, give it the max order + 2^18 to create a sizable
          // order gap between the last two entries. (Same as on dyna)
          orderFrom = orderTo = order + Math.pow(2, 18);
        } else {
          // New order will be average of the adjacent entries.
          orderFrom = order;
          orderTo = orderedRoomList[i + 1].order;
        }
      }

      newOrder = Math.floor((orderFrom + orderTo) / 2.0);

      break;
    }

    if (newOrder === null) return;

    window.APP.accountChannel.setMatrixRoomOrder(roomId, newOrder);
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

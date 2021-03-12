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

    // Channel <-> room bimap
    this.channelIdToRoomId = new Map();
    this.roomIdToChannelId = new Map();

    // Map of space ID -> spaceroom roomId
    this.spaceIdToRoomId = new Map();

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
      this._attachMatrixEventHandlers();

      this.client.startClient({ lazyLoadMembers: true }).then(() => {
        this.client.once("sync", async state => {
          if (state === "PREPARED") {
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

    const { client, roomIdToChannelId, channelIdToRoomId } = this;
    if (!client) return treeData;

    let spaceRoom;

    for (const room of client.getVisibleRooms()) {
      if (!room.hasMembershipState(client.credentials.userId, "join")) continue;
      if (this._spaceIdForRoom(room) !== spaceId) continue;

      if (this._jelTypeForRoom(room) === "jel.space") {
        spaceRoom = room;
        continue;
      }

      if (this._jelTypeForRoom(room) !== "jel.channel") continue;

      const channelId = roomIdToChannelId.get(room.roomId);

      treeData.push({
        key: channelId,
        title: titleControl,
        url: null,
        atomId: channelId,
        isLeaf: true
      });
    }

    if (spaceRoom) {
      // Sort the rooms for the tree based upon the space child state
      const childRooms = spaceRoom.currentState.events.get("m.space_child");
      const roomOrders = new Map();

      if (childRooms) {
        for (const [
          roomId,
          {
            event: {
              content: { order, via }
            }
          }
        ] of childRooms.entries()) {
          if (!via) continue; // Rooms without via have been removed from the space

          roomOrders.set(roomId, order);
        }
      }

      treeData.sort(({ atomId: channelIdX }, { atomId: channelIdY }) => {
        const roomIdX = channelIdToRoomId.get(channelIdX);
        const roomIdY = channelIdToRoomId.get(channelIdY);

        const orderX = roomOrders.get(roomIdX) || 0;
        const orderY = roomOrders.get(roomIdY) || 0;
        if (orderX < orderY) return -1;
        if (orderX > orderY) return 1;
        return 0;
      });
    }

    return treeData;
  }

  setChannelName(channelId, name) {
    const { client, roomNameChangeTimeouts, channelIdToRoomId } = this;

    const roomId = channelIdToRoomId.get(channelId);
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

  // For the given room ids, return objects that conform to the atom
  // metadata structure expected by the UI.
  async getAtomMetadataForChannelIds(channelIds) {
    const { client, initialSyncPromise, pendingRoomJoinPromises, channelIdToRoomId } = this;

    // Don't return any atoms until initial sync finished.
    await initialSyncPromise;

    const atoms = [];

    for (const channelId of channelIds) {
      const roomId = channelIdToRoomId.get(channelId);

      // Wait until room is joined.
      const promise = pendingRoomJoinPromises.get(roomId);
      if (promise) await promise;

      const room = client.getRoom(roomId);
      if (!room) continue;

      atoms.push(this._roomToAtomMetadata(room));
    }

    return atoms;
  }

  channelCan(permission, channelId) {
    const { channelIdToRoomId } = this;

    const roomId = channelIdToRoomId.get(channelId);
    if (!roomId) return false;

    return this._roomCan(permission, roomId);
  }

  moveChannelAbove(channelId, aboveChannelId) {
    console.log("above", channelId, aboveChannelId);
    this.updateRoomOrderForPlacement(channelId, aboveChannelId, -1);
  }

  moveChannelBelow(channelId, belowChannelId) {
    console.log("below", channelId, belowChannelId);
    this.updateRoomOrderForPlacement(channelId, belowChannelId, 1);
  }

  updateRoomOrderForPlacement(channelId, targetChannelId, direction /* -1 above, 1 below */) {
    const { client, channelIdToRoomId } = this;

    const roomId = channelIdToRoomId.get(channelId);
    const targetRoomId = channelIdToRoomId.get(targetChannelId);

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

    window.APP.accountChannel.setChannelMatrixRoomOrder(roomId, newOrder);
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
    } else if (this._jelTypeForRoom(room) === "jel.channel") {
      for (const spaceId of room.currentState.events.get("jel.space.parent").keys()) {
        return spaceId;
      }
    }
  }

  _jelTypeForRoom(room) {
    return room.currentState.events.get("jel.type").get("").event.content.type;
  }

  _isChannelRoomForCurrentSpace(room) {
    const { spaceId } = window.APP.spaceChannel;

    return this._spaceIdForRoom(room) === spaceId && this._jelTypeForRoom(room) === "jel.channel";
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
      } else if (room.hasMembershipState(client.credentials.userId, "leave")) {
        // Left room
        this.dispatchEvent(new CustomEvent("current_space_channels_changed", {}));
      }
    });

    client.on("RoomState.events", ({ event }) => {
      if (event.type === "jel.channel") {
        this.channelIdToRoomId.set(event.content.channel_id, event.room_id);
        this.roomIdToChannelId.set(event.room_id, event.content.channel_id);
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

        const room = client.getRoom(event.room_id);

        if (room && this._isSpaceRoomForCurrentSpace(room)) {
          // May have been a re-order in the current space, re-render
          this.dispatchEvent(new CustomEvent("current_space_channels_changed", {}));
        }
      }

      // If name is updated, fire the channel_meta_refresh event in the form expected
      // by the atom metadata hander.
      if (event.type === "m.room.name") {
        const room = client.getRoom(event.room_id);

        if (this._jelTypeForRoom(room) === "jel.channel") {
          const metas = [this._roomToAtomMetadata(room)];
          this.dispatchEvent(new CustomEvent("channel_meta_refresh", { detail: { metas } }));
        }
      }
    });
  }

  _roomToAtomMetadata(room) {
    const { roomIdToChannelId } = this;

    let name = null;

    const mRoomName = room.currentState.getStateEvents("m.room.name", "");
    if (mRoomName && mRoomName.getContent() && mRoomName.getContent().name) {
      name = mRoomName.getContent().name.trim();
    }

    return {
      channel_id: roomIdToChannelId.get(room.roomId),
      name
    };
  }
}

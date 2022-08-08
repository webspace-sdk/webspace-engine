import { EventTarget } from "event-target-shim";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { getReticulumFetchUrl } from "../../hubs/utils/phoenix-utils";
import { ATOM_NOTIFICATION_TYPES } from "./atom-metadata";
import { getMessages } from "../../hubs/utils/i18n";
import { renderAvatarToPng } from "./avatar-utils";

// Delay we wait before flushing a room rename since the user
// can keep typing in the UI.
const ROOM_RENAME_DELAY = 1000;

const MEMBER_SORT_REGEX = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]+/g;

// These are the matrix default push rules that are automatically
// disabled globally and then copied on a per-space basis, which will
// let the user toggle them on and off. This relies up on the spaceroom_id
// key in the message content being set properly, which is done via the Jel
// fork of element.
const DEFAULT_GLOBAL_PUSH_RULES_TO_SPACE_OVERRIDE = [
  ".m.rule.contains_display_name",
  ".m.rule.contains_user_name",
  ".m.rule.message",
  ".m.rule.encrypted",
  ".m.rule.roomnotif"
];

// Maps the space channel notification setting to the suffixes of push rules that must be enabled
// on the space. Note that these must be in order from most constrained match to least.
const JEL_SPACE_CHANNEL_NOTIFICATION_SETTING_TO_RULE_SUFFIXES = [
  ["all", ["contains_display_name", "contains_user_name", "message", "encrypted", "roomnotif"]],
  ["mentions", ["contains_display_name", "contains_user_name", "roomnotif"]],
  ["none", ["roomnotif"]]
];

const GLOBAL_PUSH_RULES_TO_DISABLE = [".m.rule.invite_for_me"];

export default class Matrix extends EventTarget {
  constructor(store, spaceMetadata, hubMetadata) {
    super();

    this.store = store;
    this.spaceMetadata = spaceMetadata;
    this.hubMetadata = hubMetadata;

    this.pendingRoomJoinPromises = new Map();
    this.pendingRoomJoinResolvers = new Map();
    this.roomNameChangeTimeouts = new Map();
    this.avatarUpdateTimeout = null;

    // Hub <-> room bimap
    this.hubIdToRoomId = new Map();
    this.roomIdToHubId = new Map();

    this.neonDispatcher = null;
    this.neonLifecycle = null;
    this.neonStores = null;
    this.neonConstants = null;
    this.neonUtils;
    this.roomIdToNeonRoomNotificationStateHandler = new Map();

    // Space <-> spaceroom bimap
    this.spaceIdToRoomId = new Map();
    this.roomIdToSpaceId = new Map();

    this.isInitialSyncFinished = false;

    this.initialSyncPromise = new Promise(res => {
      this.initialSyncFinished = res;
    });

    this.lastSetAppBadgeUnread = -1;

    this.currentSpaceId = null;
    this.currentSpaceMembersVersion = 0;
    this.currentSpaceMembers = [];
  }

  async init(scene, subscriptions, sessionId, homeserver, loginToken, expectedUserId) {
    const { store } = this;
    const { accountChannel } = window.APP;

    const deviceId = store.state.credentials.deviceId;
    this.sessionId = sessionId;
    this.homeserver = homeserver;
    this.subscriptions = subscriptions;

    let accessToken = store.state.credentials.matrixAccessToken;
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

      const { user_id, access_token: matrixAccessToken } = await loginRes.json();
      store.update({ credentials: { matrixAccessToken } });

      accessToken = matrixAccessToken;
      userId = user_id;
    }

    console.log("Logged into matrix as", userId);

    // Set up neon in iframe
    await waitForDOMContentLoaded();

    this.neon = document.getElementById("neon");

    const neon = this.neon;

    await new Promise(res => {
      neon.addEventListener("load", res, { once: true });
      neon.setAttribute("src", "/neon");
    });

    await waitForDOMContentLoaded(neon.contentDocument, neon.contentWindow);

    const res = new Promise((res, rej) => {
      // Inner client calls this and passes matrix client.
      neon.contentWindow.onPreClientStart = client => {
        this.client = client;

        this._attachMatrixEventHandlers();

        this.client.once("sync", async state => {
          if (state === "PREPARED") {
            await this._syncProfile();

            subscriptions.addEventListener("subscriptions_updated", () => this._syncPusher());

            await this._syncPusher();

            this._joinMissingRooms();

            accountChannel.addEventListener("account_refresh", () => {
              // Memberships may have changed, so join missing space rooms.
              this._joinMissingRooms();
            });

            // TODO SHARED
            scene.addEventListener("space-oldpresence-synced", () => this._syncProfile());
            this._disableGlobalPushRules();

            const { spaceStore } = this.neonStores;

            spaceStore.on(this.neonConstants.UPDATE_TOP_LEVEL_SPACES, () => {
              for (const room of client.getRooms()) {
                if (room.isSpaceRoom()) {
                  this._unsubscribeFromNotificationState(room);

                  if (room.hasMembershipState(client.credentials.userId, "join")) {
                    this._subscribeToNotificationState(room);
                  }
                }
              }
            });

            for (const room of client.getRooms()) {
              if (room.hasMembershipState(client.credentials.userId, "join")) {
                this._subscribeToNotificationState(room);
              }
            }

            this.initialSyncFinished();
            this.isInitialSyncFinished = true;

            this.dispatchEvent(new CustomEvent("initial_sync_finished"));

            res();
          } else {
            rej();
          }
        });
      };
    });

    const { getLoadedSession, getLifecycle, getDispatcher, getStores, getConstants, getUtils } = neon.contentWindow;
    const innerSession = await getLoadedSession;
    this.neonLifecycle = await getLifecycle;
    this.neonDispatcher = await getDispatcher;
    this.neonStores = await getStores;
    this.neonConstants = await getConstants;
    this.neonUtils = await getUtils;

    this._setDefaultNeonSettings();

    if (!innerSession) {
      await this.neonLifecycle.setLoggedIn({
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
          client.setRoomName(roomId, name || getMessages()["hub.unnamed-channel-title"]);
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

  // Switches the neon UI to the specified hub, and updates
  // the currentSpaceMembers to include the members of the space,
  // firing currnet_space_members_updated once it is ready.
  async switchToHub({ hub_id: hubId, space_id: spaceId }) {
    this._updateCurrentSpaceMembersForSpaceId(spaceId);
    await this._switchClientToRoomForHubId(hubId);
  }

  async _refreshCurrentSpaceMembers() {
    const { currentSpaceId } = this;
    if (!currentSpaceId) return;

    this._updateCurrentSpaceMembersForSpaceId(currentSpaceId);
  }

  async _refreshCurrentSpaceMembersOnRoomChange(roomId) {
    // Check for current space member refresh
    if (this.currentSpaceId === null) return;

    const currentSpaceRoomId = this.spaceIdToRoomId.get(this.currentSpaceId);
    if (currentSpaceRoomId !== roomId) return;
    this._refreshCurrentSpaceMembers();
  }

  async _updateCurrentSpaceMembersForSpaceId(spaceId) {
    const { client, spaceIdToRoomId } = this;

    this.currentSpaceId = spaceId;
    this.currentSpaceMembers.length = 0;
    this.currentSpaceMembersVersion += 1;

    this.dispatchEvent(new CustomEvent("current_space_members_updated"));

    // Assume this will be called again if room is not ready yet.
    const roomId = spaceIdToRoomId.get(spaceId);
    if (!roomId) return;

    const expectedVersion = this.currentSpaceMembersVersion;

    const room = client.getRoom(roomId);
    const membership = room && room.getMyMembership();
    if (membership !== "join") return;

    await room.loadMembersIfNeeded();

    if (this.currentSpaceId !== spaceId) return;
    if (this.currentSpaceMembersVersion !== expectedVersion);

    this.currentSpaceMembers.length = 0;

    for (const m of Object.values(room.currentState.members)) {
      if (m.membership !== "join" && m.membership !== "invite") continue;

      // Filter out non-account matrix users
      if (!m.userId.startsWith("@jel_")) continue;

      // work around a race where you might have a room member object
      // before the user object exists.  This may or may not cause
      // https://github.com/vector-im/vector-web/issues/186
      if (m.user === null) {
        m.user = client.getUser(m.userId);
      }

      this.currentSpaceMembers.push(m);
    }

    this.currentSpaceMembers.sort(this._memberSort);
    this.dispatchEvent(new CustomEvent("current_space_members_updated"));
  }

  async _switchClientToRoomForHubId(hubId) {
    const { hubIdToRoomId } = this;

    const roomId = hubIdToRoomId.get(hubId);
    if (!roomId) return;

    await this.initialSyncPromise;

    this.neonDispatcher.dispatch({
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

    const childRooms = spaceRoom.currentState.events.get("m.space.child");
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
    return this.neonLifecycle.logout();
  }

  async setNotifyChannelChatModeForSpace(spaceId, mode) {
    const { client } = this;
    if (!client) return null;

    const pushRules = await client.getPushRules();

    const managedRuleSuffixes = JEL_SPACE_CHANNEL_NOTIFICATION_SETTING_TO_RULE_SUFFIXES[0][1];

    const ruleSuffixesToEnable = JEL_SPACE_CHANNEL_NOTIFICATION_SETTING_TO_RULE_SUFFIXES.find(([m]) => m === mode)[1];

    for (const [scope, scopeRules] of Object.entries(pushRules)) {
      for (const [kind, kindRules] of Object.entries(scopeRules)) {
        for (const { rule_id, enabled } of kindRules) {
          const isManaged = managedRuleSuffixes.map(suffix => `jel.space_${spaceId}.rule.${suffix}`).includes(rule_id);
          if (!isManaged) continue;

          const shouldEnable = ruleSuffixesToEnable
            .map(suffix => `jel.space_${spaceId}.rule.${suffix}`)
            .includes(rule_id);

          if (enabled !== shouldEnable) {
            client.setPushRuleEnabled(scope, kind, rule_id, shouldEnable);
          }
        }
      }
    }
  }

  async updateAvatarColor(r, g, b, debounce = true) {
    if (this.avatarUpdateTimeout) {
      clearTimeout(this.avatarUpdateTimeout);
    }

    const update = async () => {
      const { client } = this;
      const [blob] = await renderAvatarToPng(r, g, b);
      const file = new File([blob], "avatar.png", { type: "image/png" });
      const fileUrl = await client.uploadContent(file, { onlyContentUri: true });

      // Debounce this for 5 seconds given the way the UI works currently.
      client.setAvatarUrl(fileUrl);
      this.avatarUpdateTimeout = null;
    };

    if (debounce) {
      this.avatarUpdateTimeout = setTimeout(update, 5000);
    } else {
      await update();
    }
  }

  async getNotifyChannelChatModeForSpace(spaceId) {
    const { client } = this;
    if (!client) return null;

    let setting = "none";

    // The current setting for the space is the one which has all the rules enabled in JEL_SPACE_CHANNEL_NOTIFICATION_SETTING_TO_RULE_SUFFIXES
    for (const [candidateSetting, suffixes] of JEL_SPACE_CHANNEL_NOTIFICATION_SETTING_TO_RULE_SUFFIXES) {
      let allRulesEnabledForSetting = true;

      for (const suffix of suffixes) {
        const spaceRuleId = `jel.space_${spaceId}.rule.${suffix}`;

        let hasEnabledRuleForSuffix = false;

        for (const [, scopeRules] of Object.entries(client.pushRules)) {
          for (const [, kindRules] of Object.entries(scopeRules)) {
            for (const { rule_id, enabled } of kindRules) {
              if (rule_id === spaceRuleId && enabled) {
                hasEnabledRuleForSuffix = true;
                break;
              }
            }

            if (hasEnabledRuleForSuffix) break;
          }

          if (hasEnabledRuleForSuffix) break;
        }

        if (!hasEnabledRuleForSuffix) {
          allRulesEnabledForSetting = false;
          break;
        }
      }

      if (allRulesEnabledForSetting) {
        setting = candidateSetting;
        break;
      }
    }

    return setting;
  }

  getAvatarUrlForMember(member, width, height, resizeMethod = "scale") {
    return member.getAvatarUrl(
      this.client.getHomeserverUrl(),
      Math.floor(width * window.devicePixelRatio),
      Math.floor(height * window.devicePixelRatio),
      resizeMethod
    );
  }

  markRoomForHubIdAsFullyRead(hubId) {
    const { client, hubIdToRoomId } = this;

    const roomId = hubIdToRoomId.get(hubId);
    if (!roomId) return;

    const room = client.getRoom(roomId);
    if (!room) return;

    const lastEvent = room.timeline[room.timeline.length - 1];
    if (!lastEvent) return;

    const readUpToId = room.getEventReadUpTo(client.credentials.userId);
    const lastEventId = lastEvent.event.event_id;

    if (readUpToId !== lastEventId) {
      client.sendReadReceipt(lastEvent);
    }
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

  async _syncPusher() {
    const { client, subscriptions, store } = this;
    if (!client || !subscriptions || !store || !subscriptions.ready) return;

    const sub = subscriptions.subscribed ? await subscriptions.getCurrentSub() : null;

    const pusherParams = {
      app_id: "app.jel",
      app_display_name: "Jel",
      device_display_name: "Jel Web Client",
      lang: navigator.language
    };

    const { pushers } = await client.getPushers();
    let existingPusherForDevice = null;

    for (const pusher of pushers) {
      const {
        data: { device_id }
      } = pusher;

      if (device_id === store.state.credentials.deviceId) {
        existingPusherForDevice = pusher;
        break;
      }
    }

    if (sub) {
      const { endpoint } = sub;
      const {
        keys: { p256dh, auth }
      } = sub.toJSON();

      if (!existingPusherForDevice || existingPusherForDevice.pushkey !== p256dh) {
        if (existingPusherForDevice) {
          // Remove existing push key for this user if pushkey changed
          await client.setPusher({
            ...pusherParams,
            kind: null,
            pushkey: existingPusherForDevice.pushkey,
            data: {}
          });
        }

        // This may need to be updated to a new domain, for now assume reticulum is the push handler.
        const url = getReticulumFetchUrl("/_matrix/push/v1/notify", true);

        await client.setPusher({
          ...pusherParams,
          kind: "http",
          pushkey: p256dh,
          data: {
            url,
            auth,
            endpoint,
            device_id: store.state.credentials.deviceId,
            account_id: store.credentialsAccountId
          },
          append: true
        });
      }
    } else {
      if (existingPusherForDevice) {
        // Remove existing pusher for this user if sub is removed
        await client.setPusher({
          ...pusherParams,
          kind: null,
          pushkey: existingPusherForDevice.pushkey,
          data: {}
        });
      }
    }
  }

  async _syncProfile() {
    const { client, sessionId } = this;
    const matrixUser = await client.getUser(client.credentials.userId);

    const spacePresences = window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state;
    const spacePresence = spacePresences && spacePresences[sessionId];
    const meta = spacePresence && spacePresence.metas[spacePresence.metas.length - 1];

    if (meta && meta.profile) {
      const { displayName } = meta.profile;

      if (displayName !== matrixUser.displayName) {
        await client.setDisplayName(displayName);
      }
    }

    if (meta && meta.profile && meta.profile.persona && meta.profile.persona.avatar) {
      const user = client.getUser(client.getUserId());

      // Initial avatar url set here, for updates we call this function directly
      // from UI.
      if (!user.avatarUrl) {
        await this.updateAvatarColor(
          meta.profile.persona.avatar.primary_color.r,
          meta.profile.persona.avatar.primary_color.g,
          meta.profile.persona.avatar.primary_color.b,
          false
        );
      }
    }
  }

  async _disableGlobalPushRules() {
    const { client } = this;

    const pushRules = await client.getPushRules();

    // Disable invite notifications, since server does this for you.
    for (const [scope, scopeRules] of Object.entries(pushRules)) {
      for (const [kind, kindRules] of Object.entries(scopeRules)) {
        for (const { rule_id, enabled } of kindRules) {
          if (GLOBAL_PUSH_RULES_TO_DISABLE.includes(rule_id) && enabled) {
            client.setPushRuleEnabled(scope, kind, rule_id, false);
          }

          if (DEFAULT_GLOBAL_PUSH_RULES_TO_SPACE_OVERRIDE.includes(rule_id) && enabled) {
            client.setPushRuleEnabled(scope, kind, rule_id, false);
          }
        }
      }
    }
  }

  async _initSpacePushRules(spaceId, spaceRoomId) {
    const { client } = this;

    const pushRules = client.pushRules;

    // Disable invite notifications, since server does this for you.
    for (const [scope, scopeRules] of Object.entries(pushRules)) {
      for (const [kind, kindRules] of Object.entries(scopeRules)) {
        for (const rule of kindRules) {
          const { rule_id } = rule;
          if (!DEFAULT_GLOBAL_PUSH_RULES_TO_SPACE_OVERRIDE.includes(rule_id)) continue;

          const spaceRuleId = rule_id.replace(/^\.m\./, `jel.space_${spaceId}.`);

          const existingRule = pushRules[scope][kind].find(({ rule_id }) => rule_id === spaceRuleId);

          if (!existingRule) {
            const conditions = [
              ...(rule.conditions || []),

              // For now, we rely upon the Jel-specific content key spaceroom_id
              { kind: "event_match", key: "content.spaceroom_id", pattern: spaceRoomId }
            ];

            const actions = [...rule.actions];

            // Special case - @room -> @everyone
            for (const cond of conditions) {
              if (cond.pattern === "@room") {
                cond.pattern = "@everyone";
              }
            }

            // Add sound: default to all push rules, since we want to have sounds be regulated by service worker.
            const hasSound = actions.find(a => a.set_tweak === "sound");

            if (!hasSound) {
              actions.push({ set_tweak: "sound", value: "default" });
            }

            await client.addPushRule(scope, kind, spaceRuleId, {
              enabled: true,
              pattern: rule.pattern,
              conditions,
              actions
            });
          }
        }
      }
    }
  }

  async _joinMissingRooms() {
    const { memberships } = window.APP.accountChannel;
    const { client } = this;

    // Join each Jel space's matrix room, then walk all the children
    // matrix rooms and join the ones marked auto_join=true
    for (const {
      space: { matrix_spaceroom_id }
    } of memberships) {
      if (!matrix_spaceroom_id) continue;

      const spaceRoom = await this._ensureRoomJoined(matrix_spaceroom_id);

      // Collect all the published child rooms that we are not members of,
      // and then query the backend to determine which ones we can join.
      //
      // Walk each child room (channels) and join them if allowed and auto_join = true

      const roomsToCheck = [];
      const childRooms = spaceRoom.currentState.events.get("m.space.child");

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
          const room = client.getRoom(roomId);

          if (room && room.hasMembershipState(client.credentials.userId, "join")) continue;
          roomsToCheck.push(roomId);
        }

        if (roomsToCheck.length > 0) {
          const roomsToJoin = await window.APP.accountChannel.getJoinableMatrixRooms(roomsToCheck);

          for (const roomId of roomsToJoin) {
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

  _subscribeToNotificationState(room) {
    this._unsubscribeFromNotificationState(room);

    const { spaceMetadata, hubMetadata, roomIdToHubId, roomIdToSpaceId } = this;
    const { NOTIFICATION_STATE_UPDATE, NotificationColor } = this.neonConstants;
    const { roomId } = room;

    const state = this._neonNotificationStateForRoom(room);

    const handler = () => {
      const { count, color } = state;

      let atomNotificationType = ATOM_NOTIFICATION_TYPES.NONE;

      switch (color) {
        case NotificationColor.Bold:
          atomNotificationType = ATOM_NOTIFICATION_TYPES.UNREAD;
          break;
        case NotificationColor.Grey:
          atomNotificationType = ATOM_NOTIFICATION_TYPES.NOTIFICATIONS;
          break;
        case NotificationColor.Red:
          atomNotificationType = ATOM_NOTIFICATION_TYPES.PING_NOTIFICATIONS;
          break;
      }

      const spaceId = roomIdToSpaceId.get(roomId);

      if (spaceId) {
        spaceMetadata.setCounts(spaceId, {
          notification_type: atomNotificationType,
          notification_count: count
        });
      }

      const hubId = roomIdToHubId.get(roomId);

      if (hubId) {
        hubMetadata.setCounts(hubId, {
          notification_type: atomNotificationType,
          notification_count: count
        });

        // Update app badge when counts change for notifications
        if (navigator.setAppBadge) {
          const unread = this._getJoinedRoomCountWithUnreadNotifications();

          if (this.lastSetAppBadgeUnread !== unread) {
            if (unread >= 0 && unread <= 9) {
              navigator.setAppBadge(unread);
            } else if (unread > 9) {
              navigator.setAppBadge();
            }

            this.lastSetAppBadgeUnread = unread;
          }
        }
      }
    };

    handler();
    this.roomIdToNeonRoomNotificationStateHandler.set(roomId, handler);
    state.on(NOTIFICATION_STATE_UPDATE, handler);
  }

  _unsubscribeFromNotificationState(room) {
    const { NOTIFICATION_STATE_UPDATE } = this.neonConstants;
    const { roomId } = room;

    const handler = this.roomIdToNeonRoomNotificationStateHandler.get(roomId);
    if (!handler) return;

    const state = this._neonNotificationStateForRoom(room);
    state.off(NOTIFICATION_STATE_UPDATE, handler);
  }

  _neonNotificationStateForRoom(room) {
    const { roomIdToSpaceId } = this;
    const { spaceStore, roomNotificationStateStore } = this.neonStores;
    const { roomId } = room;

    if (roomIdToSpaceId.has(roomId)) {
      return spaceStore.getNotificationState(roomId);
    } else {
      return roomNotificationStateStore.getRoomState(room);
    }
  }

  _setDefaultNeonSettings() {
    const { settingsStore } = this.neonStores;
    const { SettingLevel } = this.neonConstants;

    for (const [setting, value] of Object.entries({
      showTypingNotifications: true,
      autoplayGifsAndVideos: false,
      urlPreviewsEnabled: true,
      "TextualBody.enableBigEmoji": true,
      showReadReceipts: false,
      showTwelveHourTimestamps: true,
      alwaysShowTimestamps: false,
      showRedactions: false,
      enableSyntaxHighlightLanguageDetection: true,
      expandCodeByDefault: true,
      scrollToBottomOnMessageSent: true,
      showCodeLineNumbers: false,
      showJoinLeaves: false,
      showAvatarChanges: false,
      showDisplaynameChanges: false,
      showImages: true,
      showChatEffects: true,
      "Pill.shouldShowPillAvatar": true,
      ctrlFForSearch: false
    })) {
      settingsStore.setValue(setting, null, SettingLevel.DEVICE, value);
    }
  }

  _getJoinedRoomCountWithUnreadNotifications() {
    const { client } = this;

    let unreadRoomCount = 0;

    // Is this too expensive to run on every notification?
    for (const room of client.getRooms()) {
      if (room.getUnreadNotificationCount("total") > 0 && room.hasMembershipState(client.credentials.userId, "join")) {
        unreadRoomCount++;
      }
    }

    return unreadRoomCount;
  }

  _attachMatrixEventHandlers() {
    const { client, spaceIdToRoomId, roomIdToSpaceId, hubIdToRoomId, roomIdToHubId } = this;

    client.on("accountData", ({ event: { type } }) => {
      if (type === "m.push_rules") {
        this.dispatchEvent(new CustomEvent("push_rules_changed"));
      }
    });

    client.on("RoomState.members", (ev, state, { roomId }) => {
      this._refreshCurrentSpaceMembersOnRoomChange(roomId);
    });

    client.on("RoomMember.name", (ev, { roomId }) => {
      this._refreshCurrentSpaceMembersOnRoomChange(roomId);
    });

    for (const ev of ["User.presence", "User.currentlyActive"]) {
      client.on(ev, (event, { userId }) => {
        if (!this.currentSpaceId) return;

        const roomId = this.spaceIdToRoomId.get(this.currentSpaceId);
        if (!roomId) return;

        const room = client.getRoom(roomId);
        if (!room.hasMembershipState(userId, "join")) return;

        this._refreshCurrentSpaceMembers();
      });
    }

    client.on("Room.myMembership", async (room, membership) => {
      const { roomId } = room;

      const spaceId = this.roomIdToSpaceId.get(roomId);
      const hubId = this.roomIdToHubId.get(roomId);

      if (spaceId && membership === "join" && this.currentSpaceId === spaceId) {
        this._refreshCurrentSpaceMembers();
      }

      if (!client.isInitialSyncComplete()) return;

      if (membership !== "invite" && membership !== "join" && hubId) {
        this.dispatchEvent(new CustomEvent("left_room_for_hub", { detail: { hubId } }));
      }

      if (room.hasMembershipState(client.credentials.userId, "join")) {
        const pendingJoinPromiseResolver = this.pendingRoomJoinResolvers.get(roomId);

        if (pendingJoinPromiseResolver) {
          this.pendingRoomJoinPromises.delete(roomId);
          this.pendingRoomJoinResolvers.delete(roomId);
          pendingJoinPromiseResolver(room);
        }

        this._subscribeToNotificationState(room);

        // If we just joined a room, the user may be waiting on the UI to update.
        const spaceId = window.APP.spaceChannel.spaceId;
        const hubId = window.APP.hubChannel.hubId;
        const desiredRoomId = this.hubIdToRoomId.get(hubId);

        if (hubId && desiredRoomId === roomId) {
          this.switchToHub({ hub_id: hubId, space_id: spaceId });
        }

        console.log(`Matrix: joined room ${roomId}`);
      } else if (
        room.hasMembershipState(client.credentials.userId, "leave") ||
        room.hasMembershipState(client.credentials.userId, "ban")
      ) {
        this._unsubscribeFromNotificationState(room);
      }
    });

    client.on("RoomState.events", ({ event }) => {
      if (event.type === "jel.hub") {
        // This is where we can perform steps that happen at most once per session per hub.
        hubIdToRoomId.set(event.content.hub_id, event.room_id);
        roomIdToHubId.set(event.room_id, event.content.hub_id);
      }

      if (event.type === "jel.space") {
        // This is where we can perform steps that happen at most once per session per space.
        spaceIdToRoomId.set(event.content.space_id, event.room_id);
        roomIdToSpaceId.set(event.room_id, event.content.space_id);
        this._initSpacePushRules(event.content.space_id, event.room_id);

        if (this.currentSpaceId === event.content.space_id) {
          this._refreshCurrentSpaceMembers();
        }
      }

      if (!client.isInitialSyncComplete()) return;

      // If a new room is added to a spaceroom we're in after initial sync,
      // we need to join it if it's auto_join.
      if (event.type === "m.space.child") {
        if (event.content.auto_join && event.content.via) {
          this._ensureRoomJoined(event.state_key);
        }
      }
    });
  }

  _memberSort = (() => {
    const convertPresence = p => (p === "unavailable" ? "online" : p);
    const order = ["active", "online", "offline"];

    const presenceIndex = p => {
      const idx = order.indexOf(convertPresence(p));
      return idx === -1 ? order.length : idx; // unknown states at the end
    };

    return (memberA, memberB) => {
      // taken from matrix-react-sdk
      // order by presence, with "active now" first.
      // ...and then by power level
      // ...and then alphabetically.

      const userA = memberA.user;
      const userB = memberB.user;

      if (!userA && !userB) return 0;
      if (userA && !userB) return -1;
      if (!userA && userB) return 1;

      // First by presence
      const idxA = presenceIndex(userA.currentlyActive ? "active" : userA.presence);
      const idxB = presenceIndex(userB.currentlyActive ? "active" : userB.presence);
      if (idxA !== idxB) {
        return idxA - idxB;
      }

      // Second by power level
      if (memberA.powerLevel !== memberB.powerLevel) {
        return memberB.powerLevel - memberA.powerLevel;
      }

      // Fourth by name (alphabetical)
      const nameA = (memberA.name[0] === "@" ? memberA.name.substr(1) : memberA.name).replace(MEMBER_SORT_REGEX, "");
      const nameB = (memberB.name[0] === "@" ? memberB.name.substr(1) : memberB.name).replace(MEMBER_SORT_REGEX, "");

      return nameA.localeCompare(nameB, {
        ignorePunctuation: true,
        sensitivity: "base"
      });
    };
  })();
}

import TreeManager from "../../jel/utils/tree-manager";
import { getHubIdFromHistory, getSpaceIdFromHistory } from "../../jel/utils/jel-url-utils";
import { isSetEqual } from "../../jel/utils/set-utils";
import { getInitialHubForSpaceId } from "../../jel/utils/membership-utils";
import { clearResolveUrlCache } from "./media-utils";
import { getMessages } from "./i18n";
import { SOUND_CHAT_MESSAGE } from "../systems/sound-effects-system";
import qsTruthy from "./qs_truthy";
import HubStore from "../storage/hub-store";
import MediaTree from "../../jel/utils/media-tree";
import { applyTemplate } from "../../jel/utils/template-utils";
import { clearVoxAttributePools } from "../../jel/objects/JelVoxBufferGeometry";
import { restartPeriodicSyncs } from "../components/periodic-full-syncs";

const NOISY_OCCUPANT_COUNT = 12; // Above this # of occupants, we stop posting join/leaves/renames

const isDebug = qsTruthy("debug");
const isBotMode = qsTruthy("bot");

let positionTrackerInterval = null;

const stopTrackingPosition = () => clearInterval(positionTrackerInterval);

const startTrackingPosition = (() => {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  return hubStore => {
    stopTrackingPosition();
    const avatarRig = DOM_ROOT.getElementById("avatar-rig");
    const avatarPov = DOM_ROOT.getElementById("avatar-pov-node");
    const scene = DOM_ROOT.querySelector("a-scene");

    positionTrackerInterval = setInterval(() => {
      if (!scene.isPlaying) return;

      avatarRig.object3D.getWorldPosition(position);
      avatarPov.object3D.getWorldQuaternion(rotation);

      hubStore.update({
        lastPosition: { x: position.x, y: position.y, z: position.z },
        lastRotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }
      });
    }, 1000);
  };
})();

async function updateEnvironmentForHub(hub) {
  DOM_ROOT.querySelector(".a-canvas").classList.remove("a-hidden");

  SYSTEMS.terrainSystem.updateWorldForHub(hub);
  SYSTEMS.atmosphereSystem.updateAtmosphereForHub(hub);
}

async function moveToInitialHubLocationAndBeginPeriodicSyncs(hub, hubStore) {
  const sceneEl = DOM_ROOT.querySelector("a-scene");

  const characterController = sceneEl.systems["hubs-systems"].characterController;

  let startPosition, startRotation;

  if (hubStore.state.lastPosition.x === undefined) {
    // Random scatter in x z radially
    const randomDirection = new THREE.Vector3(-1 + Math.random() * 2.0, 0, -1 + Math.random() * 2.0);
    randomDirection.normalize();

    // Spawn point is centered based upon hub setting, and random pick from radius
    startPosition = new THREE.Vector3(
      hub.spawn_point.position.x + randomDirection.x * hub.spawn_point.radius,
      hub.spawn_point.position.y,
      hub.spawn_point.position.z + randomDirection.z * hub.spawn_point.radius
    );

    startRotation = new THREE.Quaternion(
      hub.spawn_point.rotation.x,
      hub.spawn_point.rotation.y,
      hub.spawn_point.rotation.z,
      hub.spawn_point.rotation.w
    );
  } else {
    startPosition = new THREE.Vector3(
      hubStore.state.lastPosition.x,
      hubStore.state.lastPosition.y,
      hubStore.state.lastPosition.z
    );

    startRotation = new THREE.Quaternion(
      hubStore.state.lastRotation.x,
      hubStore.state.lastRotation.y,
      hubStore.state.lastRotation.z,
      hubStore.state.lastRotation.w
    );
  }

  if (isBotMode) {
    // Bot spawns at semi-random position
    startPosition.x = -31 + Math.random() * 63;
    startPosition.z = -31 + Math.random() * 63;
  } else {
    startTrackingPosition(hubStore);
  }

  characterController.teleportTo(startPosition, startRotation);

  restartPeriodicSyncs();
}

const createHubChannelParams = () => {
  const params = {
    auth_token: null,
    perms_token: null,
    is_first_shared_world: false
  };

  const { token } = window.APP.store.state.credentials;
  if (token) {
    params.auth_token = token;
  }

  return params;
};

function updateUIForHub(isTransition, hub, hubChannel, remountJelUI) {
  if (isTransition) {
    const neon = DOM_ROOT.querySelector("#neon");
    const canvas = DOM_ROOT.querySelector(".a-canvas");

    if (hub.type === "world") {
      neon.classList.remove("visible");
      UI.classList.add("hub-type-world");
      UI.classList.remove("hub-type-channel");
      canvas.focus();
    } else {
      neon.classList.add("visible");
      UI.classList.add("hub-type-channel");
      UI.classList.remove("hub-type-world");
      neon.focus();
    }

    window.APP.matrix.switchToHub(hub);
  }

  remountJelUI({ hub });
}

const updateSceneStateForHub = (() => {
  // When we switch to a channel from a world, we mute the mic,
  // and for convenience restore it to being unmuted the next
  // time we go into a world.
  let wasMutedOnLastChannelEntry = true;

  return hub => {
    const scene = DOM_ROOT.querySelector("a-scene");

    if (hub.type === "world") {
      scene.removeState("off");
      scene.classList.add("visible");

      if (wasMutedOnLastChannelEntry) {
        wasMutedOnLastChannelEntry = false;
        scene.emit("action_mute");
      }
    } else {
      if (scene.is("unmuted")) {
        wasMutedOnLastChannelEntry = true;
        scene.emit("action_mute");
      }

      scene.classList.remove("visible");
      scene.addState("off");

      SYSTEMS.videoBridgeSystem.exitBridge();
    }
  };
})();

const initHubPresence = async presence => {
  const scene = DOM_ROOT.querySelector("a-scene");
  const { hubChannel } = window.APP;

  await new Promise(res => {
    presence.onSync(() => {
      const presence = hubChannel.presence;

      const sessionIds = Object.getOwnPropertyNames(presence.state);
      const occupantCount = sessionIds.length;

      if (occupantCount > 1) {
        scene.addState("copresent");
      } else {
        scene.removeState("copresent");
      }

      scene.emit("hub-presence-synced");

      res();
    });
  });
};

const setupDataChannelMessageHandlers = () => {
  const scene = DOM_ROOT.querySelector("a-scene");
  const projectileSystem = scene.systems["hubs-systems"].projectileSystem;

  const messages = getMessages();

  const getName = clientId => {
    const presenceState = NAF.connection.getPresenceStateForClientId(clientId);
    if (presenceState) {
      return presenceState.profile.displayName;
    } else {
      return messages["chat.default-name"];
    }
  };

  NAF.connection.subscribeToDataChannel("chat", (_type, { body }, fromSessionId) => {
    const name = getName(fromSessionId);

    scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CHAT_MESSAGE);

    scene.emit("chat_log_entry", { name, type: "chat", body, posted_at: performance.now() });
  });

  NAF.connection.subscribeToDataChannel("reactji", (_type, { to_session_id, body }, fromSessionId) => {
    const name = getName(fromSessionId);
    const toName = getName(to_session_id);

    scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CHAT_MESSAGE);
    scene.emit("chat_log_entry", { name, toName, type: "reactji", body, posted_at: performance.now() });
  });

  NAF.connection.subscribeToDataChannel("emoji_launch", (_type, { body }, fromSessionId) => {
    if (!scene.isPlaying) return;
    if (fromSessionId === NAF.clientId) return;
    projectileSystem.replayEmojiSpawnerProjectile(body);
  });

  NAF.connection.subscribeToDataChannel("emoji_burst", (_type, { body }, fromSessionId) => {
    if (!scene.isPlaying) return;
    if (fromSessionId === NAF.clientId) return;
    projectileSystem.replayEmojiBurst(body);
  });
};

const joinHubChannel = (hubPhxChannel, hubStore, entryManager, remountJelUI) => {
  const isInitialJoin = true;
  const { hubChannel } = window.APP;

  const hub = {
    description: null,
    embed_token: null,
    entry_code: 268661,
    entry_mode: "allow",
    hub_id: "fU8ox2d",
    is_home: false,
    lobby_count: 0,
    member_count: 0,
    name: "Conference Props",
    roles: { space: "editor" },
    room_size: 24,
    scene: null,
    slug: "conference-props",
    space_id: "tKod5",
    spawn_point: { position: { x: 0, y: 0, z: 0 }, radius: 10, rotation: { w: 1, x: 0, y: 0, z: 0 } },
    template: { hash: null, name: null, synced_at: null },
    type: "world",
    url: "https://hubs.local:4000/conference-props-tKod5fU8ox2d",
    user_data: null,
    world: {
      bark_color_b: 0.12156862745098039,
      bark_color_g: 0.20784313725490197,
      bark_color_r: 0.3333333333333333,
      edge_color_b: 0.07450980392156863,
      edge_color_g: 0.11372549019607843,
      edge_color_r: 0.1568627450980392,
      grass_color_b: 0.10588235294117647,
      grass_color_g: 0.5450980392156862,
      grass_color_r: 0.7254901960784313,
      ground_color_b: 0.14901960784313725,
      ground_color_g: 0.2823529411764706,
      ground_color_r: 0.35294117647058826,
      leaves_color_b: 0.6,
      leaves_color_g: 0.22745098039215686,
      leaves_color_r: 0.7254901960784313,
      rock_color_b: 0.47843137254901963,
      rock_color_g: 0.47843137254901963,
      rock_color_r: 0.47843137254901963,
      seed: 64,
      sky_color_b: 0.8117647058823529,
      sky_color_g: 0.6392156862745098,
      sky_color_r: 0.5411764705882353,
      type: 3,
      water_color_b: 0.47843137254901963,
      water_color_g: 0.22745098039215686,
      water_color_r: 0
    },
    world_template_id: null
  };

  return new Promise(joinFinished => {
    // TODO shared, deal with perms
    //hubChannel.setPermissionsFromToken(permsToken);
    hubChannel.dispatchEvent(new CustomEvent("permissions_updated", {}));

    if (!isInitialJoin) {
      // Send complete sync on phoenix re-join.
      NAF.connection.entities.completeSync(null, true);
    }

    const scene = DOM_ROOT.querySelector("a-scene");

    // Wait for scene objects to load before connecting, so there is no race condition on network state.
    document.title = `${hub.name}`;

    // Note that scene state needs to be updated before UI because focus handler will often fire
    // which assumes scene state is set already to "off" for channels.
    updateSceneStateForHub(hub);

    updateUIForHub(true, hub, hubChannel, remountJelUI);
    updateEnvironmentForHub(hub);

    // Reset inspect if we switched while inspecting
    SYSTEMS.cameraSystem.uninspect();

    THREE.Cache.clear();

    // Clear voxmojis from prior world
    SYSTEMS.voxmojiSystem.clear();

    SYSTEMS.atmosphereSystem.restartAmbience();

    // Free memory from voxel editing undo stacks.
    SYSTEMS.builderSystem.clearUndoStacks();
    SYSTEMS.undoSystem.clearUndoStacks();

    clearVoxAttributePools();

    clearResolveUrlCache();

    moveToInitialHubLocationAndBeginPeriodicSyncs(hub, hubStore);

    const joinPromise = new Promise(res => document.body.addEventListener("connected", res, { once: true }));

    if (!isInitialJoin) {
      // TODO disconnect
    }

    const handle = evt => {
      if (evt.detail.name !== "networked-scene");
      scene.removeEventListener("componentinitialized", handle);
      scene.components["networked-scene"].connect();
    };

    setupDataChannelMessageHandlers();

    scene.addEventListener("componentinitialized", handle);

    scene.setAttribute("networked-scene", {
      audio: true,
      connectOnLoad: false,
      room: hub.hub_id,
      adapter: "p2pcf",
      app: "jel",
      debug: !!isDebug
    });

    const connectionErrorTimeout = setTimeout(() => {
      console.error("Unknown error occurred while attempting to connect to networked scene.");
      remountJelUI({ unavailableReason: "connect_error" });
      entryManager.exitScene();
    }, 90000);

    joinPromise.then(() => {
      clearTimeout(connectionErrorTimeout);
      scene.emit("didConnectToNetworkedScene");
      joinFinished(true);
    });
  });
};

const setupHubChannelMessageHandlers = (hubPhxChannel, hubStore, entryManager, history, remountJelUI) => {
  const scene = DOM_ROOT.querySelector("a-scene");
  const { hubChannel, spaceChannel } = window.APP;

  // Avoid updating the history frequently, as users type new hub names
  let historyReplaceTimeout = null;

  hubPhxChannel.on("hub_refresh", ({ hubs, stale_fields }) => {
    const hub = hubs[0];

    // Special case: don't do anything, we rely upon the metadata subscriptions to quickly update
    // references to hub names + icon in-place.
    const isJustLabel = isSetEqual(new Set(["name"]), new Set(stale_fields));

    if (!isJustLabel) {
      updateUIForHub(false, hub, hubChannel, remountJelUI);

      if (stale_fields.includes("roles")) {
        hubChannel.fetchPermissions();
        spaceChannel.fetchPermissions();
      }

      if (hub.entry_mode === "deny") {
        scene.emit("hub_closed");
      }
    }

    if (stale_fields.includes("name")) {
      const titleParts = document.title.split(" | "); // Assumes title has | trailing site name
      titleParts[0] = hub.name;
      document.title = titleParts.join(" | ");

      const pathParts = history.location.pathname.split("/");
      const { search, state } = history.location;
      const pathname = history.location.pathname.replace(
        `/${pathParts[1]}`,
        `/${hub.slug}-${hub.space_id}${hub.hub_id}`
      );

      if (historyReplaceTimeout) {
        clearTimeout(historyReplaceTimeout);
      }

      historyReplaceTimeout = setTimeout(() => history.replace({ pathname, search, state }), 1000);
    }
  });

  hubPhxChannel.on("mute", ({ session_id }) => {
    if (session_id === NAF.clientId && scene.is("unmuted")) {
      scene.emit("action_mute");
    }
  });
};

const initPresence = (function() {
  const lastPostedDisplayNames = new Map();
  const presenceIdToClientId = new Map();

  return presence => {
    const { store } = window.APP;
    const scene = DOM_ROOT.querySelector("a-scene");

    store.addEventListener("profilechanged", () => {
      presence.setLocalStateField("profile", store.state.profile);
    });

    const postJoinOrNameChange = (clientId, displayName) => {
      const isSelf = clientId === NAF.clientId;

      if (!lastPostedDisplayNames.has(clientId)) {
        if (!isSelf) {
          scene.emit("chat_log_entry", {
            type: "join",
            name: displayName,
            posted_at: performance.now()
          });
        }
      } else if (lastPostedDisplayNames.get(clientId) !== displayName) {
        scene.emit("chat_log_entry", {
          type: "display_name_changed",
          oldName: lastPostedDisplayNames.get(clientId),
          name: displayName,
          posted_at: performance.now()
        });
      }

      lastPostedDisplayNames.set(clientId, displayName);
    };

    presence.on("change", ({ added, updated, removed }) => {
      const { states } = presence;

      for (const addedId of added) {
        const state = states.get(addedId);
        const { client_id: clientId, profile } = state;
        if (!clientId) continue;

        presenceIdToClientId.set(addedId, clientId);

        if (profile?.displayName && states.size <= NOISY_OCCUPANT_COUNT) {
          postJoinOrNameChange(clientId, profile.displayName);
        }

        scene.emit("client-presence-updated", { ...state, clientId });
      }

      for (const updateId of updated) {
        const state = states.get(updateId);
        const { client_id: clientId, profile } = state;
        if (!clientId) continue;

        presenceIdToClientId.set(updateId, clientId);

        if (profile?.displayName && states.size <= NOISY_OCCUPANT_COUNT) {
          postJoinOrNameChange(clientId, profile.displayName);
        }

        scene.emit("client-presence-updated", { ...state, clientId });
      }

      for (const removeId of removed) {
        if (!presenceIdToClientId.has(removeId)) continue;
        const clientId = presenceIdToClientId.get(removeId);

        if (lastPostedDisplayNames.has(clientId)) {
          scene.emit("chat_log_entry", {
            type: "leave",
            name: lastPostedDisplayNames.get(clientId),
            posted_at: performance.now()
          });
        }

        presenceIdToClientId.delete(removeId);
        lastPostedDisplayNames.delete(clientId);
      }

      scene.emit("presence-synced", {});
    });

    presence.setLocalStateField("profile", store.state.profile);

    scene.addEventListener("client-presence-updated", ({ detail: { clientId } }) => {
      SYSTEMS.avatarSystem.markPersonaAvatarDirty(clientId);
      SYSTEMS.skyBeamSystem.markColorDirtyForCreator(clientId);
    });
  };
})();

export function setupTreeManagers(socket, history, subscriptions, entryManager, remountJelUI) {
  const spaceId = getSpaceIdFromHistory(history);
  const { spaceMetadata, hubMetadata } = window.APP;
  console.log(`Space ID: ${spaceId}`);

  const treeManager = new TreeManager(spaceMetadata, hubMetadata);
  const voxTree = new MediaTree("vox");
  const sceneTree = new MediaTree("world_templates");

  voxTree.build();
  sceneTree.build();

  document.body.addEventListener(
    "connected",
    async ({ detail: { connection, presence } }) => {
      initPresence(presence);

      await treeManager.init(connection);

      remountJelUI({ history, treeManager, voxTree, sceneTree });
    },
    { once: true }
  );

  treeManager.setSpaceCollectionId(spaceId);
}

export async function joinHub(scene, socket, history, entryManager, remountJelUI) {
  const { store, hubChannel } = window.APP;

  const spaceId = getSpaceIdFromHistory(history);
  const hubId = getHubIdFromHistory(history);
  console.log(`Hub ID: ${hubId}`);

  const hubStore = new HubStore(hubId);
  const params = createHubChannelParams();

  const hubPhxChannel = socket.channel(`hub:${hubId}`, params);

  stopTrackingPosition();
  setupHubChannelMessageHandlers(hubPhxChannel, hubStore, entryManager, history, remountJelUI);

  hubChannel.bind(hubPhxChannel, hubId);

  if (NAF.connection.adapter) {
    NAF.connection.adapter.leaveRoom(true);
  }

  const joinSuccessful = await joinHubChannel(hubPhxChannel, hubStore, entryManager, remountJelUI);

  if (joinSuccessful) {
    store.setLastJoinedHubId(spaceId, hubId);
  } else {
    const initialHubForSpaceId = getInitialHubForSpaceId(spaceId);

    // Failed to join initial hub, remove this entry so we don't end up trying to go here again.
    if (hubId === initialHubForSpaceId) {
      store.clearLastJoinedHubId(spaceId);
    }
  }
}

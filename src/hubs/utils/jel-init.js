import TreeManager from "../../jel/utils/tree-manager";
import { getHubIdFromHistory, getSpaceIdFromHistory } from "../../jel/utils/jel-url-utils";
import { getInitialHubForSpaceId } from "../../jel/utils/membership-utils";
import { getMessages } from "./i18n";
import { SOUND_CHAT_MESSAGE } from "../systems/sound-effects-system";
import qsTruthy from "./qs_truthy";
import HubStore from "../storage/hub-store";
import MediaTree from "../../jel/utils/media-tree";
import { clearVoxAttributePools } from "../../jel/objects/JelVoxBufferGeometry";
import { restartPeriodicSyncs } from "../components/periodic-full-syncs";
import { toByteArray as base64ToByteArray } from "base64-js";
import { pushHubMetaUpdateIntoDOM } from "../../jel/utils/dom-utils";
import WorldImporter from "../../jel/utils/world-importer";

import crypto from "crypto";

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

function updateUIForHub(hub, remountJelUI) {
  const canvas = DOM_ROOT.querySelector(".a-canvas");

  canvas.focus();

  remountJelUI({ hub });
}

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

  const { atomAccessManager } = window.APP;

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

  NAF.connection.subscribeToDataChannel("update_hub_meta", (_type, { body: hub }, fromSessionId) => {
    const { atomAccessManager } = window.APP;
    if (!atomAccessManager.hubCan("update_hub_meta", null /* hubId */, fromSessionId)) return;

    // When hub is updated, update meta tags
    pushHubMetaUpdateIntoDOM(hub);
  });

  // Public key verification
  //
  const clientIdChallenges = new Map();

  // When a client connects, send the challenge to verify their public key
  document.body.addEventListener("clientConnected", ({ detail: { clientId } }) => {
    const challenge = crypto.randomBytes(20).toString("hex");
    clientIdChallenges.set(clientId, challenge);
    window.APP.hubChannel.sendMessage(challenge, "challenge", clientId);
  });

  NAF.connection.subscribeToDataChannel("challenge", async (_type, { body: challenge }, fromClientId) => {
    const { challengeSignature, clientIdSignature } = await atomAccessManager.getChallengeResponse(challenge);
    const response = {
      publicKey: window.APP.store.state.credentials.public_key,
      challengeSignature,
      clientIdSignature
    };
    window.APP.hubChannel.sendMessage(response, "challenge_response", fromClientId);
  });

  NAF.connection.subscribeToDataChannel(
    "challenge_response",
    async (
      _type,
      {
        body: {
          publicKey: publicKey,
          challengeSignature: challengeSignatureBase64,
          clientIdSignature: clientIdSignatureBase64
        }
      },
      fromClientId
    ) => {
      const challenge = clientIdChallenges.get(fromClientId);
      if (!challenge) return;

      const challengeSignature = base64ToByteArray(challengeSignatureBase64);
      const clientIdSignature = base64ToByteArray(clientIdSignatureBase64);

      atomAccessManager.verifyChallengeResponse(
        new TextEncoder().encode(challenge),
        publicKey,
        challengeSignature,
        clientIdSignature,
        new TextEncoder().encode(fromClientId)
      );
    }
  );
};

const joinHubChannel = (hubId, spaceId, hubStore, hubMetadata, entryManager, remountJelUI, initialWorldHTML) => {
  const isInitialJoin = true;
  const { atomAccessManager } = window.APP;

  return new Promise(joinFinished => {
    hubMetadata.getOrFetchMetadata(hubId).then(async hub => {
      atomAccessManager.dispatchEvent(new CustomEvent("permissions_updated", {}));

      if (!isInitialJoin) {
        NAF.connection.entities.completeSync(null, true);
      }

      const scene = DOM_ROOT.querySelector("a-scene");

      // Note that scene state needs to be updated before UI because focus handler will often fire
      // which assumes scene state is set already to "off" for channels.
      scene.removeState("off");
      scene.classList.add("visible");

      const hubId = hub.hub_id;

      hubMetadata.subscribeToMetadata(hubId, () => {
        const hub = hubMetadata?.getMetadata(hubId);
        // TODO SHARED - handle special case here when just name is changed, to avoid remounting whole UI
        updateUIForHub(hub, remountJelUI);
        updateEnvironmentForHub(hub);
      });

      updateUIForHub(hub, remountJelUI);
      updateEnvironmentForHub(hub);

      if (initialWorldHTML) {
        // Careful - don't begin processing networking packets until the world has imported to avoid
        // race conditions on objects that were updated by peers
        scene.systems.networked.pause();

        new WorldImporter().importHtmlToCurrentWorld(initialWorldHTML, true, true).then(() => {
          scene.systems.networked.play();
        });
      }

      SYSTEMS.terrainSystem.startAutoLoadingChunks();

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

      moveToInitialHubLocationAndBeginPeriodicSyncs(hub, hubStore);

      const joinPromise = new Promise(res => document.body.addEventListener("connected", res, { once: true }));

      if (!isInitialJoin) {
        // TODO unplug writeback first, so DOM doesn't get written during teardown
        // TODO disconnect
      }

      const handle = evt => {
        if (evt.detail.name !== "networked-scene");
        scene.removeEventListener("componentinitialized", handle);
        scene.components["networked-scene"].connect();
      };

      setupDataChannelMessageHandlers();
      scene.addEventListener("componentinitialized", handle);

      // Hacky for now, put the worker URL into a global
      window.APP.workerUrl = hub.worker_url;

      if (hub.cors_anywhere_url) {
        window.APP.corsAnywhereUrl = hub.cors_anywhere_url;
      }

      scene.setAttribute("networked-scene", {
        audio: true,
        connectOnLoad: false,
        room: hub.hub_id,
        adapter: "p2pcf",
        app: "webspace",
        adapterOptions: { workerUrl: hub.worker_url },
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

export async function setupTreeManagers(history, entryManager, remountJelUI) {
  const spaceId = await getSpaceIdFromHistory(history);
  const { spaceMetadata, hubMetadata } = window.APP;
  console.log(`Space ID: ${spaceId}`);

  const treeManager = new TreeManager(spaceMetadata, hubMetadata);
  const voxTree = new MediaTree("vox");
  const sceneTree = new MediaTree("world_templates");

  // TODO SHARED
  // voxTree.build();
  // sceneTree.build();

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

export async function joinHub(scene, history, entryManager, remountJelUI, initialWorldHTML) {
  const { store, hubChannel, hubMetadata, atomAccessManager } = window.APP;

  const spaceId = await getSpaceIdFromHistory(history);
  const hubId = await getHubIdFromHistory(history);
  console.log(`Hub ID: ${hubId}`);

  const hubStore = new HubStore(hubId);

  stopTrackingPosition();

  hubChannel.bind(hubId);
  atomAccessManager.setCurrentHubId(hubId);

  if (NAF.connection.adapter) {
    NAF.connection.adapter.leaveRoom(true);
  }

  const joinSuccessful = await joinHubChannel(
    hubId,
    spaceId,
    hubStore,
    hubMetadata,
    entryManager,
    remountJelUI,
    initialWorldHTML
  );

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

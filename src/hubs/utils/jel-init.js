import TreeManager from "../../jel/utils/tree-manager";
import { getHubIdFromHistory, getSpaceIdFromHistory } from "../../jel/utils/jel-url-utils";
import nextTick from "./next-tick";
import { isSetEqual } from "../../jel/utils/set-utils";
import { homeHubForSpaceId, getInitialHubForSpaceId } from "../../jel/utils/membership-utils";
import { clearResolveUrlCache } from "./media-utils";
import { addNewHubToTree } from "../../jel/utils/tree-utils";
import { getMessages } from "./i18n";
import { SOUND_CHAT_MESSAGE } from "../systems/sound-effects-system";
import { navigateToHubUrl } from "../../jel/utils/jel-url-utils";
import qsTruthy from "./qs_truthy";
import { getReticulumMeta, invalidateReticulumMeta, connectToReticulum } from "./phoenix-utils";
import HubStore from "../storage/hub-store";
import MediaTree from "../../jel/utils/media-tree";
import WorldImporter from "../../jel/utils/world-importer";
import { getHtmlForTemplate, applyTemplate } from "../../jel/utils/template-utils";
import { clearVoxAttributePools } from "../../jel/objects/JelVoxBufferGeometry";
import { restartPeriodicSyncs } from "../components/periodic-full-syncs";

const NOISY_OCCUPANT_COUNT = 12; // Above this # of occupants, we stop posting join/leaves/renames

const isDebug = qsTruthy("debug");
const isBotMode = qsTruthy("bot");
const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobileVR();

let dynaDeployReconnectInterval;
let positionTrackerInterval = null;

const dynaReconnectMaxDelayMs = 15000;
const stopTrackingPosition = () => clearInterval(positionTrackerInterval);

const startTrackingPosition = (() => {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  return hubStore => {
    stopTrackingPosition();
    const avatarRig = document.getElementById("avatar-rig");
    const avatarPov = document.getElementById("avatar-pov-node");
    const scene = document.querySelector("a-scene");

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
  document.querySelector(".a-canvas").classList.remove("a-hidden");

  SYSTEMS.terrainSystem.updateWorldForHub(hub);
  SYSTEMS.atmosphereSystem.updateAtmosphereForHub(hub);
}

async function moveToInitialHubLocationAndBeginPeriodicSyncs(hub, hubStore) {
  const sceneEl = document.querySelector("a-scene");

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

const createDynaChannelParams = () => {
  const store = window.APP.store;

  const params = {};

  const { token } = store.state.credentials;
  if (token) {
    params.auth_token = token;
  }

  return params;
};

const createSpaceChannelParams = () => {
  const store = window.APP.store;
  const scene = AFRAME.scenes[0];

  const params = {
    profile: store.state.profile,
    auth_token: null,
    perms_token: null,
    context: {
      mobile: isMobile || isMobileVR
    },
    unmuted: !!(scene && scene.is("unmuted"))
  };

  if (isMobileVR) {
    params.context.hmd = true;
  }

  const { token } = store.state.credentials;
  if (token) {
    params.auth_token = token;
  }

  return params;
};

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

const migrateToNewDynaServer = async deployNotification => {
  const { dynaChannel } = window.APP;

  // On Reticulum deploys, reconnect after a random delay until pool + version match deployed version/pool
  console.log(`Dyna deploy detected on ${deployNotification.dyna_pool}`);
  clearInterval(dynaDeployReconnectInterval);

  await new Promise(res => {
    setTimeout(() => {
      const tryReconnect = async () => {
        invalidateReticulumMeta();
        const reticulumMeta = await getReticulumMeta();

        if (
          reticulumMeta.pool === deployNotification.dyna_pool &&
          reticulumMeta.version === deployNotification.dyna_version
        ) {
          console.log("Dyna reconnecting.");
          clearInterval(dynaDeployReconnectInterval);
          const socket = dynaChannel.channel.socket;
          await new Promise(res => socket.disconnect(res));
          await connectToReticulum(isDebug, socket.params(), null, socket);

          res();
        }
      };

      dynaDeployReconnectInterval = setInterval(tryReconnect, 5000);
      tryReconnect();
    }, Math.floor(Math.random() * dynaReconnectMaxDelayMs));
  });
};

function updateUIForHub(isTransition, hub, hubChannel, remountUI, remountJelUI) {
  if (isTransition) {
    const neon = document.querySelector("#neon");
    const canvas = document.querySelector(".a-canvas");
    const jelInterface = document.querySelector("#jel-interface");

    if (hub.type === "world") {
      neon.classList.remove("visible");
      jelInterface.classList.add("hub-type-world");
      jelInterface.classList.remove("hub-type-channel");
      canvas.focus();
    } else {
      neon.classList.add("visible");
      jelInterface.classList.add("hub-type-channel");
      jelInterface.classList.remove("hub-type-world");
      neon.focus();
    }

    window.APP.matrix.switchToHub(hub);
  }

  remountUI({ hub, entryDisallowed: !hubChannel.canEnterRoom(hub) });
  remountJelUI({ hub });
}

const updateSceneStateForHub = (() => {
  // When we switch to a channel from a world, we mute the mic,
  // and for convenience restore it to being unmuted the next
  // time we go into a world.
  let wasMutedOnLastChannelEntry = true;

  return hub => {
    const scene = document.querySelector("a-scene");

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

const joinSpaceChannel = async (spacePhxChannel, entryManager, treeManager, remountUI, remountJelUI) => {
  const scene = document.querySelector("a-scene");
  const { store, spaceChannel, hubMetadata } = window.APP;

  let isInitialJoin = true;

  const socket = spacePhxChannel.socket;

  await new Promise(joinFinished => {
    spacePhxChannel
      .join()
      .receive("ok", async data => {
        const sessionId = (socket.params().session_id = data.session_id);

        socket.params().session_token = data.session_token;

        remountUI({ sessionId });
        remountJelUI({ sessionId });

        if (isInitialJoin) {
          // Bind hub metadata which will cause metadata queries to start
          // going to new channel (and re-run in-flight ones.)
          hubMetadata.bind(spaceChannel);

          // Disconnect + reconnect NAF unless this is a re-join

          // Disconnect AFrame if already connected
          scene.removeAttribute("networked-scene");

          // Allow disconnect cleanup
          await nextTick();
        }

        const permsToken = data.perms_token;
        spaceChannel.setPermissionsFromToken(permsToken);

        if (!isInitialJoin) {
          joinFinished();
          return;
        }

        isInitialJoin = false;

        const space = data.spaces[0];
        const spaceId = space.space_id;
        const accountId = store.credentialsAccountId;

        treeManager.setAccountCollectionId(accountId);
        treeManager.setSpaceCollectionId(spaceId);

        joinFinished();
      })
      .receive("error", res => {
        if (res.reason === "closed") {
          entryManager.exitScene();
          remountJelUI({ unavailableReason: "closed" });
        } else if (res.reason === "join_denied") {
          entryManager.exitScene();
          remountJelUI({ unavailableReason: "denied" });
        }

        console.error(res);
        joinFinished();
      });
  });
};

const initHubPresence = async presence => {
  const scene = document.querySelector("a-scene");
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

let updateTitleAndWorldForHubHandler;

const setupDataChannelMessageHandlers = () => {
  const scene = document.querySelector("a-scene");
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

const joinHubChannel = (hubPhxChannel, hubStore, entryManager, remountUI, remountJelUI) => {
  let isInitialJoin = true;
  const { spaceChannel, hubChannel, spaceMetadata, hubMetadata, matrix } = window.APP;

  return new Promise(joinFinished => {
    hubPhxChannel
      .join()
      .receive("ok", async data => {
        const hub = data.hubs[0];
        const isWorld = hub.type === "world";

        const presence = hubChannel.presence;
        const permsToken = data.perms_token;
        hubChannel.setPermissionsFromToken(permsToken);

        if (isInitialJoin) {
          await initHubPresence(presence);
        } else {
          if (isWorld) {
            // Send complete sync on phoenix re-join.
            NAF.connection.entities.completeSync(null, true);
          }
        }

        const scene = document.querySelector("a-scene");

        spaceChannel.sendJoinedHubEvent(hub.hub_id);

        if (!isInitialJoin) {
          // Slight hack, to ensure correct presence state we need to re-send the entry event
          // on re-join. Ideally this would be updated into the channel socket state but this
          // would require significant changes to the space channel events and socket management.
          spaceChannel.sendEnteredHubEvent();
        }

        // Wait for scene objects to load before connecting, so there is no race condition on network state.
        await new Promise(res => {
          if (updateTitleAndWorldForHubHandler) {
            hubMetadata.unsubscribeFromMetadata(updateTitleAndWorldForHubHandler);
          }
          updateTitleAndWorldForHubHandler = (updatedIds, hubMetadata) => {
            const metadata = hubMetadata && hubMetadata.getMetadata(hub.hub_id);

            if (metadata) {
              document.title = `${metadata.displayName} | Jel`;
            } else {
              document.title = `Jel`;
            }

            updateEnvironmentForHub(metadata);
          };
          hubMetadata.subscribeToMetadata(hub.hub_id, updateTitleAndWorldForHubHandler);
          updateTitleAndWorldForHubHandler([hub.hub_id], hubMetadata);
          hubMetadata.ensureMetadataForIds([hub.hub_id]);

          // Note that scene state needs to be updated before UI because focus handler will often fire
          // which assumes scene state is set already to "off" for channels.
          updateSceneStateForHub(hub);

          updateUIForHub(true, hub, hubChannel, remountUI, remountJelUI);
          updateEnvironmentForHub(hub);

          if (hub.type === "world") {
            // Worlds don't show neon so we should mark all events as read as needed.
            matrix.markRoomForHubIdAsFullyRead(hub.hub_id);
          }

          if (isInitialJoin) {
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

            // If this is not a world, skip connecting to NAF
            if (!isWorld) {
              res();
              return;
            }

            moveToInitialHubLocationAndBeginPeriodicSyncs(hub, hubStore);

            const joinPromise = new Promise(res => document.body.addEventListener("connected", res, { once: true }));

            if (isInitialJoin) {
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
            } else {
              NAF.connection.adapter.joinRoom(hub.hub_id);
            }

            const connectionErrorTimeout = setTimeout(() => {
              console.error("Unknown error occurred while attempting to connect to networked scene.");
              remountJelUI({ unavailableReason: "connect_error" });
              entryManager.exitScene();
            }, 90000);

            joinPromise
              .then(() => {
                if (isInitialJoin) {
                  if (hub.template && hub.template.name) {
                    const { name, synced_at, hash } = hub.template;
                    return applyTemplate(name, synced_at, hash);
                  } else {
                    return Promise.resolve();
                  }
                } else {
                  return Promise.resolve();
                }
              })
              .then(() => {
                clearTimeout(connectionErrorTimeout);
                scene.emit("didConnectToNetworkedScene");
              })
              .then(res);
          }
        });

        isInitialJoin = false;
        joinFinished(true);
      })
      .receive("error", res => {
        if (res.reason === "closed") {
          entryManager.exitScene();
          remountJelUI({ unavailableReason: "closed" });
        } else if (res.reason === "join_denied") {
          entryManager.exitScene();

          // Check if we can invite ourselves to the space.
          spaceMetadata.getOrFetchMetadata(spaceChannel.spaceId).then(async ({ permissions: { create_invite } }) => {
            if (create_invite) {
              // Kind of hacky, get hub id and create new space channel.
              const spaceId = spaceChannel.spaceId;
              const hubId = hubPhxChannel.topic.split(":")[1];

              const socket = await connectToReticulum();

              const spacePhxChannel = socket.channel(spaceChannel.channel.topic, createSpaceChannelParams());

              spacePhxChannel.join().receive("ok", async () => {
                spaceChannel.bind(spacePhxChannel, spaceId);
                document.location = await spaceChannel.createInvite(hubId);
              });
            } else {
              remountJelUI({ unavailableReason: "denied" });
            }
          });
        }

        joinFinished(false);
      });
  });
};

const setupSpaceChannelMessageHandlers = spacePhxChannel => {
  const { spaceChannel, hubChannel } = window.APP;

  spacePhxChannel.on("permissions_updated", () => {
    spaceChannel.fetchPermissions();
    hubChannel.fetchPermissions();
  });
};

const setupHubChannelMessageHandlers = (hubPhxChannel, hubStore, entryManager, history, remountUI, remountJelUI) => {
  const scene = document.querySelector("a-scene");
  const { hubChannel, spaceChannel } = window.APP;

  // Avoid updating the history frequently, as users type new hub names
  let historyReplaceTimeout = null;

  hubPhxChannel.on("hub_refresh", ({ hubs, stale_fields }) => {
    const hub = hubs[0];

    // Special case: don't do anything, we rely upon the metadata subscriptions to quickly update
    // references to hub names + icon in-place.
    const isJustLabel = isSetEqual(new Set(["name"]), new Set(stale_fields));

    if (!isJustLabel) {
      updateUIForHub(false, hub, hubChannel, remountUI, remountJelUI);

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

// Dirty flag used to pass is_first_shared=true to hub join, which is used to trigger
// notifications.
let hasJoinedPublicWorldForCurrentSpace;

const initPresence = (function() {
  const lastPostedDisplayNames = new Map();
  const presenceIdToClientId = new Map();

  return presence => {
    const { store } = window.APP;
    const scene = document.querySelector("a-scene");

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

export function joinSpace(socket, history, subscriptions, entryManager, remountUI, remountJelUI, membershipsPromise) {
  const spaceId = getSpaceIdFromHistory(history);
  const { dynaChannel, spaceChannel, spaceMetadata, hubMetadata, store } = window.APP;
  console.log(`Space ID: ${spaceId}`);

  const dynaPhxChannel = socket.channel(`dyna`, createDynaChannelParams());
  dynaPhxChannel
    .join()
    .receive("ok", async data => subscriptions.setVapidPublicKey(data.vapid_public_key))
    .receive("error", res => console.error(res));

  dynaPhxChannel.on("notice", async data => {
    // On dyna deploys, reconnect after a random delay until pool + version match deployed version/pool
    if (data.event === "dyna-deploy") {
      await migrateToNewDynaServer(data);
    }
  });
  dynaChannel.bind(dynaPhxChannel);

  spaceMetadata.bind(dynaChannel);

  const spacePhxChannel = socket.channel(`space:${spaceId}`, createSpaceChannelParams());
  setupSpaceChannelMessageHandlers(spacePhxChannel, entryManager);
  spaceChannel.bind(spacePhxChannel, spaceId);

  hasJoinedPublicWorldForCurrentSpace = false;

  const treeManager = new TreeManager(spaceMetadata, hubMetadata);
  const voxTree = new MediaTree("vox");
  const sceneTree = new MediaTree("world_templates");

  voxTree.build();
  sceneTree.build();

  document.body.addEventListener(
    "connected",
    async ({ detail: { connection, presence } }) => {
      initPresence(presence);

      const memberships = await membershipsPromise;
      await treeManager.init(connection, memberships);
      const homeHub = homeHubForSpaceId(spaceId, memberships);
      hubMetadata.ensureMetadataForIds([homeHub.hub_id]);

      if (store.state.context.isFirstVisitToSpace) {
        const hubs = {};

        // First time space setup, create initial public channels + worlds. TODO do this server-side.
        await addNewHubToTree(treeManager, spaceId, "channel", null, "General Discussion");
        await addNewHubToTree(treeManager, spaceId, "channel", null, "Random");

        for (const world of ["first"]) {
          const name = getMessages()[`space.${world}-world-name`];
          const templateName = world;
          const html = getHtmlForTemplate(templateName);
          const [
            worldType,
            worldSeed,
            worldColors,
            spawnPosition,
            spawnRotation,
            spawnRadius
          ] = new WorldImporter().getWorldMetadataFromHtml(html);

          hubs[world] = await addNewHubToTree(
            treeManager,
            spaceId,
            "world",
            null,
            name,
            world,
            worldType,
            worldSeed,
            worldColors,
            spawnPosition,
            spawnRotation,
            spawnRadius
          );
        }

        navigateToHubUrl(history, hubs.first.url);
        store.update({ context: { isFirstVisitToSpace: false } });
      }

      remountJelUI({ history, treeManager, voxTree, sceneTree });
    },
    { once: true }
  );

  spaceMetadata.ensureMetadataForIds([spaceId]);

  store.update({ context: { spaceId } });

  return joinSpaceChannel(spacePhxChannel, entryManager, treeManager, remountUI, remountJelUI);
}

export async function joinHub(scene, socket, history, entryManager, remountUI, remountJelUI) {
  const { store, hubChannel, hubMetadata } = window.APP;

  const spaceId = getSpaceIdFromHistory(history);
  const hubId = getHubIdFromHistory(history);
  console.log(`Hub ID: ${hubId}`);

  const hubStore = new HubStore(hubId);
  const params = createHubChannelParams();

  await hubMetadata.ensureMetadataForIds([hubId], true);

  const metadata = hubMetadata.getMetadata(hubId);
  const isHomeHub = metadata && metadata.is_home;
  const isWorld = metadata.type === "world";

  if (!isHomeHub && isWorld && !hasJoinedPublicWorldForCurrentSpace) {
    params.is_first_shared = !hasJoinedPublicWorldForCurrentSpace;
    hasJoinedPublicWorldForCurrentSpace = true;
  }

  const hubPhxChannel = socket.channel(`hub:${hubId}`, params);

  stopTrackingPosition();
  setupHubChannelMessageHandlers(hubPhxChannel, hubStore, entryManager, history, remountUI, remountJelUI);

  hubChannel.bind(hubPhxChannel, hubId);

  if (NAF.connection.adapter) {
    // Sending an exit message is only needed if we're not about to immediately
    // join another hub over NAF.
    const sendExitMessage = !isWorld;

    NAF.connection.adapter.leaveRoom(sendExitMessage);
  }

  const joinSuccessful = await joinHubChannel(hubPhxChannel, hubStore, entryManager, remountUI, remountJelUI);

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

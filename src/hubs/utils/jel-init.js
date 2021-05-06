import TreeManager from "../../jel/utils/tree-manager";
import { getHubIdFromHistory, getSpaceIdFromHistory, setupPeerConnectionConfig } from "../../jel/utils/jel-url-utils";
import nextTick from "./next-tick";
import { authorizeOrSanitizeMessage } from "./permissions-utils";
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
import WorldImporter from "../../jel/utils/world-importer";
import { getHtmlForTemplate, applyTemplate } from "../../jel/utils/template-utils";
import { clearVoxAttributePools } from "../../jel/objects/JelVoxBufferGeometry";
import mixpanel from "mixpanel-browser";

const PHOENIX_RELIABLE_NAF = "phx-reliable";
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

async function moveToInitialHubLocation(hub, hubStore) {
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
  const selectedMediaLayer = SYSTEMS.mediaPresenceSystem.getSelectedMediaLayer();

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
  remountJelUI({ hub, selectedMediaLayer });
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

const initSpacePresence = (presence, socket) => {
  const { hubChannel, spaceChannel } = window.APP;

  const scene = document.querySelector("a-scene");
  let sentMultipleOccupantGaugeThisSession = false;

  return new Promise(res => {
    presence.onSync(() => {
      const presence = spaceChannel.presence;
      presence.__hadInitialSync = true;

      scene.emit("space-presence-synced");
      res();
    });

    presence.onJoin((sessionId, current, info) => {
      // Ignore presence join/leaves if this Presence has not yet had its initial sync (o/w the user
      // will see join messages for every user.)
      if (!spaceChannel.presence.__hadInitialSync) return;
      if (!hubChannel.presence || !hubChannel.presence.state) return;

      const meta = info.metas[info.metas.length - 1];
      const occupantCount = Object.entries(hubChannel.presence.state).length;
      const currentHubId = spaceChannel.getCurrentHubFromPresence();
      const isCurrentHub = meta.hub_id === currentHubId;

      if (occupantCount <= NOISY_OCCUPANT_COUNT) {
        if (current) {
          // Change to existing presence
          const isSelf = sessionId === socket.params().session_id;
          const currentMeta = current.metas[0];

          if (!isSelf && currentMeta.hub_id !== meta.hub_id && meta.profile.displayName && isCurrentHub) {
            scene.emit("chat_log_entry", {
              type: "join",
              name: meta.profile.displayName,
              posted_at: performance.now()
            });
          }

          if (currentMeta.profile && meta.profile && currentMeta.profile.displayName !== meta.profile.displayName) {
            scene.emit("chat_log_entry", {
              type: "display_name_changed",
              oldName: currentMeta.profile.displayName,
              name: meta.profile.displayName,
              posted_at: performance.now()
            });
          }
        } else if (info.metas.length === 1 && isCurrentHub) {
          // New presence
          const meta = info.metas[0];

          if (meta.presence && meta.profile.displayName) {
            scene.emit("chat_log_entry", {
              type: "join",
              name: meta.profile.displayName,
              posted_at: performance.now()
            });
          }
        }
      }

      if (occupantCount > 1 && !sentMultipleOccupantGaugeThisSession) {
        sentMultipleOccupantGaugeThisSession = true;
        mixpanel.track("Gauge Multiple Occupants", {});
      }

      scene.emit("space_presence_updated", {
        sessionId,
        profile: meta.profile,
        streaming: meta.streaming,
        recording: meta.recording
      });
    });

    presence.onLeave((sessionId, current, info) => {
      // Ignore presence join/leaves if this Presence has not yet had its initial sync
      if (!spaceChannel.presence.__hadInitialSync) return;
      if (!hubChannel.presence || !hubChannel.presence.state) return;

      const occupantCount = Object.entries(hubChannel.presence.state).length;
      if (occupantCount > NOISY_OCCUPANT_COUNT) return;

      if (!current) return;

      const isSelf = sessionId === socket.params().session_id;
      const meta = info.metas[info.metas.length - 1];
      const currentHubId = spaceChannel.getCurrentHubFromPresence();
      const currentMeta = current.metas[current.metas.length - 1];
      const wasCurrentHub = meta.hub_id === currentHubId;
      const isCurrentHub = currentMeta && currentMeta.hub_id === currentHubId;

      if (!isSelf && meta && meta.profile.displayName && !isCurrentHub && wasCurrentHub) {
        scene.emit("chat_log_entry", { type: "leave", name: meta.profile.displayName, posted_at: performance.now() });
      }
    });
  });
};

const joinSpaceChannel = async (spacePhxChannel, entryManager, treeManager, remountUI, remountJelUI) => {
  const scene = document.querySelector("a-scene");
  const { store, spaceChannel, hubMetadata } = window.APP;

  let presenceInitPromise;
  let isInitialJoin = true;

  const socket = spacePhxChannel.socket;

  await new Promise(joinFinished => {
    spacePhxChannel
      .join()
      .receive("ok", async data => {
        const presence = spaceChannel.presence;
        const sessionId = (socket.params().session_id = data.session_id);

        if (!presenceInitPromise) {
          presenceInitPromise = initSpacePresence(presence, socket);
        }

        socket.params().session_token = data.session_token;

        remountUI({ sessionId });
        remountJelUI({ sessionId });

        if (isInitialJoin) {
          // Bind hub metadata which will cause metadata queries to start
          // going to new channel (and re-run in-flight ones.)
          hubMetadata.bind(spaceChannel);

          // Disconnect + reconnect NAF + SAF unless this is a re-join

          // Disconnect AFrame if already connected
          scene.removeAttribute("networked-scene");
          scene.removeAttribute("shared-scene");

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

        const { xana_host, turn } = data.spaces[0];

        const setupNAFAdapter = () => {
          const adapter = NAF.connection.adapter;

          if (!adapter.reliableTransport) {
            // These will be set later when we join a hub.
            adapter.reliableTransport = () => {};
            adapter.unreliableTransport = () => {};
          }

          setupPeerConnectionConfig(adapter, xana_host, turn);

          let newXanaHostPollInterval = null;

          // When reconnecting, update the server URL if necessary
          adapter.setReconnectionListeners(
            () => {
              if (newXanaHostPollInterval) return;

              newXanaHostPollInterval = setInterval(async () => {
                const { xana_host, xana_port, turn } = await spaceChannel.getHosts();

                const currentXanaURL = adapter.getServerUrl();
                const newXanaURL = `wss://${xana_host}:${xana_port}`;

                setupPeerConnectionConfig(adapter, xana_host, turn);

                if (currentXanaURL !== newXanaURL) {
                  console.log(`Updated Xana Host: ${newXanaURL}`);
                  scene.setAttribute("networked-scene", { serverURL: newXanaURL });
                  adapter.setServerUrl(newXanaURL);
                }
              }, 10000);
            },
            () => {
              clearInterval(newXanaHostPollInterval);
              newXanaHostPollInterval = null;
            },
            () => {
              clearInterval(newXanaHostPollInterval);
              newXanaHostPollInterval = null;
            }
          );
        };

        const setupSAFAdapter = () => {
          SAF.connection.adapter.setClientId(socket.params().session_id);
          const adapter = SAF.connection.adapter;

          let newArpaHostPollInterval = null;

          // When reconnecting, update the server URL if necessary
          adapter.setReconnectionListeners(
            () => {
              if (newArpaHostPollInterval) return;

              newArpaHostPollInterval = setInterval(async () => {
                const { arpa_host, arpa_port } = await spaceChannel.getHosts();

                const currentArpaURL = adapter.getServerUrl();
                const newArpaURL = `wss://${arpa_host}:${arpa_port}`;

                if (currentArpaURL !== newArpaURL) {
                  console.log(`Updated Arpa Host: ${newArpaURL}`);
                  scene.setAttribute("shared-scene", { serverURL: newArpaURL });
                  adapter.setServerUrl(newArpaURL);
                }
              }, 1000);
            },
            () => {
              clearInterval(newArpaHostPollInterval);
              newArpaHostPollInterval = null;
            }
          );
        };

        if (NAF.connection.adapter) {
          setupNAFAdapter();
        } else {
          scene.addEventListener("adapter-ready", setupNAFAdapter, { once: true });
        }

        if (SAF.connection.adapter) {
          setupSAFAdapter();
        } else {
          scene.addEventListener("shared-adapter-ready", setupSAFAdapter, { once: true });
        }

        await presenceInitPromise;

        const space = data.spaces[0];
        const spaceId = space.space_id;
        const accountId = store.credentialsAccountId;

        treeManager.setAccountCollectionId(accountId);
        treeManager.setSpaceCollectionId(spaceId);

        console.log(`Xana host: ${space.xana_host}:${space.xana_port}`);
        console.log(`Arpa host: ${space.arpa_host}:${space.arpa_port}`);

        const xanaUrl = `wss://${space.xana_host}:${space.xana_port}`;
        const arpaUrl = `wss://${space.arpa_host}:${space.arpa_port}`;

        // Wait for scene objects to load before connecting, so there is no race condition on network state.
        scene.setAttribute("networked-scene", {
          audio: true,
          connectOnLoad: false,
          adapter: "dialog",
          app: "jel",
          room: spaceId,
          serverURL: xanaUrl,
          debug: !!isDebug
        });

        scene.setAttribute("shared-scene", {
          connectOnLoad: false,
          collection: spaceId,
          serverURL: arpaUrl,
          debug: !!isDebug
        });

        while (!scene.components["networked-scene"] || !scene.components["networked-scene"].data) await nextTick();

        const connectionErrorTimeout = setTimeout(() => {
          console.error("Unknown error occurred while attempting to connect to networked scene.");
          remountJelUI({ unavailableReason: "connect_error" });
          entryManager.exitScene();
        }, 90000);

        const nafConnected = new Promise(res => document.body.addEventListener("connected", res, { once: true }));
        const safConnected = new Promise(res => document.body.addEventListener("share-connected", res, { once: true }));

        scene.components["networked-scene"]
          .connect()
          .then(() => scene.components["shared-scene"].connect())
          .then(() => nafConnected)
          .then(() => safConnected)
          .then(() => {
            clearTimeout(connectionErrorTimeout);
            scene.emit("didConnectToNetworkedScene");
            joinFinished();
          })
          .catch(connectError => {
            clearTimeout(connectionErrorTimeout);
            // hacky until we get return codes
            const isFull = connectError.msg && connectError.msg.match(/\bfull\b/i);
            console.error(connectError);
            remountJelUI({ unavailableReason: isFull ? "full" : "connect_error" });
            entryManager.exitScene();
            joinFinished();
          });
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

const joinHubChannel = (hubPhxChannel, hubStore, entryManager, remountUI, remountJelUI) => {
  let isInitialJoin = true;
  const { spaceChannel, hubChannel, hubMetadata, matrix } = window.APP;

  return new Promise(joinFinished => {
    hubPhxChannel
      .join()
      .receive("ok", async data => {
        const hub = data.hubs[0];
        const isWorld = hub.type === "world";

        const presence = hubChannel.presence;
        const permsToken = data.perms_token;
        hubChannel.setPermissionsFromToken(permsToken);

        const adapter = NAF.connection.adapter;
        adapter.reliableTransport = hubChannel.sendReliableNAF.bind(hubChannel);
        adapter.unreliableTransport = hubChannel.sendUnreliableNAF.bind(hubChannel);

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
            THREE.Cache.clear();

            // Clear voxmojis from prior world
            SYSTEMS.voxmojiSystem.clear();

            SYSTEMS.atmosphereSystem.restartAmbience();

            // Free memory from voxel editing undo stacks.
            SYSTEMS.builderSystem.clearUndoStacks();

            clearVoxAttributePools();

            clearResolveUrlCache();

            // If this is not a world, skip connecting to NAF + SAF
            if (!isWorld) {
              res();
              return;
            }

            moveToInitialHubLocation(hub, hubStore);

            NAF.connection.adapter
              .joinHub(hub.hub_id)
              .then(() => scene.components["shared-scene"].subscribe(hub.hub_id))
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
          remountJelUI({ unavailableReason: "denied" });
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

  spacePhxChannel.on("persona_refresh", ({ session_id }) => {
    // If persona changed, update avatar color + sky beam color
    SYSTEMS.avatarSystem.markPersonaAvatarDirty(session_id);
    SYSTEMS.skyBeamSystem.markColorDirtyForCreator(session_id);
  });
};

const setupHubChannelMessageHandlers = (hubPhxChannel, hubStore, entryManager, history, remountUI, remountJelUI) => {
  const scene = document.querySelector("a-scene");
  const { hubChannel, spaceChannel } = window.APP;
  const messages = getMessages();

  const handleIncomingNAF = data => {
    if (!NAF.connection.adapter) return;

    NAF.connection.adapter.onData(authorizeOrSanitizeMessage(data), PHOENIX_RELIABLE_NAF);
  };

  hubPhxChannel.on("naf", data => handleIncomingNAF(data));
  hubPhxChannel.on("nafr", ({ from_session_id, naf: unparsedData }) => {
    // Server optimization: server passes through unparsed NAF message, we must now parse it.
    const data = JSON.parse(unparsedData);
    data.from_session_id = from_session_id;
    handleIncomingNAF(data);
  });

  hubPhxChannel.on("message", ({ session_id, to_session_id, type, body }) => {
    const getName = session_id => {
      const userInfo = spaceChannel.presence.state[session_id];
      if (userInfo) {
        return userInfo.metas[0].profile.displayName;
      } else {
        return messages["chat.default-name"];
      }
    };

    switch (type) {
      case "chat": {
        const name = getName(session_id);
        const entry = { name, type, body, posted_at: performance.now() };

        scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CHAT_MESSAGE);

        scene.emit("chat_log_entry", entry);
        break;
      }
      case "reactji": {
        const name = getName(session_id);
        const toName = getName(to_session_id);
        const entry = { name, toName, type, body, posted_at: performance.now() };

        scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CHAT_MESSAGE);
        scene.emit("chat_log_entry", entry);
        break;
      }
      case "emoji_launch":
      case "emoji_burst": {
        // Don't replicate emojis when paused, so we don't see a huge burst of them after the fact.
        if (!scene.isPlaying) return;

        if (session_id !== NAF.clientId) {
          const projectileSystem = scene.systems["hubs-systems"].projectileSystem;

          if (type === "emoji_launch") {
            projectileSystem.replayEmojiSpawnerProjectile(body);
          }

          if (type === "emoji_burst") {
            projectileSystem.replayEmojiBurst(body);
          }
        }

        break;
      }
    }
  });

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

export function joinSpace(socket, history, subscriptions, entryManager, remountUI, remountJelUI, membershipsPromise) {
  const spaceId = getSpaceIdFromHistory(history);
  const { dynaChannel, spaceChannel, spaceMetadata, hubMetadata, store } = window.APP;
  console.log(`Space ID: ${spaceId}`);
  remountJelUI({ spaceId });

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

  document.body.addEventListener(
    "share-connected",
    async ({ detail: { connection } }) => {
      const memberships = await membershipsPromise;
      await treeManager.init(connection, memberships);
      const homeHub = homeHubForSpaceId(spaceId, memberships);
      hubMetadata.ensureMetadataForIds([homeHub.hub_id]);

      if (store.state.context.isFirstVisitToSpace) {
        const hubs = {};

        // First time space setup, create initial public channels + worlds. TODO do this server-side.
        await addNewHubToTree(treeManager, spaceId, "channel", null, "General Discussion");
        await addNewHubToTree(treeManager, spaceId, "channel", null, "Random");

        for (const world of ["first", "welcome", "whats-new", "faq"]) {
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

      remountJelUI({ history, treeManager });
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

    NAF.connection.adapter.leaveHub(sendExitMessage);
  }

  if (SAF.connection.adapter && scene.components["shared-scene"]) {
    scene.components["shared-scene"].unsubscribe();
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

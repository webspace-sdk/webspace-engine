import TreeManager from "../../jel/utils/tree-manager";
import { getHubIdFromHistory, getSpaceIdFromHistory, setupPeerConnectionConfig } from "../../jel/utils/jel-url-utils";
import { createInWorldLogMessage } from "../react-components/chat-message";
import nextTick from "./next-tick";
import { authorizeOrSanitizeMessage } from "./permissions-utils";
import { isSetEqual } from "../../jel/utils/set-utils";
import { homeHubForSpaceId } from "../../jel/utils/membership-utils";
import qsTruthy from "./qs_truthy";
//import { getReticulumMeta, invalidateReticulumMeta, connectToReticulum } from "./phoenix-utils";
import HubStore from "../storage/hub-store";

const PHOENIX_RELIABLE_NAF = "phx-reliable";
const NOISY_OCCUPANT_COUNT = 12; // Above this # of occupants, we stop posting join/leaves/renames

const isDebug = qsTruthy("debug");
const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobileVR();

//let retDeployReconnectInterval;
let positionTrackerInterval = null;

//const retReconnectMaxDelayMs = 15000;
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
  const sceneEl = document.querySelector("a-scene");

  // Clear the three.js image cache and load the loading environment before switching to the new one.
  const terrainSystem = sceneEl.systems["hubs-systems"].terrainSystem;

  document.querySelector(".a-canvas").classList.remove("a-hidden");
  sceneEl.addState("visible");

  terrainSystem.updateWorld(hub.world.type, hub.world.seed);
}

async function moveToInitialHubLocation(hub, hubStore) {
  const sceneEl = document.querySelector("a-scene");

  const waypointSystem = sceneEl.systems["hubs-systems"].waypointSystem;
  waypointSystem.releaseAnyOccupiedWaypoints();
  const characterController = sceneEl.systems["hubs-systems"].characterController;

  document.querySelector(".a-canvas").classList.remove("a-hidden");
  sceneEl.addState("visible");

  if (hubStore.state.lastPosition.x) {
    const startPosition = new THREE.Vector3(
      hubStore.state.lastPosition.x,
      hubStore.state.lastPosition.y,
      hubStore.state.lastPosition.z
    );

    const startRotation = new THREE.Quaternion(
      hubStore.state.lastRotation.x,
      hubStore.state.lastRotation.y,
      hubStore.state.lastRotation.z,
      hubStore.state.lastRotation.w
    );

    characterController.teleportTo(startPosition, startRotation);
  } else {
    waypointSystem.moveToSpawnPoint();
  }

  startTrackingPosition(hubStore);
}

const createDynaChannelParams = () => {
  const store = window.APP.store;

  const params = {
    auth_token: null,
    perms_token: null
  };

  const { token } = store.state.credentials;
  if (token) {
    params.auth_token = token;
  }

  return params;
};

const createSpaceChannelParams = () => {
  const store = window.APP.store;

  const params = {
    profile: store.state.profile,
    auth_token: null,
    perms_token: null,
    context: {
      mobile: isMobile || isMobileVR
    }
  };

  if (isMobileVR) {
    params.context.hmd = true;
  }

  const { token } = store.state.credentials;
  if (token) {
    console.log(`Logged into account ${store.credentialsAccountId}`);
    params.auth_token = token;
  }

  return params;
};

const createHubChannelParams = () => {
  const params = {
    auth_token: null,
    perms_token: null
  };

  const { token } = window.APP.store.state.credentials;
  if (token) {
    params.auth_token = token;
  }

  return params;
};

// TODO JEL
//const migrateToNewReticulumServer = async deployNotification => {
//  const { authChannel, linkChannel, hubChannel, retChannel, spaceChannel } = window.APP;
//
//  // On Reticulum deploys, reconnect after a random delay until pool + version match deployed version/pool
//  console.log(`Reticulum deploy detected v${deployNotification.ret_version} on ${deployNotification.ret_pool}`);
//  clearInterval(retDeployReconnectInterval);
//
//  await new Promise(res => {
//    setTimeout(() => {
//      const tryReconnect = async () => {
//        invalidateReticulumMeta();
//        const reticulumMeta = await getReticulumMeta();
//
//        if (
//          reticulumMeta.pool === deployNotification.ret_pool &&
//          reticulumMeta.version === deployNotification.ret_version
//        ) {
//          console.log("Reticulum reconnecting.");
//          clearInterval(retDeployReconnectInterval);
//          const oldSocket = retChannel.channel.socket;
//          const socket = await connectToReticulum(isDebug, oldSocket.params());
//          await retChannel.migrateToSocket(socket, createDynaChannelParams());
//          await spaceChannel.migrateToSocket(socket, createSpaceChannelParams());
//          await hubChannel.migrateToSocket(socket, createHubChannelParams());
//          authChannel.setSocket(socket);
//          linkChannel.setSocket(socket);
//
//          // Disconnect old socket after a delay to ensure this user is always registered in presence.
//          setTimeout(() => {
//            console.log("Reconnection complete. Disconnecting old reticulum socket.");
//            oldSocket.teardown();
//          }, 10000);
//
//          res();
//        }
//      };
//
//      retDeployReconnectInterval = setInterval(tryReconnect, 5000);
//      tryReconnect();
//    }, Math.floor(Math.random() * retReconnectMaxDelayMs));
//  });
//};

function updateUIForHub(hub, hubChannel, remountUI, remountJelUI) {
  const scene = document.querySelector("a-scene");
  const mediaPresenceSystem = scene.systems["hubs-systems"].mediaPresenceSystem;
  const selectedMediaLayer = mediaPresenceSystem.getSelectedMediaLayer();
  remountUI({ hub, entryDisallowed: !hubChannel.canEnterRoom(hub) });
  remountJelUI({ hub, selectedMediaLayer });
}

const initSpacePresence = (presence, socket, remountUI, remountJelUI, addToPresenceLog) => {
  const { hubChannel, spaceChannel } = window.APP;

  const scene = document.querySelector("a-scene");

  return new Promise(res => {
    presence.onSync(() => {
      const presence = spaceChannel.presence;
      remountUI({ spacePresences: presence.state });
      remountJelUI({ spacePresences: presence.state });

      presence.__hadInitialSync = true;
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
            addToPresenceLog({
              type: "entered",
              presence: meta.presence,
              name: meta.profile.displayName
            });
          }

          if (
            currentMeta.profile &&
            meta.profile &&
            currentMeta.profile.displayName !== meta.profile.displayName &&
            isCurrentHub
          ) {
            addToPresenceLog({
              type: "display_name_changed",
              oldName: currentMeta.profile.displayName,
              newName: meta.profile.displayName
            });
          }
        } else if (info.metas.length === 1 && isCurrentHub) {
          // New presence
          const meta = info.metas[0];

          if (meta.presence && meta.profile.displayName) {
            addToPresenceLog({
              type: "join",
              presence: meta.presence,
              name: meta.profile.displayName
            });
          }
        }
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
        addToPresenceLog({
          type: "leave",
          name: meta.profile.displayName
        });
      }
    });
  });
};

const joinSpaceChannel = async (
  spacePhxChannel,
  entryManager,
  treeManager,
  remountUI,
  remountJelUI,
  addToPresenceLog
) => {
  const scene = document.querySelector("a-scene");
  const { store, spaceChannel } = window.APP;

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
          presenceInitPromise = initSpacePresence(presence, socket, remountUI, remountJelUI, addToPresenceLog);
        }

        socket.params().session_token = data.session_token;

        remountUI({ sessionId });
        remountJelUI({ sessionId });

        if (isInitialJoin) {
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

        const { xana_host, arpa_host, turn } = data.spaces[0];

        const setupAdapter = () => {
          const adapter = NAF.connection.adapter;

          if (!adapter.reliableTransport) {
            // These will be set later when we join a hub.
            adapter.reliableTransport = () => {};
            adapter.unreliableTransport = () => {};
          }

          setupPeerConnectionConfig(adapter, xana_host, turn);

          let newHostPollInterval = null;

          // When reconnecting, update the server URL if necessary
          adapter.setReconnectionListeners(
            () => {
              if (newHostPollInterval) return;

              newHostPollInterval = setInterval(async () => {
                const { xana_host, xana_port, arpa_host, arpa_port, turn } = await spaceChannel.getHosts();

                const currentXanaURL = NAF.connection.adapter.serverUrl;
                const currentArpaURL = SAF.connection.adapter.serverUrl;
                const newXanaURL = `wss://${xana_host}:${xana_port}`;
                const newArpaURL = `wss://${arpa_host}:${arpa_port}`;

                setupPeerConnectionConfig(adapter, xana_host, turn);

                if (currentXanaURL !== newXanaURL) {
                  // TODO JEL test coordinated reconnect
                  scene.setAttribute("networked-scene", { serverURL: newXanaURL });
                  adapter.serverUrl = newXanaURL;
                  //NAF.connection.adapter.joinHub(currentHub); // TODO JEL RECONNECT
                }

                if (currentArpaURL !== newArpaURL) {
                  // TODO JEL test coordinated reconnect
                  scene.setAttribute("shared-scene", { serverURL: newArpaURL });
                  adapter.serverUrl = newArpaURL;
                  //NAF.connection.adapter.joinHub(currentHub); // TODO JEL RECONNECT
                }
              }, 1000);
            },
            () => {
              clearInterval(newHostPollInterval);
              newHostPollInterval = null;
            },
            () => {
              clearInterval(newHostPollInterval);
              newHostPollInterval = null;
            }
          );
        };

        if (NAF.connection.adapter) {
          setupAdapter();
        } else {
          scene.addEventListener("adapter-ready", setupAdapter, { once: true });
        }

        if (SAF.connection.adapter) {
          SAF.connection.adapter.setClientId(socket.params().session_id);
        } else {
          scene.addEventListener(
            "shared-adapter-ready",
            async ({ detail: adapter }) => {
              // TODO JEL this may not be needed once sharedb moves to dyna
              adapter.setClientId(socket.params().session_id);
            },
            { once: true }
          );
        }

        await presenceInitPromise;

        const space = data.spaces[0];
        const spaceId = space.space_id;
        const accountId = store.credentialsAccountId;

        treeManager.setAccountCollectionId(accountId);
        treeManager.setSpaceCollectionId(spaceId);

        console.log(`Xana host: ${space.xana_host}:${space.xana_port}`);
        console.log(`Arpa host: ${space.arpa_host}:${space.arpa_port}`);
        // Wait for scene objects to load before connecting, so there is no race condition on network state.
        scene.setAttribute("networked-scene", {
          audio: true,
          connectOnLoad: false,
          adapter: "dialog",
          app: "jel",
          room: spaceId,
          serverURL: `wss://${space.xana_host}:${space.xana_port}`,
          debug: !!isDebug
        });

        scene.setAttribute("shared-scene", {
          connectOnLoad: false,
          collection: spaceId,
          serverURL: `wss://${space.arpa_host}:${space.arpa_port}`,
          debug: !!isDebug
        });

        while (!scene.components["networked-scene"] || !scene.components["networked-scene"].data) await nextTick();

        const connectionErrorTimeout = setTimeout(() => {
          console.error("Unknown error occurred while attempting to connect to networked scene.");
          remountUI({ roomUnavailableReason: "connect_error" });
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
            remountUI({ roomUnavailableReason: isFull ? "full" : "connect_error" });
            entryManager.exitScene();
            joinFinished();
          });
      })
      .receive("error", res => {
        if (res.reason === "closed") {
          entryManager.exitScene();
          remountUI({ roomUnavailableReason: "closed" });
        } else if (res.reason === "oauth_required") {
          entryManager.exitScene();
          remountUI({ oauthInfo: res.oauth_info, showOAuthDialog: true });
        } else if (res.reason === "join_denied") {
          entryManager.exitScene();
          remountUI({ roomUnavailableReason: "denied" });
        }

        console.error(res);
        joinFinished();
      });
  });
};

const initHubPresence = async (presence, remountUI, remountJelUI) => {
  const scene = document.querySelector("a-scene");
  const { hubChannel } = window.APP;

  await new Promise(res => {
    presence.onSync(() => {
      const presence = hubChannel.presence;

      remountUI({ hubPresences: presence.state });
      remountJelUI({ hubPresences: presence.state });

      const sessionIds = Object.getOwnPropertyNames(presence.state);
      const occupantCount = sessionIds.length;

      if (occupantCount > 1) {
        scene.addState("copresent");
      } else {
        scene.removeState("copresent");
      }

      res();
    });
  });
};

let updateTitleForHubHandler;

const joinHubChannel = async (hubPhxChannel, hubStore, entryManager, remountUI, remountJelUI) => {
  let isInitialJoin = true;
  const { spaceChannel, hubChannel, hubMetadata } = window.APP;

  await new Promise(joinFinished => {
    hubPhxChannel
      .join()
      .receive("ok", async data => {
        const presence = hubChannel.presence;
        const permsToken = data.perms_token;
        hubChannel.setPermissionsFromToken(permsToken);

        const adapter = NAF.connection.adapter;
        adapter.reliableTransport = hubChannel.sendReliableNAF.bind(hubChannel);
        adapter.unreliableTransport = hubChannel.sendUnreliableNAF.bind(hubChannel);

        if (isInitialJoin) {
          await initHubPresence(presence, remountUI, remountJelUI);
        } else {
          // Send complete sync on phoenix re-join.
          NAF.connection.entities.completeSync(null, true);
        }

        const scene = document.querySelector("a-scene");

        const hub = data.hubs[0];
        spaceChannel.sendJoinedHubEvent(hub.hub_id);

        if (!isInitialJoin) {
          // Slight hack, to ensure correct presence state we need to re-send the entry event
          // on re-join. Ideally this would be updated into the channel socket state but this
          // would require significant changes to the space channel events and socket management.
          spaceChannel.sendEnteredHubEvent();
        }

        // Wait for scene objects to load before connecting, so there is no race condition on network state.
        await new Promise(res => {
          if (updateTitleForHubHandler) {
            hubMetadata.unsubscribeFromMetadata(updateTitleForHubHandler);
          }
          updateTitleForHubHandler = (updatedIds, hubMetadata) => {
            const metadata = hubMetadata && hubMetadata.getMetadata(hub.hub_id);

            if (metadata) {
              document.title = `${metadata.displayName} | Jel`;
            } else {
              document.title = `Jel`;
            }
          };
          hubMetadata.subscribeToMetadata(hub.hub_id, updateTitleForHubHandler);
          updateTitleForHubHandler([hub.hub_id], hubMetadata);
          hubMetadata.ensureMetadataForIds([hub.hub_id]);
          updateUIForHub(hub, hubChannel, remountUI, remountJelUI);
          updateEnvironmentForHub(hub);

          if (isInitialJoin) {
            THREE.Cache.clear();

            moveToInitialHubLocation(hub, hubStore);

            NAF.connection.adapter
              .joinHub(hub.hub_id)
              .then(() => scene.components["shared-scene"].subscribe(hub.hub_id))
              .then(res);
          }
        });

        isInitialJoin = false;
        joinFinished();
      })
      .receive("error", res => {
        if (res.reason === "closed") {
          entryManager.exitScene();
          remountUI({ roomUnavailableReason: "closed" });
        } else if (res.reason === "oauth_required") {
          entryManager.exitScene();
          remountUI({ oauthInfo: res.oauth_info, showOAuthDialog: true });
        } else if (res.reason === "join_denied") {
          entryManager.exitScene();
          remountUI({ roomUnavailableReason: "denied" });
        }

        joinFinished();
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
    const scene = document.querySelector("a-scene");

    // If persona changed, update avatar color
    scene.systems["hubs-systems"].avatarSystem.markPersonaAvatarDirty(session_id);
  });
};

const setupHubChannelMessageHandlers = (
  hubPhxChannel,
  hubStore,
  entryManager,
  addToPresenceLog,
  history,
  remountUI,
  remountJelUI
) => {
  const scene = document.querySelector("a-scene");
  const { hubChannel, spaceChannel } = window.APP;

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

  hubPhxChannel.on("message", ({ session_id, type, body, from }) => {
    const getAuthor = () => {
      const userInfo = spaceChannel.presence.state[session_id];
      if (from) {
        return from;
      } else if (userInfo) {
        return userInfo.metas[0].profile.displayName;
      } else {
        return "Mystery user";
      }
    };

    const name = getAuthor();
    const maySpawn = scene.is("entered");

    const incomingMessage = { name, type, body, maySpawn, sessionId: session_id };

    if (scene.is("vr-mode")) {
      createInWorldLogMessage(incomingMessage);
    }

    addToPresenceLog(incomingMessage);
  });

  // Avoid updating the history frequently, as users type new hub names
  let historyReplaceTimeout = null;

  hubPhxChannel.on("hub_refresh", ({ hubs, stale_fields }) => {
    const hub = hubs[0];

    // Special case: don't do anything, we rely upon the metadata subscriptions to quickly update
    // references to hub names + icon in-place.
    const isJustLabel = isSetEqual(new Set(["name"]), new Set(stale_fields));

    if (!isJustLabel) {
      updateUIForHub(hub, hubChannel, remountUI, remountJelUI);

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
    if (session_id === NAF.clientId && !scene.is("muted")) {
      scene.emit("action_mute");
    }
  });
};

export function joinSpace(
  socket,
  history,
  entryManager,
  remountUI,
  remountJelUI,
  addToPresenceLog,
  membershipsPromise
) {
  const spaceId = getSpaceIdFromHistory(history);
  const { dynaChannel, spaceChannel, spaceMetadata, hubMetadata, store } = window.APP;
  console.log(`Space ID: ${spaceId}`);
  remountJelUI({ spaceId });

  dynaChannel.leave();

  const dynaPhxChannel = socket.channel(`dyna`, createDynaChannelParams());
  dynaPhxChannel.join().receive("error", res => console.error(res));
  dynaChannel.bind(dynaPhxChannel);
  spaceMetadata.bind(dynaChannel);

  const spacePhxChannel = socket.channel(`space:${spaceId}`, createSpaceChannelParams());
  setupSpaceChannelMessageHandlers(spacePhxChannel, entryManager);
  spaceChannel.bind(spacePhxChannel, spaceId);

  const treeManager = new TreeManager(spaceMetadata, hubMetadata);

  document.body.addEventListener(
    "share-connected",
    async ({ detail: { connection } }) => {
      const memberships = await membershipsPromise;
      await treeManager.init(connection, memberships);
      const homeHub = homeHubForSpaceId(spaceId, memberships);
      hubMetadata.ensureMetadataForIds([homeHub.hub_id]);

      remountJelUI({ history, treeManager });
    },
    { once: true }
  );

  hubMetadata.bind(spaceChannel);
  spaceMetadata.ensureMetadataForIds([spaceId]);

  store.update({ context: { spaceId } });

  return joinSpaceChannel(spacePhxChannel, entryManager, treeManager, remountUI, remountJelUI, addToPresenceLog);
}

export async function joinHub(socket, history, entryManager, remountUI, remountJelUI, addToPresenceLog) {
  const { hubChannel, hubMetadata } = window.APP;

  if (hubChannel.channel) {
    hubChannel.leave();
  }

  const hubId = getHubIdFromHistory(history);
  console.log(`Hub ID: ${hubId}`);

  const hubStore = new HubStore(hubId);
  const hubPhxChannel = socket.channel(`hub:${hubId}`, createHubChannelParams());

  stopTrackingPosition();
  setupHubChannelMessageHandlers(
    hubPhxChannel,
    hubStore,
    entryManager,
    addToPresenceLog,
    history,
    remountUI,
    remountJelUI
  );

  await hubMetadata.ensureMetadataForIds([hubId], true);
  hubChannel.bind(hubPhxChannel, hubId);

  await joinHubChannel(hubPhxChannel, hubStore, entryManager, remountUI, remountJelUI);
}

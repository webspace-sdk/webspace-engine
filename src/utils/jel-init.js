import SpaceMetadata from "../jel/utils/space-metadata";
import TreeManager from "../jel/utils/tree-manager";
import { getHubIdFromHistory, getSpaceIdFromHistory, setupPeerConnectionConfig } from "../jel/utils/jel-url-utils";
import { createInWorldLogMessage } from "../react-components/chat-message";
import nextTick from "./next-tick";
import { authorizeOrSanitizeMessage } from "./permissions-utils";
import qsTruthy from "./qs_truthy";
import loadingEnvironment from "../assets/models/LoadingEnvironment.glb";
import { proxiedUrlFor } from "./media-url-utils";
import { traverseMeshesAndAddShapes } from "./physics-utils";
import { getReticulumMeta, invalidateReticulumMeta, migrateChannelToSocket, connectToReticulum } from "./phoenix-utils";

const PHOENIX_RELIABLE_NAF = "phx-reliable";
const NOISY_OCCUPANT_COUNT = 12; // Above this # of occupants, we stop posting join/leaves/renames

const isDebug = qsTruthy("debug");
const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobileVR();

let retPhxChannel;
let retDeployReconnectInterval;
const retReconnectMaxDelayMs = 15000;

async function updateEnvironmentForHub(hub, entryManager, remountUI) {
  let sceneUrl;
  let isLegacyBundle; // Deprecated

  const sceneErrorHandler = () => {
    remountUI({ roomUnavailableReason: "scene_error" });
    entryManager.exitScene();
  };

  const environmentScene = document.querySelector("#environment-scene");
  const sceneEl = document.querySelector("a-scene");

  if (hub.scene) {
    isLegacyBundle = false;
    sceneUrl = hub.scene.model_url;
  } else if (hub.scene === null) {
    // delisted/removed scene
    sceneUrl = loadingEnvironment;
  } else {
    const defaultSpaceTopic = hub.topics[0];
    const glbAsset = defaultSpaceTopic.assets.find(a => a.asset_type === "glb");
    const bundleAsset = defaultSpaceTopic.assets.find(a => a.asset_type === "gltf_bundle");
    sceneUrl = (glbAsset || bundleAsset).src || loadingEnvironment;
    const hasExtension = /\.gltf/i.test(sceneUrl) || /\.glb/i.test(sceneUrl);
    isLegacyBundle = !(glbAsset || hasExtension);
  }

  if (isLegacyBundle) {
    // Deprecated
    const res = await fetch(sceneUrl);
    const data = await res.json();
    const baseURL = new URL(THREE.LoaderUtils.extractUrlBase(sceneUrl), window.location.href);
    sceneUrl = new URL(data.assets[0].src, baseURL).href;
  } else {
    sceneUrl = proxiedUrlFor(sceneUrl);
  }

  console.log(`Scene URL: ${sceneUrl}`);

  let environmentEl = null;

  if (environmentScene.childNodes.length === 0) {
    const environmentEl = document.createElement("a-entity");

    environmentEl.addEventListener(
      "model-loaded",
      () => {
        environmentEl.removeEventListener("model-error", sceneErrorHandler);

        // Show the canvas once the model has loaded
        document.querySelector(".a-canvas").classList.remove("a-hidden");

        sceneEl.addState("visible");

        //TODO: check if the environment was made with spoke to determine if a shape should be added
        traverseMeshesAndAddShapes(environmentEl);
      },
      { once: true }
    );

    environmentEl.addEventListener("model-error", sceneErrorHandler, { once: true });

    environmentEl.setAttribute("gltf-model-plus", {
      src: sceneUrl,
      useCache: false,
      inflate: true,
      useECSY: qsTruthy("ecsy")
    });
    environmentScene.appendChild(environmentEl);
  } else {
    // Change environment
    environmentEl = environmentScene.childNodes[0];

    // Clear the three.js image cache and load the loading environment before switching to the new one.
    THREE.Cache.clear();
    const waypointSystem = sceneEl.systems["hubs-systems"].waypointSystem;
    waypointSystem.releaseAnyOccupiedWaypoints();

    environmentEl.addEventListener(
      "model-loaded",
      () => {
        environmentEl.addEventListener(
          "model-loaded",
          () => {
            environmentEl.removeEventListener("model-error", sceneErrorHandler);
            traverseMeshesAndAddShapes(environmentEl);

            // We've already entered, so move to new spawn point once new environment is loaded
            if (sceneEl.is("entered")) {
              waypointSystem.moveToSpawnPoint();
            }

            const fader = document.getElementById("viewing-camera").components["fader"];

            // Add a slight delay before de-in to reduce hitching.
            setTimeout(() => fader.fadeIn(), 2000);
          },
          { once: true }
        );

        sceneEl.emit("leaving_loading_environment");
        environmentEl.setAttribute("gltf-model-plus", { src: sceneUrl });
      },
      { once: true }
    );

    if (!sceneEl.is("entered")) {
      environmentEl.addEventListener("model-error", sceneErrorHandler, { once: true });
    }

    environmentEl.setAttribute("gltf-model-plus", { src: loadingEnvironment });
  }
}

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

const migrateToNewReticulumServer = async (deployNotification, retPhxChannel) => {
  const { authChannel, linkChannel, hubChannel, spaceChannel } = window.APP;

  // On Reticulum deploys, reconnect after a random delay until pool + version match deployed version/pool
  console.log(`Reticulum deploy detected v${deployNotification.ret_version} on ${deployNotification.ret_pool}`);
  clearInterval(retDeployReconnectInterval);

  await new Promise(res => {
    setTimeout(() => {
      const tryReconnect = async () => {
        invalidateReticulumMeta();
        const reticulumMeta = await getReticulumMeta();

        if (
          reticulumMeta.pool === deployNotification.ret_pool &&
          reticulumMeta.version === deployNotification.ret_version
        ) {
          console.log("Reticulum reconnecting.");
          clearInterval(retDeployReconnectInterval);
          const oldSocket = retPhxChannel.socket;
          const socket = await connectToReticulum(isDebug, oldSocket.params());
          retPhxChannel = await migrateChannelToSocket(retPhxChannel, socket);
          await spaceChannel.migrateToSocket(socket, createSpaceChannelParams());
          await hubChannel.migrateToSocket(socket, createHubChannelParams());
          authChannel.setSocket(socket);
          linkChannel.setSocket(socket);

          // Disconnect old socket after a delay to ensure this user is always registered in presence.
          setTimeout(() => {
            console.log("Reconnection complete. Disconnecting old reticulum socket.");
            oldSocket.teardown();
          }, 10000);

          res();
        }
      };

      retDeployReconnectInterval = setInterval(tryReconnect, 5000);
      tryReconnect();
    }, Math.floor(Math.random() * retReconnectMaxDelayMs));
  });
};

const createRetChannel = (socket, spaceId) => {
  if (retPhxChannel) {
    retPhxChannel.leave();
  }

  retPhxChannel = socket.channel(`ret`, { space_id: spaceId });
  retPhxChannel.join().receive("error", res => console.error(res));

  retPhxChannel.on("notice", async data => {
    // TODO JEL check controlled deploy
    // On Reticulum deploys, reconnect after a random delay until pool + version match deployed version/pool
    if (data.event === "ret-deploy") {
      await migrateToNewReticulumServer(data, retPhxChannel);
    }
  });
};

function updateUIForHub(hub, hubChannel, remountUI, remountJelUI) {
  remountUI({ hub, entryDisallowed: !hubChannel.canEnterRoom(hub) });
  remountJelUI({ hub });
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
  const { spaceChannel } = window.APP;

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

        const { host, turn } = data.spaces[0];

        const setupAdapter = () => {
          const adapter = NAF.connection.adapter;

          if (!adapter.reliableTransport) {
            // These will be set later when we join a hub.
            adapter.reliableTransport = () => {};
            adapter.unreliableTransport = () => {};
          }

          setupPeerConnectionConfig(adapter, host, turn);

          let newHostPollInterval = null;

          // When reconnecting, update the server URL if necessary
          adapter.setReconnectionListeners(
            () => {
              if (newHostPollInterval) return;

              newHostPollInterval = setInterval(async () => {
                const currentServerURL = NAF.connection.adapter.serverUrl;
                const { host, port, turn } = await spaceChannel.getHost();
                const newServerURL = `wss://${host}:${port}`;

                setupPeerConnectionConfig(adapter, host, turn);

                if (currentServerURL !== newServerURL) {
                  // TODO JEL test coordinated reconnect
                  console.log("Connecting to new webrtc server " + newServerURL);
                  scene.setAttribute("networked-scene", { serverURL: newServerURL });
                  adapter.serverUrl = newServerURL;
                  //NAF.connection.adapter.joinHub(currentHub); // TODO JEL RECONNECT
                }
              }, 1000);
            },
            () => {
              clearInterval(newHostPollInterval);
              newHostPollInterval = null;
            },
            null
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

        treeManager.setCollectionId(spaceId);

        console.log(`WebRTC host: ${space.host}:${space.port}`);
        // Wait for scene objects to load before connecting, so there is no race condition on network state.
        scene.setAttribute("networked-scene", {
          audio: true,
          connectOnLoad: false,
          adapter: "dialog",
          app: "jel",
          room: spaceId,
          serverURL: `wss://${space.host}:${space.port}`,
          debug: !!isDebug
        });

        scene.setAttribute("shared-scene", {
          connectOnLoad: false,
          collection: spaceId,
          serverURL: `wss://hubs.local:8001`,
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
      const vrHudPresenceCount = document.querySelector("#hud-presence-count");
      vrHudPresenceCount.setAttribute("text", "value", occupantCount.toString());

      if (occupantCount > 1) {
        scene.addState("copresent");
      } else {
        scene.removeState("copresent");
      }

      res();
    });
  });
};

const joinHubChannel = async (hubPhxChannel, entryManager, remountUI, remountJelUI) => {
  let isInitialJoin = true;
  const { spaceChannel, hubChannel } = window.APP;

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

        remountUI({
          hubIsBound: data.hub_requires_oauth,
          initialIsFavorited: data.subscriptions.favorites
        });

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
          updateUIForHub(hub, hubChannel, remountUI, remountJelUI);
          updateEnvironmentForHub(hub, entryManager, remountUI);

          if (isInitialJoin) {
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
};

const setupHubChannelMessageHandlers = (
  hubPhxChannel,
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
  hubPhxChannel.on("hub_refresh", ({ session_id, hubs, stale_fields }) => {
    const hub = hubs[0];
    const userInfo = spaceChannel.presence.state[session_id];

    updateUIForHub(hub, hubChannel, remountUI, remountJelUI);

    if (stale_fields.includes("scene")) {
      const fader = document.getElementById("viewing-camera").components["fader"];

      fader.fadeOut().then(() => {
        scene.emit("reset_scene");
        updateEnvironmentForHub(hub, entryManager);
      });

      addToPresenceLog({
        type: "scene_changed",
        name: userInfo.metas[0].profile.displayName,
        sceneName: hub.scene ? hub.scene.name : "a custom URL"
      });
    }

    if (stale_fields.includes("roles")) {
      hubChannel.fetchPermissions();
      spaceChannel.fetchPermissions();
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

      history.replace({ pathname, search, state });

      addToPresenceLog({
        type: "hub_name_changed",
        name: userInfo.metas[0].profile.displayName,
        hubName: hub.name
      });
    }

    if (hub.entry_mode === "deny") {
      scene.emit("hub_closed");
    }
  });

  hubPhxChannel.on("mute", ({ session_id }) => {
    if (session_id === NAF.clientId && !scene.is("muted")) {
      scene.emit("action_mute");
    }
  });
};

const setupUIEventHandlers = (hubChannel, remountJelUI) => {
  const onHubDestroyConfirmed = async hubId => {
    if (hubId !== hubChannel.hubId) return false;
    await hubChannel.closeHub();
    return true;
  };

  remountJelUI({ onHubDestroyConfirmed });
};

export function joinSpace(socket, history, entryManager, remountUI, remountJelUI, addToPresenceLog) {
  const spaceId = getSpaceIdFromHistory(history);
  const { spaceChannel, store } = window.APP;
  console.log(`Space ID: ${spaceId}`);
  remountJelUI({ spaceId });

  createRetChannel(socket, spaceId);

  if (spaceChannel.channel) {
    spaceChannel.leave();
  }

  const spacePhxChannel = socket.channel(`space:${spaceId}`, createSpaceChannelParams());
  setupSpaceChannelMessageHandlers(spacePhxChannel, entryManager);
  spaceChannel.bind(spacePhxChannel, spaceId);

  const spaceMetadata = new SpaceMetadata(spaceChannel);
  const treeManager = new TreeManager(spaceMetadata);

  document.body.addEventListener(
    "share-connected",
    async ({ detail: { connection } }) => {
      await treeManager.init(connection);
      remountJelUI({ history, treeManager });
    },
    { once: true }
  );

  spaceMetadata.init();
  store.update({ context: { spaceId } });

  return joinSpaceChannel(spacePhxChannel, entryManager, treeManager, remountUI, remountJelUI, addToPresenceLog);
}

export function joinHub(socket, history, entryManager, remountUI, remountJelUI, addToPresenceLog) {
  const { hubChannel } = window.APP;

  if (hubChannel.channel) {
    hubChannel.leave();
  }

  const hubId = getHubIdFromHistory(history);
  console.log(`Hub ID: ${hubId}`);

  const hubPhxChannel = socket.channel(`hub:${hubId}`, createHubChannelParams());
  setupHubChannelMessageHandlers(hubPhxChannel, entryManager, addToPresenceLog, history, remountUI, remountJelUI);
  hubChannel.bind(hubPhxChannel, hubId);
  setupUIEventHandlers(hubChannel, remountJelUI);

  return joinHubChannel(hubPhxChannel, entryManager, remountUI, remountJelUI);
}

import "./webxr-bypass-hacks";
import "./utils/theme";
import "@babel/polyfill";
import "./utils/debug-log";

console.log(`App version: ${process.env.BUILD_VERSION || "?"}`);

import "./assets/stylesheets/hub.scss";
import initialBatchImage from "./assets/images/warning_icon.png";
import loadingEnvironment from "./assets/models/LoadingEnvironment.glb";

import "aframe";
import "./utils/logging";
import { patchWebGLRenderingContext } from "./utils/webgl";
patchWebGLRenderingContext();

import "three/examples/js/loaders/GLTFLoader";
import "networked-aframe/src/index";
import "shared-aframe/src/index";
import "naf-janus-adapter";
import "aframe-rounded";
import "webrtc-adapter";
import "aframe-slice9-component";
import "./utils/threejs-positional-audio-updatematrixworld";
import "./utils/threejs-world-update";
import patchThreeAllocations from "./utils/threejs-allocation-patches";
import patchThreeNoProgramDispose from "./jel/utils/threejs-avoid-disposing-programs";
import { detectOS, detect } from "detect-browser";
import { getReticulumMeta, invalidateReticulumMeta, migrateChannelToSocket } from "./utils/phoenix-utils";

import nextTick from "./utils/next-tick";
import { addAnimationComponents } from "./utils/animation";
import { authorizeOrSanitizeMessage } from "./utils/permissions-utils";
import "./naf-dialog-adapter";

import "./components/scene-components";
import "./components/scale-in-screen-space";
import "./components/mute-mic";
import "./components/bone-mute-state-indicator";
import "./components/bone-visibility";
import "./components/fader";
import "./components/in-world-hud";
import "./components/emoji";
import "./components/virtual-gamepad-controls";
import "./components/ik-controller";
import "./components/hand-controls2";
import "./components/hoverable-visuals";
import "./components/hover-visuals";
import "./components/offset-relative-to";
import "./components/player-info";
import "./components/debug";
import "./components/hand-poses";
import "./components/hud-controller";
import "./components/freeze-controller";
import "./components/icon-button";
import "./components/text-button";
import "./components/block-button";
import "./components/mute-button";
import "./components/kick-button";
import "./components/close-vr-notice-button";
import "./components/leave-room-button";
import "./components/visible-if-permitted";
import "./components/visibility-on-content-types";
import "./components/hide-when-pinned-and-forbidden";
import "./components/visibility-while-frozen";
import "./components/stats-plus";
import "./components/networked-avatar";
import "./components/media-views";
import "./jel/components/media-text";
import { initQuillPool } from "./jel/utils/quill-pool";
import "./components/avatar-volume-controls";
import "./components/pinch-to-move";
import "./components/pitch-yaw-rotator";
import "./components/position-at-border";
import "./components/pinnable";
import "./components/pin-networked-object-button";
import "./components/mirror-media-button";
import "./components/close-mirrored-media-button";
import "./components/drop-object-button";
import "./components/remove-networked-object-button";
import "./components/camera-focus-button";
import "./components/unmute-video-button";
import "./components/destroy-at-extreme-distances";
import "./components/visible-to-owner";
import "./components/camera-tool";
import "./components/emit-state-change";
import "./components/action-to-event";
import "./components/action-to-remove";
import "./components/emit-scene-event-on-remove";
import "./components/follow-in-fov";
import "./components/matrix-auto-update";
import "./components/clone-media-button";
import "./components/open-media-button";
import "./components/refresh-media-button";
import "./components/tweet-media-button";
import "./components/remix-avatar-button";
import "./components/transform-object-button";
import "./components/scale-button";
import "./components/hover-menu";
import "./components/disable-frustum-culling";
import "./components/teleporter";
import "./components/set-active-camera";
import "./components/track-pose";
import "./components/replay";
import "./components/visibility-by-path";
import "./components/tags";
import "./components/hubs-text";
import "./components/billboard";
import "./components/periodic-full-syncs";
import "./components/inspect-button";
import "./components/set-max-resolution";
import "./components/avatar-audio-source";
import { sets as userinputSets } from "./systems/userinput/sets";

import ReactDOM from "react-dom";
import React from "react";
import { Router, Route } from "react-router-dom";
import { createBrowserHistory } from "history";
import { pushHistoryState, pushHistoryPath } from "./utils/history";
import UIRoot from "./react-components/ui-root";
import AuthChannel from "./utils/auth-channel";
import HubChannel from "./utils/hub-channel";
import LinkChannel from "./utils/link-channel";
import { connectToReticulum } from "./utils/phoenix-utils";
import { disableiOSZoom } from "./utils/disable-ios-zoom";
import { proxiedUrlFor } from "./utils/media-url-utils";
import { traverseMeshesAndAddShapes } from "./utils/physics-utils";
import { handleExitTo2DInterstitial, exit2DInterstitialAndEnterVR } from "./utils/vr-interstitial";
import { getAvatarSrc } from "./utils/avatar-utils.js";
import MessageDispatch from "./message-dispatch";
import SceneEntryManager from "./scene-entry-manager";
import { createInWorldLogMessage } from "./react-components/chat-message";

import "./systems/nav";
import "./systems/frame-scheduler";
import "./systems/personal-space-bubble";
import "./systems/app-mode";
import "./systems/permissions";
import "./systems/exit-on-blur";
import "./systems/auto-pixel-ratio";
import "./systems/idle-detector";
import "./systems/camera-tools";
import "./systems/userinput/userinput";
import "./systems/userinput/userinput-debug";
import "./systems/ui-hotkeys";
import "./systems/tips";
import "./systems/interactions";
import "./systems/hubs-systems";
import "./systems/capture-system";
import "./systems/listed-media";
import "./systems/linked-media";
import "./jel/systems/media-presence-system";
import { SOUND_CHAT_MESSAGE } from "./systems/sound-effects-system";

import "./gltf-component-mappings";

import { App } from "./App";
import { platformUnsupported } from "./support";

window.APP = new App();
window.APP.RENDER_ORDER = {
  HUD_BACKGROUND: 1,
  HUD_ICONS: 2,
  CURSOR: 3
};
const store = window.APP.store;
store.update({ preferences: { shouldPromptForRefresh: undefined } });

const history = createBrowserHistory();
window.APP.history = history;
const authChannel = new AuthChannel(store);
const hubChannel = new HubChannel(store);
const linkChannel = new LinkChannel(store);
window.APP.hubChannel = hubChannel;
store.addEventListener("profilechanged", hubChannel.sendProfileUpdate.bind(hubChannel));

const mediaSearchStore = window.APP.mediaSearchStore;
const NOISY_OCCUPANT_COUNT = 12; // Above this # of occupants, we stop posting join/leaves/renames

const qs = new URLSearchParams(location.search);
const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobileVR();

THREE.Object3D.DefaultMatrixAutoUpdate = false;
window.APP.quality =
  window.APP.store.state.preferences.materialQualitySetting === "low"
    ? "low"
    : window.APP.store.state.preferences.materialQualitySetting === "high"
      ? "high"
      : isMobile || isMobileVR
        ? "low"
        : "high";

import "./components/owned-object-limiter";
import "./components/owned-object-cleanup-timeout";
import "./components/set-unowned-body-kinematic";
import "./components/scalable-when-grabbed";
import "./components/networked-counter";
import "./components/event-repeater";
import "./components/set-yxz-order";

import "./components/cursor-controller";

import "./components/nav-mesh-helper";

import "./components/tools/pen";
import "./components/tools/pen-laser";
import "./components/tools/networked-drawing";
import "./components/tools/drawing-manager";

import "./components/body-helper";
import "./components/shape-helper";

import registerNetworkSchemas from "./network-schemas";
import registerTelemetry from "./telemetry";
import { warmSerializeElement } from "./utils/serialize-element";

import { getAvailableVREntryTypes, VR_DEVICE_AVAILABILITY, ONLY_SCREEN_AVAILABLE } from "./utils/vr-caps-detect";
import detectConcurrentLoad from "./utils/concurrent-load-detector";

import qsTruthy from "./utils/qs_truthy";

const PHOENIX_RELIABLE_NAF = "phx-reliable";
NAF.options.firstSyncSource = PHOENIX_RELIABLE_NAF;
NAF.options.syncSource = PHOENIX_RELIABLE_NAF;

const isBotMode = qsTruthy("bot");
const isTelemetryDisabled = qsTruthy("disable_telemetry");
const isDebug = qsTruthy("debug");

if (!isBotMode && !isTelemetryDisabled) {
  registerTelemetry("/hub", "Room Landing Page");
}

disableiOSZoom();
detectConcurrentLoad();

function setupLobbyCamera() {
  const camera = document.getElementById("scene-preview-node");
  const previewCamera = document.getElementById("environment-scene").object3D.getObjectByName("scene-preview-camera");

  if (previewCamera) {
    camera.object3D.position.copy(previewCamera.position);
    camera.object3D.rotation.copy(previewCamera.rotation);
    camera.object3D.rotation.reorder("YXZ");
  } else {
    const cameraPos = camera.object3D.position;
    camera.object3D.position.set(cameraPos.x, 2.5, cameraPos.z);
  }

  camera.object3D.matrixNeedsUpdate = true;

  camera.removeAttribute("scene-preview-camera");
  camera.setAttribute("scene-preview-camera", "positionOnly: true; duration: 60");
}

let uiProps = {};

// when loading the client as a "default room" on the homepage, use MemoryHistory since exposing all the client paths at the root is undesirable

const qsVREntryType = qs.get("vr_entry_type");

let performConditionalSignIn;

function mountUI(props = {}) {
  const scene = document.querySelector("a-scene");
  const disableAutoExitOnIdle =
    qsTruthy("allow_idle") || (process.env.NODE_ENV === "development" && !qs.get("idle_timeout"));
  const isCursorHoldingPen =
    scene &&
    (scene.systems.userinput.activeSets.includes(userinputSets.rightCursorHoldingPen) ||
      scene.systems.userinput.activeSets.includes(userinputSets.leftCursorHoldingPen));
  const hasActiveCamera = scene && !!scene.systems["camera-tools"].getMyCamera();
  const forcedVREntryType = qsVREntryType;

  ReactDOM.render(
    <Router history={history}>
      <Route
        render={routeProps => (
          <UIRoot
            {...{
              scene,
              isBotMode,
              disableAutoExitOnIdle,
              forcedVREntryType,
              store,
              mediaSearchStore,
              isCursorHoldingPen,
              hasActiveCamera,
              performConditionalSignIn,
              ...props,
              ...routeProps
            }}
          />
        )}
      />
    </Router>,
    document.getElementById("ui-root")
  );
}

function remountUI(props) {
  uiProps = { ...uiProps, ...props };
  mountUI(uiProps);
}

function setupPerformConditionalSignin(entryManager) {
  entryManager.performConditionalSignIn = performConditionalSignIn = async (
    predicate,
    action,
    messageId,
    onFailure
  ) => {
    if (predicate()) return action();

    const scene = document.querySelector("a-scene");
    const signInContinueTextId = scene.is("vr-mode") ? "entry.return-to-vr" : "dialog.close";

    await handleExitTo2DInterstitial(true, () => remountUI({ showSignInDialog: false }));

    remountUI({
      showSignInDialog: true,
      signInMessageId: `sign-in.${messageId}`,
      signInCompleteMessageId: `sign-in.${messageId}-complete`,
      signInContinueTextId,
      onContinueAfterSignIn: async () => {
        remountUI({ showSignInDialog: false });
        let actionError = null;
        if (predicate()) {
          try {
            await action();
          } catch (e) {
            actionError = e;
          }
        } else {
          actionError = new Error("Predicate failed post sign-in");
        }

        if (actionError && onFailure) onFailure(actionError);
        exit2DInterstitialAndEnterVR();
      }
    });
  };

  remountUI({ performConditionalSignIn });
}

function setupPeerConnectionConfig(adapter, host, turn) {
  const forceTurn = qs.get("force_turn");
  const forceTcp = qs.get("force_tcp");
  const peerConnectionConfig = {};

  if (turn && turn.enabled) {
    const iceServers = [];

    turn.transports.forEach(ts => {
      // Try both TURN DTLS and TCP/TLS
      if (!forceTcp) {
        iceServers.push({ urls: `turns:${host}:${ts.port}`, username: turn.username, credential: turn.credential });
      }

      iceServers.push({
        urls: `turns:${host}:${ts.port}?transport=tcp`,
        username: turn.username,
        credential: turn.credential
      });
    });

    iceServers.push({ urls: "stun:stun1.l.google.com:19302" });

    peerConnectionConfig.iceServers = iceServers;
    peerConnectionConfig.iceTransportPolicy = "all";

    if (forceTurn || forceTcp) {
      peerConnectionConfig.iceTransportPolicy = "relay";
    }
  } else {
    peerConnectionConfig.iceServers = [
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ];
  }

  adapter.setPeerConnectionConfig(peerConnectionConfig);
}

async function updateEnvironmentForHub(hub, entryManager) {
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

async function updateUIForHub(hub, hubChannel) {
  remountUI({ hub, entryDisallowed: !hubChannel.canEnterRoom(hub) });
}

function handleHubChannelJoined(isInitialJoin, entryManager, hubChannel, messageDispatch, data) {
  const scene = document.querySelector("a-scene");

  if (!isInitialJoin) {
    // Slight hack, to ensure correct presence state we need to re-send the entry event
    // on re-join. Ideally this would be updated into the channel socket state but this
    // would require significant changes to the hub channel events and socket management.
    if (scene.is("entered")) {
      hubChannel.sendEnteredEvent();
    }

    // Send complete sync on phoenix re-join.
    NAF.connection.entities.completeSync(null, true);
    return;
  }

  const hub = data.hubs[0];

  console.log(`Janus host: ${hub.host}:${hub.port}`);

  // Wait for scene objects to load before connecting, so there is no race condition on network state.
  const connectToScene = async () => {
    scene.setAttribute("networked-scene", {
      room: "server_id", // JEL
      serverURL: `wss://${hub.host}:${hub.port}`,
      debug: !!isDebug
    });

    scene.setAttribute("shared-scene", {
      room: "server_id",
      serverURL: `wss://hubs.local:8001`,
      debug: !!isDebug
    });

    while (!scene.components["networked-scene"] || !scene.components["networked-scene"].data) await nextTick();

    updateUIForHub(hub, hubChannel);
    updateEnvironmentForHub(hub, entryManager);

    const connectionErrorTimeout = setTimeout(() => {
      console.error("Unknown error occurred while attempting to connect to networked scene.");
      remountUI({ roomUnavailableReason: "connect_error" });
      entryManager.exitScene();
    }, 90000);

    const isConnected = NAF.connection.isConnected();

    (!isConnected ? scene.components["networked-scene"].connect() : Promise.resolve())
      .then(() => (!isConnected ? scene.components["shared-scene"].connect() : Promise.resolve()))
      .then(() => NAF.connection.adapter.joinSpace(hub.hub_id)) // TODO JEL
      .then(() => scene.components["shared-scene"].subscribe("c" /*, hub.hub_id*/))
      .then(() => {
        clearTimeout(connectionErrorTimeout);
        scene.emit("didConnectToNetworkedScene");
      })
      .catch(connectError => {
        clearTimeout(connectionErrorTimeout);
        // hacky until we get return codes
        const isFull = connectError.msg && connectError.msg.match(/\bfull\b/i);
        console.error(connectError);
        remountUI({ roomUnavailableReason: isFull ? "full" : "connect_error" });
        entryManager.exitScene();

        return;
      });
  };

  connectToScene();
}

async function runBotMode(scene, entryManager) {
  const noop = () => {};
  scene.renderer = { setAnimationLoop: noop, render: noop };

  while (!NAF.connection.isConnected()) await nextTick();
  entryManager.enterSceneWhenLoaded(new MediaStream(), false);
}

function initPhysicsThreeAndCursor(scene) {
  const physicsSystem = scene.systems["hubs-systems"].physicsSystem;
  physicsSystem.setDebug(isDebug || physicsSystem.debug);
  patchThreeAllocations();
  patchThreeNoProgramDispose();

  for (const side of ["right", "left"]) {
    document.getElementById(`${side}-cursor-controller`).components["cursor-controller"].enabled = false;
  }
}

async function initAvatar() {
  // If the stored avatar doesn't have a valid src, reset to a legacy avatar.
  const avatarSrc = await getAvatarSrc(store.state.profile.avatarId);
  if (!avatarSrc) {
    await store.resetToRandomDefaultAvatar();
  }

  return avatarSrc;
}

async function checkPrerequisites() {
  if (platformUnsupported()) {
    return false;
  }

  const detectedOS = detectOS(navigator.userAgent);

  const browser = detect();
  // HACK - it seems if we don't initialize the mic track up-front, voices can drop out on iOS
  // safari when initializing it later.
  if (["iOS", "Mac OS"].includes(detectedOS) && ["safari", "ios"].includes(browser.name)) {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      remountUI({ showSafariMicDialog: true });
      return;
    }
  }

  if (qs.get("required_version") && process.env.BUILD_VERSION) {
    const buildNumber = process.env.BUILD_VERSION.split(" ", 1)[0]; // e.g. "123 (abcd5678)"

    if (qs.get("required_version") !== buildNumber) {
      remountUI({ roomUnavailableReason: "version_mismatch" });
      setTimeout(() => document.location.reload(), 5000);
      return false;
    }
  }

  getReticulumMeta().then(reticulumMeta => {
    console.log(`Reticulum @ ${reticulumMeta.phx_host}: v${reticulumMeta.version} on ${reticulumMeta.pool}`);

    if (
      qs.get("required_ret_version") &&
      (qs.get("required_ret_version") !== reticulumMeta.version || qs.get("required_ret_pool") !== reticulumMeta.pool)
    ) {
      remountUI({ roomUnavailableReason: "version_mismatch" });
      setTimeout(() => document.location.reload(), 5000);
      return false;
    }
  });

  return true;
}

function hideCanvas() {
  const canvas = document.querySelector(".a-canvas");
  canvas.classList.add("a-hidden");
}

function initBatching() {
  // HACK - Trigger initial batch preparation with an invisible object
  document
    .querySelector("a-scene")
    .querySelector("#batch-prep")
    .setAttribute("media-image", { batch: true, src: initialBatchImage, contentType: "image/png" });
}

function addGlobalEventListeners(scene, entryManager) {
  window.addEventListener("action_create_avatar", () => {
    performConditionalSignIn(
      () => hubChannel.signedIn,
      () => pushHistoryState(history, "overlay", "avatar-editor"),
      "create-avatar"
    );
  });

  scene.addEventListener("scene_media_selected", e => {
    const sceneInfo = e.detail;

    performConditionalSignIn(
      () => hubChannel.can("update_hub"),
      () => hubChannel.updateScene(sceneInfo),
      "change-scene"
    );
  });

  scene.addEventListener("action_focus_chat", () => {
    const chatFocusTarget = document.querySelector(".chat-focus-target");
    chatFocusTarget && chatFocusTarget.focus();
  });

  scene.addEventListener("tips_changed", e => {
    remountUI({ activeTips: e.detail });
  });

  scene.addEventListener("leave_room_requested", () => {
    entryManager.exitScene("left");
    remountUI({ roomUnavailableReason: "left" });
  });

  scene.addEventListener("camera_toggled", () => remountUI({}));

  scene.addEventListener("camera_removed", () => remountUI({}));

  scene.addEventListener("hub_closed", () => {
    scene.exitVR();
    entryManager.exitScene("closed");
    remountUI({ roomUnavailableReason: "closed" });
  });

  scene.addEventListener("action_camera_recording_started", () => hubChannel.beginRecording());
  scene.addEventListener("action_camera_recording_ended", () => hubChannel.endRecording());

  scene.addEventListener("action_selected_media_result_entry", e => {
    const { entry, selectAction } = e.detail;
    if ((entry.type !== "scene_listing" && entry.type !== "scene") || selectAction !== "use") return;
    if (!hubChannel.can("update_hub")) return;

    hubChannel.updateScene(entry.url);
  });

  // Handle request for user gesture
  scene.addEventListener("2d-interstitial-gesture-required", () => {
    remountUI({
      showInterstitialPrompt: true,
      onInterstitialPromptClicked: () => {
        remountUI({ showInterstitialPrompt: false, onInterstitialPromptClicked: null });
        scene.emit("2d-interstitial-gesture-complete");
      }
    });
  });
}

function setupVREventHandlers(scene, availableVREntryTypesPromise) {
  const handleEarlyVRMode = () => {
    // If VR headset is activated, refreshing page will fire vrdisplayactivate
    // which puts A-Frame in VR mode, so exit VR mode whenever it is attempted
    // to be entered and we haven't entered the room yet.
    if (scene.is("vr-mode") && !scene.is("vr-entered") && !isMobileVR) {
      console.log("Pre-emptively exiting VR mode.");
      scene.exitVR();
      return true;
    }

    return false;
  };

  scene.addEventListener("enter-vr", () => {
    if (handleEarlyVRMode()) return true;

    if (isMobileVR) {
      // Optimization, stop drawing UI if not visible
      remountUI({ hide: true });
    }

    document.body.classList.add("vr-mode");

    availableVREntryTypesPromise.then(availableVREntryTypes => {
      // Don't stretch canvas on cardboard, since that's drawing the actual VR view :)
      if ((!isMobile && !isMobileVR) || availableVREntryTypes.cardboard !== VR_DEVICE_AVAILABILITY.yes) {
        document.body.classList.add("vr-mode-stretch");
      }
    });
  });

  handleEarlyVRMode();

  // HACK A-Frame 0.9.0 seems to fail to wire up vrdisplaypresentchange early enough
  // to catch presentation state changes and recognize that an HMD is presenting on startup.
  window.addEventListener(
    "vrdisplaypresentchange",
    () => {
      if (scene.is("vr-entered")) return;
      if (scene.is("vr-mode")) return;

      const device = AFRAME.utils.device.getVRDisplay();

      if (device && device.isPresenting) {
        if (!scene.is("vr-mode")) {
          console.warn("Hit A-Frame bug where VR display is presenting but A-Frame has not entered VR mode.");
          scene.enterVR();
        }
      }
    },
    { once: true }
  );

  scene.addEventListener("exit-vr", () => {
    document.body.classList.remove("vr-mode");
    document.body.classList.remove("vr-mode-stretch");

    remountUI({ hide: false });

    // HACK: Oculus browser pauses videos when exiting VR mode, so we need to resume them after a timeout.
    if (/OculusBrowser/i.test(window.navigator.userAgent)) {
      document.querySelectorAll("[media-video]").forEach(m => {
        const videoComponent = m.components["media-video"];

        if (videoComponent) {
          videoComponent._ignorePauseStateChanges = true;

          setTimeout(() => {
            const video = videoComponent.video;

            if (video && video.paused && !videoComponent.data.videoPaused) {
              video.play();
            }

            videoComponent._ignorePauseStateChanges = false;
          }, 1000);
        }
      });
    }
  });
}

async function setupUIBasedUponVRTypes(availableVREntryTypesPromise) {
  const availableVREntryTypes = await availableVREntryTypesPromise;

  if (isMobileVR) {
    remountUI({ availableVREntryTypes, forcedVREntryType: "vr", checkingForDeviceAvailability: false });

    if (/Oculus/.test(navigator.userAgent) && "getVRDisplays" in navigator) {
      // HACK - The polyfill reports Cardboard as the primary VR display on startup out ahead of
      // Oculus Go on Oculus Browser 5.5.0 beta. This display is cached by A-Frame,
      // so we need to resolve that and get the real VRDisplay before entering as well.
      const displays = await navigator.getVRDisplays();
      const vrDisplay = displays.length && displays[0];
      AFRAME.utils.device.getVRDisplay = () => vrDisplay;
    }
  } else {
    const hasVREntryDevice =
      availableVREntryTypes.cardboard !== VR_DEVICE_AVAILABILITY.no ||
      availableVREntryTypes.generic !== VR_DEVICE_AVAILABILITY.no ||
      availableVREntryTypes.daydream !== VR_DEVICE_AVAILABILITY.no;

    remountUI({
      availableVREntryTypes,
      forcedVREntryType: qsVREntryType || (!hasVREntryDevice ? "2d" : null),
      checkingForDeviceAvailability: false
    });
  }
}

function startBotModeIfNecessary(scene, entryManager) {
  const environmentScene = document.querySelector("#environment-scene");

  const onFirstEnvironmentLoad = () => {
    // Replace renderer with a noop renderer to reduce bot resource usage.
    if (isBotMode) {
      runBotMode(scene, entryManager);
    }

    environmentScene.removeEventListener("model-loaded", onFirstEnvironmentLoad);
  };

  environmentScene.addEventListener("model-loaded", onFirstEnvironmentLoad);
}

function handleEnvironmentLoaded() {
  const scene = document.querySelector("a-scene");
  const environmentScene = document.querySelector("#environment-scene");

  if (!scene.is("entered")) {
    setupLobbyCamera();
  }

  // This will be run every time the environment is changed (including the first load.)
  remountUI({ environmentSceneLoaded: true });
  scene.emit("environment-scene-loaded");

  // Re-bind the teleporter controls collision meshes in case the scene changed.
  document.querySelectorAll("a-entity[teleporter]").forEach(x => x.components["teleporter"].queryCollisionEntities());

  for (const modelEl of environmentScene.children) {
    addAnimationComponents(modelEl);
  }
}

async function createSocket(entryManager) {
  let isReloading = false;
  window.addEventListener("beforeunload", () => (isReloading = true));

  const socket = await connectToReticulum(isDebug);

  socket.onClose(e => {
    // We don't currently have an easy way to distinguish between being kicked (server closes socket)
    // and a variety of other network issues that seem to produce the 1000 closure code, but the
    // latter are probably more common. Either way, we just tell the user they got disconnected.
    const NORMAL_CLOSURE = 1000;

    if (e.code === NORMAL_CLOSURE && !isReloading) {
      entryManager.exitScene();
      remountUI({ roomUnavailableReason: "disconnected" });
    }
  });

  return socket;
}

const createHubChannelParams = () => {
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

let retDeployReconnectInterval;
const retReconnectMaxDelayMs = 15000;

const migrateToNewReticulumServer = async (deployNotification, retPhxChannel) => {
  // On Reticulum deploys, reconnect after a random delay until pool + version match deployed version/pool
  console.log(`Reticulum deploy detected v${deployNotification.ret_version} on ${deployNotification.ret_pool}`);
  clearInterval(retDeployReconnectInterval);

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
        await hubChannel.migrateToSocket(socket, createHubChannelParams());
        authChannel.setSocket(socket);
        linkChannel.setSocket(socket);

        // Disconnect old socket after a delay to ensure this user is always registered in presence.
        setTimeout(() => {
          console.log("Reconnection complete. Disconnecting old reticulum socket.");
          oldSocket.teardown();
        }, 10000);
      }
    };

    retDeployReconnectInterval = setInterval(tryReconnect, 5000);
    tryReconnect();
  }, Math.floor(Math.random() * retReconnectMaxDelayMs));
};

const createRetChannel = (socket, hubId) => {
  const retPhxChannel = socket.channel(`ret`, { hub_id: hubId });
  retPhxChannel.join().receive("error", res => console.error(res));

  retPhxChannel.on("notice", async data => {
    // On Reticulum deploys, reconnect after a random delay until pool + version match deployed version/pool
    if (data.event === "ret-deploy") {
      await migrateToNewReticulumServer(data, retPhxChannel);
    }
  });
};

const addToPresenceLog = (() => {
  const presenceLogEntries = [];

  return entry => {
    const scene = document.querySelector("a-scene");
    entry.key = Date.now().toString();

    presenceLogEntries.push(entry);
    remountUI({ presenceLogEntries });
    if (entry.type === "chat" && scene.is("loaded")) {
      scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CHAT_MESSAGE);
    }

    // Fade out and then remove
    setTimeout(() => {
      entry.expired = true;
      remountUI({ presenceLogEntries });

      setTimeout(() => {
        presenceLogEntries.splice(presenceLogEntries.indexOf(entry), 1);
        remountUI({ presenceLogEntries });
      }, 5000);
    }, 20000);
  };
})();

const joinHubChannel = async (hubPhxChannel, entryManager, messageDispatch) => {
  const scene = document.querySelector("a-scene");

  let isInitialJoin = true;

  // We need to be able to wait for initial presence syncs across reconnects and socket migrations,
  // so we create this object in the outer scope and assign it a new promise on channel join.
  const presenceSync = {
    promise: null,
    resolve: null
  };

  const socket = hubPhxChannel.socket;

  return new Promise(joinFinished => {
    hubPhxChannel
      .join()
      .receive("ok", async data => {
        socket.params().session_id = data.session_id;
        socket.params().session_token = data.session_token;

        const vrHudPresenceCount = document.querySelector("#hud-presence-count");

        presenceSync.promise = new Promise(resolve => (presenceSync.resolve = resolve));

        if (isInitialJoin) {
          const requestedOccupants = [];

          const requestOccupants = async (sessionIds, state) => {
            requestedOccupants.length = 0;
            for (let i = 0; i < sessionIds.length; i++) {
              const sessionId = sessionIds[i];
              if (sessionId !== NAF.clientId && state[sessionId].metas[0].presence === "room") {
                requestedOccupants.push(sessionId);
              }
            }

            while (!NAF.connection.isConnected()) await nextTick();
            NAF.connection.adapter.syncOccupants(requestedOccupants);
          };

          hubChannel.presence.onSync(() => {
            const presence = hubChannel.presence;

            remountUI({
              sessionId: socket.params().session_id,
              presences: presence.state,
              entryDisallowed: !hubChannel.canEnterRoom(uiProps.hub)
            });

            const sessionIds = Object.getOwnPropertyNames(presence.state);
            const occupantCount = sessionIds.length;
            vrHudPresenceCount.setAttribute("text", "value", occupantCount.toString());

            if (occupantCount > 1) {
              scene.addState("copresent");
            } else {
              scene.removeState("copresent");
            }

            requestOccupants(sessionIds, presence.state);

            // HACK - Set a flag on the presence object indicating if the initial sync has completed,
            // which is used to determine if we should fire join/leave messages into the presence log.
            // This flag is required since we reuse these onJoin and onLeave handler functions on
            // socket migrations.
            presence.__hadInitialSync = true;

            presenceSync.resolve();

            presence.onJoin((sessionId, current, info) => {
              // Ignore presence join/leaves if this Presence has not yet had its initial sync (o/w the user
              // will see join messages for every user.)
              if (!hubChannel.presence.__hadInitialSync) return;

              const meta = info.metas[info.metas.length - 1];
              const occupantCount = Object.entries(hubChannel.presence.state).length;

              if (occupantCount <= NOISY_OCCUPANT_COUNT) {
                if (current) {
                  // Change to existing presence
                  const isSelf = sessionId === socket.params().session_id;
                  const currentMeta = current.metas[0];

                  if (
                    !isSelf &&
                    currentMeta.presence !== meta.presence &&
                    meta.presence === "room" &&
                    meta.profile.displayName
                  ) {
                    addToPresenceLog({
                      type: "entered",
                      presence: meta.presence,
                      name: meta.profile.displayName
                    });
                  }

                  if (
                    currentMeta.profile &&
                    meta.profile &&
                    currentMeta.profile.displayName !== meta.profile.displayName
                  ) {
                    addToPresenceLog({
                      type: "display_name_changed",
                      oldName: currentMeta.profile.displayName,
                      newName: meta.profile.displayName
                    });
                  }
                } else if (info.metas.length === 1) {
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

              scene.emit("presence_updated", {
                sessionId,
                profile: meta.profile,
                roles: meta.roles,
                permissions: meta.permissions,
                streaming: meta.streaming,
                recording: meta.recording
              });
            });

            presence.onLeave((sessionId, current, info) => {
              // Ignore presence join/leaves if this Presence has not yet had its initial sync
              if (!hubChannel.presence.__hadInitialSync) return;

              if (current && current.metas.length > 0) return;
              const occupantCount = Object.entries(hubChannel.presence.state).length;
              if (occupantCount > NOISY_OCCUPANT_COUNT) return;

              const meta = info.metas[0];

              if (meta.profile.displayName) {
                addToPresenceLog({
                  type: "leave",
                  name: meta.profile.displayName
                });
              }
            });
          });
        }

        const permsToken = data.perms_token;
        hubChannel.setPermissionsFromToken(permsToken);

        const { host, turn, hub_id } = data.hubs[0];

        const setupWebRTC = () => {
          const adapter = NAF.connection.adapter;
          setupPeerConnectionConfig(adapter, host, turn);

          let newHostPollInterval = null;

          // TODO JEL reconnect shared
          // When reconnecting, update the server URL if necessary
          adapter.setReconnectionListeners(
            () => {
              if (newHostPollInterval) return;

              newHostPollInterval = setInterval(async () => {
                const currentServerURL = NAF.connection.adapter.serverUrl;
                const { host, port, turn } = await hubChannel.getHost();
                const newServerURL = `wss://${host}:${port}`;

                setupPeerConnectionConfig(adapter, host, turn);

                if (currentServerURL !== newServerURL) {
                  console.log("Connecting to new webrtc server " + newServerURL);
                  scene.setAttribute("networked-scene", { serverURL: newServerURL });
                  // TODO JEL shared reconnect
                  adapter.serverUrl = newServerURL;
                  NAF.connection.adapter.joinSpace(hub_id); // TODO JEL TEST
                }
              }, 1000);
            },
            () => {
              clearInterval(newHostPollInterval);
              newHostPollInterval = null;
            },
            null
          );

          adapter.reliableTransport = hubChannel.sendReliableNAF.bind(hubChannel);
          adapter.unreliableTransport = hubChannel.sendUnreliableNAF.bind(hubChannel);
        };

        if (NAF.connection.adapter) {
          setupWebRTC();
        } else {
          scene.addEventListener("adapter-ready", setupWebRTC, { once: true });
        }

        remountUI({
          hubIsBound: data.hub_requires_oauth,
          initialIsFavorited: data.subscriptions.favorites
        });

        await presenceSync.promise;

        handleHubChannelJoined(isInitialJoin, entryManager, hubChannel, messageDispatch, data);

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

        console.error(res);
        joinFinished();
      });

    scene.addEventListener(
      "shared-adapter-ready",
      async ({ detail: adapter }) => {
        // TODO JEL this may not be needed once this is on dyna
        adapter.setClientId(socket.params().session_id);
      },
      { once: true }
    );
  });
};

const setupHubChannelMessageHandlers = (hubPhxChannel, entryManager) => {
  const scene = document.querySelector("a-scene");

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
      const userInfo = hubChannel.presence.state[session_id];
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
    const userInfo = hubChannel.presence.state[session_id];

    updateUIForHub(hub, hubChannel);

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

    if (stale_fields.includes("member_permissions")) {
      hubChannel.fetchPermissions();
    }

    if (stale_fields.includes("name")) {
      const titleParts = document.title.split(" | "); // Assumes title has | trailing site name
      titleParts[0] = hub.name;
      document.title = titleParts.join(" | ");

      // TODO JEL ROUTING
      // Re-write the slug in the browser history
      const pathParts = history.location.pathname.split("/");
      const oldSlug = pathParts[1];
      const { search, state } = history.location;
      const pathname = history.location.pathname.replace(`/${oldSlug}`, `/${hub.slug}`);

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

  hubPhxChannel.on("permissions_updated", () => hubChannel.fetchPermissions());

  hubPhxChannel.on("mute", ({ session_id }) => {
    if (session_id === NAF.clientId && !scene.is("muted")) {
      scene.emit("action_mute");
    }
  });
};

function getHubIdFromHistory() {
  return qs.get("hub_id") || history.location.pathname.substring(1).split("/")[2];
}

async function joinSpace(socket, entryManager, messageDispatch) {
  if (hubChannel.channel) {
    hubChannel.leave();
    // TODO JEL disconnect from dialog
  }

  const hubId = getHubIdFromHistory();
  console.log(`Hub ID: ${hubId}`);
  createRetChannel(socket, hubId); // TODO JEL ROUTING switch hub id in ret channel

  const hubPhxChannel = socket.channel(`hub:${hubId}`, createHubChannelParams());
  setupHubChannelMessageHandlers(hubPhxChannel, entryManager);
  hubChannel.bind(hubPhxChannel, hubId);

  return joinHubChannel(hubPhxChannel, entryManager, messageDispatch);
}

async function start() {
  if (!checkPrerequisites()) return;

  const scene = document.querySelector("a-scene");
  const entryManager = new SceneEntryManager(hubChannel, authChannel, history);
  const messageDispatch = new MessageDispatch(
    scene,
    entryManager,
    hubChannel,
    addToPresenceLog,
    remountUI,
    mediaSearchStore
  );

  document.getElementById("avatar-rig").messageDispatch = messageDispatch;

  setupPerformConditionalSignin(entryManager);
  await store.initProfile();

  hideCanvas();
  warmSerializeElement();
  initQuillPool();

  window.APP.scene = scene;

  scene.setAttribute("shadow", { enabled: window.APP.quality !== "low" }); // Disable shadows on low quality
  scene.renderer.debug.checkShaderErrors = false;

  initBatching();

  if (scene.hasLoaded) {
    initPhysicsThreeAndCursor(scene);
  } else {
    scene.addEventListener("loaded", () => initPhysicsThreeAndCursor(scene), { once: true });
  }

  await initAvatar();

  addGlobalEventListeners(scene, entryManager);

  window.dispatchEvent(new CustomEvent("hub_channel_ready"));

  remountUI({ availableVREntryTypes: ONLY_SCREEN_AVAILABLE, checkingForDeviceAvailability: true });
  const availableVREntryTypesPromise = getAvailableVREntryTypes();

  registerNetworkSchemas();

  remountUI({
    authChannel,
    hubChannel,
    linkChannel,
    enterScene: entryManager.enterScene,
    exitScene: reason => {
      entryManager.exitScene();

      if (reason) {
        remountUI({ roomUnavailableReason: reason });
      }
    },
    initialIsSubscribed: false,
    activeTips: scene.systems.tips.activeTips
  });

  setupVREventHandlers(scene, availableVREntryTypesPromise);
  setupUIBasedUponVRTypes(availableVREntryTypesPromise); // Note no await here, to avoid blocking
  startBotModeIfNecessary(scene, entryManager);

  const environmentScene = document.querySelector("#environment-scene");
  environmentScene.addEventListener("model-loaded", handleEnvironmentLoaded);

  const socket = await createSocket(entryManager);

  hubChannel.addEventListener("permissions_updated", e => {
    const assignJoinToken = () => NAF.connection.adapter.setJoinToken(e.detail.permsToken);

    if (NAF.connection.adapter) {
      assignJoinToken();
    } else {
      scene.addEventListener("adapter-ready", assignJoinToken, { once: true });
    }
  });

  scene.addEventListener("adapter-ready", () => NAF.connection.adapter.setClientId(socket.params().session_id));

  authChannel.setSocket(socket);

  remountUI({
    onSendMessage: messageDispatch.dispatch,
    onLoaded: () => store.executeOnLoadActions(scene),
    onMediaSearchResultEntrySelected: (entry, selectAction) =>
      scene.emit("action_selected_media_result_entry", { entry, selectAction }),
    onMediaSearchCancelled: entry => scene.emit("action_media_search_cancelled", entry),
    onAvatarSaved: entry => scene.emit("action_avatar_saved", entry)
  });

  let nextHubToJoin;
  let joinPromise;

  const performJoin = async () => {
    // Handle rapid history changes, only join last one.
    const hubId = getHubIdFromHistory();
    nextHubToJoin = hubId;
    if (joinPromise) await joinPromise;
    joinPromise = null;

    if (hubChannel.hubId !== hubId && nextHubToJoin === hubId) {
      joinPromise = joinSpace(socket, entryManager, messageDispatch);
    }
  };

  history.listen(performJoin);
  performJoin();
}

// TODO JEL remove
window.navigateToSpace = hubId => {
  const searchParams = new URLSearchParams(history.location.search);
  pushHistoryPath(history, `/spaces/abc123/${hubId}/slug`, searchParams.toString());
};

document.addEventListener("DOMContentLoaded", start);

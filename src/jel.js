import nodeCrypto from "crypto";
import "aframe";
import "networked-aframe/src/index";
import { detectOS, detect } from "detect-browser";
import Color from "color";
import random from "random";
import seedrandom from "seedrandom";
import { fromByteArray } from "base64-js";

random.use(seedrandom("base"));

import "./hubs/utils/theme";
import "./hubs/utils/debug-log";
import "./hubs/utils/logging";
import "./hubs/utils/threejs-world-update";
import "./hubs/components/scene-components";
import "./hubs/components/scale-in-screen-space";
import "./hubs/components/mute-mic";
import "./hubs/components/bone-mute-state-indicator";
import "./hubs/components/bone-visibility";
import "./hubs/components/fader";
import "./hubs/components/in-world-hud";
import "./hubs/components/emoji";
import "./hubs/components/virtual-gamepad-controls";
import "./hubs/components/ik-controller";
import "./hubs/components/hand-controls2";
import "./hubs/components/hoverable-visuals";
import "./hubs/components/hover-visuals";
import "./hubs/components/offset-relative-to";
import "./hubs/components/player-info";
import "./hubs/components/debug";
import "./hubs/components/hand-poses";
import "./hubs/components/hud-controller";
import "./hubs/components/icon-button";
import "./hubs/components/text-button";
import "./hubs/components/block-button";
import "./hubs/components/mute-button";
import "./hubs/components/kick-button";
import "./hubs/components/close-vr-notice-button";
import "./hubs/components/leave-room-button";
import "./hubs/components/visible-if-permitted";
import "./hubs/components/visibility-on-content-types";
import "./hubs/components/visibility-while-frozen";
import "./hubs/components/networked-avatar";
import "./hubs/components/media-views";
import "./jel/components/media-vox";
import "./jel/components/media-text";
import "./jel/components/media-emoji";
import "./jel/components/media-stream";
import "./hubs/components/avatar-volume-controls";
import "./hubs/components/pinch-to-move";
import "./hubs/components/position-at-border";
import "./hubs/components/close-mirrored-media-button";
import "./hubs/components/drop-object-button";
import "./hubs/components/remove-networked-object-button";
import "./hubs/components/camera-focus-button";
import "./hubs/components/unmute-video-button";
import "./hubs/components/destroy-at-extreme-distances";
import "./hubs/components/visible-to-owner";
import "./hubs/components/camera-tool";
import "./hubs/components/emit-state-change";
import "./hubs/components/action-to-event";
import "./hubs/components/action-to-remove";
import "./hubs/components/emit-scene-event-on-remove";
import "./hubs/components/follow-in-fov";
import "./hubs/components/matrix-auto-update";
import "./hubs/components/open-media-button";
import "./hubs/components/refresh-media-button";
import "./hubs/systems/transform-selected-object";
import "./hubs/systems/scale-object";
import "./hubs/components/hover-menu";
import "./hubs/components/disable-frustum-culling";
import "./hubs/components/teleporter";
import "./hubs/components/set-active-camera";
import "./hubs/components/track-pose";
import "./hubs/components/replay";
import "./hubs/components/visibility-by-path";
import "./hubs/components/tags";
import "./hubs/components/hubs-text";
import "./hubs/components/billboard";
import "./hubs/components/periodic-full-syncs";
import "./hubs/components/inspect-button";
import "./hubs/components/set-max-resolution";
import "./hubs/components/avatar-audio-source";
import "./jel/components/pinned-to-self";
import "./jel/components/look-at-self";
import "./hubs/systems/frame-scheduler";
import "./hubs/systems/personal-space-bubble";
import "./hubs/systems/app-mode";
import "./hubs/systems/permissions";
import "./hubs/systems/exit-on-blur";
import "./hubs/systems/idle-detector";
import "./hubs/systems/camera-tools";
import "./hubs/systems/userinput/userinput";
import "./hubs/systems/userinput/userinput-debug";
import "./hubs/systems/ui-hotkeys";
import "./hubs/systems/tips";
import "./hubs/systems/interactions";
import "./jel/systems/effects-system";
import "./hubs/systems/hubs-systems";
import "./hubs/systems/capture-system";
import "./hubs/systems/listed-media";
import "./hubs/systems/linked-media";
import "./hubs/systems/camera-rotator-system";
import "./jel/systems/media-presence-system";
import "./jel/systems/wrapped-entity-system";
import "./hubs/gltf-component-mappings";
import "./hubs/components/owned-object-limiter";
import "./hubs/components/owned-object-cleanup-timeout";
import "./hubs/components/set-unowned-body-kinematic";
import "./hubs/components/scalable-when-grabbed";
import "./hubs/components/networked-counter";
import "./hubs/components/event-repeater";
import "./hubs/components/set-yxz-order";
import "./hubs/components/cursor-controller";
import "./hubs/components/nav-mesh-helper";
import "./hubs/components/tools/pen";
import "./hubs/components/tools/pen-laser";
import "./hubs/components/tools/networked-drawing";
import "./hubs/components/tools/drawing-manager";
import "./hubs/components/body-helper";
import "./hubs/components/shape-helper";

import { SHADOW_DOM_STYLES } from "./jel/styles";
import AFRAME_DOM from "./jel/aframe-dom";
import { isInQuillEditor } from "./jel/utils/quill-utils";
import { CURSOR_LOCK_STATES, getCursorLockState } from "./jel/utils/dom-utils";
import { patchWebGLRenderingContext, isSoftwareRenderer } from "./hubs/utils/webgl";
import patchThreeNoProgramDispose from "./jel/utils/threejs-avoid-disposing-programs";
import nextTick from "./hubs/utils/next-tick";
import { SOUND_QUACK, SOUND_SPECIAL_QUACK } from "./hubs/systems/sound-effects-system";
import ducky from "!!url-loader!./assets/hubs/models/DuckyMesh.glb";
import { getAbsoluteHref } from "./hubs/utils/media-url-utils";
import { hasActiveScreenShare } from "./hubs/utils/media-utils";
import ReactDOM from "react-dom";
import React from "react";
import { Router, Route } from "react-router-dom";
import { createBrowserHistory } from "history";
import { clearHistoryState } from "./hubs/utils/history";
import JelUI from "./jel/react-components/jel-ui";
import AccountChannel from "./jel/utils/account-channel";
import DynaChannel from "./jel/utils/dyna-channel";
import SpaceChannel from "./hubs/utils/space-channel";
import HubChannel from "./hubs/utils/hub-channel";
import AtomMetadata, {
  ATOM_TYPES,
  LocalDOMHubMetadataSource,
  IndexDOMSpaceMetadataSource,
  VoxMetadataSource
} from "./jel/utils/atom-metadata";
import { setupTreeManagers, joinHub } from "./hubs/utils/jel-init";
import { disableiOSZoom } from "./hubs/utils/disable-ios-zoom";
import { getHubIdFromHistory, getSpaceIdFromHistory } from "./jel/utils/jel-url-utils";
import SceneEntryManager from "./hubs/scene-entry-manager";
import AtomAccessManager from "./jel/utils/atom-access-manager";
import EditRingManager from "./jel/utils/edit-ring-manager";

import {
  SansSerifFontCSS,
  SerifFontCSS,
  MonoFontCSS,
  ComicFontCSS,
  ComicFont2CSS,
  WritingFontCSS,
  LabelFontCSS
} from "./jel/fonts/quill-fonts";
import { registerWrappedEntityPositionNormalizers } from "./jel/systems/wrapped-entity-system";
import { getIsWindowAtScreenEdges, isInEditableField } from "./jel/utils/dom-utils";
import { resetTemplate } from "./jel/utils/template-utils";
import { App } from "./App";
import { platformUnsupported } from "./hubs/support";
import { loadEmojis } from "./jel/utils/emojis";
import registerNetworkSchemas from "./hubs/network-schemas";
import { warmSerializeElement } from "./hubs/utils/serialize-element";
import { getAvailableVREntryTypes, VR_DEVICE_AVAILABILITY } from "./hubs/utils/vr-caps-detect";
import detectConcurrentLoad from "./hubs/utils/concurrent-load-detector";
import qsTruthy from "./hubs/utils/qs_truthy";

console.log(`App version: ${process.env.BUILD_VERSION || "?"}`);

patchWebGLRenderingContext();

window.APP = new App();
const store = window.APP.store;

store.update({ preferences: { shouldPromptForRefresh: undefined } });

const history = createBrowserHistory();
const accountChannel = new AccountChannel(store);
const dynaChannel = new DynaChannel(store);
const spaceChannel = new SpaceChannel(store);
const hubChannel = new HubChannel(store);
const spaceMetadata = new AtomMetadata(ATOM_TYPES.SPACE);
const hubMetadata = new AtomMetadata(ATOM_TYPES.HUB);
const voxMetadata = new AtomMetadata(ATOM_TYPES.VOX);
const atomAccessManager = new AtomAccessManager();
const editRingManager = new EditRingManager();

atomAccessManager.init();

window.APP.history = history;
window.APP.accountChannel = accountChannel;
window.APP.dynaChannel = dynaChannel;
window.APP.spaceChannel = spaceChannel;
window.APP.hubChannel = hubChannel;
window.APP.hubMetadata = hubMetadata;
window.APP.spaceMetadata = spaceMetadata;
window.APP.voxMetadata = voxMetadata;
window.APP.atomAccessManager = atomAccessManager;
window.APP.editRingManager = editRingManager;

const qs = new URLSearchParams(location.search);

const isMobile = AFRAME.utils.device.isMobile();
const isMobileVR = AFRAME.utils.device.isMobileVR();

THREE.Object3D.DefaultMatrixAutoUpdate = false;
window.APP.materialQuality =
  window.APP.store.state.preferences.materialQualitySetting === "low"
    ? "low"
    : window.APP.store.state.preferences.materialQualitySetting === "high"
      ? "high"
      : isMobile || isMobileVR
        ? "low"
        : "high";

const PHOENIX_RELIABLE_NAF = "phx-reliable";
NAF.options.firstSyncSource = PHOENIX_RELIABLE_NAF;
NAF.options.syncSource = PHOENIX_RELIABLE_NAF;

const isBotMode = qsTruthy("bot");
const isDebug = qsTruthy("debug");
const disablePausing = qsTruthy("no_pause") || isBotMode;
const skipPanels = qsTruthy("skip_panels");

const browser = detect();

// Don't pause on blur on linux bc of gfx instability
const performConservativePausing = browser.os === "Linux";
const PAUSE_AFTER_BLUR_DURATION_MS = performConservativePausing ? 0 : 2 * 60000;

if (isBotMode) {
  const token = qs.get("credentials_token");
  const email = qs.get("credentials_email") || "nobody@nowhere.com";

  if (token) {
    store.update({ credentials: { token, email } });
  }
}

registerWrappedEntityPositionNormalizers();

disableiOSZoom();
detectConcurrentLoad();

let jelUIProps = {};

function mountJelUI(props = {}) {
  if (isBotMode) return;

  const scene = DOM_ROOT.querySelector("a-scene");

  ReactDOM.render(
    <Router history={history}>
      <Route
        render={routeProps => (
          <JelUI
            {...{
              scene,
              store,
              history: routeProps.history,
              ...props
            }}
          />
        )}
      />
    </Router>,
    DOM_ROOT.getElementById("jel-react-root")
  );
}

function remountJelUI(props) {
  jelUIProps = { ...jelUIProps, ...props };
  mountJelUI(jelUIProps);
}

window.remountJelUI = remountJelUI;

async function runBotMode(scene, entryManager) {
  const noop = () => {};
  scene.renderer = { setAnimationLoop: noop, render: noop };

  while (!NAF.connection.isConnected()) await nextTick();
  entryManager.enterSceneWhenLoaded(false);
}

function initPhysicsThreeAndCursor(scene) {
  const physicsSystem = scene.systems["hubs-systems"].physicsSystem;
  physicsSystem.setDebug(isDebug || physicsSystem.debug);
  const renderer = AFRAME.scenes[0].renderer;

  patchThreeNoProgramDispose(renderer);
}

async function checkPrerequisites() {
  if (platformUnsupported()) return false;

  const detectedOS = detectOS(navigator.userAgent);

  // HACK - it seems if we don't initialize the mic track up-front, voices can drop out on iOS
  // safari when initializing it later.
  if (["iOS", "Mac OS"].includes(detectedOS) && ["safari", "ios"].includes(browser.name)) {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // remountUI({ showSafariMicDialog: true });
      return;
    }
  }

  if (qs.get("required_version") && process.env.BUILD_VERSION) {
    const buildNumber = process.env.BUILD_VERSION.split(" ", 1)[0]; // e.g. "123 (abcd5678)"

    if (qs.get("required_version") !== buildNumber) {
      // remountUI({ roomUnavailableReason: "version_mismatch" });
      setTimeout(() => document.location.reload(), 5000);
      return false;
    }
  }

  return true;
}

function hideCanvas() {
  const canvas = DOM_ROOT.querySelector(".a-canvas");
  canvas.classList.add("a-hidden");
}

function addGlobalEventListeners(scene, entryManager, atomAccessManager) {
  scene.addEventListener("preferred_mic_changed", e => {
    const deviceId = e.detail;
    scene.systems["hubs-systems"].mediaStreamSystem.updatePreferredMicDevice(deviceId);
  });

  // Fired when the user chooses a create action from the create action menu
  scene.addEventListener("create_action_exec", e => {
    const createAction = e.detail;
    let uploadAccept;

    switch (createAction) {
      case "duck":
        scene.emit("add_media", { src: getAbsoluteHref(location.href, ducky), contentType: "model/gltf-binary" });

        if (Math.random() < 0.01) {
          scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_SPECIAL_QUACK);
        } else {
          scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_QUACK);
        }
        break;
      case "page":
        scene.emit("add_media_text", "page");
        break;
      case "label":
        scene.emit("add_media_text", "label");
        break;
      case "banner":
        scene.emit("add_media_text", "banner");
        break;
      case "vox":
        scene.emit("add_media_vox", "");
        break;
      case "voxmoji":
        scene.emit("action_show_emoji_picker", "");
        break;
      case "screen":
        scene.emit("action_share_screen", "");
        break;
      case "video_embed":
      case "image_embed":
      case "pdf_embed":
      case "model_embed":
        scene.emit("action_show_create_embed", createAction.replace("_embed", ""));
        break;
      case "image_upload":
        uploadAccept = "image/*";
        break;
      case "video_upload":
        uploadAccept = "video/*";
        break;
      case "pdf_upload":
        uploadAccept = "application/pdf";
        break;
      case "model_upload":
        uploadAccept = ".glb,.vox";
        break;
    }

    if (uploadAccept) {
      const el = DOM_ROOT.querySelector("#file-upload-input");
      el.accept = uploadAccept;
      el.click();
    }
  });

  scene.addEventListener("cursor-lock-state-changed", () => {
    const uiAnimationSystem = scene.systems["hubs-systems"].uiAnimationSystem;

    const cursorLockState = getCursorLockState();
    const panelsCollapsed = uiAnimationSystem.isCollapsingOrCollapsed();

    // Do not affect panels when in ephemeral locking states
    const locked = cursorLockState === CURSOR_LOCK_STATES.LOCKED_PERSISTENT;
    const unlocked = cursorLockState === CURSOR_LOCK_STATES.UNLOCKED_PERSISTENT;
    if (
      !isInQuillEditor() &&
      !isInEditableField() &&
      ((panelsCollapsed && unlocked) || (!panelsCollapsed && locked)) &&
      !SYSTEMS.cameraSystem.isInspecting()
    ) {
      if (panelsCollapsed) {
        uiAnimationSystem.collapseSidePanels();
      }
    }
  });

  scene.addEventListener("action_focus_chat", () => {
    const chatFocusTarget = DOM_ROOT.querySelector(".chat-focus-target");
    chatFocusTarget && chatFocusTarget.focus();
  });

  scene.addEventListener("leave_room_requested", () => {
    entryManager.exitScene("left");
  });

  scene.addEventListener("hub_closed", () => {
    scene.exitVR();
    entryManager.exitScene("closed");
    // remountUI({ roomUnavailableReason: "closed" });
  });

  ["#jel-react-root", "#jel-popup-root"].forEach(selector => {
    const el = DOM_ROOT.querySelector(selector);
    el.addEventListener("mouseover", () => scene.addState("pointer-exited"));
    el.addEventListener("mouseout", () => scene.removeState("pointer-exited"));
  });

  // The app starts in low quality mode so loading screen runs OK, boost quality once loading is complete.
  // The auto detail system will then lower the quality again if needed.
  let performedInitialQualityBoost = false;

  scene.addEventListener("terrain_chunk_cpu_spike_over", () => {
    if (!performedInitialQualityBoost && !isBotMode) {
      performedInitialQualityBoost = true;

      let setToDefaultDefaultDetail = true;

      const isSoftware = isSoftwareRenderer();

      if (!isSoftware && window.APP.store.state.settings.defaultDetailLevel) {
        const now = Math.floor(new Date() / 1000.0);

        // The default detail level has an expiration date, for cases where the user has
        // re-configured their machine properly to use the GPU, etc.
        const applyUntil = window.APP.store.state.settings.defaultDetailLevelUntilSeconds;
        const shouldApplyDefaultDetailLevel = now < applyUntil;

        if (shouldApplyDefaultDetailLevel) {
          window.APP.detailLevel = window.APP.store.state.settings.defaultDetailLevel;
          setToDefaultDefaultDetail = false;
        }
      }

      // If not overridden, set the detail level to high and assume auto quality system will handle it.
      if (setToDefaultDefaultDetail) {
        window.APP.detailLevel = isSoftware ? 3 : 0;
        scene.renderer.setPixelRatio(isSoftware ? 1.0 : window.devicePixelRatio);
        scene.systems.effects.updateComposer = true;
      }
    }

    SYSTEMS.atmosphereSystem.enableAmbience();
    SYSTEMS.autoQualitySystem.startTracking();
  });

  scene.addEventListener("action_reset_objects", () => {
    // TOOD SHARED drop this
    const hubId = atomAccessManager.currentHubId;
    const metadata = hubMetadata.getMetadata(hubId);
    if (!metadata || !metadata.template || !metadata.template.name) return;

    resetTemplate(metadata.template.name);
  });
}

// Attempts to pause a-frame scene and rendering if tabbed away or maximized and window is blurred
function setupGameEnginePausing(scene) {
  const physics = scene.systems["hubs-systems"].physicsSystem;
  const autoQuality = scene.systems["hubs-systems"].autoQualitySystem;
  let disableAmbienceTimeout = null;

  const webglLoseContextExtension = scene.renderer.getContext().getExtension("WEBGL_lose_context");

  const apply = hidden => {
    if (document.visibilityState === "hidden" || hidden) {
      if (document.visibilityState === "visible") {
        scene.pause();

        // THREE bug - if this clock is not stopped we end up lerping audio listener positions over a long duration
        // because getDelta() returns a large value on resume.
        scene.audioListener && scene.audioListener._clock.stop();
        scene.renderer.animation.stop();
        SYSTEMS.externalCameraSystem.stopRendering();
      }

      UI.classList.add("paused");
      physics.updateSimulationRate(1000.0 / 15.0);
      // TODO presence.setInactive();
      clearTimeout(disableAmbienceTimeout);

      disableAmbienceTimeout = setTimeout(() => {
        SYSTEMS.atmosphereSystem.disableAmbience();
      }, 15000);
    } else {
      if (!scene.is("off")) {
        if (document.visibilityState === "visible") {
          // Hacky. On some platforms GL context needs to be explicitly restored. So do it.
          // This really shouldn't be necessary :P
          if (
            (!scene.renderer.getContext() || scene.renderer.getContext().isContextLost()) &&
            webglLoseContextExtension
          ) {
            webglLoseContextExtension.restoreContext();
          }

          scene.audioListener && scene.audioListener._clock.start();
          scene.play();
          scene.renderer.animation.start();
          SYSTEMS.externalCameraSystem.startRendering();
        }

        clearTimeout(disableAmbienceTimeout);
        UI.classList.remove("paused");
        physics.updateSimulationRate(1000.0 / 90.0);
        // TODO presence.setActive();
        SYSTEMS.atmosphereSystem.enableAmbience();
      }

      if (document.visibilityState === "visible") {
        autoQuality.startTracking();
      }
    }
  };

  // Need a timeout since tabbing in browser causes blur then focus rapidly
  let windowBlurredTimeout = null;

  if (!disablePausing) {
    document.addEventListener("visibilitychange", () => apply());

    window.addEventListener("blur", () => {
      // May be an iframe, don't pause in that case
      if (DOM_ROOT.activeElement?.contentWindow && DOM_ROOT.activeElement?.contentWindow.document.hasFocus()) {
        return;
      }

      const { pauseImmediatelyOnNextBlur } = window.APP;
      window.APP.pauseImmediatelyOnNextBlur = false;

      if (pauseImmediatelyOnNextBlur && document.visibilityState === "visible") {
        // HACK needed to deal with browser stealing window focus occasionally eg screen share nag
        // Force the pause because we want the user to click back in.
        clearTimeout(windowBlurredTimeout);
        apply(true);
        return;
      }

      // Stop tracking quality immediately on blur to make sure it doesn't drop it.
      autoQuality.stopTracking();

      // If there's a screen share active, don't pause since user may be watching on dual monitors.
      if (!performConservativePausing && hasActiveScreenShare()) return;

      windowBlurredTimeout = setTimeout(() => {
        apply(true);
      }, PAUSE_AFTER_BLUR_DURATION_MS);
    });

    window.addEventListener("focus", () => {
      clearTimeout(windowBlurredTimeout);
      apply(false);
    });
  }

  scene.addEventListener("stateadded", ({ detail }) => {
    if (detail === "off") {
      apply(true);
    }
  });

  scene.addEventListener("stateremoved", ({ detail }) => {
    if (detail === "off") {
      apply(false);
    }
  });
}

function setupSidePanelLayout(scene) {
  const handleSidebarResizerDrag = (selector, cssVars, isLeft, min, max, xToWidth, storeCallback) => {
    const dragTarget = DOM_ROOT.querySelector(selector);

    dragTarget.addEventListener("mousedown", () => {
      const handleMove = e => {
        const w = Math.min(max, Math.max(min, xToWidth(e.clientX)));

        for (let i = 0; i < cssVars.length; i++) {
          const propKey = `--${cssVars[i]}`;
          const propVal = `${w}px`;

          UI.style.setProperty(propKey, propVal);
          dragTarget.style.setProperty(propKey, propVal);
        }

        SYSTEMS.uiAnimationSystem.applySceneSize(isLeft ? w : null, !isLeft ? w : null, true);
        SYSTEMS.uiAnimationSystem.setTargetSceneSizes();
        scene.resize();

        storeCallback(w);
        e.preventDefault();
      };

      document.addEventListener("mousemove", handleMove);

      document.addEventListener(
        "mouseup",
        () => {
          scene.emit("side_panel_resize_complete");
          document.removeEventListener("mousemove", handleMove);
        },
        { once: true }
      );
    });
  };

  if (skipPanels) {
    for (const id of ["#nav-drag-target", "#presence-drag-target"]) {
      const el = DOM_ROOT.querySelector(id);
      el.parentNode.removeChild(el);
    }
  } else {
    handleSidebarResizerDrag(
      "#nav-drag-target",
      ["nav-width"],
      true,
      320,
      440,
      x => x,
      w => store.update({ uiState: { navPanelWidthPx: w } })
    );

    handleSidebarResizerDrag(
      "#presence-drag-target",
      ["presence-width"],
      false,
      222,
      312,
      x => window.innerWidth - x,
      w => store.update({ uiState: { presencePanelWidthPx: w } })
    );
  }
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
      remountJelUI({ hide: true });
    }

    UI.classList.add("vr-mode");

    availableVREntryTypesPromise.then(availableVREntryTypes => {
      // Don't stretch canvas on cardboard, since that's drawing the actual VR view :)
      if ((!isMobile && !isMobileVR) || availableVREntryTypes.cardboard !== VR_DEVICE_AVAILABILITY.yes) {
        UI.classList.add("vr-mode-stretch");
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
    UI.classList.remove("vr-mode");
    UI.classList.remove("vr-mode-stretch");

    remountJelUI({ hide: false });

    // HACK: Oculus browser pauses videos when exiting VR mode, so we need to resume them after a timeout.
    if (/OculusBrowser/i.test(window.navigator.userAgent)) {
      DOM_ROOT.querySelectorAll("[media-video]").forEach(m => {
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

async function setupUIBasedUponVRTypes() {
  if (isMobileVR) {
    if (/Oculus/.test(navigator.userAgent) && "getVRDisplays" in navigator) {
      // HACK - The polyfill reports Cardboard as the primary VR display on startup out ahead of
      // Oculus Go on Oculus Browser 5.5.0 beta. This display is cached by A-Frame,
      // so we need to resolve that and get the real VRDisplay before entering as well.
      const displays = await navigator.getVRDisplays();
      const vrDisplay = displays.length && displays[0];
      AFRAME.utils.device.getVRDisplay = () => vrDisplay;
    }
  }
}

function startBotModeIfNecessary(scene, entryManager) {
  if (isBotMode) {
    const onTerrainLoaded = () => {
      // Replace renderer with a noop renderer to reduce bot resource usage.
      runBotMode(scene, entryManager);

      scene.addEventListener("terrain_chunk_cpu_spike_over", onTerrainLoaded);
    };

    scene.addEventListener("terrain_chunk_cpu_spike_over", onTerrainLoaded);
  }
}

function addMissingDefaultHtml() {
  const bodyStyle = window.getComputedStyle(document.body);

  let headStyleTagBody = "";

  if (!document.doctype) {
    const nodeDoctype = document.implementation.createDocumentType("html", "", "");

    document.insertBefore(nodeDoctype, document.childNodes[0]);
  }

  if (!document.head.querySelector("meta[charset]")) {
    const metaTag = document.createElement("meta");
    metaTag.setAttribute("charset", "utf-8");
    document.head.appendChild(metaTag);
  }

  if (!document.head.querySelector("meta[name='viewport']")) {
    const metaTag = document.createElement("meta");
    metaTag.setAttribute("name", "viewport");
    metaTag.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    document.head.appendChild(metaTag);
  }

  if (!document.head.querySelector("meta[name='mobile-web-app-capable']")) {
    const metaTag = document.createElement("meta");
    metaTag.setAttribute("name", "mobile-web-app-capable");
    metaTag.setAttribute("content", "yes");
    document.head.appendChild(metaTag);
  }

  if (!document.head.querySelector("meta[name='theme-color']")) {
    const metaTag = document.createElement("meta");
    metaTag.setAttribute("name", "theme-color");
    metaTag.setAttribute("content", "black");
    document.head.appendChild(metaTag);
  }

  if (bodyStyle.margin !== "0px") {
    headStyleTagBody += "margin: 0; ";
  }

  if (bodyStyle.overflow !== "hidden") {
    headStyleTagBody += "overflow: hidden; ";
  }

  const bgColor = Color(bodyStyle.backgroundColor || "rgba(0,0,0,0.0)");
  if (bgColor.alpha() === 0) {
    headStyleTagBody += "background-color: #061139; ";
  }

  if (headStyleTagBody) {
    // img's are hidden too, to avoid browser fetch with loading="lazy"
    const styleTag = document.createElement("style");
    styleTag.innerText = `body * { display: none; } body { ${headStyleTagBody.trim()} }`;
    document.head.appendChild(styleTag);
  }

  if (!document.head.querySelector("title")) {
    const titleTag = document.createElement("title");
    titleTag.innerText = "Unnamed World";
    document.head.appendChild(titleTag);
  }
}

function pauseAllPlayableElements() {
  const pauseAll = () => {
    // Find all the video + audio tags in the dom, pause them if they're playing, and then add an event listener
    // when the play state changes to pause them again if they're played.
    for (const el of document.querySelectorAll("video, audio")) {
      el.pause();

      el.addEventListener("play", () => {
        el.pause();
      });
    }
  };

  new MutationObserver(pauseAll).observe(document.body, { subtree: false, childList: true });

  pauseAll();
}

// Need to add networking compatible ids to each element under the document root
async function patchUpManuallyAddedHtmlTags() {
  // Generator for new ids. Use random number generator based on doc contents
  // so it generates the same on each load across clients.
  const getRandomIdForEl = async (el, index) => {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(el.outerHTML + `${index}`));
    const rng = random.clone(seedrandom(fromByteArray(new Uint8Array(hash))));

    // Generate a string of 7 random alphanumerics
    let s = "";
    for (let i = 0; i < 7; i++) {
      s += String.fromCharCode(rng.float() < 0.2 ? rng.int(48, 57) : rng.int(97, 122));
    }
    return s;
  };

  const seenIds = new Set();

  for (let iChild = 0; iChild < document.body.children.length; iChild++) {
    const el = document.body.children[iChild];
    const id = el.id;

    // Manually added tags are assumed to be the ones with bad ids
    if (!id || !id.match(/^[a-z0-9]{7}$/) || (id && seenIds.has(id))) {
      el.id = await getRandomIdForEl(el, iChild);

      // Start out manually added tags as draggable
      el.setAttribute("draggable", "");

      // Turn label and marquee into h1s
      if (el.tagName === "MARQUEE" || el.tagName === "LABEL") {
        if (el.children.length === 0) {
          const h1 = document.createElement("h1");
          h1.innerText = el.innerText;
          el.innerHTML = h1.outerHTML;
        }
      }
    }

    seenIds.add(el.id);
  }
}

async function start() {
  if (!(await checkPrerequisites())) return;
  addMissingDefaultHtml();
  pauseAllPlayableElements();

  await patchUpManuallyAddedHtmlTags();

  let initialWorldHTML = `<!DOCTYPE html>\n<html><body>${document.body.innerHTML}</body></html>`;

  const useShadowDom = true;

  if (useShadowDom) {
    window.DOM_ROOT = document.body.attachShadow({ mode: "closed" });
  } else {
    const el = document.createElement("main");
    document.body.appendChild(el);
    el.getElementById = id => document.getElementById(id);
    window.DOM_ROOT = el;
  }

  AFRAME.selectorRoot = window.DOM_ROOT;
  window.DOM_ROOT._ready = false;

  const shadowStyles = document.createElement("style");
  shadowStyles.type = "text/css";
  shadowStyles.appendChild(document.createTextNode(SHADOW_DOM_STYLES));
  DOM_ROOT.appendChild(shadowStyles);
  const emojiLoadPromise = loadEmojis();

  DOM_ROOT.innerHTML += `
      <div id="jel-ui">
          <div id="jel-popup-root"></div>
          <div id="jel-react-root"></div>
      </div>

      <div id="support-root"></div>

      <div id="nav-drag-target"></div>
      <div id="presence-drag-target"></div>
      <div id="quill-container"></div>

      <div id="gaze-cursor">
          <div class="cursor"></div>
      </div>
  `;

  const tmp = document.createElement("div");
  tmp.innerHTML = AFRAME_DOM;

  const sceneReady = new Promise(r => tmp.children[0].addEventListener("nodeready", r, { once: true }));
  DOM_ROOT.appendChild(tmp.children[0]);
  window.UI = DOM_ROOT.getElementById("jel-ui");

  await sceneReady;

  // Patch the scene resize handler to update the camera properly, since the
  // camera system manages the projection matrix.
  const scene = DOM_ROOT.querySelector("a-scene");

  editRingManager.init(scene);

  const sceneResize = scene.resize.bind(scene);
  const resize = function() {
    sceneResize();
    SYSTEMS.cameraSystem.updateCameraSettings();
  };
  scene.resize = resize.bind(scene);

  // A-frame already wired up this event handler but we do this again since it doesn't seem to be working without this
  // since we moved to shadow DOM.
  window.addEventListener("resize", () => {
    setTimeout(() => {
      scene.resize();
    });
  });

  DOM_ROOT._ready = true;

  // Load the fonts

  const fontDoc = document.implementation.createHTMLDocument(""),
    fontStyles = document.createElement("style");

  fontStyles.textContent = `
    ${SansSerifFontCSS}
    ${SerifFontCSS}
    ${MonoFontCSS}
    ${ComicFontCSS}
    ${ComicFont2CSS}
    ${WritingFontCSS}
    ${LabelFontCSS}
  `;
  // the style will only be parsed once it is added to a document
  fontDoc.body.appendChild(fontStyles);

  for (const { style } of fontStyles.sheet.cssRules) {
    const src = style.getPropertyValue("src");
    const fontDisplay = style.getPropertyValue("font-display");
    const fontFamily = style.getPropertyValue("font-family");
    const fontWeight = style.getPropertyValue("font-weight");
    const fontStyle = style.getPropertyValue("font-style");
    const url = src.substring(5, src.indexOf('"', 6));
    const buf = await (await (await fetch(url)).blob()).arrayBuffer();
    const font = new FontFace(fontFamily, buf, { style: fontStyle, weight: fontWeight });
    font.display = fontDisplay || "swap";
    await font.load();

    document.fonts.add(font);
  }

  // The styled-components library adds a bunch of empty style tags when processing templates
  // in the 'master' stylesheet.
  [...document.querySelectorAll("style[data-styled]")].forEach(x => x.remove());

  document.dispatchEvent(new CustomEvent("shadow-root-ready"));

  registerNetworkSchemas();

  const canvas = DOM_ROOT.querySelector(".a-canvas");
  scene.renderer.setPixelRatio(1); // Start with low pixel ratio, quality adjustment system will raise

  canvas.setAttribute("tabindex", 0); // Make it so canvas can be focused

  if (navigator.serviceWorker && document.location.protocol !== "file:") {
    try {
      navigator.serviceWorker.register("/webspace.service.js");
    } catch (e) { // eslint-disable-line
    }
  }

  const entryManager = new SceneEntryManager();

  hideCanvas();

  await store.initDefaults();

  warmSerializeElement();

  window.APP.scene = scene;

  let focusCanvasTimeout = null;

  // Focus canvas if we mouse over it and aren't in an input field
  // Delay the focus change unless we're focused on the body, which means nothing
  // was focused.
  canvas.addEventListener("mouseover", () => {
    if (!isInEditableField() && !SYSTEMS.cameraSystem.isEditing()) {
      clearTimeout(focusCanvasTimeout);
      focusCanvasTimeout = setTimeout(() => {
        if (!isInEditableField()) {
          canvas.focus();
        }
      }, DOM_ROOT.activeElement === null ? 0 : 3000);
    }
  });

  canvas.addEventListener("mousedown", () => {
    if (!isInEditableField() && !SYSTEMS.cameraSystem.isEditing()) {
      SYSTEMS.uiAnimationSystem.collapseSidePanels();
    }
  });

  canvas.addEventListener("mousemove", async ({ buttons, clientX, clientY }) => {
    let leftDelta = 0;
    let rightDelta = 0;
    let bottomDelta = 0;

    const triggerSizePx = DOM_ROOT.querySelector("#left-expand-trigger").offsetWidth;
    const interaction = AFRAME.scenes[0].systems.interaction;

    // Ignore when holding.
    const held =
      interaction.state.leftHand.held ||
      interaction.state.rightHand.held ||
      interaction.state.rightRemote.held ||
      interaction.state.leftRemote.held;

    if (
      buttons === 0 && // No buttons
      DOM_ROOT.activeElement === canvas && // Over canvas
      !held && // Not holding
      !SYSTEMS.cameraSystem.isInspecting() // Not Inspecting
    ) {
      // Show expansion triggers when moving around canvas.
      const peekRegionPct = 0.2; // % of window width to peek

      // Hide when near corners, due to fitts
      // y margins to fully hide triggers
      const xMarginDisablePx = SYSTEMS.uiAnimationSystem.targetSceneLeft + 12.0;
      const yMarginDisablePx = 84.0;

      // y margins to slide out triggers
      const xMarginSlicePx = xMarginDisablePx + 64;
      const yMarginSlicePx = 148.0;

      if (clientX < window.innerWidth * peekRegionPct) {
        leftDelta = triggerSizePx * (1.0 - clientX / (window.innerWidth * peekRegionPct));
      } else if (clientX > window.innerWidth - window.innerWidth * peekRegionPct) {
        rightDelta = triggerSizePx * (1.0 - (window.innerWidth - clientX) / (window.innerWidth * peekRegionPct));
      }

      if (clientY > window.innerHeight - window.innerHeight * peekRegionPct) {
        bottomDelta = triggerSizePx * (1.0 - (window.innerHeight - clientY) / (window.innerHeight * peekRegionPct));
      }

      // Corner detection
      if (clientX <= xMarginDisablePx || clientX > window.innerWidth - xMarginDisablePx) {
        bottomDelta = 0;
      } else if (clientX < xMarginSlicePx) {
        const slideAmount = (clientX - xMarginDisablePx) / (xMarginSlicePx - xMarginDisablePx);
        bottomDelta *= slideAmount;
      } else if (clientX > window.innerWidth - xMarginSlicePx && clientX < window.innerWidth - xMarginDisablePx) {
        const slideAmount = (window.innerWidth - clientX - xMarginDisablePx) / (xMarginSlicePx - xMarginDisablePx);
        bottomDelta *= slideAmount;
      }

      if (clientY <= yMarginDisablePx || clientY > window.innerHeight - yMarginDisablePx) {
        leftDelta = 0;
        rightDelta = 0;
      } else if (clientY < yMarginSlicePx) {
        const slideAmount = (clientY - yMarginDisablePx) / (yMarginSlicePx - yMarginDisablePx);
        leftDelta *= slideAmount;
        rightDelta *= slideAmount;
      } else if (clientY > window.innerHeight - yMarginSlicePx && clientY < window.innerHeight - yMarginDisablePx) {
        const slideAmount = (window.innerHeight - clientY - yMarginDisablePx) / (yMarginSlicePx - yMarginDisablePx);
        leftDelta *= slideAmount;
        rightDelta *= slideAmount;
      }
    }

    // TODO permission dialog for placement API is annoying, just do bottom.
    const [, isRightEdge, isBottomEdge, isLeftEdge] = await getIsWindowAtScreenEdges();

    if (isLeftEdge) {
      DOM_ROOT.querySelector("#left-expand-trigger").setAttribute(
        "style",
        `left: ${-triggerSizePx + Math.floor(leftDelta)}px`
      );
    }

    if (isRightEdge) {
      DOM_ROOT.querySelector("#right-expand-trigger").setAttribute(
        "style",
        `right: ${-triggerSizePx + Math.floor(rightDelta)}px`
      );
    }

    if (isBottomEdge) {
      DOM_ROOT.querySelector("#bottom-expand-trigger").setAttribute(
        "style",
        `bottom: ${-triggerSizePx + Math.floor(bottomDelta)}px`
      );
    }
  });

  canvas.addEventListener("mouseout", () => {
    clearTimeout(focusCanvasTimeout);
    canvas.blur();
  });

  canvas.focus();

  scene.renderer.debug.checkShaderErrors = true;

  if (scene.hasLoaded) {
    initPhysicsThreeAndCursor(scene);
  } else {
    scene.addEventListener("loaded", () => initPhysicsThreeAndCursor(scene), { once: true });
  }

  addGlobalEventListeners(scene, entryManager, atomAccessManager);
  setupSidePanelLayout(scene);
  setupGameEnginePausing(scene);
  await emojiLoadPromise;

  const sessionId = nodeCrypto.randomBytes(20).toString("hex");

  remountJelUI({ sessionId });

  const availableVREntryTypesPromise = getAvailableVREntryTypes();

  setupVREventHandlers(scene, availableVREntryTypesPromise);
  setupUIBasedUponVRTypes(); // Note no await here, to avoid blocking
  startBotModeIfNecessary(scene, entryManager);
  clearHistoryState(history);

  atomAccessManager.addEventListener("permissions_updated", () => {
    const hubCan = atomAccessManager.hubCan.bind(atomAccessManager);
    const spaceCan = atomAccessManager.spaceCan.bind(atomAccessManager);
    const voxCan = atomAccessManager.voxCan.bind(atomAccessManager);

    remountJelUI({ hubCan, spaceCan, voxCan });

    // Switch off building mode if we cannot spawn media
    if (!hubCan("spawn_and_move_media")) {
      if (SYSTEMS.builderSystem.enabled) {
        SYSTEMS.builderSystem.toggle();
        SYSTEMS.launcherSystem.toggle();
      }
    }
  });

  scene.addEventListener("adapter-ready", () => NAF.connection.adapter.setClientId(sessionId));

  let nextSpaceToJoin;
  let nextHubToJoin;
  let joinHubPromise;

  console.log(`Logged into account ${store.state.credentials.public_key.x} ${store.state.credentials.public_key.y}`);

  const performJoin = async () => {
    // Handle rapid history changes, only join last one.
    const spaceId = await getSpaceIdFromHistory(history);
    const hubId = await getHubIdFromHistory(history);

    nextSpaceToJoin = spaceId;
    nextHubToJoin = hubId;

    if (joinHubPromise) await joinHubPromise;
    joinHubPromise = null;

    if (spaceChannel.spaceId !== spaceId && nextSpaceToJoin === spaceId) {
      store.update({ context: { spaceId } });

      const [treeManager] = await setupTreeManagers(history, entryManager, remountJelUI);
      const spaceMetadataSource = new IndexDOMSpaceMetadataSource(treeManager.worldNav);
      spaceMetadata.bind(spaceMetadataSource);

      const hubMetadataSource = new LocalDOMHubMetadataSource(treeManager.worldNav);
      hubMetadata.bind(hubMetadataSource);

      const voxMetadataSource = new VoxMetadataSource();
      voxMetadata.bind(voxMetadataSource);

      remountJelUI({ spaceId });
    }

    if (joinHubPromise) await joinHubPromise;
    joinHubPromise = null;

    if (hubChannel.hubId !== hubId && nextHubToJoin === hubId) {
      joinHubPromise = joinHub(scene, history, entryManager, remountJelUI, initialWorldHTML);
      initialWorldHTML = null;

      await joinHubPromise;
    }
  };

  history.listen(performJoin);

  await performJoin();

  entryManager.enterScene(false).then(() => {
    remountJelUI({ isDoneLoading: true });
  });
}

document.addEventListener("DOMContentLoaded", start);

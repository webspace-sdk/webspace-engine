import qsTruthy from "./utils/qs_truthy";
import nextTick from "./utils/next-tick";
import { hackyMobileSafariTest } from "./utils/detect-touchscreen";
import { ensureOwnership } from "./../jel/utils/ownership-utils";
import { MEDIA_TEXT_COLOR_PRESETS } from "../jel/components/media-text";
import { waitForShadowDOMContentLoaded } from "./utils/async-utils";
import { createVox } from "./utils/phoenix-utils";
import { switchCurrentHubToWorldTemplate } from "../jel/utils/template-utils";
import { retainPdf, releasePdf } from "../jel/utils/pdf-pool";
import defaultAvatar from "!!url-loader!../assets/hubs/models/DefaultAvatar.glb";
import { getHubIdFromHistory, getSpaceIdFromHistory } from "../jel/utils/jel-url-utils";
import { gatePermission } from "./utils/permissions-utils";

const { detect } = require("detect-browser");

const isBotMode = qsTruthy("bot");
const isMobile = AFRAME.utils.device.isMobile();
const forceEnableTouchscreen = hackyMobileSafariTest();
const qs = new URLSearchParams(location.search);

import {
  spawnMediaInfrontOfPlayer,
  performAnimatedRemove,
  snapEntityToBiggestNearbyScreen,
  addAndArrangeRoundtableMedia,
  upload
} from "./utils/media-utils";
import { handleExitTo2DInterstitial, exit2DInterstitialAndEnterVR } from "./utils/vr-interstitial";
import { ObjectContentOrigins } from "./object-types";
import { getAvatarType } from "./utils/avatar-utils";
import { pushHistoryState } from "./utils/history";
import { proxiedUrlFor } from "./utils/media-url-utils";

const isIOS = AFRAME.utils.device.isIOS();

export default class SceneEntryManager {
  constructor() {
    const { hubChannel, spaceChannel, atomAccessManager, history } = window.APP;
    this.spaceChannel = spaceChannel;
    this.hubChannel = hubChannel;
    this.atomAccessManager = atomAccessManager;
    this.store = window.APP.store;
    this.mediaSearchStore = window.APP.mediaSearchStore;
    this._entered = false;
    this.performConditionalSignIn = () => {};
    this.history = history;

    waitForShadowDOMContentLoaded().then(() => {
      this.scene = DOM_ROOT.querySelector("a-scene");
      this.rightCursorController = DOM_ROOT.getElementById("right-cursor-controller");
      this.leftCursorController = DOM_ROOT.getElementById("left-cursor-controller");
      this.avatarRig = DOM_ROOT.getElementById("avatar-rig");
    });
  }

  hasEntered = () => {
    return this._entered;
  };

  enterScene = async enterInVR => {
    if (enterInVR) {
      // This specific scene state var is used to check if the user went through the
      // entry flow and chose VR entry, and is used to preempt VR mode on refreshes.
      this.scene.addState("vr-entered");

      // HACK - A-Frame calls getVRDisplays at module load, we want to do it here to
      // force gamepads to become live.
      "getVRDisplays" in navigator && navigator.getVRDisplays();

      await exit2DInterstitialAndEnterVR(true);
    }

    if (isMobile || forceEnableTouchscreen || qsTruthy("mobile")) {
      this.avatarRig.setAttribute("virtual-gamepad-controls", {});
    }

    this._setupPlayerRig();
    this._setupBlocking();
    this._setupKicking();
    this._setupMedia();
    this._setupCamera();

    if (qsTruthy("offline")) return;

    this._spawnAvatar();

    this.scene.classList.remove("hand-cursor");
    this.scene.classList.add("no-cursor");

    await waitForShadowDOMContentLoaded();
    this._entered = true;
    this.store.update({ activity: { lastEnteredAt: new Date().toISOString() } });

    // Bump stored entry count after 30s
    setTimeout(() => this.store.bumpEntryCount(), 30000);

    this.scene.addState("entered");

    if (isBotMode) {
      //this._runBot(); // TODO JEL bots
    }
  };

  whenSceneLoaded = callback => {
    if (this.scene.hasLoaded) {
      callback();
    } else {
      this.scene.addEventListener("loaded", callback);
    }
  };

  enterSceneWhenLoaded = enterInVR => {
    this.whenSceneLoaded(() => this.enterScene(enterInVR));
  };

  exitScene = () => {
    this.scene.exitVR();
    if (NAF.connection.adapter && NAF.connection.adapter.localMediaStream) {
      NAF.connection.adapter.localMediaStream.getTracks().forEach(t => t.stop());
    }
    if (this.scene.renderer) {
      this.scene.renderer.setAnimationLoop(null); // Stop animation loop, TODO A-Frame should do this
    }
    this.scene.parentNode.removeChild(this.scene);
  };

  _setupPlayerRig = () => {
    this._setPlayerInfoFromProfile();

    // Explict user action changed avatar or updated existing avatar.
    this.scene.addEventListener("avatar_updated", () => this._setPlayerInfoFromProfile(true));

    // Store updates can occur to avatar id in cases like error, auth reset, etc.
    this.store.addEventListener("statechanged", () => this._setPlayerInfoFromProfile());

    const avatarScale = parseInt(qs.get("avatar_scale"), 10);
    if (avatarScale) {
      this.avatarRig.setAttribute("scale", { x: avatarScale, y: avatarScale, z: avatarScale });
    }
  };

  _setPlayerInfoFromProfile = async (force = false) => {
    const avatarId = this.store.state.profile.avatarId;
    if (!force && this._lastFetchedAvatarId === avatarId) return; // Avoid continually refetching based upon state changing

    this._lastFetchedAvatarId = avatarId;

    this.avatarRig.setAttribute("player-info", { avatarSrc: defaultAvatar, avatarType: getAvatarType(avatarId) });
  };

  _setupKicking = () => {
    // This event is only received by the kicker
    document.body.addEventListener("kicked", ({ detail }) => {
      const { clientId: kickedClientId } = detail;
      const { entities } = NAF.connection.entities;
      for (const id in entities) {
        const entity = entities[id];
        if (NAF.utils.getCreator(entity) !== kickedClientId) continue;

        if (entity.components.networked.data.persistent) {
          ensureOwnership(entity);
          entity.parentNode.removeChild(entity);
        } else {
          NAF.entities.removeEntity(id);
        }
      }
    });
  };

  _setupBlocking = () => {
    document.body.addEventListener("blocked", ev => {
      NAF.connection.entities.removeEntitiesOfClient(ev.detail.clientId);
    });

    document.body.addEventListener("unblocked", ev => {
      NAF.connection.entities.completeSync(ev.detail.clientId, true);
    });
  };

  _setupMedia = () => {
    this.scene.addEventListener("add_media", e => {
      const contentOrigin = e.detail instanceof File ? ObjectContentOrigins.FILE : ObjectContentOrigins.URL;

      spawnMediaInfrontOfPlayer({ src: e.detail, contentOrigin });
    });

    this.scene.addEventListener("add_media_text", e => {
      const [backgroundColor, foregroundColor] = MEDIA_TEXT_COLOR_PRESETS[
        window.APP.store.state.uiState.mediaTextColorPresetIndex || 0
      ];

      spawnMediaInfrontOfPlayer({
        contents: "",
        contentSubtype: e.detail,
        mediaOptions: { backgroundColor, foregroundColor }
      });
    });

    this.scene.addEventListener("add_media_vox", async () => {
      const spaceId = await getSpaceIdFromHistory(history);
      const hubId = await getHubIdFromHistory(history);
      const { voxSystem, builderSystem } = SYSTEMS;

      const {
        vox: [{ vox_id: voxId }]
      } = await createVox(spaceId, hubId);

      const sync = await voxSystem.getSync(voxId);
      await sync.setVoxel(0, 0, 0, builderSystem.brushVoxColor);
      await voxSystem.spawnVoxInFrontOfPlayer(voxId);
    });

    this.scene.addEventListener("add_media_emoji", ({ detail: emoji }) => {
      spawnMediaInfrontOfPlayer({ contents: emoji });
    });

    this.scene.addEventListener("add_media_exploded_pdf", async e => {
      let pdfUrl;

      const fileOrUrl = e.detail.fileOrUrl;
      const startPhi = e.detail.startPhi || -Math.PI;
      const endPhi = e.detail.endPhi || Math.PI;
      const width = e.detail.width || 3;
      const margin = e.detail.margin || 0.75;
      const hubId = await getHubIdFromHistory(history);

      // This is going to generate an array of media, get the URL first.
      if (fileOrUrl instanceof File) {
        if (!window.APP.atomAccessManager.canHub("upload_files")) return;

        const {
          origin,
          meta: { access_token }
        } = await upload(fileOrUrl, "application/pdf", hubId);

        const url = new URL(await proxiedUrlFor(origin));
        url.searchParams.set("token", access_token);
        pdfUrl = url.ref;
      } else {
        pdfUrl = fileOrUrl;
      }

      const pdf = await retainPdf(await proxiedUrlFor(pdfUrl));
      const numPages = pdf.numPages;

      const centerMatrixWorld = new THREE.Matrix4();
      const avatarPov = DOM_ROOT.querySelector("#avatar-pov-node");
      avatarPov.object3D.updateMatrices();
      centerMatrixWorld.copy(avatarPov.object3D.matrixWorld);

      for (let i = 0; i < numPages; i++) {
        addAndArrangeRoundtableMedia(
          centerMatrixWorld,
          pdfUrl,
          width,
          margin,
          numPages,
          i,
          { index: i, pagable: false },
          true,
          startPhi,
          endPhi
        );
      }

      releasePdf(pdf);
    });

    this.scene.addEventListener("action_spawn", () => {
      handleExitTo2DInterstitial(false, () => window.APP.mediaSearchStore.pushExitMediaBrowserHistory());
      window.APP.mediaSearchStore.sourceNavigateToDefaultSource();
    });

    this.scene.addEventListener("action_invite", () => {
      handleExitTo2DInterstitial(false, () => this.history.goBack());
      pushHistoryState(this.history, "overlay", "invite");
    });

    this.scene.addEventListener("action_kick_client", ({ detail: { clientId } }) => {
      console.log("kick", clientId);
      // TODO SHARED
    });

    this.scene.addEventListener("action_mute_client", ({ detail: { clientId } }) => {
      console.log("kick", clientId);
      // TODO SHARED
    });

    this.scene.addEventListener("action_switch_template", ({ detail: { worldTemplateId } }) => {
      switchCurrentHubToWorldTemplate(worldTemplateId);
    });

    document.addEventListener("paste", e => {
      if (!gatePermission("spawn_and_move_media")) return;
      SYSTEMS.pasteSystem.enqueuePaste(e);
    });

    document.addEventListener("dragover", e => e.preventDefault());

    this.scene.addEventListener("dragenter", e => {
      const { types } = e.dataTransfer;
      const transformSystem = this.scene.systems["transform-selected-object"];

      if (types.length === 1 && types[0] === "jel/vox" && !transformSystem.transforming) {
        SYSTEMS.voxSystem.beginPlacingDraggedVox();
      }
    });

    document.addEventListener("drop", e => {
      if (!gatePermission("spawn_and_move_media")) return;

      e.preventDefault();

      let url = e.dataTransfer.getData("url");

      if (!url) {
        // Sometimes dataTransfer text contains a valid URL, so try for that.
        try {
          url = new URL(e.dataTransfer.getData("text")).href;
        } catch (e) {
          // Nope, not this time.
        }
      }

      const files = e.dataTransfer.files;

      if (url) {
        spawnMediaInfrontOfPlayer({ src: url, contentOrigin: ObjectContentOrigins.URL });
      } else {
        for (const file of files) {
          spawnMediaInfrontOfPlayer({ src: file, contentOrigin: ObjectContentOrigins.FILE });
        }
      }
    });

    let isHandlingVideoShare = false;

    const shareVideoMediaStream = async (constraints, isDisplayMedia) => {
      if (isHandlingVideoShare) return;
      isHandlingVideoShare = true;

      let newStream;

      try {
        if (isDisplayMedia) {
          newStream = await navigator.mediaDevices.getDisplayMedia(constraints);
        } else {
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
      } catch (e) {
        isHandlingVideoShare = false;
        return;
      }

      const browser = detect();

      if (browser.name === "chrome") {
        // HACK Chrome will move focus to the screen share nag so pause immediately
        // to ensure user clicks back in.
        window.APP.pauseImmediatelyOnNextBlur = true;
      }

      const videoTracks = newStream ? newStream.getVideoTracks() : [];
      const mediaStreamSystem = this.scene.systems["hubs-systems"].mediaStreamSystem;

      if (videoTracks.length > 0) {
        // Clean up the media-stream entities (which are the entities that are
        // bound to this client's webrtc video stream) when the video track ends.
        const handleEndedVideoShareTrack = () => {
          if (isHandlingVideoShare) return;
          isHandlingVideoShare = true;

          const mediaStreamEntities = DOM_ROOT.querySelectorAll("[media-stream]");

          for (const mediaStreamEntity of mediaStreamEntities) {
            if (mediaStreamEntity && mediaStreamEntity.parentNode) {
              ensureOwnership(mediaStreamEntity);
              performAnimatedRemove(mediaStreamEntity);
            }
          }

          const audioSystem = this.scene.systems["hubs-systems"].audioSystem;
          audioSystem.removeStreamFromOutboundAudio("screenshare");

          this.scene.removeState("sharing_video");
          isHandlingVideoShare = false;
        };

        newStream.getVideoTracks().forEach(track => {
          mediaStreamSystem.addTrack(track);
          track.addEventListener("ended", handleEndedVideoShareTrack, { once: true });
        });

        if (newStream && newStream.getAudioTracks().length > 0) {
          const audioSystem = this.scene.systems["hubs-systems"].audioSystem;
          audioSystem.addStreamToOutboundAudio("screenshare", newStream);
        }

        const entity = spawnMediaInfrontOfPlayer({ src: mediaStreamSystem.mediaStream });

        // Snap screen share to screen
        entity.addEventListener(
          "media-loaded",
          () => {
            snapEntityToBiggestNearbyScreen(entity);
          },
          { once: true }
        );
      }

      this.scene.addState("sharing_video");
      isHandlingVideoShare = false;
    };

    this.scene.addEventListener("action_share_camera", () => {
      shareVideoMediaStream({
        video: {
          mediaSource: "camera",
          width: isIOS ? { max: 1280 } : { max: 2560 },
          frameRate: 30
        }
        //TODO: Capture audio from camera?
      });
    });

    this.scene.addEventListener("action_share_screen", () => {
      shareVideoMediaStream(
        {
          video: {
            // Work around BMO 1449832 by calculating the width. This will break for multi monitors if you share anything
            // other than your current monitor that has a different aspect ratio.
            width: 1080 * (screen.width / screen.height),
            height: 1080,
            frameRate: 30
          },
          audio: {
            echoCancellation: window.APP.store.state.preferences.disableEchoCancellation === true ? false : true,
            noiseSuppression: window.APP.store.state.preferences.disableNoiseSuppression === true ? false : true,
            autoGainControl: window.APP.store.state.preferences.disableAutoGainControl === true ? false : true
          }
        },
        true
      );
    });

    this.scene.addEventListener("action_end_video_sharing", async () => {
      const mediaStreamSystem = this.scene.systems["hubs-systems"].mediaStreamSystem;
      await mediaStreamSystem.stopVideoTracks();
    });

    this.mediaSearchStore.addEventListener("media-exit", () => {
      exit2DInterstitialAndEnterVR();
    });
  };

  _setupCamera = () => {
    this.scene.addEventListener("action_toggle_camera", () => {
      if (!this.atomAccessManager.hubCan("spawn_camera")) return;
      const myCamera = this.scene.systems["camera-tools"].getMyCamera();

      if (myCamera) {
        myCamera.parentNode.removeChild(myCamera);
        this.scene.removeState("camera");
      } else {
        const entity = document.createElement("a-entity");
        entity.setAttribute("networked", { template: "#interactable-camera" });
        entity.setAttribute("offset-relative-to", {
          target: "#avatar-pov-node",
          offset: { x: 0, y: 0, z: -1.5 }
        });
        this.scene.appendChild(entity);
        this.scene.addState("camera");
      }

      // Need to wait a frame so camera is registered with system.
      setTimeout(() => this.scene.emit("camera_toggled"));
    });

    this.scene.addEventListener("photo_taken", e => this.hubChannel.broadcastMessage({ src: e.detail }, "photo"));
    this.scene.addEventListener("video_taken", e => this.hubChannel.broadcastMessage({ src: e.detail }, "video"));
  };

  _spawnAvatar = () => {
    this.avatarRig.setAttribute("networked", "template: #remote-avatar; attachTemplateToLocal: false;");
    this.avatarRig.setAttribute("networked-avatar", "");
    this.avatarRig.emit("entered");
  };

  _runBot = async mediaStream => {
    const audioEl = document.createElement("audio");
    let audioInput;
    let dataInput;

    // Wait for startup to render form
    do {
      audioInput = DOM_ROOT.querySelector("#bot-audio-input");
      dataInput = DOM_ROOT.querySelector("#bot-data-input");
      await nextTick();
    } while (!audioInput || !dataInput);

    const getAudio = () => {
      audioEl.loop = true;
      audioEl.muted = true;
      audioEl.crossorigin = "anonymous";
      audioEl.src = URL.createObjectURL(audioInput.files[0]);
      document.body.appendChild(audioEl);
    };

    if (audioInput.files && audioInput.files.length > 0) {
      getAudio();
    } else {
      audioInput.onchange = getAudio;
    }

    const camera = DOM_ROOT.querySelector("#avatar-pov-node");
    const leftController = DOM_ROOT.querySelector("#player-left-controller");
    const rightController = DOM_ROOT.querySelector("#player-right-controller");
    const getRecording = () => {
      fetch(URL.createObjectURL(dataInput.files[0]))
        .then(resp => resp.json())
        .then(recording => {
          camera.setAttribute("replay", "");
          camera.components["replay"].poses = recording.camera.poses;

          leftController.setAttribute("replay", "");
          leftController.components["replay"].poses = recording.left.poses;
          leftController.removeAttribute("visibility-by-path");
          leftController.removeAttribute("track-pose");
          leftController.setAttribute("visible", true);

          rightController.setAttribute("replay", "");
          rightController.components["replay"].poses = recording.right.poses;
          rightController.removeAttribute("visibility-by-path");
          rightController.removeAttribute("track-pose");
          rightController.setAttribute("visible", true);
        });
    };

    if (dataInput.files && dataInput.files.length > 0) {
      getRecording();
    } else {
      dataInput.onchange = getRecording;
    }

    await new Promise(resolve => audioEl.addEventListener("canplay", resolve));
    mediaStream.addTrack(
      audioEl.captureStream
        ? audioEl.captureStream().getAudioTracks()[0]
        : audioEl.mozCaptureStream
          ? audioEl.mozCaptureStream().getAudioTracks()[0]
          : null
    );
    await NAF.connection.adapter.setLocalMediaStream(mediaStream);
    audioEl.play();
  };
}

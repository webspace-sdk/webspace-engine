import qsTruthy from "./utils/qs_truthy";
import nextTick from "./utils/next-tick";
import { hackyMobileSafariTest } from "./utils/detect-touchscreen";
import { ensureOwnership } from "./../jel/utils/ownership-utils";
import { MEDIA_TEXT_COLOR_PRESETS } from "../jel/components/media-text";
import { waitForDOMContentLoaded } from "./utils/async-utils";
const { detect } = require("detect-browser");

const isBotMode = qsTruthy("bot");
const isMobile = AFRAME.utils.device.isMobile();
const forceEnableTouchscreen = hackyMobileSafariTest();
const isMobileVR = AFRAME.utils.device.isMobileVR();
const isDebug = qsTruthy("debug");
const qs = new URLSearchParams(location.search);

import { spawnMediaInfrontOfPlayer, performAnimatedRemove } from "./utils/media-utils";
import {
  isIn2DInterstitial,
  handleExitTo2DInterstitial,
  exit2DInterstitialAndEnterVR,
  forceExitFrom2DInterstitial
} from "./utils/vr-interstitial";
import { ObjectContentOrigins } from "./object-types";
import { getAvatarSrc, getAvatarType } from "./utils/avatar-utils";
import { pushHistoryState } from "./utils/history";

const isIOS = AFRAME.utils.device.isIOS();

export default class SceneEntryManager {
  constructor(spaceChannel, hubChannel, authChannel, history) {
    this.spaceChannel = spaceChannel;
    this.hubChannel = hubChannel;
    this.authChannel = authChannel;
    this.store = window.APP.store;
    this.mediaSearchStore = window.APP.mediaSearchStore;
    this._entered = false;
    this.performConditionalSignIn = () => {};
    this.history = history;

    waitForDOMContentLoaded().then(() => {
      this.scene = document.querySelector("a-scene");
      this.rightCursorController = document.getElementById("right-cursor-controller");
      this.leftCursorController = document.getElementById("left-cursor-controller");
      this.avatarRig = document.getElementById("avatar-rig");
    });
  }

  hasEntered = () => {
    return this._entered;
  };

  enterScene = async enterInVR => {
    if (isDebug && NAF.connection.adapter.session) {
      NAF.connection.adapter.session.options.verbose = true;
    }

    if (isDebug && SAF.connection.adapter.session) {
      SAF.connection.adapter.session.options.verbose = true;
    }

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

    await waitForDOMContentLoaded();
    this._entered = true;

    // Delay sending entry event telemetry until VR display is presenting.
    this.spaceChannel.sendEnteredHubEvent().then(() => {
      this.store.update({ activity: { lastEnteredAt: new Date().toISOString() } });
    });

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
    if (this.hubChannel) {
      this.hubChannel.disconnect();
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
    const avatarSrc = await getAvatarSrc(avatarId);

    this.avatarRig.setAttribute("player-info", { avatarSrc, avatarType: getAvatarType(avatarId) });
  };

  _setupKicking = () => {
    // This event is only received by the kicker
    document.body.addEventListener("kicked", ({ detail }) => {
      // TODO JEL need to handle SAF
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
      // TODO JEL need to handle SAF
      NAF.connection.entities.removeEntitiesOfClient(ev.detail.clientId);
    });

    document.body.addEventListener("unblocked", ev => {
      // TODO JEL need to handle SAF
      NAF.connection.entities.completeSync(ev.detail.clientId, true);
    });
  };

  _setupMedia = () => {
    this.scene.addEventListener("add_media", e => {
      const contentOrigin = e.detail instanceof File ? ObjectContentOrigins.FILE : ObjectContentOrigins.URL;

      spawnMediaInfrontOfPlayer(e.detail, null, contentOrigin);
    });

    this.scene.addEventListener("add_media_text", e => {
      const [backgroundColor, foregroundColor] = MEDIA_TEXT_COLOR_PRESETS[
        window.APP.store.state.uiState.mediaTextColorPresetIndex || 0
      ];

      spawnMediaInfrontOfPlayer(null, "", null, e.detail, { backgroundColor, foregroundColor });
    });

    this.scene.addEventListener("add_media_emoji", ({ detail: emoji }) => {
      spawnMediaInfrontOfPlayer(null, emoji);
    });

    this.scene.addEventListener("object_spawned", e => {
      this.hubChannel.sendObjectSpawnedEvent(e.detail.objectType);
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
      this.performConditionalSignIn(
        () => this.hubChannel.can("kick_users"),
        async () => await window.APP.hubChannel.kick(clientId),
        "kick-user"
      );
    });

    this.scene.addEventListener("action_mute_client", ({ detail: { clientId } }) => {
      this.performConditionalSignIn(
        () => this.hubChannel.can("mute_users"),
        () => window.APP.hubChannel.mute(clientId),
        "mute-user"
      );
    });

    this.scene.addEventListener("action_vr_notice_closed", () => forceExitFrom2DInterstitial());

    document.addEventListener("paste", e => AFRAME.scenes[0].systems["hubs-systems"].pasteSystem.enqueuePaste(e));

    document.addEventListener("dragover", e => e.preventDefault());

    document.addEventListener("drop", e => {
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
        spawnMediaInfrontOfPlayer(url, null, ObjectContentOrigins.URL);
      } else {
        for (const file of files) {
          spawnMediaInfrontOfPlayer(file, null, ObjectContentOrigins.FILE);
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
        // HACK Chrome will move focus to the screen share nag so disable
        // the blur handler one time.
        window.APP.disableBlurHandlerOnceIfVisible = true;
      }

      const videoTracks = newStream ? newStream.getVideoTracks() : [];
      const mediaStreamSystem = this.scene.systems["hubs-systems"].mediaStreamSystem;

      if (videoTracks.length > 0) {
        // Clean up the media-stream entities (which are the entities that are
        // bound to this client's webrtc video stream) when the video track ends.
        const handleEndedVideoShareTrack = () => {
          if (isHandlingVideoShare) return;
          isHandlingVideoShare = true;

          const mediaStreamEntities = document.querySelectorAll("[media-stream]");

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

        spawnMediaInfrontOfPlayer(mediaStreamSystem.mediaStream);
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

    this.scene.addEventListener("action_selected_media_result_entry", async e => {
      // TODO spawn in space when no rights
      const { entry, selectAction } = e.detail;
      if (selectAction !== "spawn") return;

      const delaySpawn = isIn2DInterstitial() && !isMobileVR;
      await exit2DInterstitialAndEnterVR();

      // If user has HMD lifted up or gone through interstitial, delay spawning for now. eventually show a modal
      if (delaySpawn) {
        setTimeout(() => {
          spawnMediaInfrontOfPlayer(entry.url, null, ObjectContentOrigins.URL);
        }, 3000);
      } else {
        spawnMediaInfrontOfPlayer(entry.url, null, ObjectContentOrigins.URL);
      }
    });

    this.mediaSearchStore.addEventListener("media-exit", () => {
      exit2DInterstitialAndEnterVR();
    });
  };

  _setupCamera = () => {
    this.scene.addEventListener("action_toggle_camera", () => {
      if (!this.hubChannel.can("spawn_camera")) return;
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

    this.scene.addEventListener("photo_taken", e => this.hubChannel.sendMessage({ src: e.detail }, "photo"));
    this.scene.addEventListener("video_taken", e => this.hubChannel.sendMessage({ src: e.detail }, "video"));
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
      audioInput = document.querySelector("#bot-audio-input");
      dataInput = document.querySelector("#bot-data-input");
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

    const camera = document.querySelector("#avatar-pov-node");
    const leftController = document.querySelector("#player-left-controller");
    const rightController = document.querySelector("#player-right-controller");
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

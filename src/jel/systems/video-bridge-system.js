import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import { spawnMediaInfrontOfPlayer } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";

export class VideoBridgeSystem {
  constructor(sceneEl, audioSystem, externalCameraSystem, autoQualitySystem) {
    this.sceneEl = sceneEl;
    this.externalCameraSystem = externalCameraSystem;
    this.autoQualitySystem = autoQualitySystem;
    this.audioSystem = audioSystem;
    this.bridgeVideoCanvas = null;
    this.bridgeShareCanvas = null;
    this.isSettingUpBridge = false;
    this.watcherInterval = null;
  }

  async startBridge(type, id, password) {
    if (this.hasBridge()) return Promise.resolve();
    this.isSettingUpBridge = true;
    this.autoQualitySystem.stopTracking();

    const bridgeInfo = await fetchReticulumAuthenticated("/api/v1/video_bridge_keys", "POST", { type, id });

    const el = document.createElement("iframe");
    el.setAttribute("width", 1280);
    el.setAttribute("height", 720);
    el.setAttribute("id", "video-bridge-iframe");

    const spacePresences =
      window.APP.spaceChannel && window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state;
    const spacePresence = spacePresences && spacePresences[NAF.clientId];
    const meta = spacePresence && spacePresence.metas[spacePresence.metas.length - 1];

    const name = meta && meta.profile ? meta.profile.displayName : "New Member";

    await new Promise(res => {
      el.setAttribute("src", `/${type}.html`);

      const interval = setInterval(async () => {
        if (!el.contentWindow || !el.contentWindow.bridgeReady) return;

        clearInterval(interval);

        await el.contentWindow.join({
          apiKey: bridgeInfo.key,
          meetingNumber: id,
          password,
          name,
          signature: bridgeInfo.secret
        });

        const canvasInterval = setInterval(() => {
          const videoCanvas = el.contentDocument.getElementById("speak-view-video");
          const shareCanvas = el.contentDocument.querySelector(".sharee-container__canvas");
          const shareLayout = el.contentDocument.querySelector(".sharing-layout");

          if (!videoCanvas || !shareCanvas || !shareLayout) return;

          clearInterval(canvasInterval);
          this.externalCameraSystem.addExternalCamera();
          this.bridgeVideoCanvas = videoCanvas;
          this.bridgeShareCanvas = shareCanvas;

          el.contentWindow.bridgeAudioMediaStream = this.audioSystem.outboundStream;
          el.contentWindow.bridgeVideoMediaStream = this.externalCameraSystem.getExternalCameraStream();

          this.sceneEl.canvas.focus();
          const screen = spawnMediaInfrontOfPlayer(
            "jel://bridge/video",
            null,
            ObjectContentOrigins.URL,
            null,
            {},
            false,
            -2.25,
            1.0
          );
          screen.object3D.scale.setScalar(2.25);
          screen.object3D.matrixNeedsUpdate = true;

          // Add a slight delay because the bridge needs to finalize the streams.
          // This flag is used to disable the blur handler which causes problems when setting up the bridge.
          setTimeout(() => {
            this.autoQualitySystem.startTracking();
            this.isSettingUpBridge = false;
          }, 5000);

          this.watcherInterval = setInterval(() => {
            const hasEnded = el.contentWindow.bridgeStatus === "ended";
            if (hasEnded) {
              this.exitBridge();
              return;
            }

            const isScreenShareActive =
              shareLayout
                .getAttribute("style")
                .replaceAll(" ", "")
                .toLowerCase()
                .indexOf("display:block") >= 0;
            const src = isScreenShareActive ? "jel://bridge/share" : "jel://bridge/video";

            if (screen.components["media-canvas"].data.src !== src) {
              screen.setAttribute("media-canvas", { src });
            }
          }, 2000);

          res();
        }, 500);
      }, 500);

      document.body.append(el);
    });
  }

  hasBridge() {
    return !!document.getElementById("video-bridge-iframe");
  }

  async exitBridge() {
    if (!this.hasBridge()) return;

    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = null;
    }

    // Remove media elements
    const els = document.querySelectorAll("[media-canvas]");
    const toRemove = [];
    for (const el of els) {
      if (el.components["media-canvas"].data.src.startsWith("jel://bridge")) {
        toRemove.push(el);
      }
    }

    for (const el of toRemove) {
      el.parentElement.removeChild(el);
    }

    this.bridgeVideoCanvas = null;

    const bridge = document.getElementById("video-bridge-iframe");
    await bridge.contentWindow.leave();
    bridge.parentElement.removeChild(bridge);
    this.externalCameraSystem.removeExternalCamera();
  }
}

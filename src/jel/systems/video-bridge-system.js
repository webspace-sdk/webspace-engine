import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import { spawnMediaInfrontOfPlayer } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import ScreenQuad from "../objects/screen-quad";
import { toHexDigest } from "../utils/crypto-utils";

const PREVIEW_HEIGHT = 160;
const PREVIEW_WIDTH = 300;
const PREVIEW_LEFT_OFFSET = 14;
const PREVIEW_BOTTOM_OFFSET = 196;

export class VideoBridgeSystem {
  constructor(sceneEl, audioSystem, externalCameraSystem, autoQualitySystem) {
    this.sceneEl = sceneEl;
    this.scene = sceneEl.object3D;
    this.externalCameraSystem = externalCameraSystem;
    this.autoQualitySystem = autoQualitySystem;
    this.audioSystem = audioSystem;
    this.bridgeVideoCanvas = null;
    this.bridgeShareCanvas = null;
    this.isSettingUpBridge = false;
    this.watcherInterval = null;
    this.videoPreview = null;
    this.sharePreview = null;
    this.videoPreviewTexture = null;
    this.sharePreviewTexture = null;
    this.isScreenShareActive = false;

    window.addEventListener("resize", () => {
      // Need to wait for canvas to be resized.
      setTimeout(() => {
        this.updatePreviews();
      }, 500);
    });

    this.sceneEl.addEventListener("animated_resize_complete", () => this.updatePreviews());
  }

  updatePreviews() {
    const { sceneEl, videoPreview, sharePreview } = this;
    const canvas = sceneEl.canvas;
    const w = canvas.width;
    const h = canvas.height;

    for (const preview of [videoPreview, sharePreview]) {
      if (!preview) continue;

      preview.setTop(1.0 - PREVIEW_BOTTOM_OFFSET / h - PREVIEW_HEIGHT / h);
      preview.setLeft(PREVIEW_LEFT_OFFSET / w);
      preview.setWidth(PREVIEW_WIDTH / w);
      preview.setHeight(PREVIEW_HEIGHT / h);
    }
  }

  async startBridge(type, id, password, width = 640, height = 360) {
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

        // Register bridge hash in presence so others can id when in same bridge.
        const bridgeId = await toHexDigest(`${type}${id}`);
        window.APP.spaceChannel.startBridge(bridgeId);

        const canvasInterval = setInterval(() => {
          const videoCanvas = el.contentDocument.getElementById("speak-view-video");
          const shareCanvas = el.contentDocument.querySelector(".sharee-container__canvas");
          const shareLayout = el.contentDocument.querySelector(".sharing-layout");

          if (!videoCanvas || !shareCanvas || !shareLayout) return;

          clearInterval(canvasInterval);
          this.externalCameraSystem.addExternalCamera(width, height);
          this.bridgeVideoCanvas = videoCanvas;
          this.bridgeShareCanvas = shareCanvas;

          this.videoPreviewTexture = new THREE.CanvasTexture(this.bridgeVideoCanvas);

          this.videoPreview = new ScreenQuad({ texture: this.videoPreviewTexture });

          this.videoPreview.visible = true;

          this.scene.add(this.videoPreview);

          this.updatePreviews();

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

            this.isScreenShareActive =
              shareLayout
                .getAttribute("style")
                .replaceAll(" ", "")
                .toLowerCase()
                .indexOf("display:block") >= 0;
            const src = this.isScreenShareActive ? "jel://bridge/share" : "jel://bridge/video";

            if (screen.components["media-canvas"].data.src !== src) {
              screen.setAttribute("media-canvas", { src });
              this.showPreview();
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

  hidePreview() {
    if (this.videoPreview) {
      this.videoPreview.visible = false;
    }

    if (this.sharePreview) {
      this.sharePreview.visible = false;
    }
  }

  showPreview() {
    if (this.isScreenShareActive && !this.sharePreview && this.bridgeShareCanvas) {
      // Lazily create share preview since canvas is sized properly later.
      this.sharePreviewTexture = new THREE.CanvasTexture(this.bridgeShareCanvas);
      this.sharePreview = new ScreenQuad({ texture: this.sharePreviewTexture });
      this.scene.add(this.sharePreview);
      this.updatePreviews();
    }

    this.videoPreview.visible = !this.isScreenShareActive;

    if (this.sharePreview) {
      this.sharePreview.visible = this.isScreenShareActive;
    }
  }

  tick() {
    if (this.videoPreview && this.videoPreview.visible) {
      this.videoPreviewTexture.needsUpdate = true;
    }

    if (this.sharePreview && this.sharePreview.visible) {
      this.sharePreviewTexture.needsUpdate = true;
    }
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
    this.bridgeShareCanvas = null;

    if (this.videoPreview) {
      this.scene.remove(this.videoPreview);
      this.videoPreview = null;
    }

    if (this.sharePreview) {
      this.scene.remove(this.sharePreview);
      this.sharePreview = null;
    }

    if (this.videoPreviewTexture) {
      this.videoPreviewTexture.dispose();
      this.sharePreviewTexture.dispose();

      this.videoPreviewTexture = null;
      this.sharePreviewTexture = null;
    }

    const bridge = document.getElementById("video-bridge-iframe");
    await bridge.contentWindow.leave();
    bridge.parentElement.removeChild(bridge);
    this.externalCameraSystem.removeExternalCamera();
    window.APP.spaceChannel.exitBridge();
  }
}

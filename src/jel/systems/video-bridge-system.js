import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";
import { spawnMediaInfrontOfPlayer } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";

export class VideoBridgeSystem {
  constructor(sceneEl, audioSystem, externalCameraSystem) {
    this.sceneEl = sceneEl;
    this.externalCameraSystem = externalCameraSystem;
    this.audioSystem = audioSystem;
    this.bridgeVideoCanvas = null;
    this.isSettingUpBridge = false;
  }

  async startBridge(type, id, password) {
    if (this.hasBridge()) return Promise.resolve();
    this.isSettingUpBridge = true;

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
          const canvas = el.contentDocument.getElementById("speak-view-video");
          if (!canvas) return;
          clearInterval(canvasInterval);
          this.externalCameraSystem.addExternalCamera();
          this.bridgeVideoCanvas = canvas;

          el.contentWindow.bridgeAudioMediaStream = this.audioSystem.outboundStream;
          el.contentWindow.bridgeVideoMediaStream = this.externalCameraSystem.getExternalCameraStream();

          this.sceneEl.canvas.focus();
          spawnMediaInfrontOfPlayer("jel://bridge/video", null, ObjectContentOrigins.URL, null, {}, false);

          // Add a slight delay because the bridge needs to finalize the streams.
          // This flag is used to disable the blur handler which causes problems when setting up the bridge.
          setTimeout(() => (this.isSettingUpBridge = false), 5000);

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

    this.bridgeVideoCanvas = null;

    const bridge = document.getElementById("video-bridge-iframe");
    await bridge.contentWindow.leave();
    bridge.parentElement.removeChild(bridge);
    this.externalCameraSystem.removeExternalCamera();
  }
}

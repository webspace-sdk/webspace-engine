import { fetchReticulumAuthenticated } from "../../hubs/utils/phoenix-utils";

export class VideoBridgeSystem {
  constructor() {}

  async startBridge(type, id, password) {
    if (this.hasBridge()) return Promise.resolve();

    const bridgeInfo = await fetchReticulumAuthenticated("/api/v1/video_bridge_keys", "POST", { type, id });
    console.log(bridgeInfo);

    const el = document.createElement("iframe");
    el.setAttribute("width", 1280);
    el.setAttribute("height", 720);
    el.setAttribute("id", "video-bridge-iframe");
    const name = "Test Guy";

    await new Promise(res => {
      el.setAttribute("src", `/${type}.html`);

      const interval = setInterval(async () => {
        console.log("waiting ", el.contentWindow, el.contentWindow && el.contentWindow.bridgeReady);
        if (!el.contentWindow || !el.contentWindow.bridgeReady) return;
        clearInterval(interval);
        console.log("bridge ready, joining");
        await el.contentWindow.join({
          apiKey: bridgeInfo.key,
          meetingNumber: id,
          password,
          name,
          signature: bridgeInfo.secret
        });
        console.log("joined, waiting for canvas");

        const canvasInterval = setInterval(() => {
          const canvas = el.contentDocument.getElementById("speak-view-video");
          if (!canvas) return;
          clearInterval(canvasInterval);
          console.log("got canvas, waiting for streams");

          res();
        }, 500);
      }, 500);

      console.log("add");
      document.body.append(el);
    });

    // Yield back a function setBridgeStreams(audio, video)
    return (audioStream, videoStream) => {
      console.log("got streams");
      el.contentWindow.bridgeAudioMediaStream = audioStream;
      el.contentWindow.bridgeVideoMediaStream = videoStream;
    };
  }

  hasBridge() {
    !!document.getElementById("video-bridge-iframe");
  }

  async exitBridge() {
    if (!this.hasBridge()) return;

    const bridge = document.getElementById("video-bridge-iframe");
    await bridge.contentWindow.leave();
    bridge.parentElement.removeChild(bridge);
  }
}

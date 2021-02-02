export class VideoBridgeSystem {
  constructor() {}

  startBridge(joinInfo) {
    if (this.hasBridge()) return Promise.resolve();

    return new Promise(res => {
      const el = document.createElement("video-bridge-iframe");
      el.setAttribute("src", `/${joinInfo.type}.html`);

      const interval = setInterval(async () => {
        if (!el.contentWindow || !el.contentWindow.bridgeReady) return;
        clearInterval(interval);
        console.log("bridge ready, joining");
        await el.contentWindow.join(joinInfo);
        console.log("joined, waiting for canvas");

        const canvasInterval = setInterval(() => {
          const canvas = el.contentDocument.getElementById("speak-view-video");
          if (!canvas) return;
          clearInterval(canvasInterval);
          console.log("got canvas, waiting for streams");

          // Yield back a function setBridgeStreams(audio, video)
          res((audioStream, videoStream) => {
            console.log("got streams");
            el.contentWindow.bridgeAudioMediaStream = audioStream;
            el.contentWindow.bridgeVideoMediaStream = videoStream;
          });
        }, 500);
      }, 500);

      document.body.append(el);
    });
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

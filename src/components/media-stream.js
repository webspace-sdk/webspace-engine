// This component is added to media-video entities that are sharing the video
// stream from this client.
AFRAME.registerComponent("media-stream", {
  remove() {
    const streams = DOM_ROOT.querySelectorAll("[media-stream]");
    if (streams.length > 0) return;

    // No entities left, end the stream.
    this.el.sceneEl.emit("action_end_video_sharing");
  }
});

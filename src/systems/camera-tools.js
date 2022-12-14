import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import { isMine } from "../utils/ownership-utils";

const CAMERA_UPDATE_FRAME_DELAY = 10; // Update one camera every N'th frame

// Used for tracking and managing camera tools in the scene
AFRAME.registerSystem("camera-tools", {
  init() {
    this.cameraEls = [];
    this.cameraUpdateCount = 0;
    this.ticks = 0;
    this.updateMyCamera = this.updateMyCamera.bind(this);

    waitForShadowDOMContentLoaded().then(() => {
      const playerModelEl = DOM_ROOT.querySelector("#avatar-rig .model");
      playerModelEl.addEventListener("model-loading", () => (this.playerHead = null));
      playerModelEl.addEventListener("model-loaded", this.updatePlayerHead.bind(this));
      this.updatePlayerHead();
      this.updateMyCamera();
    });
  },

  updatePlayerHead() {
    const headEl = DOM_ROOT.getElementById("avatar-head");
    this.playerHead = headEl && headEl.object3D;
  },

  register(el) {
    this.cameraEls.push(el);
    el.addEventListener("ownership-changed", this.updateMyCamera);
    this.updateMyCamera();
  },

  deregister(el) {
    this.cameraEls = this.cameraEls.filter(c => c !== el);
    el.removeEventListener("ownership-changed", this.updateMyCamera);
    this.updateMyCamera();
  },

  getMyCamera() {
    return this.myCamera;
  },

  ifMyCameraRenderingViewfinder(f) {
    if (!this.myCamera) return;

    const myCameraTool = this.myCamera.components["camera-tool"];

    if (myCameraTool && myCameraTool.showCameraViewfinder && myCameraTool.camera) {
      f(myCameraTool);
    }
  },

  updateMyCamera() {
    if (!this.cameraEls) {
      this.myCamera = null;
    } else {
      this.myCamera = this.cameraEls.find(isMine);
    }
  },

  tick() {
    this.ticks++;

    // We update at most one camera viewfinder per frame.
    if (this.ticks % CAMERA_UPDATE_FRAME_DELAY === 0) {
      if (this.cameraEls.length == 0) return;

      this.cameraUpdateCount++;
      this.cameraEls[this.cameraUpdateCount % this.cameraEls.length].components["camera-tool"].updateViewfinder();
    }
  }
});

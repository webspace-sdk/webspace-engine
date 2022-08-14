import { ScenePreviewCameraSystem } from "./scene-preview-camera-system";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";

AFRAME.registerSystem("scene-systems", {
  init() {
    waitForShadowDOMContentLoaded().then(() => {
      this.DOMContentDidLoad = true;
    });
    this.scenePreviewCameraSystem = new ScenePreviewCameraSystem();
  },

  tick() {
    if (!this.DOMContentDidLoad) return;
    this.scenePreviewCameraSystem.tick();
  }
});

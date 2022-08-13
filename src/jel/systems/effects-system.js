import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import CubeSSAOPass from "../effects/cube-ssao";

AFRAME.registerSystem("effects", {
  init: function() {
    waitForDOMContentLoaded().then(() => {
      this.viewingCameraEl = DOM_ROOT.getElementById("viewing-camera");
    });

    window.addEventListener("resize", () => (this.updateComposer = true));

    this.el.addEventListener("side_panel_resize_complete", () => (this.updateComposer = true));

    this.updateComposer = true;
  },

  tick: function() {
    if (!this.sceneEl.renderer) return;

    if (!this.playerCamera) {
      if (!this.viewingCameraEl) return;
      this.playerCamera = this.viewingCameraEl.getObject3D("camera");
      if (!this.playerCamera) return;
    }

    const renderer = this.sceneEl.renderer;

    if (this.updateComposer && renderer) {
      this.updateComposer = false;

      const camera = this.playerCamera;
      const scene = this.sceneEl.object3D;
      const { width, height } = this.sceneEl.getBoundingClientRect();
      const pixelRatio = renderer.getPixelRatio();
      const w = Math.floor(width * pixelRatio);
      const h = Math.floor(height * pixelRatio);
      const aoRadius = 5.0 * pixelRatio;

      if (!this.composer) {
        this.composer = new EffectComposer(renderer);

        this.ssaoPass = new CubeSSAOPass(scene, camera, w, h);

        this.ssaoPass.needsSwap = false;

        this.composer.addPass(this.ssaoPass);

        this.disableEffects = false;

        const render = renderer.render;
        let isEffectSystem = false;
        const self = this;

        renderer.render = function() {
          if (isEffectSystem || self.disableEffects) {
            render.apply(this, arguments);
          } else {
            isEffectSystem = true;
            self.composer.render();
            isEffectSystem = false;
          }
        };
      }

      this.ssaoPass.setSize(w, h);
      this.ssaoPass.setAORadius(Math.max(2.0, aoRadius));
      this.composer.setSize(w, h);
    }
  }
});

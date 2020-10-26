import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import CubeSSAOPass from "../effects/cube-ssao";

AFRAME.registerSystem("effects", {
  init: function() {
    waitForDOMContentLoaded().then(() => {
      this.viewingCameraEl = document.getElementById("viewing-camera");
    });

    window.addEventListener("resize", () => (this.updateComposer = true));

    this.el.addEventListener("animated_resize_started", () => {
      // Speed up framerate while resizing by disabling FXAA and copy passes
      this.ssaoPass.enableFXAA = false;
    });

    this.el.addEventListener("animated_resize_complete", () => {
      this.ssaoPass.enableFXAA = true;
      this.updateComposer = true;
    });

    this.updateComposer = true;
  },

  tick: function(t, dt) {
    if (!this.playerCamera) {
      if (!this.viewingCameraEl) return;
      this.playerCamera = this.viewingCameraEl.getObject3D("camera");
      if (!this.playerCamera) return;
    }

    if (this.updateComposer) {
      this.updateComposer = false;

      const camera = this.playerCamera;
      const scene = this.sceneEl.object3D;
      const renderer = this.sceneEl.renderer;
      const { width, height } = this.sceneEl.getBoundingClientRect();
      const pixelRatio = renderer.getPixelRatio();
      const w = width * pixelRatio;
      const h = height * pixelRatio;

      if (!this.composer) {
        this.composer = new EffectComposer(renderer);

        this.ssaoPass = new CubeSSAOPass(scene, camera, w, h);

        this.ssaoPass.material.uniforms.offset.value = 0.35;
        this.ssaoPass.material.uniforms.darkness.value = 5.0;
        this.ssaoPass.material.uniforms.saturation.value = 0.35;
        this.ssaoPass.material.uniforms.brightness.value = 0.1;

        this.composer.addPass(this.ssaoPass);

        this.ssaoPass.enabled = this.highQuality;

        this.disableEffects = false;

        const render = renderer.render;
        let isEffectSystem = false;
        const self = this;

        renderer.render = function() {
          if (isEffectSystem || self.disableEffects) {
            render.apply(this, arguments);
          } else {
            isEffectSystem = true;
            self.composer.render(dt * 1000);
            isEffectSystem = false;
          }
        };
      }

      this.ssaoPass.setSize(w, h);
      this.composer.setSize(w, h);
    }
  }
});

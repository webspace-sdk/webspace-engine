import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import CubeSSAOPass from "../effects/cube-ssao";

AFRAME.registerSystem("effects", {
  init: function() {
    waitForDOMContentLoaded().then(() => {
      this.viewingCameraEl = document.getElementById("viewing-camera");
    });

    window.addEventListener("resize", () => (this.updateComposer = true));
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
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.renderPass = new RenderPass(scene, camera);

        this.ssaoPass.material.uniforms.offset.value = 0.35;
        this.ssaoPass.material.uniforms.darkness.value = 5.0;
        this.ssaoPass.material.uniforms.saturation.value = 0.35;
        this.ssaoPass.material.uniforms.brightness.value = 0.1;

        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.ssaoPass);
        // TODO need to stencil this against text
        // this.composer.addPass(this.fxaaPass);

        // TODO quality
        this.highQuality = true;
        this.renderPass.enabled = !this.highQuality;
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

      this.fxaaPass.material.uniforms.resolution.value.x = 1 / w;
      this.fxaaPass.material.uniforms.resolution.value.y = 1 / h;
      this.ssaoPass.setSize(w, h);
      this.composer.setSize(w, h);
    }
  }
});

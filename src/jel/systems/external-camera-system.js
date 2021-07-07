import patchThreeAllocations from "../..//hubs/utils/threejs-allocation-patches";
import patchThreeNoProgramDispose from "../../jel/utils/threejs-avoid-disposing-programs";

const tmpVec3 = new THREE.Vector3();
const lookAtMatrix = new THREE.Matrix4();
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import CubeSSAOPass from "../effects/cube-ssao";

export class ExternalCameraSystem {
  constructor(sceneEl, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem, wrappedEntitySystem) {
    this.sceneEl = sceneEl;
    this.scene = sceneEl.object3D;
    this.renderer = null;
    this.camera = null;
    this.canvas = null;
    this.track = null;
    this.atmosphereSystem = atmosphereSystem;
    this.terrainSystem = terrainSystem;
    this.cameraSystem = cameraSystem;
    this.avatarSystem = avatarSystem;
    this.wrappedEntitySystem = wrappedEntitySystem;
    this.trackedEntity = null;
    this.viewingCameraSelected = false;
    this.forceViewingCamera = false;
    this.viewingCamera = null;
    this.webglLoseContextExtension = null;
  }

  isEnabled() {
    return !!this.renderer;
  }

  // Toggle between the tracked entity and the viewing camera for position
  toggleCamera() {
    this.viewingCameraSelected = !this.viewingCameraSelected;
  }

  // Force showing the viewing camera until releaseForcedViewingCamera is called
  enableForcedViewingCamera() {
    this.forceViewingCamera = true;
  }

  // Restore showing the previous camera before forceViewingCamera was called
  releaseForcedViewingCamera() {
    this.forceViewingCamera = false;
  }

  addExternalCamera(width, height, enablePostprocessing = false, contextAttributes = {}) {
    if (this.camera) return;
    if (!this.viewingCamera) {
      const viewingCameraEl = document.getElementById("viewing-camera");

      if (viewingCameraEl && viewingCameraEl.components.camera.camera) {
        this.viewingCamera = viewingCameraEl.components.camera.camera;
      }
    }

    const { scene, sceneEl, wrappedEntitySystem } = this;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 26);

    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 4, 0.05);
    camera.matrixNeedsUpdate = true;

    scene.add(camera);
    wrappedEntitySystem.register(camera);

    const canvas = document.getElementById("external-camera-canvas");
    canvas.width = width;
    canvas.height = height;

    sceneEl.emit("external_camera_added");

    const context = canvas.getContext("webgl2", {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "default",
      xrCompatible: true,
      ...contextAttributes
    });

    const rendererConfig = {
      alpha: false,
      antialias: false,
      canvas,
      context,
      logarithmicDepthBuffer: false,
      forceWebVR: false,
      colorManagement: true,
      sortObjects: false,
      physicallyCorrectLights: true,
      webgl2: true,
      multiview: false
    };

    const renderer = new THREE.WebGLRenderer(rendererConfig);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.soft = true;
    renderer.setPixelRatio(sceneEl.renderer.getPixelRatio());

    patchThreeAllocations(renderer);
    patchThreeNoProgramDispose(renderer);

    if (enablePostprocessing) {
      const pixelRatio = renderer.getPixelRatio();
      const w = Math.floor(width * pixelRatio);
      const h = Math.floor(height * pixelRatio);
      const aoRadius = 5.0 * pixelRatio;
      const composer = new EffectComposer(renderer);
      const ssaoPass = new CubeSSAOPass(scene, camera, w, h);

      ssaoPass.needsSwap = false;
      composer.addPass(ssaoPass);
      ssaoPass.setSize(w, h);
      ssaoPass.setAORadius(Math.max(2.0, aoRadius));
      composer.setSize(w, h);

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

      this.composer = composer;
      this.ssaoPass = ssaoPass;
    }

    this.camera = camera;
    this.renderer = renderer;
    this.canvas = canvas;
    this.webglLoseContextExtension = renderer.getContext().getExtension("WEBGL_lose_context");
  }

  setExternalCameraTrackedEntity(entity) {
    this.trackedEntity = entity;
  }

  getExternalCameraStream() {
    if (!this.canvas) return;

    this.stream = this.canvas.captureStream(0);
    this.track = this.stream.getVideoTracks()[0];

    return this.stream;
  }

  removeExternalCamera() {
    const { camera, track, renderer, ssaoPass, scene, sceneEl, wrappedEntitySystem } = this;
    if (!camera) return;

    wrappedEntitySystem.unregister(camera);
    scene.remove(camera);
    renderer.dispose();

    if (ssaoPass) {
      ssaoPass.dispose();
    }

    if (track) {
      track.stop();
    }

    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.ssaoPass = null;
    this.canvas = null;
    this.stream = null;
    this.track = null;
    this.trackedEntity = null;

    sceneEl.emit("external_camera_removed");
  }

  tock(t) {
    const {
      scene,
      atmosphereSystem,
      terrainSystem,
      cameraSystem,
      avatarSystem,
      wrappedEntitySystem,
      renderer,
      camera,
      track,
      trackedEntity,
      viewingCameraSelected,
      forceViewingCamera,
      viewingCamera
    } = this;
    if (!renderer) return;

    const { videoBridgeSystem } = SYSTEMS;
    const { playerHead } = cameraSystem;
    const head = playerHead && playerHead.object3D;
    const ikController = playerHead && playerHead.parentEl.parentEl.parentEl.parentEl.components["ik-controller"];

    const oldOnAfterRender = scene.onAfterRender;
    const waterNeededUpdate = atmosphereSystem.water.needsUpdate;
    let didRevealHead = false;

    terrainSystem.cullChunksAndFeatureGroups(camera);
    videoBridgeSystem.hidePreview();

    if ((viewingCameraSelected || forceViewingCamera) && viewingCamera) {
      viewingCamera.getWorldPosition(camera.position);
      viewingCamera.getWorldQuaternion(camera.quaternion);
    } else {
      if (head && !head.visible && ikController) {
        didRevealHead = true;

        head.visible = true;
        head.scale.copy(ikController.headScale);
        head.updateMatrices(true, true);
        head.updateMatrixWorld(true, true);

        // Update self avatar to ensure head is renderer
        avatarSystem.processAvatars(t, true);

        head.getWorldPosition(tmpVec3);
      }

      if (trackedEntity) {
        const obj = trackedEntity.object3D;
        lookAtMatrix.lookAt(obj.position, tmpVec3, obj.up);
        camera.quaternion.setFromRotationMatrix(lookAtMatrix);
        camera.position.copy(obj.position);
      } else {
        camera.position.set(tmpVec3.x + 2, tmpVec3.y + 0.5, tmpVec3.z + 2);
        camera.lookAt(tmpVec3.x, tmpVec3.y, tmpVec3.z);
      }
    }

    camera.updateMatrices(true, true);
    camera.updateMatrixWorld(true, true);

    // Update lights + force shadow redraw
    atmosphereSystem.moveSunlightAndWaterSound(camera, false);
    renderer.shadowMap.needsUpdate = true;

    // Ensure camera is in proper world space
    wrappedEntitySystem.moveObjForWrap(camera);

    delete scene.onAfterRender;

    // Render
    renderer.render(scene, camera);

    if (track && track.requestFrame) {
      track.requestFrame();
    }

    scene.onAfterRender = oldOnAfterRender;

    // Restore state + lights
    atmosphereSystem.water.needsUpdate = waterNeededUpdate;
    atmosphereSystem.moveSunlightAndWaterSound();
    videoBridgeSystem.showPreview();
    renderer.shadowMap.needsUpdate = true;

    if (didRevealHead) {
      head.visible = false;
      head.scale.set(0.0001, 0.0001, 0.0001);
      head.updateMatrices(true, true);
      head.updateMatrixWorld(true, true);

      // Update self avatar to re-hide head
      avatarSystem.processAvatars(t, true);
    }

    wrappedEntitySystem.moveObjForWrap(camera);
  }

  stopRendering() {
    if (!this.renderer) return;
    this.renderer.animation.stop();
  }

  startRendering() {
    if (!this.renderer) return;

    // Hacky. On some platforms GL context needs to be explicitly restored. So do it.
    // This really shouldn't be necessary :P
    if (this.renderer.getContext().isContextLost() && this.webglLoseContextExtension) {
      this.webglLoseContextExtension.restoreContext();
    }

    this.renderer.animation.start();
  }
}

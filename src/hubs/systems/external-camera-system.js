import patchThreeAllocations from "../..//hubs/utils/threejs-allocation-patches";
import patchThreeNoProgramDispose from "../../jel/utils/threejs-avoid-disposing-programs";

const RENDER_WIDTH = 640;
const RENDER_HEIGHT = 360;

const tmpVec3 = new THREE.Vector3();
const lookAtMatrix = new THREE.Matrix4();

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
  }

  // Hacky - this returns true if an external camera can be enabled.
  // This is used to determine if image data is retained in the various texture loaders
  // so that multiple renderers can be used.
  isAllowed() {
    // TODO JEL set this based upon hub permitting the external camera
    return true;
  }

  addExternalCamera() {
    if (this.camera) return;

    const { scene, sceneEl, wrappedEntitySystem } = this;
    const camera = new THREE.PerspectiveCamera(50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 26);

    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 4, 0.05);
    camera.matrixNeedsUpdate = true;

    scene.add(camera);
    wrappedEntitySystem.register(camera);
    sceneEl.emit("external_camera_added");

    const canvas = document.getElementById("external-camera-canvas");

    const context = canvas.getContext("webgl2", {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "default",
      xrCompatible: true
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
    patchThreeAllocations(renderer);
    patchThreeNoProgramDispose(renderer);

    this.camera = camera;
    this.renderer = renderer;
    this.canvas = canvas;
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
    const { camera, track, renderer, scene, sceneEl, wrappedEntitySystem } = this;
    if (!camera) return;

    wrappedEntitySystem.unregister(camera);
    scene.remove(camera);
    renderer.dispose();

    if (track) {
      track.stop();
    }

    this.camera = null;
    this.renderer = null;
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
      trackedEntity
    } = this;
    if (!renderer) return;

    const { playerHead } = cameraSystem;
    const head = playerHead && playerHead.object3D;

    const oldOnAfterRender = scene.onAfterRender;
    const waterNeededUpdate = atmosphereSystem.water.needsUpdate;
    let headWasVisible;

    terrainSystem.cullChunksAndFeatureGroups(camera);

    if (head) {
      headWasVisible = head.visible;
      head.visible = true;
      head.scale.set(1, 1, 1);
      head.updateMatrices(true, true);
      head.updateMatrixWorld(true, true);

      // Update self avatar to ensure head is renderer
      avatarSystem.processAvatars(t, true);
      head.getWorldPosition(tmpVec3);

      if (trackedEntity) {
        const obj = trackedEntity.object3D;
        lookAtMatrix.lookAt(obj.position, tmpVec3, obj.up);
        camera.quaternion.setFromRotationMatrix(lookAtMatrix);
        camera.position.copy(obj.position);
      } else {
        camera.position.set(tmpVec3.x + 2, tmpVec3.y + 0.5, tmpVec3.z + 2);
        camera.lookAt(tmpVec3.x, tmpVec3.y, tmpVec3.z);
      }

      camera.updateMatrices(true, true);
      camera.updateMatrixWorld(true, true);
    }

    // Remove quad to prevent recursion

    // Update lights + force shadow redraw
    atmosphereSystem.moveSunlight(camera);
    renderer.shadowMap.needsUpdate = true;

    // Ensure camera is in proper world space
    wrappedEntitySystem.moveObjForWrap(camera);

    delete scene.onAfterRender;

    // Render
    renderer.render(scene, camera);

    if (track) {
      track.requestFrame();
    }

    scene.onAfterRender = oldOnAfterRender;

    // Restore state + lights
    atmosphereSystem.water.needsUpdate = waterNeededUpdate;
    atmosphereSystem.moveSunlight();
    renderer.shadowMap.needsUpdate = true;

    if (head && !headWasVisible) {
      head.visible = false;
      head.scale.set(0.0001, 0.0001, 0.0001);
      head.updateMatrices(true, true);
      head.updateMatrixWorld(true, true);

      // Update self avatar to re-hide head
      avatarSystem.processAvatars(t, true);
    }

    wrappedEntitySystem.moveObjForWrap(camera);
  }
}

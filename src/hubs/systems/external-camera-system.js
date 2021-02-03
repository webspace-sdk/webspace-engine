import patchThreeAllocations from "../..//hubs/utils/threejs-allocation-patches";
import patchThreeNoProgramDispose from "../../jel/utils/threejs-avoid-disposing-programs";

const MAX_CAMERAS = 16;

const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;

//const ON_SCREEN_WIDTH = 300;
//const ON_SCREEN_HEIGHT = (RENDER_HEIGHT / RENDER_WIDTH) * ON_SCREEN_WIDTH;

const tmpVec3 = new THREE.Vector3();

export class ExternalCameraSystem {
  constructor(sceneEl, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem, wrappedEntitySystem) {
    this.sceneEl = sceneEl;
    this.scene = sceneEl.object3D;
    this.renderers = Array(MAX_CAMERAS).fill(null);
    this.cameras = Array(MAX_CAMERAS).fill(null);
    this.maxRegisteredIndex = -1;
    this.atmosphereSystem = atmosphereSystem;
    this.terrainSystem = terrainSystem;
    this.cameraSystem = cameraSystem;
    this.avatarSystem = avatarSystem;
    this.wrappedEntitySystem = wrappedEntitySystem;
  }

  // Hacky - this returns true if an external camera can be enabled.
  // This is used to determine if image data is retained in the various texture loaders
  // so that multiple renderers can be used.
  isAllowed() {
    // TODO JEL set this based upon hub permitting the external camera
    return true;
  }

  addExternalCamera() {
    const idx = this.getFreeIndex();
    this.maxRegisteredIndex = Math.max(idx, this.maxRegisteredIndex);

    const camera = new THREE.PerspectiveCamera(50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 26);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 4, 0.05);
    camera.matrixNeedsUpdate = true;

    this.scene.add(camera);
    this.wrappedEntitySystem.register(camera);

    const canvas = document.createElement("canvas");
    canvas.width = RENDER_WIDTH;
    canvas.height = RENDER_HEIGHT;
    canvas.setAttribute("style", "position: absolute; top:0; left:0; width: 400px; height: 200px; z-index: 100000;");
    document.body.appendChild(canvas);

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

    this.cameras[idx] = camera;
    this.renderers[idx] = renderer;

    return idx;
  }

  removeExternalCamera(idx) {
    const camera = this.cameras[idx];

    this.wrappedEntitySystem.unregister(camera);
    this.scene.remove(camera);

    this.cameras[idx] = null;

    let maxIndex = -1;

    for (let i = 0; i < this.cameras.length; i++) {
      if (this.cameras[i]) {
        maxIndex = i;
      }
    }

    this.maxRegisteredIndex = maxIndex;
  }

  getFreeIndex() {
    for (let i = 0; i < this.renderers.length; i++) {
      if (this.renderers[i] === null) return i;
    }

    return null;
  }

  tock(t) {
    const { scene, cameras, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem, wrappedEntitySystem } = this;

    for (let i = 0; i < MAX_CAMERAS; i++) {
      const renderer = this.renderers[i];
      if (!renderer) continue;

      const { playerHead } = cameraSystem;
      const head = playerHead && playerHead.object3D;
      const camera = cameras[i];

      const oldOnAfterRender = scene.onAfterRender;
      const waterNeededUpdate = atmosphereSystem.water.needsUpdate;
      atmosphereSystem.water.disableReflections();
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
        camera.position.set(tmpVec3.x + 2, tmpVec3.y + 0.5, tmpVec3.z + 2);
        camera.lookAt(tmpVec3.x, tmpVec3.y, tmpVec3.z);
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

      scene.onAfterRender = oldOnAfterRender;

      // Restore state + lights
      atmosphereSystem.water.needsUpdate = waterNeededUpdate;
      atmosphereSystem.water.enableReflections();
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
}

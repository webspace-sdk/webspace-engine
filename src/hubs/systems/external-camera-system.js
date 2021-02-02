import ScreenQuad from "../../jel/objects/screen-quad";
import { disposeNode } from "../utils/three-utils";

const MAX_CAMERAS = 16;

const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;

const ON_SCREEN_WIDTH = 300;
const ON_SCREEN_HEIGHT = (RENDER_HEIGHT / RENDER_WIDTH) * ON_SCREEN_WIDTH;

const tmpVec3 = new THREE.Vector3();

export class ExternalCameraSystem {
  constructor(sceneEl, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem, wrappedEntitySystem) {
    this.sceneEl = sceneEl;
    this.scene = sceneEl.object3D;
    this.renderer = sceneEl.renderer;
    this.renderTargets = Array(MAX_CAMERAS).fill(null);
    this.cameras = Array(MAX_CAMERAS).fill(null);
    this.screenQuads = Array(MAX_CAMERAS).fill(null);
    this.maxRegisteredIndex = -1;
    this.atmosphereSystem = atmosphereSystem;
    this.terrainSystem = terrainSystem;
    this.cameraSystem = cameraSystem;
    this.avatarSystem = avatarSystem;
    this.wrappedEntitySystem = wrappedEntitySystem;

    window.addEventListener("resize", () => this.updateScreenQuads());
    this.sceneEl.addEventListener("animated_resize_complete", () => this.updateScreenQuads());
  }

  addExternalCamera() {
    const idx = this.getFreeIndex();
    this.maxRegisteredIndex = Math.max(idx, this.maxRegisteredIndex);

    const renderTarget = new THREE.WebGLRenderTarget(RENDER_WIDTH, RENDER_HEIGHT, {
      format: THREE.RGBAFormat,
      encoding: THREE.sRGBEncoding,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter
    });

    const camera = new THREE.PerspectiveCamera(50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 26);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 4, 0.05);
    camera.matrixNeedsUpdate = true;

    const screenQuad = new ScreenQuad({ texture: renderTarget.texture });

    this.scene.add(camera);
    this.scene.add(screenQuad);

    this.wrappedEntitySystem.register(camera);

    this.renderTargets[idx] = renderTarget;
    this.cameras[idx] = camera;
    this.screenQuads[idx] = screenQuad;

    this.updateScreenQuads();
    return idx;
  }

  removeExternalCamera(idx) {
    const renderTarget = this.renderTargets[idx];
    if (!renderTarget) return;

    const camera = this.cameras[idx];
    const screenQuad = this.screenQuads[idx];

    this.wrappedEntitySystem.unregister(camera);
    this.scene.remove(camera);
    this.scene.remove(screenQuad);

    disposeNode(screenQuad);
    renderTarget.dispose();

    this.renderTargets[idx] = null;
    this.cameras[idx] = null;
    this.screenQuads[idx] = null;

    let maxIndex = -1;

    for (let i = 0; i < this.cameras.length; i++) {
      if (this.cameras[i]) {
        maxIndex = i;
      }
    }

    this.maxRegisteredIndex = maxIndex;
  }

  getFreeIndex() {
    for (let i = 0; i < this.renderTargets.length; i++) {
      if (this.renderTargets[i] === null) return i;
    }

    return null;
  }

  tock(t) {
    const {
      scene,
      cameras,
      renderer,
      screenQuads,
      atmosphereSystem,
      terrainSystem,
      cameraSystem,
      avatarSystem,
      wrappedEntitySystem
    } = this;

    for (let i = 0; i < MAX_CAMERAS; i++) {
      const renderTarget = this.renderTargets[i];
      if (!renderTarget) continue;

      const { playerHead } = cameraSystem;
      const head = playerHead && playerHead.object3D;
      const camera = cameras[i];
      const screenQuad = screenQuads[i];

      const vrWasEnabled = renderer.vr.enabled;
      const oldOnAfterRender = scene.onAfterRender;
      const waterNeededUpdate = atmosphereSystem.water.needsUpdate;
      atmosphereSystem.water.disableReflections();
      let headWasVisible;

      delete scene.onAfterRender;
      renderer.vr.enabled = false;
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
      screenQuad.visible = false;

      // Update lights + force shadow redraw
      atmosphereSystem.moveSunlight(camera);
      renderer.shadowMap.needsUpdate = true;

      // Ensure camera is in proper world space
      wrappedEntitySystem.moveObjForWrap(camera);

      // Render
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      scene.onAfterRender = oldOnAfterRender;

      // Restore state + lights
      screenQuad.visible = true;
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
      renderer.vr.enabled = vrWasEnabled;
    }
  }

  isActive() {}

  updateScreenQuads() {
    const { sceneEl, screenQuads } = this;

    for (let i = 0; i < screenQuads.length; i++) {
      const screenQuad = screenQuads[i];
      if (screenQuad === null) continue;

      const canvas = sceneEl.canvas;
      const w = canvas.width;
      const h = canvas.height;
      screenQuad.setTop(1.0 - ON_SCREEN_HEIGHT / h);
      screenQuad.setWidth(ON_SCREEN_WIDTH / w);
      screenQuad.setHeight(ON_SCREEN_HEIGHT / h);

      // TODO multiple?
      break;
    }
  }
}

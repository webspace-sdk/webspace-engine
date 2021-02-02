import ScreenQuad from "../../jel/objects/screen-quad";

const MAX_CAMERAS = 16;

const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;

const tmpVec3 = new THREE.Vector3();

export class ExternalCameraSystem {
  constructor(sceneEl, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem, wrappedEntitySystem) {
    this.scene = sceneEl.object3D;
    this.renderer = sceneEl.renderer;
    this.renderTargets = Array(MAX_CAMERAS).fill(null);
    this.cameras = Array(MAX_CAMERAS).fill(null);
    this.maxRegisteredIndex = -1;
    this.atmosphereSystem = atmosphereSystem;
    this.terrainSystem = terrainSystem;
    this.cameraSystem = cameraSystem;
    this.avatarSystem = avatarSystem;
    this.wrappedEntitySystem = wrappedEntitySystem;
  }

  addExternalCamera() {
    const idx = this.getFreeIndex();

    const renderTarget = new THREE.WebGLRenderTarget(RENDER_WIDTH, RENDER_HEIGHT, {
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      encoding: THREE.GammaEncoding,
      depth: false,
      stencil: false
    });

    //const material = new THREE.MeshBasicMaterial({ map: renderTarget.texture });

    const camera = new THREE.PerspectiveCamera(50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 26);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 4, 0.05);
    camera.matrixNeedsUpdate = true;

    this.renderTargets[idx] = renderTarget;
    this.cameras[idx] = camera;

    this.scene.add(camera);
    this.wrappedEntitySystem.register(camera);

    this.screenQuad = new ScreenQuad({
      texture: renderTarget.texture,
      width: 0.8,
      height: 0.8
    });

    this.scene.add(this.screenQuad);
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
      screenQuad,
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

      const tmpVRFlag = renderer.vr.enabled;
      const tmpOnAfterRender = scene.onAfterRender;
      const tmpWaterNeedsUpdate = atmosphereSystem.water.needsUpdate;
      let tmpHeadVisible;

      delete scene.onAfterRender;
      renderer.vr.enabled = false;

      if (head) {
        tmpHeadVisible = head.visible;
        head.visible = true;
        head.scale.set(1, 1, 1);
        head.updateMatrices(true, true);
        head.updateMatrixWorld(true, true);
        avatarSystem.tick(t);
        head.getWorldPosition(tmpVec3);
        camera.position.set(tmpVec3.x + 2, tmpVec3.y + 0.5, tmpVec3.z + 2);
        camera.lookAt(tmpVec3.x, tmpVec3.y, tmpVec3.z);
        camera.updateMatrices(true, true);
        camera.updateMatrixWorld(true, true);
      }

      screenQuad.visible = false;
      atmosphereSystem.moveSunlight(camera);
      renderer.shadowMap.needsUpdate = true;

      terrainSystem.cullChunksAndFeatureGroups(camera);
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      screenQuad.visible = true;
      atmosphereSystem.water.needsUpdate = tmpWaterNeedsUpdate;
      atmosphereSystem.moveSunlight();
      renderer.shadowMap.needsUpdate = true;

      if (head && !tmpHeadVisible) {
        head.visible = false;
        head.scale.set(0.0001, 0.0001, 0.0001);
        head.updateMatrices(true, true);
        head.updateMatrixWorld(true, true);
        avatarSystem.tick(t);
      }

      wrappedEntitySystem.tick();
      renderer.vr.enabled = tmpVRFlag;
      scene.onAfterRender = tmpOnAfterRender;
    }
  }
}

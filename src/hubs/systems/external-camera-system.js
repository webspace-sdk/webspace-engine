import ScreenQuad from "../../jel/objects/screen-quad";

const MAX_CAMERAS = 16;

const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;

export class ExternalCameraSystem {
  constructor(sceneEl, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem) {
    this.scene = sceneEl.object3D;
    this.renderer = sceneEl.renderer;
    this.renderTargets = Array(MAX_CAMERAS).fill(null);
    this.cameras = Array(MAX_CAMERAS).fill(null);
    this.maxRegisteredIndex = -1;
    this.atmosphereSystem = atmosphereSystem;
    this.terrainSystem = terrainSystem;
    this.cameraSystem = cameraSystem;
    this.avatarSystem = avatarSystem;
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

    const camera = new THREE.PerspectiveCamera(50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 20);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 4, 0.05);
    camera.matrixNeedsUpdate = true;

    this.renderTargets[idx] = renderTarget;
    this.cameras[idx] = camera;

    this.scene.add(camera);

    this.screenQuad = new ScreenQuad({
      texture: renderTarget.texture,
      width: 0.5,
      height: 0.5
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
    const { scene, cameras, renderer, screenQuad, atmosphereSystem, terrainSystem, cameraSystem, avatarSystem } = this;

    for (let i = 0; i < MAX_CAMERAS; i++) {
      const renderTarget = this.renderTargets[i];
      if (!renderTarget) continue;

      const { playerHead } = cameraSystem;
      const head = playerHead && playerHead.object3D;
      const camera = cameras[i];

      const tmpVRFlag = renderer.vr.enabled;
      const tmpOnAfterRender = scene.onAfterRender;
      delete scene.onAfterRender;
      renderer.vr.enabled = false;

      if (head) {
        head.visible = true;
        head.scale.set(1, 1, 1);
        head.updateMatrices(true, true);
        head.updateMatrixWorld(true, true);
        avatarSystem.tick(t);
      }

      screenQuad.visible = false;
      atmosphereSystem.moveSunlight(camera);
      terrainSystem.cullChunksAndFeatureGroups(camera);
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      screenQuad.visible = true;

      if (head) {
        head.visible = false;
        head.scale.set(0.0001, 0.0001, 0.0001);
        head.updateMatrices(true, true);
        head.updateMatrixWorld(true, true);
        avatarSystem.tick(t);
      }

      renderer.vr.enabled = tmpVRFlag;
      scene.onAfterRender = tmpOnAfterRender;
    }
  }
}

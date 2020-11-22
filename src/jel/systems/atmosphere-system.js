import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import Sky from "../objects/sky";
import Water from "../objects/water";
import { Layers } from "../../hubs/components/layers";
const FOG_NEAR = 20.5;
const FOG_SPAN = 1.5;
const FOG_SPEED = 0.01;
const INITIAL_FOG_NEAR = 1.5;

// Responsible for managing shadows, environmental lighting, sky, and environment map.
export class AtmosphereSystem {
  constructor(sceneEl) {
    const scene = sceneEl.object3D;
    this.sceneEl = sceneEl;
    this.effectsSystem = sceneEl.systems["effects"];

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.getElementById("avatar-pov-node");
      this.viewingCameraEl = document.getElementById("viewing-camera");
    });

    sceneEl.addEventListener("animated_resize_started", () => {
      this.disableExtraPasses = true;
    });

    sceneEl.addEventListener("animated_resize_complete", () => {
      this.disableExtraPasses = false;
    });

    this.renderer = sceneEl.renderer;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.soft = true;
    this.renderer.antialias = false;
    this.renderer.stencil = true;
    this.renderer.powerPreference = "high-performance";
    this.disableExtraPasses = false;

    this.ambientLight = new THREE.AmbientLight(0x808080);
    this.ambientLight.layers.enable(Layers.reflection);

    this.sunLight = new THREE.DirectionalLight(0xa0a0a0, 1);
    this.sunLight.position.set(10.25, 10, 10.25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.x = 1024 * 4;
    this.sunLight.shadow.mapSize.y = 1024 * 4;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.camera.left = 15;
    this.sunLight.shadow.camera.right = -15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    this.sunLight.shadow.camera.near = 0.005;
    this.sunLight.shadow.camera.far = 20;
    this.sunLight.shadow.radius = 2;
    this.sunLight.layers.enable(Layers.reflection);

    this.sky = new Sky();
    this.sky.position.y = 0;
    this.sky.scale.setScalar(100000);

    for (let i = 0; i < this.sky.skyMaterials.length; i++) {
      const material = this.sky.skyMaterials[i];
      material.uniforms.turbidity.value = 10;
      material.uniforms.rayleigh.value = 0.5;
      material.uniforms.mieCoefficient.value = 0.005;
      material.uniforms.mieDirectionalG.value = 0.5;
      material.uniforms.luminance.value = 1;
      material.uniforms.sunPosition.value.set(-80000, 100000, -80000);
    }

    this.water = new Water(this.sky, this.renderer, scene, this.renderer.camera);
    this.water.position.y = 4.5 * (1 / 8);
    this.water.matrixNeedsUpdate = true;

    // Fog color is the midpoint of the horizon colors across the sky.
    // Might need to compute this based upon skybox math at some point.
    this.fog = new THREE.Fog(0x96c3db, FOG_NEAR, FOG_NEAR + FOG_SPAN);
    this.frame = 0;
    this.shadowsNeedsUpdate = true;
    this.waterNeedsUpdate = true;
    this.rateLimitUpdates = true;

    scene.add(this.ambientLight);
    scene.add(this.sunLight);
    scene.add(this.sky);
    scene.add(this.water); // TODO water needs to become a wrapped entity
    scene.fog = this.fog;
  }

  maximizeFog() {
    this.fog.near = INITIAL_FOG_NEAR;
    this.fog.far = INITIAL_FOG_NEAR + FOG_SPAN;
    this.fog.needsUpdate = true;
  }

  tick(dt) {
    this.frame++;

    if (this.fog.near < FOG_NEAR || this.fog.far < FOG_NEAR + FOG_SPAN) {
      const dv = FOG_SPEED * dt;
      this.fog.near = Math.min(FOG_NEAR, this.fog.near + dv);
      this.fog.far = Math.min(FOG_NEAR + FOG_SPAN, this.fog.far + dv);

      this.fog.needsUpdate = true;
    }

    if (!this.playerCamera) {
      if (!this.viewingCameraEl) return;
      this.playerCamera = this.viewingCameraEl.getObject3D("camera");
      if (!this.playerCamera) return;
      this.water.camera = this.playerCamera;
    }

    this.moveSunlight();

    // Disable effects for subrenders to water and/or sky
    this.effectsSystem.disableEffects = true;
    this.sky.onAnimationTick({ delta: dt / 1000.0 });
    this.water.onAnimationTick({ delta: dt / 1000.0 });
    this.effectsSystem.disableEffects = false;
    this.sunLight.castShadow = window.APP.detailLevel !== 2;

    // If low quality is tripped, reduce shadow map size and distance
    if (window.APP.detailLevel === 0) {
      if (this.sunLight.shadow.mapSize.x !== 1024 * 4) {
        this.sunLight.shadow.mapSize.x = 1024 * 4;
        this.sunLight.shadow.mapSize.y = 1024 * 4;
        this.sunLight.shadow.camera.far = 20;
        this.sunLight.shadow.bias = -0.0006;

        if (this.sunLight.shadow.map) {
          this.sunLight.shadow.map.dispose();
        }

        this.sunLight.shadow.map = null;
      }
    } else if (window.APP.detailLevel === 1) {
      if (this.sunLight.shadow.mapSize.x !== 1024) {
        this.sunLight.shadow.mapSize.x = 1024;
        this.sunLight.shadow.mapSize.y = 1024;
        this.sunLight.shadow.camera.far = 16;
        this.sunLight.shadow.bias = -0.0017;

        if (this.sunLight.shadow.map) {
          this.sunLight.shadow.map.dispose();
        }

        this.sunLight.shadow.map = null;
      }
    }

    if (!this.disableExtraPasses) {
      // Update shadows or water each frame, but not both.
      if (this.waterNeedsUpdate && this.shadowsNeedsUpdate) {
        if (this.rateLimitUpdates) {
          if (this.frame % 2 == 0) {
            this.renderer.shadowMap.needsUpdate = true;
            this.shadowsNeedsUpdate = false;
          } else {
            this.water.needsUpdate = true;
            this.waterNeedsUpdate = false;
          }
        } else {
          this.water.needsUpdate = true;
          this.renderer.shadowMap.needsUpdate = true;
          this.rateLimitUpdates = false;
        }
      } else if (this.waterNeedsUpdate) {
        this.water.needsUpdate = true;
        this.waterNeedsUpdate = false;
      } else if (this.shadowsNeedsUpdate) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowsNeedsUpdate = false;
      }
    } else {
      this.water.needsUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
    }
  }

  updateShadows(force) {
    this.shadowsNeedsUpdate = true;

    if (force) {
      this.rateLimitUpdates = false;
    }
  }

  updateWater(force) {
    this.waterNeedsUpdate = true;

    if (force) {
      this.rateLimitUpdates = false;
    }
  }

  moveSunlight = (() => {
    const pos = new THREE.Vector3();

    return () => {
      if (!this.avatarPovEl) return;
      this.avatarPovEl.object3D.getWorldPosition(pos);

      const sunPos = this.sunLight.position;

      pos.x -= 4;
      pos.y += 5;
      pos.z -= 4;

      const playerMoved =
        Math.abs(sunPos.x - pos.x) > 0.001 || Math.abs(sunPos.y - pos.y) > 0.001 || Math.abs(sunPos.z - pos.z) > 0.001;

      if (playerMoved) {
        this.sunLight.position.x = pos.x;
        this.sunLight.position.y = pos.y;
        this.sunLight.position.z = pos.z;
        this.sunLight.matrixNeedsUpdate = true;

        this.sunLight.target.position.x = pos.x + 4;
        this.sunLight.target.position.y = pos.y - 5;
        this.sunLight.target.position.z = pos.z + 4;
        this.sunLight.target.matrixNeedsUpdate = true;

        // HACK - somewhere in three code matrix is stale by a frame because of auto updates off
        // For now, flip it on if we move shadow camera.
        this.sunLight.shadow.camera.matrixNeedsUpdate = true;

        this.sunLight.updateMatrices();
        this.sunLight.target.updateMatrices();
        this.sunLight.shadow.camera.updateProjectionMatrix();

        this.renderer.shadowMap.needsUpdate = true;
        this.water.needsUpdate = true;
      }
    };
  })();
}

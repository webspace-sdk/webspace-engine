import { imageUrlForEmoji } from "../../hubs/utils/media-utils";
import { offsetRelativeTo } from "../../hubs/components/offset-relative-to";
import { SHAPE, FIT, ACTIVATION_STATE, TYPE } from "three-ammo/constants";
import { COLLISION_LAYERS } from "../../hubs/constants";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import {
  SOUND_LAUNCHER_1,
  SOUND_LAUNCHER_2,
  SOUND_LAUNCHER_3,
  SOUND_LAUNCHER_4,
  SOUND_LAUNCHER_5,
  SOUND_LAUNCHER_BIG,
  SOUND_FART_1,
  SOUND_FART_2,
  SOUND_FART_3,
  SOUND_FART_4,
  SOUND_FART_5,
  SOUND_FART_BIG
} from "../../hubs/systems/sound-effects-system";

import BezierEasing from "bezier-easing";

const springStep = BezierEasing(0.47, -0.07, 0.44, 3.65);

const MAX_PROJECTILES = 1024;
const PROJECTILE_EXPIRATION_MS = 5000;
const SPAWN_OFFSET = new THREE.Vector3(0, -0.85, -0.5);
const SHRINK_TIME_MS = 1000;
const SHRINK_SPEED = 0.005;
const MIN_IMPULSE = 6.0;
const MAX_IMPULSE = 8.0;
const MAX_DRIFT_XY = 0.05;
const MAX_SPIN = 0.05;
const MIN_BURST_IMPULSE = 0.02;
const MAX_BURST_IMPULSE = 0.03;
const MAX_BURST_SPIN = 0.05;
const LAUNCHER_GRAVITY = new THREE.Vector3(0, -9.8, 0);
const BURST_GRAVITY = new THREE.Vector3(0, 0.5, 0);
const MEGAMOJI_IMPULSE = 12.0;
const MEGAMOJI_SCALE = 3;
const SPAWN_TIME_MS = 250;
const SPAWN_MIN_SCALE = 0.4;
const LAUNCHER_SFX_URLS = [SOUND_LAUNCHER_1, SOUND_LAUNCHER_2, SOUND_LAUNCHER_3, SOUND_LAUNCHER_4, SOUND_LAUNCHER_5];
const FART_SFX_URLS = [SOUND_FART_1, SOUND_FART_2, SOUND_FART_3, SOUND_FART_4, SOUND_FART_5];
const BURST_PARTICLES = 8;
const BURST_PARTICLE_SCALE = 0.5;

const getLauncherSound = (emoji, isMegaMoji) => {
  if (emoji === "💩") {
    return isMegaMoji ? SOUND_FART_BIG : FART_SFX_URLS[Math.floor(Math.random() * FART_SFX_URLS.length)];
  } else {
    return isMegaMoji ? SOUND_LAUNCHER_BIG : LAUNCHER_SFX_URLS[Math.floor(Math.random() * LAUNCHER_SFX_URLS.length)];
  }
};

const INCLUDE_ENVIRONMENT_FILTER_MASK =
  COLLISION_LAYERS.INTERACTABLES | COLLISION_LAYERS.AVATAR | COLLISION_LAYERS.ENVIRONMENT;

const MESH_TYPES = {
  LAUNCHER: 0,
  BURST: 1
};

const BODY_OPTIONS = {
  [MESH_TYPES.LAUNCHER]: {
    type: TYPE.DYNAMIC,
    mass: 1,
    linearDamping: 0.01,
    angularDamping: 0.01,
    linearSleepingThreshold: 1.6,
    angularSleepingThreshold: 2.5,
    activationState: ACTIVATION_STATE.ACTIVE_TAG,
    emitCollisionEvents: false,
    disableCollision: false,
    collisionFilterGroup: 1,
    collisionFilterMask: INCLUDE_ENVIRONMENT_FILTER_MASK,
    scaleAutoUpdate: true,
    gravity: LAUNCHER_GRAVITY
  },
  [MESH_TYPES.BURST]: {
    type: TYPE.DYNAMIC,
    mass: 1,
    linearDamping: 0.01,
    angularDamping: 0.01,
    linearSleepingThreshold: 1.6,
    angularSleepingThreshold: 2.5,
    activationState: ACTIVATION_STATE.ACTIVE_TAG,
    emitCollisionEvents: false,
    disableCollision: false,
    collisionFilterGroup: 1,
    collisionFilterMask: 0,
    scaleAutoUpdate: true,
    gravity: BURST_GRAVITY
  }
};

const FREED_BODY_OPTIONS = {
  activationState: ACTIVATION_STATE.DISABLE_SIMULATION,
  collisionFilterMask: 0
};

const RESET_BODY_OPTIONS = {
  activationState: ACTIVATION_STATE.ACTIVE_TAG,
  collisionFilterMask: INCLUDE_ENVIRONMENT_FILTER_MASK
};

const SHAPE_OPTIONS = {
  type: SHAPE.BOX,
  fit: FIT.ALL
};

const tmpVec3 = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

export class ProjectileSystem {
  constructor(sceneEl, voxmojiSystem, physicsSystem, wrappedEntitySystem, soundEffectsSystem) {
    this.sceneEl = sceneEl;
    this.voxmojiSystem = voxmojiSystem;
    this.physicsSystem = physicsSystem;
    this.wrappedEntitySystem = wrappedEntitySystem;
    this.soundEffectsSystem = soundEffectsSystem;

    this.meshes = Array(MAX_PROJECTILES).fill(null);
    this.meshTypes = Array(MAX_PROJECTILES).fill(MESH_TYPES.LAUNCHER);
    this.freeFlags = Array(MAX_PROJECTILES).fill(true);
    this.bodyUuids = Array(MAX_PROJECTILES).fill(null);
    this.bodyReadyFlags = Array(MAX_PROJECTILES).fill(false);
    this.shapesUuids = Array(MAX_PROJECTILES).fill(null);
    this.impulses = Array(MAX_PROJECTILES).fill(null);
    this.startTimes = Array(MAX_PROJECTILES).fill(Infinity);
    this.targetScales = Array(MAX_PROJECTILES).fill(1.0);
    this.playPositionalSoundAfterTicks = Array(MAX_PROJECTILES).fill(false);
    this.emojis = Array(MAX_PROJECTILES).fill("");
    this.maxIndex = -1;
    this.avatarPovEl = null;

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.querySelector("#avatar-pov-node");
    });
  }

  // Fires a projectile of the given emoji, and returns a payload which can be passed to replayProjectile to fire the same one with the same initial conditions.
  fireEmojiLauncherProjectile(emoji, isMegaMoji = false, extraXImpulse = 0.0, extraZImpulse = 0.0) {
    if (!window.APP.hubChannel) return;

    const { avatarPovEl } = this;

    if (!avatarPovEl) return;
    const avatarPovNode = avatarPovEl.object3D;

    offsetRelativeTo(null, avatarPovNode, SPAWN_OFFSET, false, 1, this.sceneEl.object3D, tmpVec3, tmpQuat);

    const ox = tmpVec3.x;
    const oy = tmpVec3.y;
    const oz = tmpVec3.z;
    const orx = tmpQuat.x;
    const ory = tmpQuat.y;
    const orz = tmpQuat.z;
    const orw = tmpQuat.w;

    tmpVec3.x = 0 + -MAX_DRIFT_XY + Math.random() * 2.0 * MAX_DRIFT_XY;
    tmpVec3.y = 1 + -MAX_DRIFT_XY + Math.random() * 2.0 * MAX_DRIFT_XY;
    tmpVec3.z = -1;

    avatarPovNode.updateMatrices();
    tmpVec3.transformDirection(avatarPovNode.matrixWorld);

    const mag = isMegaMoji ? MEGAMOJI_IMPULSE : MIN_IMPULSE + Math.random() * (MAX_IMPULSE - MIN_IMPULSE);
    const ix = tmpVec3.x * mag + extraXImpulse;
    const iy = tmpVec3.y * mag;
    const iz = tmpVec3.z * mag + extraZImpulse;
    const irx = -MAX_SPIN + Math.random() * 2 * MAX_SPIN;
    const iry = -MAX_SPIN + Math.random() * 2 * MAX_SPIN;
    const irz = 0.0;

    const scale = isMegaMoji ? MEGAMOJI_SCALE : 1.0;

    this.spawnProjectile(MESH_TYPES.LAUNCHER, emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale);
    this.soundEffectsSystem.playSoundOneShot(getLauncherSound(emoji, isMegaMoji));

    return [emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale];
  }

  replayBurst([emoji, ox, oy, oz, radius]) {
    this.spawnBurst(emoji, ox, oy, oz, radius);
  }

  replayEmojiSpawnerProjectile([emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale]) {
    this.spawnProjectile(
      MESH_TYPES.LAUNCHER,
      emoji,
      ox,
      oy,
      oz,
      orx,
      ory,
      orz,
      orw,
      ix,
      iy,
      iz,
      irx,
      iry,
      irz,
      scale,
      true,
      true
    );
  }

  fireEmojiBurst(emoji, ox, oy, oz, radius) {
    this.spawnBurst(emoji, ox, oy, oz, radius);
    return [ox, oy, oz, radius];
  }

  async spawnBurst(emoji, ox, oy, oz, radius) {
    for (let i = 0; i < BURST_PARTICLES; i++) {
      const dx = Math.sin(Math.PI * 2.0 * (i / BURST_PARTICLES));
      const dz = Math.cos(Math.PI * 2.0 * (i / BURST_PARTICLES));

      ox = ox + dx * radius;
      oz = oz + dz * radius;

      tmpEuler.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI);
      tmpQuat.setFromEuler(tmpEuler);

      const orx = tmpQuat.x;
      const ory = tmpQuat.y;
      const orz = tmpQuat.z;
      const orw = tmpQuat.w;

      const mag = MIN_BURST_IMPULSE + Math.random() * (MAX_BURST_IMPULSE - MIN_BURST_IMPULSE);
      const ix = mag * dx;
      const iy = 0.0;
      const iz = mag * dz;
      const irx = -MAX_BURST_SPIN + Math.random() * 2 * MAX_BURST_SPIN;
      const iry = -MAX_BURST_SPIN + Math.random() * 2 * MAX_BURST_SPIN;
      const irz = -MAX_BURST_SPIN + Math.random() * 2 * MAX_BURST_SPIN;

      const scale = 0.8 * BURST_PARTICLE_SCALE + Math.random() * 0.2 * BURST_PARTICLE_SCALE;

      await this.spawnProjectile(
        MESH_TYPES.BURST,
        emoji,
        ox,
        oy,
        oz,
        orx,
        ory,
        orz,
        orw,
        ix,
        iy,
        iz,
        irx,
        iry,
        irz,
        scale
      );
    }
  }

  // ox, oy, oz - Spawn origin (if left undefined, spawn in front of avatar)
  // orx, ory, orz, orw - Spawn orientation
  // ix, iy, iz - Impulse (if left undefined, generate impulse)
  // irx, ry, irz - Impulse offset (if left undefined, generate random offset to create spin)
  async spawnProjectile(
    meshType,
    emoji,
    ox,
    oy,
    oz,
    orx,
    ory,
    orz,
    orw,
    ix,
    iy,
    iz,
    irx,
    iry,
    irz,
    scale,
    animateScale = false,
    playPositionalSound = false
  ) {
    const {
      freeFlags,
      avatarPovEl,
      meshes,
      meshTypes,
      voxmojiSystem,
      startTimes,
      playPositionalSoundAfterTicks,
      wrappedEntitySystem,
      targetScales,
      emojis
    } = this;
    if (!avatarPovEl) return;

    const imageUrl = imageUrlForEmoji(emoji, 64);

    // Find the index of a free mesh or a new index for a new mesh.
    let idx = -1;

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (freeFlags[i] && (meshes[i] === null || meshTypes[i] === meshType)) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      console.warn("No slots for new projectile.");
      return;
    }

    // Reserve index so concurrent spawns don't do the same
    freeFlags[idx] = false;

    let mesh = meshes[idx];
    let initialScale = scale;

    if (animateScale) {
      initialScale = mesh.scale.setScalar(SPAWN_MIN_SCALE);
    }

    if (mesh) {
      mesh.position.x = ox;
      mesh.position.y = oy;
      mesh.position.z = oz;
      mesh.quaternion.x = orx;
      mesh.quaternion.y = ory;
      mesh.quaternion.z = orz;
      mesh.quaternion.w = orw;
      mesh.scale.setScalar(initialScale);
      mesh.matrixNeedsUpdate = true;
      mesh.updateMatrices();

      this.physicsSystem.updateBody(this.bodyUuids[idx], RESET_BODY_OPTIONS);
      this.physicsSystem.resetDynamicBody(this.bodyUuids[idx]);
    } else {
      mesh = this.createProjectileMesh(meshType, idx, ox, oy, oz, orx, ory, orz, orw, initialScale);
    }

    wrappedEntitySystem.register(mesh);

    this.setImpulse(idx, ix, iy, iz, irx, iry, irz);

    freeFlags[idx] = false;
    startTimes[idx] = performance.now();
    targetScales[idx] = animateScale ? scale : null;
    playPositionalSoundAfterTicks[idx] = playPositionalSound ? 2 : 0;
    emojis[idx] = emoji;

    await voxmojiSystem.register(imageUrl, mesh);
  }

  tick(t, dt) {
    const {
      meshes,
      physicsSystem,
      bodyUuids,
      maxIndex,
      startTimes,
      targetScales,
      meshTypes,
      freeFlags,
      emojis,
      bodyReadyFlags,
      playPositionalSoundAfterTicks
    } = this;
    const now = performance.now();

    // Collision detection pass on launched emoji
    for (let i = 0; i <= maxIndex; i++) {
      if (!bodyReadyFlags[i] || freeFlags[i]) continue;
      if (meshTypes[i] !== MESH_TYPES.LAUNCHER) continue;
      const bodyUuid = bodyUuids[i];
      const collisions = physicsSystem.getCollisions(bodyUuid);

      let hitMedia = false;

      if (collisions.length > 0) {
        for (let j = 0; j < collisions; j++) {
          const hitBody = collisions[j];
          if (hitBody < 0) continue;

          const body = physicsSystem.getBody(hitBody);
          if (!body) continue;

          if (body.object3D.el && body.object3D.el.components["media-loader"]) {
            hitMedia = true;
            break;
          }
        }
      }

      if (hitMedia) {
        const mesh = meshes[i];

        this.spawnBurst(emojis[i], mesh.position.x, mesh.position.y, mesh.position.z, 0.1);
        this.freeProjectileAtIndex(i);
        continue;
      }
    }

    // Lifecycle pass
    for (let i = 0; i <= maxIndex; i++) {
      if (!bodyReadyFlags[i] || freeFlags[i]) continue;
      const bodyUuid = bodyUuids[i];

      // Expire
      if (startTimes[i] + PROJECTILE_EXPIRATION_MS < now) {
        this.freeProjectileAtIndex(i);
        continue;
      }

      // Play sound. Hacky, need to play position sound after 2 ticks since wrapped entity system will have set
      // proper position
      if (playPositionalSoundAfterTicks[i] > 0) {
        playPositionalSoundAfterTicks[i]--;

        if (playPositionalSoundAfterTicks[i] === 0) {
          const isMegaMoji = targetScales[i] === MEGAMOJI_SCALE;
          this.soundEffectsSystem.playPositionalSoundAt(
            getLauncherSound(emojis[i], isMegaMoji),
            meshes[i].position,
            false
          );
        }
      }

      // Perform scaling lifecycle
      if (meshTypes[i] === MESH_TYPES.LAUNCHER) {
        if (targetScales[i] !== null && startTimes[i] + SPAWN_TIME_MS > now) {
          const mesh = meshes[i];
          const t = (now - startTimes[i]) / SPAWN_TIME_MS;
          const scale = SPAWN_MIN_SCALE + springStep(t) * (targetScales[i] - SPAWN_MIN_SCALE);
          mesh.scale.x = scale;
          mesh.scale.y = scale;
          mesh.scale.z = 1.0;

          mesh.matrixNeedsUpdate = true;
        }

        if (startTimes[i] + PROJECTILE_EXPIRATION_MS - SHRINK_TIME_MS < now) {
          const mesh = meshes[i];
          mesh.scale.x = Math.max(0.01, mesh.scale.x - SHRINK_SPEED * dt);
          mesh.scale.y = Math.max(0.01, mesh.scale.y - SHRINK_SPEED * dt);

          if (mesh.scale.x <= 0.01) {
            this.freeProjectileAtIndex(i);
          } else {
            mesh.matrixNeedsUpdate = true;
          }
        }
      } else {
        // burst emojis just shrink
        const mesh = meshes[i];
        const s = Math.min(1, dt * 32.0) * 0.975;
        mesh.scale.x *= s;
        mesh.scale.y *= s;
        mesh.scale.z *= s;

        if (mesh.scale.x < 0.01) {
          this.freeProjectileAtIndex(i);
        } else {
          mesh.matrixNeedsUpdate = true;
        }
      }

      // Apply pending impulse
      const [ix, iy, iz, rx, ry, rz] = this.impulses[i];

      if (ix !== 0 || iy !== 0 || iz !== 0) {
        physicsSystem.applyImpulse(bodyUuid, ix, iy, iz, rx, ry, rz);
        this.clearImpulse(i);
      }
    }
  }

  createProjectileMesh(meshType, idx, ox, oy, oz, orx, ory, orz, orw, scale) {
    const { sceneEl, meshes, meshTypes } = this;

    const geo = new THREE.BoxBufferGeometry(0.65, 0.65, 0.125);
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geo, mat);

    sceneEl.object3D.add(mesh);

    mat.visible = false;
    mesh.castShadow = false;
    mesh.position.x = ox;
    mesh.position.y = oy;
    mesh.position.z = oz;
    mesh.quaternion.x = orx;
    mesh.quaternion.y = ory;
    mesh.quaternion.z = orz;
    mesh.quaternion.w = orw;
    mesh.scale.setScalar(scale);
    mesh.matrixNeedsUpdate = true;
    mesh.updateMatrices();

    meshes[idx] = mesh;
    meshTypes[idx] = meshType;

    this.maxIndex = Math.max(this.maxIndex, idx);

    this.addMeshToPhysics(idx);

    return mesh;
  }

  addMeshToPhysics(idx) {
    const { physicsSystem, meshes, meshTypes, bodyUuids, shapesUuids, bodyReadyFlags } = this;

    const mesh = meshes[idx];
    const meshType = meshTypes[idx];
    const bodyUuid = physicsSystem.addBody(mesh, BODY_OPTIONS[meshType], () => {
      bodyReadyFlags[idx] = true;
    });

    const shapesUuid = physicsSystem.addShapes(bodyUuid, mesh, SHAPE_OPTIONS);
    bodyUuids[idx] = bodyUuid;
    shapesUuids[idx] = shapesUuid;
  }

  freeProjectileAtIndex(idx) {
    const {
      meshes,
      bodyUuids,
      bodyReadyFlags,
      voxmojiSystem,
      freeFlags,
      startTimes,
      wrappedEntitySystem,
      physicsSystem
    } = this;
    const mesh = meshes[idx];
    if (freeFlags[idx]) return; // Already freed

    voxmojiSystem.unregister(mesh);
    wrappedEntitySystem.unregister(mesh);
    startTimes[idx] = Infinity; // This will stop re-expirations

    if (bodyReadyFlags[idx]) {
      physicsSystem.updateBody(bodyUuids[idx], FREED_BODY_OPTIONS);
    }

    freeFlags[idx] = true;
    this.clearImpulse(idx);
  }

  setImpulse(index, x, y, z, rx, ry, rz) {
    const { impulses } = this;

    if (impulses[index] === null) {
      impulses[index] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    }

    impulses[index][0] = x;
    impulses[index][1] = y;
    impulses[index][2] = z;
    impulses[index][3] = rx;
    impulses[index][4] = ry;
    impulses[index][5] = rz;
  }

  clearImpulse(index) {
    this.setImpulse(index, 0, 0, 0, 0, 0, 0);
  }
}

import { imageUrlForEmoji } from "../../hubs/utils/media-url-utils";
import { offsetRelativeTo } from "../../hubs/components/offset-relative-to";
import { SHAPE, FIT, ACTIVATION_STATE, TYPE } from "three-ammo/constants";
import { COLLISION_LAYERS } from "../../hubs/constants";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { getNetworkedEntitySync, getNetworkOwner } from "../utils/ownership-utils";
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
  SOUND_FART_BIG,
  SOUND_EMOJI_BURST
} from "../../hubs/systems/sound-effects-system";

import BezierEasing from "bezier-easing";
const REACTJI_SEND_RATE_LIMIT = 5000;
let lastReactjiSendTime = 0;

const springStep = BezierEasing(0.47, -0.07, 0.44, 1.65);

const MAX_PROJECTILES = 1024;
const PROJECTILE_EXPIRATION_MS = 5000;
const SPAWN_OFFSET = new THREE.Vector3(0, -0.85, -0.5);
const SELF_BURST_MIN_RADIUS = 0.75;
const SELF_BURST_MAX_RADIUS = 1.25;
const SHRINK_TIME_MS = 1000;
const SHRINK_SPEED = 0.005;
const MIN_LAUNCH_IMPULSE = 6.0;
const MAX_LAUNCH_IMPULSE = 8.0;
const MAX_DRIFT_XY = 0.05;
const MAX_LAUNCH_SPIN = 0.04;
const MIN_BURST_IMPULSE = 0.3;
const MAX_BURST_IMPULSE = 0.5;
const MAX_BURST_SPIN = 0.25;
const LAUNCHER_GRAVITY = new THREE.Vector3(0, -9.8, 0);
const BURST_GRAVITY = new THREE.Vector3(0, 1.5, 0);
const MEGAMOJI_IMPULSE = 12.0;
const MEGAMOJI_SCALE = 3;
const SPAWN_GROW_DELAY_MS = 50; // Need to delay grow so initial impulse is applied properly
const SPAWN_GROW_TIME_MS = 150;
const SPAWN_GROW_MIN_SCALE = 0.2;
const LAUNCHER_SFX_URLS = [SOUND_LAUNCHER_1, SOUND_LAUNCHER_2, SOUND_LAUNCHER_3, SOUND_LAUNCHER_4, SOUND_LAUNCHER_5];
const FART_SFX_URLS = [SOUND_FART_1, SOUND_FART_2, SOUND_FART_3, SOUND_FART_4, SOUND_FART_5];
const BURST_PARTICLE_SCALE = 0.5;

const getLauncherSound = (emoji, isMegaMoji) => {
  if (emoji === "💩") {
    return isMegaMoji ? SOUND_FART_BIG : FART_SFX_URLS[Math.floor(Math.random() * FART_SFX_URLS.length)];
  } else {
    return isMegaMoji ? SOUND_LAUNCHER_BIG : LAUNCHER_SFX_URLS[Math.floor(Math.random() * LAUNCHER_SFX_URLS.length)];
  }
};

const INCLUDE_ENVIRONMENT_FILTER_MASK =
  COLLISION_LAYERS.INTERACTABLES |
  COLLISION_LAYERS.AVATAR |
  COLLISION_LAYERS.ENVIRONMENT |
  COLLISION_LAYERS.PROJECTILES;

const MESH_TYPES = {
  LAUNCHER: 0,
  BURST: 1
};

const ORIGINS = {
  LOCAL: 0,
  REMOTE: 1
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
    collisionFilterGroup: COLLISION_LAYERS.PROJECTILES,
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
    collisionFilterGroup: COLLISION_LAYERS.BURSTS,
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
  [MESH_TYPES.LAUNCHER]: {
    activationState: ACTIVATION_STATE.ACTIVE_TAG,
    collisionFilterMask: INCLUDE_ENVIRONMENT_FILTER_MASK
  },
  [MESH_TYPES.BURST]: {
    activationState: ACTIVATION_STATE.ACTIVE_TAG,
    collisionFilterMask: 0
  }
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
    this.origins = Array(MAX_PROJECTILES).fill(0);
    this.pendingImageUrls = Array(MAX_PROJECTILES).fill(null);
    this.maxIndex = -1;
    this.avatarPovEl = null;

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = UI_ROOT.querySelector("#avatar-pov-node");
    });
  }

  // Fires a projectile of the given emoji, and returns a payload which can be passed to replayProjectile to fire the same one with the same initial conditions.
  fireEmojiLauncherProjectile(emoji, isMegaMoji = false, extraXImpulse = 0.0, extraZImpulse = 0.0) {
    if (!window.APP.hubChannel) return;

    const { avatarPovEl } = this;

    if (!avatarPovEl) return;
    const avatarPovNode = avatarPovEl.object3D;
    avatarPovNode.updateMatrices();

    offsetRelativeTo(null, avatarPovNode.matrixWorld, SPAWN_OFFSET, false, 1, this.sceneEl.object3D, tmpVec3, tmpQuat);

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

    const mag = isMegaMoji
      ? MEGAMOJI_IMPULSE
      : MIN_LAUNCH_IMPULSE + Math.random() * (MAX_LAUNCH_IMPULSE - MIN_LAUNCH_IMPULSE);
    const ix = tmpVec3.x * mag + extraXImpulse;
    const iy = tmpVec3.y * mag;
    const iz = tmpVec3.z * mag + extraZImpulse;
    const irx = -MAX_LAUNCH_SPIN + Math.random() * 2 * MAX_LAUNCH_SPIN;
    const iry = -MAX_LAUNCH_SPIN + Math.random() * 2 * MAX_LAUNCH_SPIN;
    const irz = 0.0;

    const scale = isMegaMoji ? MEGAMOJI_SCALE : 1.0;

    this.spawnProjectile(
      MESH_TYPES.LAUNCHER,
      ORIGINS.LOCAL,
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
      true
    );
    this.soundEffectsSystem.playSoundOneShot(getLauncherSound(emoji, isMegaMoji));

    return [emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale];
  }

  replayEmojiSpawnerProjectile([emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale]) {
    this.spawnProjectile(
      MESH_TYPES.LAUNCHER,
      ORIGINS.REMOTE,
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

  fireEmojiBurst(emoji) {
    const { avatarPovEl } = this;
    if (!avatarPovEl) return;

    const avatarPovNode = avatarPovEl.object3D;
    avatarPovNode.updateMatrices();

    tmpVec3.setFromMatrixPosition(avatarPovNode.matrixWorld);
    tmpVec3.y -= 0.25;
    const radius = Math.random() * (SELF_BURST_MAX_RADIUS - SELF_BURST_MIN_RADIUS) + SELF_BURST_MIN_RADIUS;
    const numParticles = 8 + Math.floor(Math.random() * 8.0);

    this.spawnBurst(emoji, tmpVec3.x, tmpVec3.y, tmpVec3.z, radius, numParticles, true);
    this.soundEffectsSystem.playSoundOneShot(SOUND_EMOJI_BURST);

    return [emoji, tmpVec3.x, tmpVec3.y, tmpVec3.z, radius, numParticles];
  }

  replayEmojiBurst([emoji, ox, oy, oz, radius, numParticles]) {
    tmpVec3.set(ox, oy, oz);
    this.soundEffectsSystem.playPositionalSoundAt(SOUND_EMOJI_BURST, tmpVec3, false);

    return this.spawnBurst(emoji, ox, oy, oz, radius, numParticles, true);
  }

  async spawnBurst(emoji, ox, oy, oz, radius, numParticles = 8, scaleAtSpawn = false) {
    for (let i = 0; i < numParticles; i++) {
      const dx = Math.sin(Math.PI * 2.0 * (i / numParticles));
      const dz = Math.cos(Math.PI * 2.0 * (i / numParticles));

      const rox = ox + dx * radius;
      const roz = oz + dz * radius;

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

      const scale = scaleAtSpawn ? 0.01 : BURST_PARTICLE_SCALE;

      await this.spawnProjectile(
        MESH_TYPES.BURST,
        ORIGINS.LOCAL,
        emoji,
        rox,
        oy,
        roz,
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
        true
      );
    }

    return [emoji, ox, oy, oz, radius, numParticles];
  }

  // ox, oy, oz - Spawn origin (if left undefined, spawn in front of avatar)
  // orx, ory, orz, orw - Spawn orientation
  // ix, iy, iz - Impulse (if left undefined, generate impulse)
  // irx, ry, irz - Impulse offset (if left undefined, generate random offset to create spin)
  async spawnProjectile(
    meshType,
    origin,
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
      origins,
      meshes,
      meshTypes,
      pendingImageUrls,
      startTimes,
      playPositionalSoundAfterTicks,
      wrappedEntitySystem,
      targetScales,
      bodyReadyFlags,
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
    origins[idx] = origin;

    let mesh = meshes[idx];

    // Note that body needs to begin its life at scale 1.0 or collisions
    // do not work properly. Once the actual scaling process begins it is
    // made visible.
    if (mesh) {
      mesh.position.x = ox;
      mesh.position.y = oy;
      mesh.position.z = oz;
      mesh.quaternion.x = orx;
      mesh.quaternion.y = ory;
      mesh.quaternion.z = orz;
      mesh.quaternion.w = orw;
      mesh.scale.setScalar(1.0);
      mesh.matrixNeedsUpdate = true;
      mesh.updateMatrices();

      this.physicsSystem.updateBody(this.bodyUuids[idx], RESET_BODY_OPTIONS[meshType]);
      this.physicsSystem.resetDynamicBody(this.bodyUuids[idx], () => (bodyReadyFlags[idx] = true));
    } else {
      mesh = this.createProjectileMesh(meshType, idx, ox, oy, oz, orx, ory, orz, orw, 1.0);
    }

    wrappedEntitySystem.register(mesh);

    this.setImpulse(idx, ix, iy, iz, irx, iry, irz);

    freeFlags[idx] = false;
    startTimes[idx] = performance.now();
    targetScales[idx] = animateScale ? scale : null;
    playPositionalSoundAfterTicks[idx] = playPositionalSound ? 2 : 0;
    emojis[idx] = emoji;
    pendingImageUrls[idx] = imageUrl;
  }

  tick(t, dt) {
    const {
      origins,
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
      playPositionalSoundAfterTicks,
      pendingImageUrls,
      voxmojiSystem
    } = this;
    const now = performance.now();

    // Collision detection pass on launched emoji
    for (let i = 0; i <= maxIndex; i++) {
      if (!bodyReadyFlags[i] || freeFlags[i]) continue;
      if (meshTypes[i] !== MESH_TYPES.LAUNCHER) continue;
      const bodyUuid = bodyUuids[i];
      const collisions = physicsSystem.getCollisions(bodyUuid);

      let hitMedia = false;
      let hitAvatarSessionId = null;

      if (collisions.length > 0) {
        for (let j = 0; j < collisions; j++) {
          const hitBody = collisions[j];
          if (hitBody < 0) continue;

          const body = physicsSystem.getBody(hitBody);
          if (!body) continue;

          const el = body.object3D.el;
          hitMedia = el && el.components["media-loader"];

          // This is a bit fragile, but a regression will be obvious.
          if (el && el.components["avatar-audio-source"]) {
            const networkedEl = getNetworkedEntitySync(el);

            if (networkedEl) {
              hitAvatarSessionId = getNetworkOwner(networkedEl);
            }
          }

          if (hitMedia) {
            const hitVox = el.components["media-vox"];

            if (hitVox && !hitVox.shouldBurstProjectileOnImpact()) {
              hitMedia = false;
            }
          }

          if (hitMedia || hitAvatarSessionId) break;
        }
      }

      if (hitMedia || hitAvatarSessionId) {
        const mesh = meshes[i];
        const meshType = meshTypes[i];
        const origin = origins[i];

        this.spawnBurst(emojis[i], mesh.position.x, mesh.position.y, mesh.position.z, 0.1);
        this.soundEffectsSystem.playPositionalSoundAt(SOUND_EMOJI_BURST, mesh.position, false);
        this.freeProjectileAtIndex(i);

        if (origin === ORIGINS.LOCAL && meshType === MESH_TYPES.LAUNCHER) {
          if (hitAvatarSessionId) {
            const now = performance.now();

            if (now > lastReactjiSendTime + REACTJI_SEND_RATE_LIMIT) {
              window.APP.hubChannel.sendMessage(emojis[i], "reactji", hitAvatarSessionId);
              lastReactjiSendTime = now;
            }
          }
        }

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
        if (
          targetScales[i] !== null &&
          startTimes[i] + SPAWN_GROW_DELAY_MS < now &&
          startTimes[i] + SPAWN_GROW_DELAY_MS + SPAWN_GROW_TIME_MS > now
        ) {
          const mesh = meshes[i];
          const t = (now - startTimes[i] - SPAWN_GROW_DELAY_MS) / SPAWN_GROW_TIME_MS;
          const scale = SPAWN_GROW_MIN_SCALE + springStep(t) * (targetScales[i] - SPAWN_GROW_MIN_SCALE);
          mesh.scale.x = scale;
          mesh.scale.y = scale;
          mesh.scale.z = 1.0;

          // Images are set *after* the initial scale, since the body needs to start
          // out scaled at 1.0 to not break collisions.
          if (pendingImageUrls[i] !== null) {
            voxmojiSystem.register(pendingImageUrls[i], meshes[i]);
            pendingImageUrls[i] = null;
          }

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

        if (mesh.scale.x === 1.0) {
          // Initial scale
          mesh.scale.x = targetScales[i];
          mesh.scale.y = targetScales[i];
          mesh.scale.z = targetScales[i];
        }

        const t = now - startTimes[i];

        if (mesh.scale.x < BURST_PARTICLE_SCALE && t < 200.0) {
          mesh.scale.x = Math.min(mesh.scale.x * 1.65, BURST_PARTICLE_SCALE);
          mesh.scale.y = Math.min(mesh.scale.y * 1.65, BURST_PARTICLE_SCALE);
          mesh.scale.z = Math.min(mesh.scale.z * 1.65, BURST_PARTICLE_SCALE);
        } else {
          mesh.scale.x *= s;
          mesh.scale.y *= s;
          mesh.scale.z *= s;
        }

        // Images are set *after* the initial scale, since the body needs to start
        // out scaled at 1.0 to not break collisions.
        if (pendingImageUrls[i] !== null) {
          voxmojiSystem.register(pendingImageUrls[i], meshes[i]);
          pendingImageUrls[i] = null;
        }

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

  createProjectileMesh(meshType, idx, ox, oy, oz, orx, ory, orz, orw) {
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
    mesh.scale.setScalar(1.0);
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
      bodyReadyFlags[idx] = false;
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

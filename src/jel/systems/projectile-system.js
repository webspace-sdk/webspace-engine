import { imageUrlForEmoji } from "../../hubs/utils/media-utils";
import { offsetRelativeTo } from "../../hubs/components/offset-relative-to";
import { SHAPE, FIT, ACTIVATION_STATE, TYPE } from "three-ammo/constants";
import { COLLISION_LAYERS } from "../../hubs/constants";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

const MAX_PROJECTILES = 128;
const PROJECTILE_EXPIRATION_MS = 5000;
const SPAWN_OFFSET = new THREE.Vector3(0, -0.85, -0.5);
const SHRINK_TIME_MS = 1000;
const SHRINK_SPEED = 0.005;
const MIN_IMPULSE = 6.0;
const MAX_IMPULSE = 8.0;
const MAX_DRIFT_XY = 0.05;
const MAX_SPIN = 0.05;
const DEFAULT_GRAVITY = new THREE.Vector3(0, -9.8, 0);
const MEGAMOJI_IMPULSE = 12.0;

const INCLUDE_ENVIRONMENT_FILTER_MASK =
  COLLISION_LAYERS.INTERACTABLES | COLLISION_LAYERS.AVATAR | COLLISION_LAYERS.ENVIRONMENT;

const BODY_OPTIONS = {
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
  gravity: DEFAULT_GRAVITY
};

const SHAPE_OPTIONS = {
  type: SHAPE.BOX,
  fit: FIT.ALL
};

const tmpVec3 = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

export class ProjectileSystem {
  constructor(sceneEl, voxmojiSystem, physicsSystem) {
    this.sceneEl = sceneEl;
    this.voxmojiSystem = voxmojiSystem;
    this.physicsSystem = physicsSystem;

    this.meshes = Array(MAX_PROJECTILES).fill(null);
    this.freeFlags = Array(MAX_PROJECTILES).fill(true);
    this.bodyUuids = Array(MAX_PROJECTILES).fill(null);
    this.bodyReadyFlags = Array(MAX_PROJECTILES).fill(false);
    this.shapesUuids = Array(MAX_PROJECTILES).fill(null);
    this.expirations = Array(MAX_PROJECTILES).fill(performance.now());
    this.impulses = Array(MAX_PROJECTILES).fill(null);
    this.maxIndex = -1;
    this.avatarPovNode = null;

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.querySelector("#avatar-pov-node");
    });
  }

  // Fires a projectile of the given emoji, and returns a payload which can be passed to replayProjectile to fire the same one with the same initial conditions.
  fireEmojiLauncherProjectile(emoji, isMegaMoji = false) {
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
    const ix = tmpVec3.x * mag;
    const iy = tmpVec3.y * mag;
    const iz = tmpVec3.z * mag;
    const irx = -MAX_SPIN + Math.random() * 2 * MAX_SPIN;
    const iry = -MAX_SPIN + Math.random() * 2 * MAX_SPIN;
    const irz = 0.0;

    const scale = isMegaMoji ? 3 : 1.0;

    this.spawnProjectile(emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale);

    return [emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale];
  }

  replayEmojiSpawnerProjectile([emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale]) {
    this.spawnProjectile(emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale);
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

  // ox, oy, oz - Spawn origin (if left undefined, spawn in front of avatar)
  // orx, ory, orz, orw - Spawn orientation
  // ix, iy, iz - Impulse (if left undefined, generate impulse)
  // irx, ry, irz - Impulse offset (if left undefined, generate random offset to create spin)
  async spawnProjectile(emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz, scale) {
    const { physicsSystem, freeFlags, avatarPovEl, meshes, voxmojiSystem, expirations, bodyUuids } = this;
    if (!avatarPovEl) return;

    const imageUrl = imageUrlForEmoji(emoji, 64);

    const avatarPovNode = avatarPovEl.object3D;

    // Find the index of a free mesh or a new index for a new mesh.
    let newIndex = -1;

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (meshes[i] === null || freeFlags[i]) {
        newIndex = i;
        break;
      }
    }

    if (newIndex === -1) {
      console.warn("No slots for new projectile.");
      return;
    }

    let mesh = meshes[newIndex];

    if (mesh) {
      physicsSystem.resetDynamicBody(bodyUuids[newIndex]);
      await voxmojiSystem.register(imageUrl, mesh);
    } else {
      mesh = await this.createProjectileMesh(newIndex, imageUrl);
    }

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

    if (ix === undefined) {
      const vec = new THREE.Vector3(
        0 + -MAX_DRIFT_XY + Math.random() * 2.0 * MAX_DRIFT_XY,
        1 + -MAX_DRIFT_XY + Math.random() * 2.0 * MAX_DRIFT_XY,
        -1
      );
      avatarPovNode.updateMatrices();
      vec.transformDirection(avatarPovNode.matrixWorld);

      const mag = MIN_IMPULSE + Math.random() * (MAX_IMPULSE - MIN_IMPULSE);
      ix = vec.x * mag;
      iy = vec.y * mag;
      iz = vec.z * mag;
      irx = -MAX_SPIN + Math.random() * 2 * MAX_SPIN;
      iry = -MAX_SPIN + Math.random() * 2 * MAX_SPIN;
      irz = 0.0;
    }

    this.setImpulse(newIndex, ix, iy, iz, irx, iry, irz);

    mesh.visible = true;

    freeFlags[newIndex] = false;
    expirations[newIndex] = performance.now() + PROJECTILE_EXPIRATION_MS;

    return [emoji, ox, oy, oz, orx, ory, orz, orw, ix, iy, iz, irx, iry, irz];
  }

  tick(t, dt) {
    const { meshes, physicsSystem, bodyUuids, maxIndex, expirations, freeFlags, bodyReadyFlags } = this;
    const now = performance.now();

    for (let i = 0; i <= maxIndex; i++) {
      if (!bodyReadyFlags[i] || freeFlags[i]) continue;
      const bodyUuid = bodyUuids[i];

      if (expirations[i] < now) {
        this.freeProjectileAtIndex(i);
        continue;
      }

      if (expirations[i] - SHRINK_TIME_MS < now) {
        const mesh = meshes[i];
        mesh.scale.x = Math.max(0.01, mesh.scale.x - SHRINK_SPEED * dt);
        mesh.scale.y = Math.max(0.01, mesh.scale.y - SHRINK_SPEED * dt);

        if (mesh.scale.x <= 0.01) {
          mesh.scale.z = 0.01;
        }

        mesh.matrixNeedsUpdate = true;
      }

      const [ix, iy, iz, rx, ry, rz] = this.impulses[i];

      if (ix !== 0 || iy !== 0 || iz !== 0) {
        physicsSystem.applyImpulse(bodyUuid, ix, iy, iz, rx, ry, rz);
        this.clearImpulse(i);
      }
    }
  }

  async createProjectileMesh(idx, imageUrl) {
    const { sceneEl, voxmojiSystem, physicsSystem, meshes, bodyUuids, shapesUuids, bodyReadyFlags } = this;

    const geo = new THREE.BoxBufferGeometry(0.65, 0.65, 0.125);
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geo, mat);

    sceneEl.object3D.add(mesh);
    await voxmojiSystem.register(imageUrl, mesh);

    mat.visible = false;
    mesh.castShadow = false;

    const bodyUuid = physicsSystem.addBody(mesh, BODY_OPTIONS, () => (bodyReadyFlags[idx] = true));

    const shapesUuid = physicsSystem.addShapes(bodyUuid, mesh, SHAPE_OPTIONS);

    meshes[idx] = mesh;
    bodyUuids[idx] = bodyUuid;
    shapesUuids[idx] = shapesUuid;

    this.maxIndex = Math.max(this.maxIndex, idx);

    return mesh;
  }

  freeProjectileAtIndex(idx) {
    const { meshes, voxmojiSystem, freeFlags, expirations } = this;
    const mesh = meshes[idx];
    if (freeFlags[idx]) return; // Already freed

    voxmojiSystem.unregister(mesh);
    expirations[idx] = Infinity; // This will stop re-expirations
    mesh.visible = false;
    mesh.scale.setScalar(1.0);
    mesh.matrixNeedsUpdate = true;
    mesh.updateMatrices();
    freeFlags[idx] = true;
    this.clearImpulse(idx);
  }
}

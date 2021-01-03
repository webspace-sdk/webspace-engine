import { imageUrlForEmoji } from "../../hubs/utils/media-utils";
import { offsetRelativeTo } from "../../hubs/components/offset-relative-to";
import { SHAPE, FIT, ACTIVATION_STATE, TYPE } from "three-ammo/constants";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

const MAX_PROJECTILES = 128;
const PROJECTILE_EXPIRATION_MS = 5000;
const SPAWN_OFFSET = new THREE.Vector3(0, 0, -1.5);

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
    this.maxIndex = -1;
    this.avatarPovNode = null;

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.querySelector("#avatar-pov-node");
    });
  }

  fireProjectile(emoji) {
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
    } else {
      mesh = this.createProjectileMesh(newIndex);
    }

    offsetRelativeTo(mesh, avatarPovNode, SPAWN_OFFSET);

    mesh.visible = true;

    freeFlags[newIndex] = false;
    expirations[newIndex] = performance.now() + PROJECTILE_EXPIRATION_MS;

    voxmojiSystem.register(imageUrl, mesh);
  }

  tick() {
    const { maxIndex, expirations, freeFlags, bodyReadyFlags } = this;
    const now = performance.now();

    for (let i = 0; i <= maxIndex; i++) {
      if (!bodyReadyFlags[i] || freeFlags[i]) continue;
      if (expirations[i] < now) {
        this.freeProjectileAtIndex(i);
      }
    }
  }

  createProjectileMesh(idx) {
    const { sceneEl, physicsSystem, meshes, bodyUuids, shapesUuids, bodyReadyFlags } = this;

    const geo = new THREE.BoxBufferGeometry(0.65, 0.65, 0.125);
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geo, mat);

    sceneEl.object3D.add(mesh);

    mat.visible = false;
    mesh.castShadow = false;

    const bodyUuid = physicsSystem.addBody(
      mesh,
      {
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
        collisionFilterMask: 7,
        scaleAutoUpdate: true
      },
      () => (bodyReadyFlags[idx] = true)
    );

    const shapesUuid = physicsSystem.addShapes(bodyUuid, mesh, {
      type: SHAPE.BOX,
      fit: FIT.ALL
    });

    meshes[idx] = mesh;
    bodyUuids[idx] = bodyUuid;
    shapesUuids[idx] = shapesUuid;

    this.maxIndex = Math.max(this.maxIndex, idx);

    return mesh;
  }

  freeProjectileAtIndex(idx) {
    const { meshes, voxmojiSystem, freeFlags, expirations } = this;
    const mesh = meshes[idx];
    voxmojiSystem.unregister(mesh);
    expirations[idx] = Infinity; // This will stop re-expirations
    mesh.visible = false;
    freeFlags[idx] = true;
  }
}

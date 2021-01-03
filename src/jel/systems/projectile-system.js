import { imageUrlForEmoji } from "../../hubs/utils/media-utils";

const MAX_PROJECTILES = 128;
const PROJECTILE_EXPIRATION_MS = 15000;

export class ProjectileSystem {
  constructor(sceneEl, voxmojiSystem) {
    this.sceneEl = sceneEl;
    this.voxmojiSystem = voxmojiSystem;

    this.meshes = Array(MAX_PROJECTILES).fill(null);
    this.expirations = Array(MAX_PROJECTILES).fill(performance.now());
    this.maxIndex = -1;
    this.avatarPovNode = null;
  }

  fireProjectile(emoji) {
    if (!this.avatarPovNode) {
      const avatarPovEl = document.querySelector("#avatar-pov-node");
      if (!avatarPovEl) return;

      this.avatarPovNode = avatarPovEl.object3D;
    }

    const { meshes, voxmojiSystem, expirations } = this;

    let newIndex = -1;

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (meshes[i] === null) {
        newIndex = i;
        break;
      }
    }

    if (newIndex === -1) {
      console.warn("No room for new projectile.");
      return;
    }

    const geo = new THREE.BoxBufferGeometry(0.65, 0.65, 0.125);
    const mat = new THREE.MeshBasicMaterial();
    mat.visible = false;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    const imageUrl = imageUrlForEmoji(emoji, 64);
    voxmojiSystem.register(imageUrl, mesh);

    meshes[newIndex] = mesh;
    expirations[newIndex] = performance.now() + PROJECTILE_EXPIRATION_MS;
  }

  tick() {
    const { maxIndex } = this;

    for (let i = 0; i <= maxIndex; i++) {}
  }
}

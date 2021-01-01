import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { imageUrlForEmoji } from "../../hubs/utils/media-utils";
import { SHAPE } from "three-ammo/constants";

AFRAME.registerComponent("projectile-emoji", {
  schema: {
    emoji: { type: "string" }
  },

  async init() {
    const geo = new THREE.BoxBufferGeometry(0.65, 0.65, 0.125);
    const mat = new THREE.MeshBasicMaterial();
    mat.visible = false;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = false;
    this.el.object3D.matrixNeedsUpdate = true;
    this.el.setObject3D("mesh", this.mesh);
    this.voxmojiSystem = this.el.sceneEl.systems["hubs-systems"].voxmojiSystem;

    const imageUrl = imageUrlForEmoji(this.data.emoji, 128);
    this.voxmojiSystem.register(imageUrl, this.mesh);

    this.el.setAttribute("shape-helper", { type: SHAPE.BOX, minHalfExtent: 0.04 });
  },

  remove() {
    const { el, mesh, voxmojiSystem } = this;
    console.log("remove");
    disposeExistingMesh(el);
    voxmojiSystem.unregister(mesh);
  }
});

export function fireProjectileEmoji(emoji = "☺️") {
  const entity = document.createElement("a-entity");
  const scene = AFRAME.scenes[0];

  entity.setAttribute("networked", { template: "#projectile-emoji" });
  entity.setAttribute("projectile-emoji", { emoji });
  entity.setAttribute("offset-relative-to", {
    target: "#avatar-pov-node",
    offset: { x: 0, y: 0, z: -1.5 },
    orientation: 1
  });
  scene.appendChild(entity);
  setTimeout(() => {
    window.em = entity;
  }, 500);
}

window.fireProjectileEmoji = fireProjectileEmoji;

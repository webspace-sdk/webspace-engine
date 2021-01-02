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
    this.pendingInitialImpulse = true;

    const imageUrl = imageUrlForEmoji(this.data.emoji, 64);
    this.voxmojiSystem.register(imageUrl, this.mesh);

    this.el.setAttribute("shape-helper", { type: SHAPE.BOX, minHalfExtent: 0.04 });
  },

  tick() {
    const bodyHelper = this.el.components["body-helper"];

    if (this.pendingInitialImpulse && bodyHelper && bodyHelper.ready) {
      const pov = document.querySelector("#avatar-pov-node").object3D;
      const driftXY = 0.15;
      const spin = 0.1;
      const vec = new THREE.Vector3(
        0 + -driftXY + Math.random() * 2.0 * driftXY,
        1 + -driftXY + Math.random() * 2.0 * driftXY,
        -1
      );
      pov.updateMatrices();
      vec.transformDirection(pov.matrixWorld);
      console.log(vec);
      const mag = 6.0 + Math.random() * 2.0;
      bodyHelper.applyImpulse(
        vec.x * mag,
        vec.y * mag,
        vec.z * mag,
        -spin + Math.random() * 2 * spin,
        -spin + Math.random() * 2 * spin,
        0.0
      );
      this.pendingInitialImpulse = false;
    }
  },

  remove() {
    const { el, mesh, voxmojiSystem } = this;
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

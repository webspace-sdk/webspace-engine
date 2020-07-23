import { WORLD_MAX_COORD, WORLD_MIN_COORD, WORLD_SIZE } from "../../hubs/systems/character-controller-system";
import { ensureOwnership } from "../utils/ownership-utils";

AFRAME.registerComponent("wrapped-entity", {
  init() {
    this.el.sceneEl.systems["hubs-systems"].wrappedEntitySystem.register(this.el);
  },

  remove() {
    this.el.sceneEl.systems["hubs-systems"].wrappedEntitySystem.unregister(this.el);
  }
});

export class WrappedEntitySystem {
  constructor(scene) {
    this.scene = scene;
    this.frame = 0;
    this.els = [];
    this.avatarPovEl = document.getElementById("avatar-pov-node");
    this.avatarRigEl = document.getElementById("avatar-rig");
  }

  register(el) {
    this.els.push(el);
  }

  unregister(el) {
    this.els.splice(this.els.indexOf(el), 1);
  }

  tick() {
    this.frame++;
    if (this.els.length === 0) return;

    for (let i = 0; i < this.els.length; i++) {
      this.moveElForWrap(this.els[i]);
    }
  }

  moveElForWrap = (function() {
    const pos = new THREE.Vector3();

    const normalizeCoord = c => {
      if (c < WORLD_MIN_COORD) {
        return WORLD_SIZE + c;
      } else if (c > WORLD_MAX_COORD) {
        return -WORLD_SIZE + c;
      } else {
        return c;
      }
    };

    return function(el) {
      const avatar = this.avatarPovEl.object3D;
      const obj = el.object3D;

      avatar.getWorldPosition(pos);

      // Avatar x, z
      const ax = pos.x;
      const az = pos.z;

      obj.getWorldPosition(pos);

      // Normalized object x, z
      const objX = normalizeCoord(pos.x);
      const objZ = normalizeCoord(pos.z);

      // Output x, z
      let outX;
      let outZ;

      // Current min distance
      let d = Number.MAX_VALUE;

      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          // Candidate out x, z
          const cx = objX + i * WORLD_SIZE;
          const cz = objZ + j * WORLD_SIZE;

          // Compute distance to avatar
          const dx = cx - ax;
          const dz = cz - az;

          const distSq = dx * dx + dz * dz;

          // New min
          if (distSq < d) {
            outX = cx;
            outZ = cz;
            d = distSq;
          }
        }
      }

      const changeX = pos.x - outX;
      const changeZ = pos.z - outZ;

      if (
        (changeX > 0 && changeX > 0.001) ||
        (changeX < 0 && changeX < -0.001) ||
        (changeZ > 0 && changeZ > 0.001) ||
        (changeZ < 0 && changeZ < -0.001)
      ) {
        // Change
        ensureOwnership(el);
        obj.position.x = outX;
        obj.position.z = outZ;
        obj.matrixNeedsUpdate = true;
      }
    };
  })();
}

export const WORLD_RADIUS = 7.5;
export const WORLD_CIRCUMFERENCE = 2 * WORLD_RADIUS * Math.PI;
export const WORLD_MAX_COORD = WORLD_CIRCUMFERENCE / 2 - 0.5;
export const WORLD_MIN_COORD = -WORLD_MAX_COORD;
export const WORLD_SIZE = WORLD_MAX_COORD - WORLD_MIN_COORD;
const MAX_AVATAR_DISTANCE_TO_ALLOW_SCHEDULED_WRAP = 5;

// This code is used to wrap objects around in world space, to simulate the experience of walking
// around a planet.

const normalizeCoord = c => {
  if (c < WORLD_MIN_COORD) {
    return WORLD_SIZE + c;
  } else if (c > WORLD_MAX_COORD) {
    return -WORLD_SIZE + c;
  } else {
    return c;
  }
};

export const registerWrappedEntityPositionNormalizers = () => {
  const pos = new THREE.Vector3();

  const normalizer = data => {
    pos.x = normalizeCoord(data.x);
    pos.y = data.y;
    pos.z = normalizeCoord(data.z);

    return new THREE.Vector3(pos.x, pos.y, pos.z);
  };

  NAF.entities.setPositionNormalizer(normalizer);
  SAF.entities.setPositionNormalizer(normalizer);

  NAF.options.maxLerpDistance = WORLD_SIZE - 1;
  SAF.options.maxLerpDistance = WORLD_SIZE - 1;
};

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

  tick = (function() {
    const pos = new THREE.Vector3();

    return function() {
      this.frame++;
      if (this.els.length === 0) return;

      const avatar = this.avatarPovEl.object3D;

      avatar.getWorldPosition(pos);

      // Avatar x, z
      const ax = pos.x;
      const az = pos.z;

      const avatarJumpedThisFrame =
        !this.previousAvatarX ||
        Math.abs(this.previousAvatarX - ax) > MAX_AVATAR_DISTANCE_TO_ALLOW_SCHEDULED_WRAP ||
        Math.abs(this.previousAvatarZ - az) > MAX_AVATAR_DISTANCE_TO_ALLOW_SCHEDULED_WRAP;

      this.previousAvatarX = ax;
      this.previousAvatarZ = az;

      if (avatarJumpedThisFrame) {
        // If our avatar just jumped across the map this frame, we need to reposition everything
        // since we may now be right up against an object on an edge.
        for (let i = 0; i < this.els.length; i++) {
          this.moveElForWrap(this.els[i], ax, az);
        }
      } else {
        // Otherwise just reposition stuff lazily, since it's beyond the horizon.
        const el = this.els[this.frame % this.els.length];
        this.moveElForWrap(el, ax, az);
      }
    };
  })();

  moveElForWrap = (function() {
    // There are 9 possible positions for this entity in world space that could be seen by the player.
    // (Planet space is bounded, world space is not.)
    //
    // Move the entity to the one nearest the player.
    const pos = new THREE.Vector3();

    return function(el, avatarX, avatarZ) {
      const obj = el.object3D;

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
          const dx = cx - avatarX;
          const dz = cz - avatarZ;

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
        obj.position.x = outX;
        obj.position.z = outZ;
        obj.matrixNeedsUpdate = true;
      }
    };
  })();
}

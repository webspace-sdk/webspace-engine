// TODO deal with thrown physics object disappearing - wait for rest
import { WORLD_SIZE, WORLD_MIN_COORD, WORLD_MAX_COORD } from "./terrain-system";
import { Terrain } from "../objects/terrain";
const MAX_AVATAR_DISTANCE_TO_ALLOW_SCHEDULED_WRAP = 5;
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";

// This code is used to wrap objects around in world space, to simulate the experience of walking
// around a planet.

export const normalizeCoord = c => {
  if (c < WORLD_MIN_COORD) {
    return WORLD_SIZE + c;
  } else if (c > WORLD_MAX_COORD) {
    return -WORLD_SIZE + c;
  } else {
    return c;
  }
};

export const denormalizeCoord = (c, p) => {
  // Bring new point to same area as previous point.
  if (c < p) {
    while (Math.abs(p - c) > WORLD_SIZE / 2) {
      c += WORLD_SIZE;
    }
  } else if (c > p) {
    while (Math.abs(p - c) > WORLD_SIZE / 2) {
      c -= WORLD_SIZE;
    }
  }

  return c;
};

export const registerWrappedEntityPositionNormalizers = () => {
  const pos = new THREE.Vector3();

  const normalizer = data => {
    const shouldNormalize = SYSTEMS.terrainSystem.worldTypeWraps();

    if (shouldNormalize) {
      pos.x = normalizeCoord(data.x);
      pos.z = normalizeCoord(data.z);
    } else {
      pos.x = data.x;
      pos.z = data.z;
    }

    pos.y = data.y;

    return new THREE.Vector3(pos.x, pos.y, pos.z);
  };

  const denormalizer = (data, prev) => {
    const shouldNormalize = SYSTEMS.terrainSystem.worldTypeWraps();

    if (shouldNormalize) {
      data.x = denormalizeCoord(data.x, prev.x);
      data.z = denormalizeCoord(data.z, prev.z);
    }

    return data;
  };

  NAF.entities.setPositionNormalizer(normalizer);

  NAF.entities.setPositionDenormalizer(denormalizer);

  NAF.options.maxLerpDistance = WORLD_SIZE - 1;
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
  constructor(scene, atmosphereSystem, skyBeamSystem, terrainSystem) {
    this.scene = scene;
    this.atmosphereSystem = atmosphereSystem;
    this.skyBeamSystem = skyBeamSystem;
    this.terrainSystem = terrainSystem;
    this.frame = 0;

    this.objs = [];
    this.forceWrapNextFrameObjs = [];
    this.handleOwnershipChanged = this.handleOwnershipChanged.bind(this);

    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPovEl = DOM_ROOT.getElementById("avatar-pov-node");
      this.avatarRigEl = DOM_ROOT.getElementById("avatar-rig");
    });

    this.previousAvatarX = null;
    this.previousAvatarZ = null;
  }

  register(elOrObj) {
    const obj = elOrObj.object3D || elOrObj;
    if (this.objs.includes(obj)) return;

    this.objs.push(obj);
    this.forceWrapNextFrameObjs.push(obj);

    if (elOrObj.addEventListener) {
      elOrObj.addEventListener("ownership-changed", this.handleOwnershipChanged);
    }
  }

  unregister(elOrObj) {
    const obj = elOrObj.object3D || elOrObj;

    let i = this.objs.indexOf(obj);

    if (i >= 0) {
      this.objs.splice(i, 1);
    }

    i = this.forceWrapNextFrameObjs.indexOf(obj);

    if (i >= 0) {
      this.forceWrapNextFrameObjs.splice(i, 1);
    }

    if (elOrObj.removeEventListener) {
      elOrObj.removeEventListener("ownership-changed", this.handleOwnershipChanged);
    }
  }

  handleOwnershipChanged({ detail: { el } }) {
    const obj = el.object3D;

    // When ownership changes, the other user may have pulled it to another part of the world,
    // so we need to re-wrap it.
    if (!this.forceWrapNextFrameObjs.includes(obj)) {
      this.forceWrapNextFrameObjs.push(obj);
    }
  }

  tick = (function() {
    const pos = new THREE.Vector3();

    return function() {
      this.frame++;
      if (this.objs.length === 0) return;
      if (!this.avatarPovEl) return;

      const avatar = this.avatarPovEl.object3D;

      avatar.getWorldPosition(pos);

      // Avatar x, z
      const ax = pos.x;
      const az = pos.z;

      const avatarJumpedThisFrame =
        this.previousAvatarX === null ||
        Math.abs(this.previousAvatarX - ax) > MAX_AVATAR_DISTANCE_TO_ALLOW_SCHEDULED_WRAP ||
        Math.abs(this.previousAvatarZ - az) > MAX_AVATAR_DISTANCE_TO_ALLOW_SCHEDULED_WRAP;

      this.previousAvatarX = ax;
      this.previousAvatarZ = az;

      if (avatarJumpedThisFrame) {
        //console.log(`Avatar moved across world, repositioning ${this.objs.length} objects.`);
        // If our avatar just jumped across the map this frame, we need to reposition everything
        // since we may now be right up against an object on an edge.
        for (let i = 0; i < this.objs.length; i++) {
          this.moveObjForWrap(this.objs[i], ax, az);
        }
      } else {
        // Handle immediately all new elements so there's no latency on initial
        // wrap state.
        for (let i = 0; i < this.forceWrapNextFrameObjs.length; i++) {
          const obj = this.forceWrapNextFrameObjs[i];
          this.moveObjForWrap(obj, ax, az);
        }

        // Otherwise just reposition things lazily, since it's beyond the horizon.
        const obj = this.objs[this.frame % this.objs.length];
        this.moveObjForWrap(obj, ax, az);
      }

      if (this.forceWrapNextFrameObjs.length > 0) {
        this.forceWrapNextFrameObjs.length = 0;
      }
    };
  })();

  moveObjForWrapIfRegistered(elOrObj) {
    const obj = elOrObj.object3D || elOrObj;

    if (this.objs.indexOf(obj) >= 0) {
      return this.moveObjForWrap(obj);
    }

    return false;
  }

  moveObjForWrap = (function() {
    // There are 9 possible positions for this entity in world space that could be seen by the player.
    // (Planet space is bounded, world space is not.)
    //
    // Move the entity to the one nearest the player.
    const pos = new THREE.Vector3();

    return function(obj, avatarX = this.previousAvatarX, avatarZ = this.previousAvatarZ) {
      if (!this.terrainSystem.worldTypeWraps()) {
        const isTerrain = obj.children && obj.children.length === 1 && obj.children[0] instanceof Terrain;
        // Keep wrapping terrain but not objects
        if (!isTerrain) return;
      }

      obj.getWorldPosition(pos);

      // Normalized object x, z
      const objX = normalizeCoord(pos.x);
      const objZ = normalizeCoord(pos.z);

      // Output x, z
      let outX;
      let outZ;

      // Current min distance
      let d = Number.MAX_VALUE;

      const wrapForPointX = avatarX;
      const wrapForPointZ = avatarZ;

      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          // Candidate out x, z
          const cx = objX + i * WORLD_SIZE;
          const cz = objZ + j * WORLD_SIZE;

          // Compute distance to wrap point
          const dx = cx - wrapForPointX;
          const dz = cz - wrapForPointZ;

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
        this.atmosphereSystem.updateShadows();
        this.atmosphereSystem.updateWater();
        return true;
      }

      return false;
    };
  })();
}

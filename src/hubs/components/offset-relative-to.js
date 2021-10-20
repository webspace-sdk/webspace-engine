import { waitForDOMContentLoaded } from "../utils/async-utils";

export const offsetRelativeTo = (() => {
  const y = new THREE.Vector3(0, 1, 0);
  const z = new THREE.Vector3(0, 0, -1);
  const QUARTER_CIRCLE = Math.PI / 2;
  const offsetVector = new THREE.Vector3();
  const targetWorldPos = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const v4 = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();

  return function(
    obj,
    targetMatrixWorld,
    offset,
    lookAt = false,
    orientation = 1,
    parent = null,
    outPos = null,
    outQuaternion = null,
    ignoreTargetPitch = false,
    phi = 0
  ) {
    if (!obj && (orientation !== 1 || lookAt)) {
      throw new Error("Orientation/lookAt on non-object target not supported");
    }

    if (parent === null && obj) {
      parent = obj.parent;
    }

    if (obj !== null && outPos === null) {
      outPos = obj.position;
    }

    if (obj !== null && outQuaternion === null) {
      outQuaternion = obj.quaternion;
    }

    offsetVector.copy(offset);

    targetMatrixWorld.decompose(v1, q, v2);

    if (ignoreTargetPitch) {
      v3.set(0, 0, -1);
      v3.transformDirection(targetMatrixWorld);
      v4.copy(v3);
      v4.y = 0;
      v4.normalize();
      q2.setFromUnitVectors(v3, v4);
      q.premultiply(q2);
    }

    if (phi !== 0) {
      v3.set(0, 1, 0);
      q2.setFromAxisAngle(v3, phi);
      q.premultiply(q2);
    }

    m.compose(
      v1,
      q,
      v2
    );

    offsetVector.applyMatrix4(m);

    if (parent) {
      parent.worldToLocal(offsetVector);
    }

    outPos.copy(offsetVector);
    if (lookAt) {
      targetWorldPos.setFromMatrixPosition(targetMatrixWorld);
      obj.updateMatrices(true);
      obj.lookAt(targetWorldPos);
    } else {
      targetMatrixWorld.decompose(v1, outQuaternion, v2);
    }

    // See doc/image_orientations.gif
    switch (orientation) {
      case 8:
        obj.rotateOnAxis(z, 3 * QUARTER_CIRCLE);
        break;
      case 7:
        obj.rotateOnAxis(z, 3 * QUARTER_CIRCLE);
        obj.rotateOnAxis(y, 2 * QUARTER_CIRCLE);
        break;
      case 6:
        obj.rotateOnAxis(z, QUARTER_CIRCLE);
        break;
      case 5:
        obj.rotateOnAxis(z, QUARTER_CIRCLE);
        obj.rotateOnAxis(y, 2 * QUARTER_CIRCLE);
        break;
      case 4:
        obj.rotateOnAxis(z, 2 * QUARTER_CIRCLE);
        obj.rotateOnAxis(y, 2 * QUARTER_CIRCLE);
        break;
      case 3:
        obj.rotateOnAxis(z, 2 * QUARTER_CIRCLE);
        break;
      case 2:
        obj.rotateOnAxis(y, 2 * QUARTER_CIRCLE);
        break;
      case 1:
      default:
        break;
    }

    if (ignoreTargetPitch) {
      obj.rotation.x = 0;
    }

    if (obj) {
      obj.matrixNeedsUpdate = true;
    }
  };
})();

/**
 * Positions an entity relative to a given target when the given event is fired.
 * @component offset-relative-to
 */
AFRAME.registerComponent("offset-relative-to", {
  schema: {
    target: {
      type: "selector"
    },
    offset: {
      type: "vec3"
    },
    on: {
      type: "string"
    },
    orientation: {
      default: 1 // see doc/image_orientations.gif
    },
    selfDestruct: {
      default: false
    },
    lookAt: {
      default: false
    }
  },
  init() {
    this.updateOffset = this.updateOffset.bind(this);

    waitForDOMContentLoaded().then(() => {
      if (this.data.on) {
        this.el.sceneEl.addEventListener(this.data.on, this.updateOffset);
      } else {
        this.updateOffset();
      }
    });
  },

  updateOffset: function() {
    const { target, offset, lookAt, orientation } = this.data;
    const obj = this.el.object3D;
    target.object3D.updateMatrices();
    offsetRelativeTo(obj, target.object3D.matrixWorld, offset, lookAt, orientation);

    if (this.data.selfDestruct) {
      if (this.data.on) {
        this.el.sceneEl.removeEventListener(this.data.on, this.updateOffset);
      }
      this.el.removeAttribute("offset-relative-to");
    }
  }
});

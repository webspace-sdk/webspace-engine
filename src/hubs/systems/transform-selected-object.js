import { paths } from "../systems/userinput/paths";
import { setMatrixWorld } from "../utils/three-utils";

export const TRANSFORM_MODE = {
  AXIS: "axis",
  PUPPET: "puppet",
  CURSOR: "cursor",
  ALIGN: "align",
  SCALE: "scale",
  SLIDE: "slide"
};

const STEP_LENGTH = Math.PI / 100;
const CAMERA_WORLD_QUATERNION = new THREE.Quaternion();
const CAMERA_WORLD_POSITION = new THREE.Vector3();
const TARGET_WORLD_QUATERNION = new THREE.Quaternion();
const v = new THREE.Vector3();
const v2 = new THREE.Vector3();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const tmpMatrix = new THREE.Matrix4();
const WHEEL_SENSITIVITY = 2.0;
const XAXIS = new THREE.Vector3(1, 0, 0);

AFRAME.registerSystem("transform-selected-object", {
  init() {
    this.target = null;
    this.mode = null;
    this.transforming = false;
    this.axis = new THREE.Vector3();
    this.store = window.APP.store;
    this.startQ = new THREE.Quaternion();

    this.dxStore = 0;
    this.dxApplied = 0;
    this.dyAll = 0;
    this.dyStore = 0;
    this.dyApplied = 0;
    this.raycasters = {};

    this.puppet = {
      initialControllerOrientation: new THREE.Quaternion(),
      initialControllerOrientation_inverse: new THREE.Quaternion(),
      initialObjectOrientation: new THREE.Quaternion(),
      currentControllerOrientation: new THREE.Quaternion(),
      controllerOrientationDelta: new THREE.Quaternion()
    };

    this.planarInfo = {
      plane: new THREE.Mesh(
        new THREE.PlaneBufferGeometry(100000, 100000, 2, 2),
        new THREE.MeshBasicMaterial({
          visible: false,
          wireframe: false,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        })
      ),
      normal: new THREE.Vector3(),
      intersections: [],
      previousPointOnPlane: new THREE.Vector3(),
      currentPointOnPlane: new THREE.Vector3(),
      deltaOnPlane: new THREE.Vector3(),
      finalProjectedVec: new THREE.Vector3()
    };

    this.el.object3D.add(this.planarInfo.plane);
  },

  stopTransform: (function() {
    //const q = new THREE.Quaternion();
    //const PI_AROUND_Y = new THREE.Quaternion(0, 1, 0, 0);
    //const pInv = new THREE.Quaternion();
    return function stopTransform() {
      this.transforming = false;
      this.target = null;

      // Flips object, taken out for now but maybe put on another hotkey
      /*if (this.mode === TRANSFORM_MODE.CURSOR) {
        this.target.getWorldQuaternion(q);
        if (qAlmostEquals(q, this.startQ)) {
          q.multiply(PI_AROUND_Y);
          this.target.parent.getWorldQuaternion(pInv);
          pInv.inverse();
          this.target.quaternion.copy(pInv).multiply(q);
          this.target.matrixNeedsUpdate = true;
        }
      }*/
    };
  })(),

  startPlaneCasting() {
    const { plane, intersections, previousPointOnPlane } = this.planarInfo;

    this.el.camera.getWorldQuaternion(CAMERA_WORLD_QUATERNION);

    if (this.mode === TRANSFORM_MODE.SLIDE) {
      plane.quaternion.setFromAxisAngle(XAXIS, Math.PI / 2);
    } else {
      plane.quaternion.copy(CAMERA_WORLD_QUATERNION);
    }

    this.target.getWorldPosition(plane.position);
    plane.matrixNeedsUpdate = true;
    plane.updateMatrices();

    intersections.length = 0;
    this.raycasters.right =
      this.raycasters.right ||
      document.getElementById("right-cursor-controller").components["cursor-controller"].raycaster;
    this.raycasters.left =
      this.raycasters.left ||
      document.getElementById("left-cursor-controller").components["cursor-controller"].raycaster;
    const raycaster = this.hand.el.id === "player-left-controller" ? this.raycasters.left : this.raycasters.right;
    const far = raycaster.far;
    raycaster.far = 1000;
    plane.raycast(raycaster, intersections);
    raycaster.far = far;
    this.transforming = !!intersections[0];
    if (!this.transforming) {
      return;
    }

    previousPointOnPlane.copy(intersections[0].point);

    this.target.getWorldQuaternion(TARGET_WORLD_QUATERNION);

    v.set(0, 0, -1).applyQuaternion(CAMERA_WORLD_QUATERNION);
    v2.set(0, 0, -1).applyQuaternion(TARGET_WORLD_QUATERNION);
    this.sign = v.dot(v2) > 0 ? 1 : -1;

    v.set(0, 1, 0); //.applyQuaternion(this.CAMERA_WORLD_QUATERNION);
    v2.set(0, 1, 0).applyQuaternion(TARGET_WORLD_QUATERNION);
    this.sign2 = v.dot(v2) > 0 ? 1 : -1;

    this.dyAll = 0;
    this.dyStore = 0;
    this.dyApplied = 0;
    this.dxAll = 0;
    this.dxStore = 0;
    this.dxApplied = 0;
  },

  startTransform(target, hand, data) {
    this.target = target;
    this.hand = hand;
    this.mode = data.mode;
    this.transforming = true;

    if (this.mode === TRANSFORM_MODE.ALIGN) {
      this.store.update({ activity: { hasRecentered: true } });
      return;
    } else if (this.mode !== TRANSFORM_MODE.SLIDE) {
      this.store.handleActivityFlag("rotated");
    }

    if (this.mode === TRANSFORM_MODE.CURSOR) {
      this.target.getWorldQuaternion(this.startQ);
    }

    if (this.mode === TRANSFORM_MODE.PUPPET) {
      this.target.getWorldQuaternion(this.puppet.initialObjectOrientation);
      this.hand.getWorldQuaternion(this.puppet.initialControllerOrientation);
      this.puppet.initialControllerOrientation_inverse.copy(this.puppet.initialControllerOrientation).inverse();
      return;
    }

    if (this.mode === TRANSFORM_MODE.AXIS) {
      this.axis.copy(data.axis);
    }

    this.startPlaneCasting();
  },

  puppetingTick() {
    const {
      currentControllerOrientation,
      controllerOrientationDelta,
      initialControllerOrientation_inverse,
      initialObjectOrientation
    } = this.puppet;
    this.hand.getWorldQuaternion(currentControllerOrientation);
    controllerOrientationDelta.copy(initialControllerOrientation_inverse).premultiply(currentControllerOrientation);
    this.target.quaternion
      .copy(initialObjectOrientation)
      .premultiply(controllerOrientationDelta)
      .premultiply(controllerOrientationDelta);
    this.target.matrixNeedsUpdate = true;
  },

  cursorAxisOrScaleTick() {
    const {
      plane,
      normal,
      intersections,
      previousPointOnPlane,
      currentPointOnPlane,
      deltaOnPlane,
      finalProjectedVec
    } = this.planarInfo;
    this.target.getWorldPosition(plane.position);

    //    this.el.camera.getWorldQuaternion(plane.quaternion);
    this.el.camera.getWorldPosition(v);
    plane.matrixNeedsUpdate = true;
    const cameraToPlaneDistance = v.sub(plane.position).length();

    intersections.length = 0;
    const raycaster = this.hand.el.id === "player-left-controller" ? this.raycasters.left : this.raycasters.right;
    const far = raycaster.far;
    raycaster.far = 1000;
    plane.raycast(raycaster, intersections);
    raycaster.far = far;
    const intersection = intersections[0];
    if (!intersection) return;

    normal.set(0, 0, -1).applyQuaternion(plane.quaternion);

    currentPointOnPlane.copy(intersection.point);
    deltaOnPlane.copy(currentPointOnPlane).sub(previousPointOnPlane);
    const SENSITIVITY = 5;
    finalProjectedVec
      .copy(deltaOnPlane)
      .projectOnPlane(normal)
      .applyQuaternion(q.copy(plane.quaternion).inverse())
      .multiplyScalar(SENSITIVITY / cameraToPlaneDistance);

    const userinput = AFRAME.scenes[0].systems.userinput;

    let wheelDelta = 0.0;

    if (userinput.get(paths.actions.transformScroll)) {
      const dWheel = userinput.get(paths.actions.transformScroll);
      wheelDelta += dWheel * WHEEL_SENSITIVITY;
    }

    if (this.mode === TRANSFORM_MODE.CURSOR) {
      const modify = userinput.get(paths.actions.transformModifier);

      this.dyAll = this.dyStore + finalProjectedVec.y;
      this.dyApplied = Math.round(this.dyAll / STEP_LENGTH) * STEP_LENGTH;
      this.dyStore = this.dyAll - this.dyApplied;

      this.dxAll = this.dxStore + finalProjectedVec.x;
      this.dxApplied = Math.round(this.dxAll / STEP_LENGTH) * STEP_LENGTH;
      this.dxStore = this.dxAll - this.dxApplied;

      // Modify will roll the object in object space, non-modify will rotate it along camera x, y
      if (this.mode === TRANSFORM_MODE.CURSOR) {
        if (modify) {
          this.target.getWorldQuaternion(TARGET_WORLD_QUATERNION);

          v.set(0, 0, 1).applyQuaternion(TARGET_WORLD_QUATERNION);
          q.setFromAxisAngle(
            v,
            Math.abs(this.dxApplied) > Math.abs(this.dyApplied)
              ? -this.dxApplied + wheelDelta
              : -this.dyApplied + wheelDelta
          );

          this.target.quaternion.premultiply(q);
        } else {
          if (wheelDelta !== 0.0) {
            this.target.getWorldQuaternion(TARGET_WORLD_QUATERNION);

            v.set(0, 0, 1).applyQuaternion(TARGET_WORLD_QUATERNION);
            q.setFromAxisAngle(v, wheelDelta);

            this.target.quaternion.premultiply(q);
          }

          v.set(1, 0, 0).applyQuaternion(CAMERA_WORLD_QUATERNION);
          q.setFromAxisAngle(v, this.sign2 * this.sign * -this.dyApplied);

          v.set(0, 1, 0);
          q2.setFromAxisAngle(v, this.dxApplied);

          this.target.quaternion.premultiply(q).premultiply(q2);
        }
      }

      this.target.matrixNeedsUpdate = true;
    } else if (this.mode === TRANSFORM_MODE.AXIS) {
      this.dxAll = this.dxStore + finalProjectedVec.x;
      this.dxApplied = Math.round(this.dxAll / STEP_LENGTH) * STEP_LENGTH;
      this.dxStore = this.dxAll - this.dxApplied;

      this.target.quaternion.multiply(q.setFromAxisAngle(this.axis, -this.sign * this.dxApplied));
      this.target.matrixNeedsUpdate = true;
    }

    previousPointOnPlane.copy(currentPointOnPlane);
  },

  slideTick() {
    const { plane, intersections } = this.planarInfo;
    intersections.length = 0;
    const raycaster = this.hand.el.id === "player-left-controller" ? this.raycasters.left : this.raycasters.right;
    const far = raycaster.far;
    raycaster.far = 1000;
    plane.raycast(raycaster, intersections);
    raycaster.far = far;
    const intersection = intersections[0];
    if (!intersection) return;

    this.target.updateMatrices();
    tmpMatrix.copy(this.target.matrixWorld);
    tmpMatrix.setPosition(intersection.point.x, tmpMatrix.elements[13], intersection.point.z);
    setMatrixWorld(this.target, tmpMatrix);
  },

  tick() {
    if (!this.transforming) {
      return;
    }

    if (this.mode === TRANSFORM_MODE.SCALE) {
      return; // Taken care of by scale-button
    }

    if (this.mode === TRANSFORM_MODE.ALIGN) {
      this.el.camera.getWorldPosition(CAMERA_WORLD_POSITION);
      this.target.lookAt(CAMERA_WORLD_POSITION);
      this.transforming = false;
      return;
    }

    if (this.mode === TRANSFORM_MODE.PUPPET) {
      this.puppetingTick();
      return;
    }

    if (this.mode === TRANSFORM_MODE.SLIDE) {
      this.slideTick();
      return;
    }

    this.cursorAxisOrScaleTick();
  }
});

import { paths } from "../systems/userinput/paths";
import { setMatrixWorld } from "../utils/three-utils";
import { VOXEL_SIZE } from "../../jel/systems/terrain-system";

const MAX_SLIDE_DISTANCE = 20.0;

export const TRANSFORM_MODE = {
  AXIS: "axis",
  PUPPET: "puppet",
  CURSOR: "cursor",
  ALIGN: "align",
  SCALE: "scale",
  SLIDE: "slide",
  STACK: "stack",
  LIFT: "lift"
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
const shiftKeyPath = paths.device.keyboard.key("shift");
const UP = new THREE.Vector3(0, 1, 0);
const offset = new THREE.Vector3();
const targetPoint = new THREE.Vector3();

function withSnap(shouldSnap, v) {
  if (shouldSnap) {
    return Math.floor(v * (1.0 / (VOXEL_SIZE * 2))) * (VOXEL_SIZE * 2);
  } else {
    return v;
  }
}

AFRAME.registerSystem("transform-selected-object", {
  init() {
    this.target = null;
    this.targetInitialMatrixWorld = new THREE.Matrix4();
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
    this.dWheelApplied = 0;
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
      finalProjectedVec: new THREE.Vector3(),
      planeCastObjectOffset: new THREE.Vector3()
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
      this.dWheelApplied = 0;

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

      this.el.emit("transform_stopped");
    };
  })(),

  startPlaneCasting() {
    const { plane, intersections, previousPointOnPlane, planeCastObjectOffset } = this.planarInfo;

    this.el.camera.getWorldQuaternion(CAMERA_WORLD_QUATERNION);
    this.el.camera.getWorldPosition(v);

    const rightCursor = document.getElementById("right-cursor-controller").components["cursor-controller"];
    const leftCursor = document.getElementById("left-cursor-controller").components["cursor-controller"];
    const isLeft = this.hand.el.id === "player-left-controller";

    const cursorObject3D = (isLeft ? leftCursor : rightCursor).data.cursor.object3D;
    if (this.mode === TRANSFORM_MODE.SLIDE || this.mode === TRANSFORM_MODE.LIFT) {
      cursorObject3D.getWorldPosition(plane.position);
      this.target.updateMatrices();

      // Store offset of object origin and cursor intersect so we precisely
      // move the object as cursor offset on plane changes.
      planeCastObjectOffset.copy(plane.position);
      planeCastObjectOffset.x -= this.target.matrixWorld.elements[12];
      planeCastObjectOffset.y -= this.target.matrixWorld.elements[13];
      planeCastObjectOffset.z -= this.target.matrixWorld.elements[14];

      if (this.mode === TRANSFORM_MODE.SLIDE) {
        plane.quaternion.setFromAxisAngle(XAXIS, Math.PI / 2);
      } else {
        plane.quaternion.copy(CAMERA_WORLD_QUATERNION);
      }
    } else {
      this.target.getWorldPosition(plane.position);
      plane.quaternion.copy(CAMERA_WORLD_QUATERNION);
    }

    plane.matrixNeedsUpdate = true;
    plane.updateMatrices();

    intersections.length = 0;
    this.raycasters.right = this.raycasters.right || rightCursor.raycaster;
    this.raycasters.left = this.raycasters.left || leftCursor.raycaster;
    const raycaster = isLeft ? this.raycasters.left : this.raycasters.right;
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

  // When stacking do not raycast to the target anymore
  handleCursorRaycastIntersections(intersections) {
    if (this.mode !== TRANSFORM_MODE.STACK) return;

    const instanceSource = this.target.el && this.target.el.getObject3D("mesh");

    // Skip the hit if it's the object being targetted.
    // Make sure to properly deref instances.
    for (const {
      instanceId,
      object,
      face: { normal },
      point
    } of intersections) {
      if (instanceId === undefined && object === this.target) continue;

      if (instanceSource && SYSTEMS.voxSystem.isMeshInstanceForSource(object, instanceId, instanceSource)) continue;

      if (instanceSource && SYSTEMS.voxmojiSystem.isMeshInstanceForSource(object, instanceId, instanceSource)) continue;

      const normalObject =
        SYSTEMS.voxSystem.getSourceForMeshAndInstance(object, instanceId) ||
        SYSTEMS.voxmojiSystem.getSourceForMeshAndInstance(object, instanceId) ||
        object;

      this.stackTargetAt(point, normal, normalObject);

      break;
    }
  },

  isGrabTransforming() {
    return (
      this.transforming &&
      (this.mode === TRANSFORM_MODE.SLIDE || this.mode === TRANSFORM_MODE.LIFT || this.mode === TRANSFORM_MODE.STACK)
    );
  },

  shouldCursorRaycastDuringTransform() {
    return this.transforming && this.mode === TRANSFORM_MODE.STACK;
  },

  clearTransformRaycastIntersection() {},

  startTransform(target, hand, data) {
    this.target = target;
    this.target.updateMatrices();
    this.targetInitialMatrixWorld.copy(this.target.matrixWorld);

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

    if (this.mode !== TRANSFORM_MODE.STACK) {
      this.startPlaneCasting();
    }

    this.el.emit("transform_started");
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

  cursorOrAxisOrLiftTick() {
    const {
      plane,
      normal,
      intersections,
      previousPointOnPlane,
      currentPointOnPlane,
      deltaOnPlane,
      planeCastObjectOffset,
      finalProjectedVec
    } = this.planarInfo;

    if (this.mode !== TRANSFORM_MODE.LIFT) {
      this.target.getWorldPosition(plane.position);
    }

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

    const userinput = this.el.systems.userinput;

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
    } else if (this.mode === TRANSFORM_MODE.LIFT) {
      const initialX = this.targetInitialMatrixWorld.elements[12];
      const initialZ = this.targetInitialMatrixWorld.elements[14];

      this.target.updateMatrices();
      tmpMatrix.copy(this.targetInitialMatrixWorld);

      const shouldSnap = !!userinput.get(shiftKeyPath);

      tmpMatrix.setPosition(initialX, withSnap(shouldSnap, intersection.point.y - planeCastObjectOffset.y), initialZ);
      setMatrixWorld(this.target, tmpMatrix);
    }

    previousPointOnPlane.copy(currentPointOnPlane);
  },

  slideTick() {
    const { plane, intersections, planeCastObjectOffset } = this.planarInfo;
    intersections.length = 0;
    const raycaster = this.hand.el.id === "player-left-controller" ? this.raycasters.left : this.raycasters.right;
    const far = raycaster.far;
    raycaster.far = 1000;
    plane.raycast(raycaster, intersections);
    raycaster.far = far;
    const intersection = intersections[0];
    if (!intersection) return;
    const userinput = this.el.systems.userinput;

    let wheelDelta = 0.0;

    if (userinput.get(paths.actions.transformScroll)) {
      const dWheel = userinput.get(paths.actions.transformScroll);
      wheelDelta += dWheel * WHEEL_SENSITIVITY;
      this.dWheelApplied += wheelDelta;
    }

    plane.updateMatrices();
    v.set(0, 0, 1);
    v.transformDirection(plane.matrixWorld);
    v.normalize();
    this.el.camera.getWorldPosition(v2);
    v2.sub(plane.position);
    v2.normalize();

    const initialX = this.targetInitialMatrixWorld.elements[12];
    const initialZ = this.targetInitialMatrixWorld.elements[14];
    const dx = intersection.point.x - initialX;
    const dz = intersection.point.z - initialZ;
    v.set(dx, 0, dz);

    if (v.length() > MAX_SLIDE_DISTANCE) {
      v.normalize();
      v.multiplyScalar(MAX_SLIDE_DISTANCE);
    }

    this.target.updateMatrices();
    tmpMatrix.copy(this.targetInitialMatrixWorld);

    const shouldSnap = !!userinput.get(shiftKeyPath);

    const newX = withSnap(shouldSnap, initialX + v.x - planeCastObjectOffset.x);

    const newY = withSnap(shouldSnap, tmpMatrix.elements[13] + this.dWheelApplied);

    const newZ = withSnap(shouldSnap, initialZ + v.z - planeCastObjectOffset.z);

    tmpMatrix.setPosition(newX, newY, newZ);

    setMatrixWorld(this.target, tmpMatrix);
  },

  stackTargetAt(point, normal, normalObject) {
    const { target } = this;
    const mesh = this.target.el && this.target.el.getObject3D("mesh");
    let bbox = SYSTEMS.voxSystem.getBoundingBoxForSource(mesh, false);

    target.updateMatrices();
    normalObject.updateMatrices();

    // v is the world space point of the bottom center of the bounding box
    offset.set(0, 0, 0);

    if (bbox) {
      bbox.getCenter(v);
      v.y = bbox.min.y;
    } else {
      bbox = mesh?.geometry?.boundingBox;

      if (bbox) {
        bbox.getCenter(v);
        v.y = bbox.min.y;
      }
    }

    // The offset for the stack should be the distance from the object's
    // origin to the box face, in object space.
    if (bbox) {
      offset.sub(v);
    }

    // Stack the current target at the stack point to the target point,
    // and orient it so its local Y axis is parallel to the normal.
    v.copy(normal);
    v.transformDirection(normalObject.matrixWorld);

    q.setFromUnitVectors(UP, v);

    // Offset is the vector displacement from object origin to the box
    // face in object space, scaled properly here.
    //console.log(len, offset);
    target.matrixWorld.decompose(v, q2, v2);
    offset.multiply(v2);
    offset.applyQuaternion(q);

    targetPoint.copy(point).add(offset);

    tmpMatrix.compose(
      targetPoint,
      q,
      v2
    );

    setMatrixWorld(this.target, tmpMatrix);
  },

  tick() {
    if (!this.transforming) {
      return;
    }

    SYSTEMS.atmosphereSystem.updateShadows();

    if (this.mode === TRANSFORM_MODE.SCALE) {
      return; // Taken care of by scale-button
    }

    if (this.mode === TRANSFORM_MODE.STACK) {
      return; // Taken care of in cursor controller tick
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

    this.cursorOrAxisOrLiftTick();
  }
});

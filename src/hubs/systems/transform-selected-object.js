import { paths } from "../systems/userinput/paths";
import { setMatrixWorld, isChildOf, expandByEntityObjectSpaceBoundingBox } from "../utils/three-utils";
import { isFlatMedia } from "../utils/media-utils";
import { VOXEL_SIZE } from "../../jel/systems/terrain-system";

const MAX_SLIDE_DISTANCE = 20.0;

export const TRANSFORM_MODE = {
  AXIS: "axis",
  PUPPET: "puppet",
  ALIGN: "align",
  SCALE: "scale",
  SLIDE: "slide",
  STACK: "stack",
  LIFT: "lift"
};

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
const FORWARD = new THREE.Vector3(0, 0, 1);
const offset = new THREE.Vector3();
const objectSnapAlong = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const axis = new THREE.Vector3();
const { DEG2RAD } = THREE.Math;
const SNAP_DEGREES = 22.5;
const SNAP_RADIANS = SNAP_DEGREES * DEG2RAD;

function withGridSnap(shouldSnap, v) {
  if (shouldSnap) {
    return Math.floor(v * (1.0 / (VOXEL_SIZE * 2))) * (VOXEL_SIZE * 2);
  } else {
    return v;
  }
}

function withAngleSnap(shouldSnap, angle) {
  if (shouldSnap) {
    return Math.round(angle / SNAP_RADIANS) * SNAP_RADIANS;
  } else {
    return angle;
  }
}

AFRAME.registerSystem("transform-selected-object", {
  init() {
    this.target = null;
    this.targetInitialMatrixWorld = new THREE.Matrix4();
    this.targetBoundingBox = new THREE.Box3();
    this.mode = null;
    this.transforming = false;
    this.store = window.APP.store;
    this.startQ = new THREE.Quaternion();

    this.dxStore = 0;
    this.dxApplied = 0;
    this.dyAll = 0;
    this.dyStore = 0;
    this.dyApplied = 0;
    this.dWheelApplied = 0;
    this.raycasters = {};
    this.prevModify = false;

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
    this.dWheelAll = 0;
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
      if (instanceId === undefined && (object === this.target || isChildOf(object, this.target))) continue;

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

  isSnappableTransforming() {
    return (
      this.transforming &&
      (this.mode === TRANSFORM_MODE.SLIDE ||
        this.mode === TRANSFORM_MODE.LIFT ||
        this.mode === TRANSFORM_MODE.STACK ||
        this.mode === TRANSFORM_MODE.AXIS)
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

    this.targetBoundingBox.makeEmpty();
    expandByEntityObjectSpaceBoundingBox(this.targetBoundingBox, target.el);

    this.hand = hand;
    this.mode = data.mode;
    this.transforming = true;

    if (this.mode === TRANSFORM_MODE.ALIGN) {
      this.store.update({ activity: { hasRecentered: true } });
      return;
    } else if (this.mode !== TRANSFORM_MODE.SLIDE) {
      this.store.handleActivityFlag("rotated");
    }

    if (this.mode === TRANSFORM_MODE.PUPPET) {
      this.target.getWorldQuaternion(this.puppet.initialObjectOrientation);
      this.hand.getWorldQuaternion(this.puppet.initialControllerOrientation);
      this.puppet.initialControllerOrientation_inverse.copy(this.puppet.initialControllerOrientation).inverse();
      return;
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

      this.target.updateMatrices();
    }

    this.dWheelAll += wheelDelta;

    const modify = userinput.get(paths.actions.transformModifier);

    if (modify !== this.prevModify) {
      // Hacky, when modify key is pressed, re-snapshot the world
      // transform of the target because otherwise the rotation transforms
      // will end up having to construct a 3-axis delta quaternion, which
      // doesn't work.
      if (this.mode === TRANSFORM_MODE.AXIS) {
        this.target.updateMatrices();
        this.targetInitialMatrixWorld.copy(this.target.matrixWorld);
        this.targetBoundingBox.makeEmpty();
        expandByEntityObjectSpaceBoundingBox(this.targetBoundingBox, this.target.el);
        this.dxAll = 0;
        this.dyAll = 0;
      }

      this.prevModify = modify;
    }

    if (this.mode === TRANSFORM_MODE.AXIS) {
      // For axis mode just keep an aggregate delta
      // Doing increments inhibits snapping
      this.dxAll += finalProjectedVec.x;
      this.dyAll += finalProjectedVec.y;

      tmpMatrix.extractRotation(this.targetInitialMatrixWorld);
      q.setFromRotationMatrix(tmpMatrix);

      const shouldSnap = !!userinput.get(shiftKeyPath);

      if (modify) {
        // Roll
        axis.set(0, 0, 1);

        q.multiply(q2.setFromAxisAngle(axis, withAngleSnap(shouldSnap, -this.sign * this.dyAll)));
      } else {
        // Pitch + Yaw
        axis.set(0, 1, 0);

        q.multiply(q2.setFromAxisAngle(axis, withAngleSnap(shouldSnap, -this.sign * this.dxAll)));

        axis.set(1, 0, 0);
        q.multiply(q2.setFromAxisAngle(axis, withAngleSnap(shouldSnap, -this.sign * this.dyAll)));

        // TODO this doesn't work, because adding the roll to the incremental
        // delta rotation causes the other axes to be wrong.
        // if (this.dWheelAll !== 0.0) {
        //   // Roll
        //   axis.set(0, 0, 1);
        //   q.multiply(q2.setFromAxisAngle(axis, withAngleSnap(shouldSnap, this.dWheelAll)));
        // }
      }

      this.target.quaternion.copy(q);
      this.target.matrixNeedsUpdate = true;
    } else if (this.mode === TRANSFORM_MODE.LIFT) {
      const initialX = this.targetInitialMatrixWorld.elements[12];
      const initialZ = this.targetInitialMatrixWorld.elements[14];

      this.target.updateMatrices();
      tmpMatrix.copy(this.targetInitialMatrixWorld);

      const shouldSnap = !!userinput.get(shiftKeyPath);

      tmpMatrix.setPosition(
        initialX,
        withGridSnap(shouldSnap, intersection.point.y - planeCastObjectOffset.y),
        initialZ
      );
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

    const newX = withGridSnap(shouldSnap, initialX + v.x - planeCastObjectOffset.x);

    const newY = withGridSnap(shouldSnap, tmpMatrix.elements[13] + this.dWheelApplied);

    const newZ = withGridSnap(shouldSnap, initialZ + v.z - planeCastObjectOffset.z);

    tmpMatrix.setPosition(newX, newY, newZ);

    setMatrixWorld(this.target, tmpMatrix);
  },

  stackTargetAt(point, normal, normalObject) {
    const { target, targetBoundingBox } = this;

    target.updateMatrices();
    normalObject.updateMatrices();

    // v is the world space point of the bottom center of the bounding box
    offset.set(0, 0, 0);
    const isFlat = isFlatMedia(target);

    targetBoundingBox.getCenter(v);

    if (!isFlat) {
      v.y = targetBoundingBox.min.y;
    }

    // The offset for the stack should be the distance from the object's
    // origin to the box face, in object space.
    offset.sub(v);

    // Stack the current target at the stack point to the target point,
    // and orient it so its local Y axis is parallel to the normal.
    v.copy(normal);
    v.transformDirection(normalObject.matrixWorld);

    objectSnapAlong.copy(isFlat ? FORWARD : UP);
    objectSnapAlong.transformDirection(this.targetInitialMatrixWorld);

    // If the world space normal and original world object up are not already parallel, reorient the object
    if (Math.abs(v.dot(objectSnapAlong) - 1) > 0.01) {
      // Flat media aligns to walls, other objects align to floor.
      const alignAxis = isFlat ? FORWARD : UP;
      q.setFromUnitVectors(alignAxis, v);
    } else {
      // Otherwise, maintain its relative spin to the object
      this.targetInitialMatrixWorld.decompose(v, q, v2);
    }

    target.matrixWorld.decompose(v, q2 /* ignored */, v2);

    // Offset is the vector displacement from object origin to the box
    // face in object space, scaled properly here.
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

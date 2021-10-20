import { paths } from "../systems/userinput/paths";
import { almostEqual, isChildOf, expandByEntityObjectSpaceBoundingBox } from "../utils/three-utils";
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
const v3 = new THREE.Vector3();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const tmpMatrix = new THREE.Matrix4();
const WHEEL_SENSITIVITY = 2.0;
const XAXIS = new THREE.Vector3(1, 0, 0);
const shiftKeyPath = paths.device.keyboard.key("shift");
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const ALONG = new THREE.Vector3(1, 0, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const BACKWARD = new THREE.Vector3(0, 0, -1);
const AGAINST = new THREE.Vector3(-1, 0, 0);
const FLAT_STACK_AXES = [FORWARD, FORWARD, FORWARD, FORWARD, FORWARD, FORWARD];
export const NON_FLAT_STACK_AXES = [UP, DOWN, FORWARD, BACKWARD, ALONG, AGAINST];
const offset = new THREE.Vector3();
const objectSnapAlong = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const axis = new THREE.Vector3();
const { DEG2RAD } = THREE.Math;
const SNAP_DEGREES = 22.5;
const SNAP_RADIANS = SNAP_DEGREES * DEG2RAD;

function withGridSnap(shouldSnap, v, scale = 1.0) {
  scale = Math.max(0.25, scale);

  if (shouldSnap) {
    return Math.floor(v * (1.0 / (VOXEL_SIZE * scale))) * (VOXEL_SIZE * scale);
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

export function stackTargetAt(
  target,
  targetBoundingBox,
  targetMatrix,
  stackAlongAxis,
  stackRotationAmount,
  point,
  normal,
  normalObject,
  normalObjectBoundingBox
) {
  const userinput = AFRAME.scenes[0].systems.userinput;

  target.updateMatrices();
  normalObject.updateMatrices();

  offset.set(0, 0, 0);
  const isFlat = isFlatMedia(target);

  targetBoundingBox.getCenter(v);

  const axis = (isFlat ? FLAT_STACK_AXES : NON_FLAT_STACK_AXES)[stackAlongAxis];
  v.set(0, 0, 0);

  // v is the object space point of the bottom/top center of the bounding box
  if (axis.x !== 0) {
    v.x = axis.x < 0 ? targetBoundingBox.max.x : targetBoundingBox.min.x;
  } else if (axis.y !== 0) {
    v.y = axis.y < 0 ? targetBoundingBox.max.y : targetBoundingBox.min.y;
  } else if (axis.z !== 0) {
    v.z = axis.z < 0 ? targetBoundingBox.max.z : targetBoundingBox.min.z;
  }

  // The offset for the stack should be the distance from the object's
  // origin to the box face, in object space.
  offset.sub(v);

  // Stack the current target at the stack point to the target point,
  // and orient it so its local Y axis is parallel to the normal.
  v.copy(normal);
  v.transformDirection(normalObject.matrixWorld);

  // Snap except along axis in direction of normal
  const nx = Math.abs(normal.x);
  const ny = Math.abs(normal.y);
  const nz = Math.abs(normal.z);

  const normalIsObjectMaxX = nx >= ny && nx >= nz;
  const normalIsObjectMaxY = !normalIsObjectMaxX && ny >= nx && ny >= nz;
  const normalIsObjectMaxZ = !normalIsObjectMaxX && !normalIsObjectMaxY;
  const normalXIsZero = Math.abs(nx) < 0.0001;
  const normalYIsZero = Math.abs(ny) < 0.0001;
  const normalZIsZero = Math.abs(nz) < 0.0001;
  const normalIsBasisVector = (normalXIsZero ? 0 : 1) + (normalYIsZero ? 0 : 1) + (normalZIsZero ? 0 : 1) === 1;

  objectSnapAlong.copy(axis);
  objectSnapAlong.transformDirection(targetMatrix);

  // Stack position snapping will center-snap the origin of the target object to the box face.
  let stackSnapPosition = false;

  // Stack scale snapping will scale the object to fit.
  let stackSnapScale = false;

  if (normalObject.el && normalObject.el.components["media-loader"]) {
    ({ stackSnapPosition, stackSnapScale } = normalObject.el.components["media-loader"].data);
  }

  // If the world space normal and original world object up are not already parallel, reorient the object
  if (Math.abs(v.dot(objectSnapAlong) - 1) > 0.001 || stackSnapPosition) {
    // Flat media aligns to walls, other objects align to floor.
    q.setFromUnitVectors(axis, v);
  } else {
    // Nudge the object to be re-aligned instead of doing a full reorient.
    q2.setFromUnitVectors(objectSnapAlong, v);
    targetMatrix.decompose(v, q, v2);
    q.multiply(q2);
  }

  if (stackRotationAmount > 0) {
    q2.setFromAxisAngle(axis, stackRotationAmount);
    q.multiply(q2);
  }

  target.matrixWorld.decompose(v /* ignored */, q2 /* ignored */, v2);

  // Offset is the vector displacement from object origin to the box
  // face in object space, scaled properly here.
  offset.multiply(v2);
  offset.applyQuaternion(q);

  // Only snap to objects if the face is along a basis vector, since otherwise the snap grid is
  // hard to define.
  const shouldSnap = !userinput.get(shiftKeyPath) && normalIsBasisVector;

  if (stackSnapPosition) {
    normalObjectBoundingBox.getCenter(v);

    if (normalIsObjectMaxX) {
      v.x = normal.x > 0 ? normalObjectBoundingBox.max.x : normalObjectBoundingBox.min.x;
    } else if (normalIsObjectMaxY) {
      v.y = normal.y > 0 ? normalObjectBoundingBox.max.y : normalObjectBoundingBox.min.y;
    } else if (normalIsObjectMaxZ) {
      v.z = normal.z > 0 ? normalObjectBoundingBox.max.z : normalObjectBoundingBox.min.z;
    }

    v.applyMatrix4(normalObject.matrixWorld);
    targetPoint.set(v.x, v.y, v.z).add(offset);
  } else {
    tmpMatrix.getInverse(normalObject.matrixWorld);
    v3.copy(point);
    v3.add(offset);
    v3.applyMatrix4(tmpMatrix);

    const { elements: te } = targetMatrix;
    const targetScale = v.set(te[0], te[1], te[2]).length();

    const { elements: ne } = normalObject.matrixWorld;
    const normalScale = v.set(ne[0], ne[1], ne[2]).length();

    const snapScale = isFlatMedia(target) ? 1.0 : targetScale / normalScale;

    v3.x = withGridSnap(shouldSnap && !normalIsObjectMaxX, v3.x, snapScale);
    v3.y = withGridSnap(shouldSnap && !normalIsObjectMaxY, v3.y, snapScale);
    v3.z = withGridSnap(shouldSnap && !normalIsObjectMaxZ, v3.z, snapScale);
    v3.applyMatrix4(normalObject.matrixWorld);

    targetPoint.set(v3.x, v3.y, v3.z);
  }

  if (stackSnapScale) {
    normalObject.matrixWorld.decompose(v3 /* ignored */, q2 /* ignored */, v /* target scale */);

    const extentX = normalObjectBoundingBox.max.x * v.x - normalObjectBoundingBox.min.x * v.x;
    const extentY = normalObjectBoundingBox.max.y * v.y - normalObjectBoundingBox.min.y * v.y;
    const extentZ = normalObjectBoundingBox.max.z * v.z - normalObjectBoundingBox.min.z * v.z;

    target.matrixWorld.decompose(v3 /* ignored */, q2 /* ignored */, v /* target scale */);
    const targetExtentX = targetBoundingBox.max.x * v.x - targetBoundingBox.min.x * v.x;
    const targetExtentY = targetBoundingBox.max.y * v.y - targetBoundingBox.min.y * v.y;
    const targetExtentZ = targetBoundingBox.max.z * v.z - targetBoundingBox.min.z * v.z;

    // Get the target UV extents to scale on, which are extents orthogonal to the axis
    let targetExtentU, targetExtentV;

    if (Math.abs(axis.x) === 1) {
      targetExtentU = targetExtentZ;
      targetExtentV = targetExtentY;
    } else if (Math.abs(axis.y) === 1) {
      targetExtentU = targetExtentX;
      targetExtentV = targetExtentZ;
    } else if (Math.abs(axis.z) === 1) {
      targetExtentU = targetExtentX;
      targetExtentV = targetExtentY;
    }

    let scaleRatio = 0.0;

    // Take the best scale that will fit within the target object's world space extents,
    // along the longest allowable edge of the target object.
    if (normalIsObjectMaxX) {
      if ((extentZ / targetExtentU) * targetExtentV <= extentY) {
        scaleRatio = Math.max(scaleRatio, extentZ / targetExtentU);
      }

      if ((extentY / targetExtentV) * targetExtentU <= extentZ) {
        scaleRatio = Math.max(scaleRatio, extentY / targetExtentV);
      }
    } else if (normalIsObjectMaxY) {
      if ((extentX / targetExtentU) * targetExtentV <= extentZ) {
        scaleRatio = Math.max(scaleRatio, extentX / targetExtentU);
      }

      if ((extentZ / targetExtentV) * targetExtentU <= extentX) {
        scaleRatio = Math.max(scaleRatio, extentZ / targetExtentV);
      }
    } else if (normalIsObjectMaxZ) {
      if ((extentX / targetExtentU) * targetExtentV <= extentY) {
        scaleRatio = Math.max(scaleRatio, extentX / targetExtentU);
      }

      if ((extentY / targetExtentV) * targetExtentU <= extentX) {
        scaleRatio = Math.max(scaleRatio, extentY / targetExtentV);
      }
    }

    if (scaleRatio === 0.0) {
      scaleRatio = 1.0;
    }

    if (!almostEqual(scaleRatio, 1.0)) {
      v2.multiplyScalar(scaleRatio);
    }
  }

  tmpMatrix.compose(
    targetPoint,
    q,
    v2
  );

  target.setMatrix(tmpMatrix);

  // BUG the q quaternion aligns normal but roll isn't right. Needs to align
  // roll with snapped face.
  //
  // Tried a bunch of attempts setting rotation.{x,y,z} and quaternion
  // hacking to no avail. Rotating the object on x did not seem to actually
  // be rotating it on a object space axis.
}

AFRAME.registerSystem("transform-selected-object", {
  init() {
    this.target = null;
    this.targetInitialMatrix = new THREE.Matrix4();
    this.targetBoundingBox = new THREE.Box3();
    this.hitNormalObject = null;
    this.hitNormalObjectBoundingBox = new THREE.Box3();
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
    this.stackAlongAxis = 0;
    this.stackRotationAmount = 0;

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
      if (this.target && this.target.el) {
        this.target.updateMatrices();
        SYSTEMS.undoSystem.pushMatrixUpdateUndo(this.target.el, this.targetInitialMatrix, this.target.matrix);
      }

      this.mode = null;
      this.transforming = false;
      this.target = null;
      this.hitNormalObject = null;
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
    intersections.sort(({ distance: x }, { distance: y }) => x - y);

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

      if (SYSTEMS.voxSystem.isTargettingMesh(object)) continue;

      const newNormalObject =
        SYSTEMS.voxSystem.getSourceForMeshAndInstance(object, instanceId) ||
        SYSTEMS.voxmojiSystem.getSourceForMeshAndInstance(object, instanceId) ||
        object;

      if (!newNormalObject.el) continue;

      if (this.hitNormalObject !== newNormalObject) {
        this.hitNormalObject = newNormalObject;
        this.hitNormalObjectBoundingBox.makeEmpty();
        expandByEntityObjectSpaceBoundingBox(this.hitNormalObjectBoundingBox, this.hitNormalObject.el);
      }

      stackTargetAt(
        this.target,
        this.targetBoundingBox,
        this.targetInitialMatrix,
        this.stackAlongAxis,
        this.stackRotationAmount,
        point,
        normal,
        this.hitNormalObject,
        this.hitNormalObjectBoundingBox
      );

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
    this.targetInitialMatrix.copy(this.target.matrix);
    this.stackAlongAxis = 0;
    this.stackRotationAmount = 0;

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

  axisOrLiftTick() {
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

    const modify = !!userinput.get(paths.actions.transformModifier);

    if (modify !== this.prevModify) {
      // Hacky, when modify key is pressed, re-snapshot the world
      // transform of the target because otherwise the rotation transforms
      // will end up having to construct a 3-axis delta quaternion, which
      // doesn't work.
      if (this.mode === TRANSFORM_MODE.AXIS) {
        this.target.updateMatrices();
        this.targetInitialMatrix.copy(this.target.matrix);
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

      tmpMatrix.extractRotation(this.targetInitialMatrix);
      q.setFromRotationMatrix(tmpMatrix);

      const shouldSnap = !userinput.get(shiftKeyPath);

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
      const { elements } = this.targetInitialMatrix;
      const initialX = elements[12];
      const initialZ = elements[14];

      const scale = v.set(elements[0], elements[1], elements[2]).length();

      this.target.updateMatrices();
      tmpMatrix.copy(this.targetInitialMatrix);

      const shouldSnap = !userinput.get(shiftKeyPath);
      const snapScale = isFlatMedia(this.target) ? 1.0 : scale;

      tmpMatrix.setPosition(
        initialX,
        withGridSnap(shouldSnap, intersection.point.y - planeCastObjectOffset.y, snapScale),
        initialZ
      );
      this.target.setMatrix(tmpMatrix);
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

    const { elements } = this.targetInitialMatrix;
    const initialX = elements[12];
    const initialZ = elements[14];
    const scale = v.set(elements[0], elements[1], elements[2]).length();

    plane.updateMatrices();
    v.set(0, 0, 1);
    v.transformDirection(plane.matrixWorld);
    v.normalize();
    this.el.camera.getWorldPosition(v2);
    v2.sub(plane.position);
    v2.normalize();

    const dx = intersection.point.x - initialX;
    const dz = intersection.point.z - initialZ;
    v.set(dx, 0, dz);

    if (v.length() > MAX_SLIDE_DISTANCE) {
      v.normalize();
      v.multiplyScalar(MAX_SLIDE_DISTANCE);
    }

    this.target.updateMatrices();
    tmpMatrix.copy(this.targetInitialMatrix);

    const shouldSnap = !userinput.get(shiftKeyPath);

    const snapScale = isFlatMedia(this.target) ? 1.0 : scale;

    const newX = withGridSnap(shouldSnap, initialX + v.x - planeCastObjectOffset.x, snapScale);

    const newY = tmpMatrix.elements[13] + withGridSnap(shouldSnap, this.dWheelApplied, snapScale);

    const newZ = withGridSnap(shouldSnap, initialZ + v.z - planeCastObjectOffset.z, snapScale);

    tmpMatrix.setPosition(newX, newY, newZ);
    this.target.setMatrix(tmpMatrix);
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
      const userinput = this.el.systems.userinput;

      // Use stored stack axis if available on element.
      const mediaLoader = this.target.el && this.target.el.components["media-loader"];

      if (mediaLoader) {
        this.stackAlongAxis = mediaLoader.data.stackAxis;
      }

      if (userinput.get(paths.actions.transformAxisNextAction)) {
        this.stackAlongAxis++;
      } else if (userinput.get(paths.actions.transformAxisPrevAction)) {
        this.stackAlongAxis--;
      }

      if (userinput.get(paths.actions.transformRotateNextAction)) {
        this.stackRotationAmount -= Math.PI / 8.0;

        if (this.stackRotationAmount < 0) {
          this.stackRotationAmount += Math.PI * 2.0;
        }
      } else if (userinput.get(paths.actions.transformRotatePrevAction)) {
        this.stackRotationAmount += Math.PI / 8.0;
      }

      if (this.stackAlongAxis < 0) {
        this.stackAlongAxis = FLAT_STACK_AXES.length - 1;
      } else {
        this.stackAlongAxis = this.stackAlongAxis % FLAT_STACK_AXES.length;
      }

      if (mediaLoader) {
        mediaLoader.el.setAttribute("media-loader", { stackAxis: this.stackAlongAxis });
      }

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

    this.axisOrLiftTick();
  }
});

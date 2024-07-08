import * as THREE from "three";

export function rollFromQuaternion(qx, qy, qz, qw) {
  // Get device x and y axes in world space
  const xUp = new THREE.Vector3(1, 0, 0);
  const yUp = new THREE.Vector3(0, 1, 0);

  const x = new THREE.Vector3();
  const y = new THREE.Vector3();

  const q = new THREE.Quaternion(qx, qy, qz, qw);
  x.copy(xUp).applyQuaternion(q);
  y.copy(yUp).applyQuaternion(q);

  // Project gravity (0, 1, 0) on to the xy plane and find the angle between the device x and y components
  const gravityOnToPlaneNormalZ = x.x * y.z - x.z * y.x;
  const gravityOnToPlaneZ = 1 - gravityOnToPlaneNormalZ;

  const dotGravityOnToPlaneDy = gravityOnToPlaneZ * y.y;
  const dotGravityOnToPlaneDx = gravityOnToPlaneZ * x.y;

  const angle = Math.atan2(dotGravityOnToPlaneDy, dotGravityOnToPlaneDx);
  return -angle + Math.PI * 0.5;
}

const targetQ = new THREE.Quaternion(0, 0, 0, 1);
const targetP = new THREE.Vector3(0, 0, 0);
const lastSlamP = new THREE.Vector3(0, 0, 0);

let poseScale = 1.0;
let wasInInertialMode = false;
const visualModeToVioLocation = new THREE.Vector3(0, 0, 0);
const initialVisualModeLocation = new THREE.Vector3(0, 0, 0);
const initialRollQuaterion = new THREE.Quaternion(0, 0, 0, 1);

let lastPoseNumber = -1;

const NUM_LERP_POSES = 4;
const POSITION_SMOOTHING = 0.2;
const POSITION_SMOOTHING_DRAG = 0.05;
const POSITION_SMOOTHING_CALIBRATION_ROLL = 0.05;
const ROTATION_SMOOTHING = 0.4;
export const PLAYER_HEIGHT = 10.5;
const MOVEMENT_SCALE = 2.75;
const DRAG_SCALE = 16.0;
const SLAM_FPS = 20.0;
const EXPECTED_SLAM_MS = 1000.0 / SLAM_FPS;
const MAX_STILL_VELOCITY_SQ = 1.0e-6;

const poseQs = [];
const posePs = [];
const poseTs = [];
const poseNows = [];

for (let i = 0; i < NUM_LERP_POSES; i++) {
  poseQs[i] = new THREE.Quaternion();
  posePs[i] = new THREE.Vector3();
  poseTs[i] = 0;
  poseNows[i] = 0;
}

let dragDownAtUndisplacedPosition = new THREE.Vector3();
let originDisplacement = new THREE.Vector3();
const calibrationDisplacement = new THREE.Vector3();
let isDraggingWorld = false;
let shouldBeginDraggingWhenStill = false;

export const CALIBRATION_PUSH = 0;
export const CALIBRATION_ROLL = 1;
export const CALIBRATION_DONE = 2;

let calibrationState = CALIBRATION_PUSH;

export function getCalibrationState() {
  return calibrationState;
}

export function finishCalibration() {
  calibrationState = CALIBRATION_DONE;
  calibrationDisplacement.copy(lastSlamP);
  originDisplacement.set(-calibrationDisplacement.x, -calibrationDisplacement.y, -calibrationDisplacement.z);
}

function reset() {
  for (let i = 0; i < NUM_LERP_POSES; i++) {
    poseQs[i] = new THREE.Quaternion();
    posePs[i] = new THREE.Vector3();
    poseTs[i] = 0;
    poseNows[i] = 0;
  }

  targetQ.set(0, 0, 0, 1);
  targetP.set(0, 0, 0);
  dragDownAtUndisplacedPosition = new THREE.Vector3();
  originDisplacement = new THREE.Vector3();
  visualModeToVioLocation.set(0, 0, 0);
  initialVisualModeLocation.set(0, 0, 0);
  calibrationDisplacement.set(0, 0, 0);
  initialRollQuaterion.set(0, 0, 0, 1);
  calibrationState = CALIBRATION_DONE;
  isDraggingWorld = false;
}

reset();

function isInWorldDragOrientation() {
  const zForward = new THREE.Vector3(0, 0, 1);
  zForward.applyQuaternion(targetQ);
  const gravity = new THREE.Vector3(0, -1, 0);
  const dot = zForward.dot(gravity);

  if (dot > -0.75) {
    const roll = rollFromQuaternion(targetQ.x, targetQ.y, targetQ.z, targetQ.w);

    return roll < -1.15 || roll > 1.15;
  }

  return false;
}

export function poseUpdateOnTriggerDown() {
  if (!isInWorldDragOrientation()) return false;

  shouldBeginDraggingWhenStill = true;
  return true;
}

function beginDraggingWorld() {
  dragDownAtUndisplacedPosition.copy(targetP);
  dragDownAtUndisplacedPosition.x -= originDisplacement.x;
  dragDownAtUndisplacedPosition.z -= originDisplacement.z;
  shouldBeginDraggingWhenStill = false;
  isDraggingWorld = true;
}

export function poseUpdateOnTriggerUp() {
  if (!isDraggingWorld) return;

  shouldBeginDraggingWhenStill = false;
  isDraggingWorld = false;

  // Take the earliest point so we don't overshoot
  const finalP = posePs[0];
  const dx = finalP.x - dragDownAtUndisplacedPosition.x;
  const dz = finalP.z - dragDownAtUndisplacedPosition.z;
  originDisplacement.set(dx - calibrationDisplacement.x, -calibrationDisplacement.y, dz - calibrationDisplacement.z);
}

export function applyNativePoseToCamera(camera) {
  if (!window.Native) return;

  const nativePose = JSON.parse(window.Native.getPose());
  const nextPoseNumber = nativePose[9];

  let hasNewPose = false;
  const now = performance.now();

  if (nextPoseNumber < lastPoseNumber) {
    console.log("Tracking lost, resetting");
    lastPoseNumber = nextPoseNumber;
    camera.position.set(0, 0, 0);
    camera.quaternion.set(0, 0, 0, 1);
    reset();
    return;
  }

  if (nextPoseNumber > lastPoseNumber) {
    lastPoseNumber = nextPoseNumber;
    hasNewPose = true;

    const x = nativePose[2];
    const y = nativePose[1];
    const z = -nativePose[0];
    const timestamp = nativePose[7];
    let forceQuaternion = false;

    if (nativePose.length > 0) {
      const nextPoseScale = nativePose[8];

      if (!isDraggingWorld) {
        // Don't vary scale during dragging - TBD if this helps or not
        poseScale = nextPoseScale;
      }

      const systemIsInInertialMode = nativePose[10];

      if (systemIsInInertialMode) {
        if (!wasInInertialMode) {
          if (poseScale < 1) {
            visualModeToVioLocation.set(-x, -y, -z);
          } else {
            visualModeToVioLocation.set(x, y, z);
          }

          wasInInertialMode = true;

          if (calibrationState === CALIBRATION_PUSH) {
            calibrationState = CALIBRATION_ROLL;

            // Jump immediately to the new orientation
            forceQuaternion = true;
          }
        }
      } else {
        if (
          initialVisualModeLocation.x === 0 &&
          initialVisualModeLocation.y === 0 &&
          initialVisualModeLocation.z === 0
        ) {
          initialVisualModeLocation.set(x, y, z);
        }

        if (wasInInertialMode) {
          visualModeToVioLocation.set(0, 0, 0);
          calibrationState = CALIBRATION_PUSH;
          wasInInertialMode = false;
        }
      }

      const offsetX = visualModeToVioLocation.x * poseScale - visualModeToVioLocation.x;
      const offsetY = visualModeToVioLocation.y * poseScale - visualModeToVioLocation.y;
      const offsetZ = visualModeToVioLocation.z * poseScale - visualModeToVioLocation.z;

      let px = (x * poseScale + offsetX) * (MOVEMENT_SCALE / poseScale);
      const py = (y * poseScale + offsetY) * (MOVEMENT_SCALE / poseScale) + PLAYER_HEIGHT;
      let pz = (z * poseScale + offsetZ) * (MOVEMENT_SCALE / poseScale);

      const dragXOffset = isDraggingWorld ? (dragDownAtUndisplacedPosition.x - px) * DRAG_SCALE : 0;
      const dragZOffset = isDraggingWorld ? (dragDownAtUndisplacedPosition.z - pz) * DRAG_SCALE : 0;

      px += dragXOffset;
      pz += dragZOffset;

      px += originDisplacement.x;
      pz += originDisplacement.z;

      const qx = nativePose[3];
      const qy = nativePose[4];
      const qz = nativePose[5];
      const qw = nativePose[6];

      const q = new THREE.Quaternion(qx, qz, qy, qw);

      // Correct for pose orientation, need to rotate by two axes
      const sqrt3 = 1.0 / Math.sqrt(3);
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(sqrt3, -sqrt3, sqrt3), Math.PI * 0.66666);
      // Rotate by 45 degrees around X
      const q3 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.15);
      q2.premultiply(q3);
      q2.multiply(q);

      lastSlamP.set(px, py, pz);

      // Not sure why this is needed
      const fqx = -q2.x;
      const fqy = q2.y;
      const fqz = q2.z;
      const fqw = -q2.w;

      if (calibrationState === CALIBRATION_PUSH) {
        // Compute the position in camera space by applying the inverse of targetQ to the world space coord
        const invQ = targetQ.clone().invert();
        const scale = -5;
        const camPos = new THREE.Vector3(0, 0, scale * (initialVisualModeLocation.z - z));
        camPos.applyQuaternion(invQ);

        if (
          initialRollQuaterion.x === 0 &&
          initialRollQuaterion.y === 0 &&
          initialRollQuaterion.z === 0 &&
          initialRollQuaterion.w === 1
        ) {
          // Set to the quaternion just of the roll of targetQ, so the push calibration is rolled properly
          const roll = rollFromQuaternion(fqx, fqy, fqz, fqw);
          initialRollQuaterion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);
        }

        targetP.set(0, PLAYER_HEIGHT, camPos.z);
        targetQ.copy(initialRollQuaterion);
      } else {
        if (calibrationState === CALIBRATION_ROLL) {
          targetP.set(0, PLAYER_HEIGHT, 0);
        } else {
          targetP.copy(lastSlamP);
        }

        targetQ.set(fqx, fqy, fqz, fqw);
      }

      for (let i = 0; i < poseTs.length - 1; i++) {
        poseTs[i] = poseTs[i + 1];
        poseQs[i].copy(poseQs[i + 1]);
        posePs[i].copy(posePs[i + 1]);
        poseNows[i] = poseNows[i + 1];
      }

      poseTs[poseTs.length - 1] = timestamp;
      poseQs[poseQs.length - 1].copy(targetQ);
      posePs[posePs.length - 1].copy(targetP);
      poseNows[poseNows.length - 1] = now;

      if (forceQuaternion) {
        camera.quaternion.copy(targetQ);
      }
    }
  }

  if (hasNewPose) {
    if (Math.abs(camera.quaternion.dot(targetQ)) < 0.99999) {
      camera.quaternion.slerp(targetQ, ROTATION_SMOOTHING);
    }
  } else {
    if (poseTs[0] !== 0) {
      const lastT = poseTs[NUM_LERP_POSES - 1];
      const firsT = poseTs[0];
      const lastNow = poseNows[NUM_LERP_POSES - 1];

      const dt = lastT - firsT;

      // Don't bother lerping if poses are too far apart (jitter in SLAM)
      const maxDt = EXPECTED_SLAM_MS * NUM_LERP_POSES + 4 * EXPECTED_SLAM_MS;

      if (dt < maxDt) {
        // Compute velocity across NUM_LERP_POSES
        const firstP = posePs[0];
        const lastP = posePs[NUM_LERP_POSES - 1];

        // Only slerp between two poses
        const firstQ = poseQs[NUM_LERP_POSES - 2];
        const lastQ = poseQs[NUM_LERP_POSES - 1];

        // Dead reckoning to new target position
        const vx = (lastP.x - firstP.x) / dt;
        const vy = (lastP.y - firstP.y) / dt;
        const vz = (lastP.z - firstP.z) / dt;
        const vDt = now - lastNow;

        // Don't begin dragging world until the device is still
        if (shouldBeginDraggingWhenStill) {
          const velSq = vx * vx + vy * vy + vz * vz;

          if (velSq < MAX_STILL_VELOCITY_SQ) {
            beginDraggingWorld();
          }
        }

        targetP.x = lastP.x + vx * vDt;
        targetP.y = lastP.y + vy * vDt;
        targetP.z = lastP.z + vz * vDt;

        // Next pose should be slerp from poseQs[0] to poseQs[NUM_LERP_POSES - 1]
        // NOTE t and the slerp amount were hand tuned on pixel 6 at 20hz SLAM
        const dtQ = lastT - poseTs[NUM_LERP_POSES - 2];

        let q;

        if (Math.abs(firstQ.dot(lastQ)) < 0.99999) {
          // Scale up based on how close dtQ was to EXPECTED_SLAM_MS
          // Assumes 60hz target fps
          q = quaternionSlerp(firstQ, lastQ, Math.min(3.0, 2.0 + EXPECTED_SLAM_MS / dtQ));
        } else {
          q = lastQ;
        }

        // Don't slerp if quaternions are close
        if (Math.abs(q.dot(camera.quaternion)) < 0.99999) {
          const slerpQ = quaternionSlerp(camera.quaternion, q, 0.165);
          camera.quaternion.set(slerpQ.x, slerpQ.y, slerpQ.z, slerpQ.w);
        }
      }
    }

    // Apply since position is a bit jumpy
    let smoothing = POSITION_SMOOTHING;

    if (calibrationState === CALIBRATION_ROLL) {
      smoothing = POSITION_SMOOTHING_CALIBRATION_ROLL;
    } else if (isDraggingWorld) {
      smoothing = POSITION_SMOOTHING_DRAG;
    }

    const camX = camera.position.x + (targetP.x - camera.position.x) * smoothing;
    const camY = camera.position.y + (targetP.y - camera.position.y) * smoothing;
    const camZ = camera.position.z + (targetP.z - camera.position.z) * smoothing;

    camera.position.set(camX, camY, camZ);
  }
}

function quaternionSlerp(qa, qb, t) {
  const qinv = new THREE.Quaternion().copy(qa).invert();
  const qc = new THREE.Quaternion().copy(qb).multiply(qinv);

  // if we are rotating more than 180 degrees, we need to invert the quaternion
  if (qc.w < 0) {
    qc.x *= -1;
    qc.y *= -1;
    qc.z *= -1;
    qc.w *= -1;
  }

  let ang = 2 * Math.acos(qc.w);
  ang *= t;

  while (ang < -Math.PI) {
    ang += Math.PI * 2;
  }

  while (ang > Math.PI) {
    ang -= Math.PI * 2;
  }

  const s = Math.sqrt(1 - qc.w * qc.w);

  const x = qc.x / s;
  const y = qc.y / s;
  const z = qc.z / s;

  const axisAngleQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), ang);

  return axisAngleQ.multiply(qa);
}

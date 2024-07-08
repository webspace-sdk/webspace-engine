export function rollFromQuaternion(qx, qy, qz, qw) {
  // Get device x and y axes in world space
  const tx = -2 * qz;
  const ty = 2 * qz;
  let tz = -2 * qy;

  const dxx = 1 + qy * tz - qz * ty;
  const dxy = qw * ty - qx * tz;
  const dxz = qw * tz + qx * ty;

  tz = 2 * qx;

  const dyx = qw * tx + qy * tz;
  const dyy = 1 + qz * tx - qx * tz;
  const dyz = qw * tz - qy * tx;

  // Project gravity (0, 0, 1) on to the xy plane and find the angle between the device x and y components
  const gravityOnToPlaneNormalZ = dxx * dyy - dxy * dyx;
  const gravityOnToPlaneZ = 1 - gravityOnToPlaneNormalZ;

  const dotGravityOnToPlaneDy = gravityOnToPlaneZ * dyz;
  const dotGravityOnToPlaneDx = gravityOnToPlaneZ * dxz;

  const angle = Math.atan2(dotGravityOnToPlaneDy, dotGravityOnToPlaneDx);
  return -angle + Math.PI * 0.5;
}

const lastReadings = [0, 0];
const lastReadingTimes = [0, 1];
let extraRoll = 0; // HACK on the mobile device we have to roll another PI/2 for landscape orientation

export function startTrackingOrientation(frequency = 60, referenceFrame = "device") {
  const sensor = new AbsoluteOrientationSensor({ frequency, referenceFrame });

  sensor.addEventListener("reading", () => {
    extraRoll = -Math.PI * 0.5;

    let roll = rollFromQuaternion(
      sensor.quaternion[0],
      sensor.quaternion[1],
      sensor.quaternion[2],
      sensor.quaternion[3]
    );

    if (roll < 0) {
      roll += 2 * Math.PI;
    }

    const now = performance.now();

    if (lastReadings[0] === 0) {
      lastReadings[0] = roll;
      lastReadings[1] = roll;
      lastReadingTimes[0] = now;
      lastReadingTimes[1] = now + 1;
    } else {
      lastReadings[0] = lastReadings[1];
      lastReadings[1] = roll;
      lastReadingTimes[0] = lastReadingTimes[1];
      lastReadingTimes[1] = now;
    }
  });
  sensor.addEventListener("error", error => {
    console.error(error);
  });
  sensor.start();
}

export function getDeviceRoll() {
  const a = lastReadings[0];
  const b = lastReadings[1];
  const ta = lastReadingTimes[0];
  const tb = lastReadingTimes[1];

  // Compute angular velocity and extrapolate
  const now = performance.now();
  const dt = Math.max(now - tb, 1);

  const diff1 = b - a;
  const diff2 = b + Math.PI * 2 - a;
  const diff3 = b - (a + Math.PI * 2);

  let diff;

  if (Math.abs(diff1) < Math.abs(diff2) && Math.abs(diff1) < Math.abs(diff3)) {
    diff = diff1;
  } else if (Math.abs(diff2) < Math.abs(diff1) && Math.abs(diff2) < Math.abs(diff3)) {
    diff = diff2;
  } else {
    diff = diff3;
  }

  const v = diff / (tb - ta);
  const roll = b + v * dt;

  return roll + extraRoll;
}

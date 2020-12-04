const SAMPLING_DURATION_MS = 1000.0 * 4.0;
const LOWER_QUALITY_FRAME_LENGTH = 1000.0 / 40; // Ensure at least 50 FPS
const MIN_SAMPLES_NEEDED = 15;
const RESET_ON_TIME_JUMP_MS = 2000.0;
const DEBUG_DURATION_MS = 20000.0;

import qsTruthy from "../../hubs/utils/qs_truthy";
const debugAutoQuality = qsTruthy("debug_auto_quality");

// Conservative quality adjuster, take frames during a SAMPLING_DURATION_MS
// period and if all frames fail to run fast enough (LOWER_QUALITY_FRAME_LENGTH)
// then lower quality.
export class AutoQualitySystem {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.enableTracking = false;
    this.sawFastFrame = false;
    this.slowFrames = 0;
    this.sampledFrames = 0;
    this.lastTick = 0;
    this.debugStartTime = performance.now();
  }

  debugLog() {
    if (!debugAutoQuality) return;
    if (performance.now() - this.debugStartTime > DEBUG_DURATION_MS) {
      if (window.APP.detailLevel !== 2) {
        window.APP.detailLevel = 2;
        console.log("Quality debug complete. Dropping quality level.");
      }
      return;
    }

    console.log(...arguments);
  }

  startTracking() {
    if (this.enableTracking) return;

    this.timeSinceLastCheck = 0.0;
    this.enableTracking = true;
  }

  stopTracking() {
    this.enableTracking = false;
  }

  tick(t) {
    if (!this.enableTracking) return;
    if (this.lastTick === 0) {
      this.lastTick = performance.now();
      return;
    }

    const dt = performance.now() - this.lastTick;
    this.lastTick = performance.now();

    this.sampledFrames++;

    if (dt > RESET_ON_TIME_JUMP_MS) {
      // Process was likely suspended
      this.timeSinceLastCheck = 0;
      this.sawFastFrame = false;

      this.debugLog("Adjust for suspend at ", t);

      return;
    }

    if (dt < LOWER_QUALITY_FRAME_LENGTH) {
      this.sawFastFrame = true;

      this.debugLog("Fast frame at ", t, dt);
    } else {
      this.slowFrames++;
    }

    this.timeSinceLastCheck += dt;

    if (this.timeSinceLastCheck > SAMPLING_DURATION_MS) {
      this.timeSinceLastCheck = 0;

      if (this.sampledFrames < MIN_SAMPLES_NEEDED) {
        this.debugLog("Insufficient samples at ", t, dt);
      }

      this.sampledFrames = 0;

      if (!this.sawFastFrame) {
        window.APP.detailLevel = Math.min(2, window.APP.detailLevel + 1);
        console.warn("Slow framerate detected New detail level: ", window.APP.detailLevel);

        this.scene.renderer.setPixelRatio(1);
        this.enableTracking = window.APP.detailLevel !== 2; // Stop tracking at lowest detail level
        document.body.classList.add("low-detail");
      }

      this.sawFastFrame = false;
      this.slowFrames = 0;
    }
  }
}

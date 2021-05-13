import { EventTarget } from "event-target-shim";
const SAMPLING_DURATION_MS = 1000.0 * 4.0;
const LOWER_QUALITY_FRAME_LENGTH = 1000.0 / 50; // Ensure at least 50 FPS
const MIN_SAMPLES_NEEDED = 15;
const RESET_ON_TIME_JUMP_MS = 2000.0;
const DEBUG_DURATION_MS = 30000.0;
const MIN_NUM_CONSECUTIVE_FAST_FRAMES = 2;
const LOWEST_DETAIL_LEVEL = 3;

// How long to maintain lower detail level on startup if machine seems to be underpowered.
const CROSS_SESSION_DETAIL_LOWER_DURATION_S = 60 * 60 * 24;

// Thresholds we use to determine inherently slow machines during first N frames.
// Note these need to be descending due to how algorithm runs.
const STARTUP_SLOW_FRAME_THRESHOLDS = [[1500.0, 3], [750.0, 5], [350.0, 10]];

import qsTruthy from "../../hubs/utils/qs_truthy";
const debugAutoQuality = qsTruthy("debug_auto_quality");

// Conservative quality adjuster, take frames during a SAMPLING_DURATION_MS
// period and if we never see MIN_NUM_CONSECUTIVE_FAST_FRAMES consecutive fast frames then lower quality.
export class AutoQualitySystem extends EventTarget {
  constructor(sceneEl) {
    super();

    this.scene = sceneEl;
    this.enableTracking = false;
    this.numConsecutiveFastFrames = 0;
    this.metFastFrameTest = false;
    this.totalFrames = 0;
    this.sampledFrames = 0;
    this.slowStartupFrames = Array(STARTUP_SLOW_FRAME_THRESHOLDS.length).fill(0);
    this.firedFrameStableEvent = false;
    this.lastTick = 0;
    this.debugStartTime = performance.now();

    window.addEventListener("resize", () => {
      // On a resize, temporarily reset the pixel ratio to 1.0 in the case
      // where we no longer need lower res.
      if (window.APP.detailLevel >= 2) {
        if (this.scene.renderer.getPixelRatio() !== 1.0) {
          this.scene.renderer.setPixelRatio(1.0);
        }
      }
    });
  }

  debugLog() {
    if (!debugAutoQuality) return;
    if (performance.now() - this.debugStartTime > DEBUG_DURATION_MS) {
      if (window.APP.detailLevel !== LOWEST_DETAIL_LEVEL) {
        window.APP.detailLevel = LOWEST_DETAIL_LEVEL;
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

  dropDetailLevel(saveToStore = false) {
    window.APP.detailLevel = Math.min(LOWEST_DETAIL_LEVEL, window.APP.detailLevel + 1);
    console.warn("Slow framerate detected. New detail level: ", window.APP.detailLevel);

    this.scene.renderer.setPixelRatio(1);
    this.enableTracking = window.APP.detailLevel !== LOWEST_DETAIL_LEVEL; // Stop tracking at lowest detail level
    document.body.classList.add("low-detail");

    if (saveToStore) {
      window.APP.store.update({
        settings: {
          defaultDetailLevel: window.APP.detailLevel,
          defaultDetailLevelUntilSeconds: Math.floor(new Date() / 1000) + CROSS_SESSION_DETAIL_LOWER_DURATION_S
        }
      });
    }
  }

  tick(t) {
    if (!this.enableTracking) return;
    if (window.APP.detailLevel === LOWEST_DETAIL_LEVEL && this.scene.renderer.pixelRatio <= 0.33) return; // Already lowest detail level, can't do anything else

    if (this.lastTick === 0) {
      this.lastTick = performance.now();
      return;
    }

    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    this.totalFrames++;
    this.sampledFrames++;

    // For ridiculously underpowered machines, have a special code path that just looks at the
    // first N frames and if they're all slower than a conservative threshold
    // we immediately drop quality. This heuristic also burns in this as the max detail level
    // in local storage for a day to avoid slow startups.
    for (let i = 0; i < STARTUP_SLOW_FRAME_THRESHOLDS.length; i++) {
      const [frameDuration, frameCount] = STARTUP_SLOW_FRAME_THRESHOLDS[i];

      if (dt > frameDuration && this.totalFrames <= frameCount) {
        this.slowStartupFrames[i] = this.slowStartupFrames[i] + 1;

        if (this.slowStartupFrames[i] >= frameCount && window.APP.detailLevel < LOWEST_DETAIL_LEVEL) {
          this.debugLog(
            "Machine seems underpowered, dropping quality level for next day.",
            dt,
            frameDuration,
            frameCount,
            this.slowStartupFrames[i]
          );

          this.dropDetailLevel(true);
          this.slowStartupFrames[i] = 0;
          this.sampledFrames = 0;
        }

        return;
      }
    }

    if (dt > RESET_ON_TIME_JUMP_MS) {
      // Process was likely suspended
      this.timeSinceLastCheck = 0;
      this.metFastFrameTest = false;
      this.numConsecutiveFastFrames = 0;

      this.debugLog("Adjust for suspend at ", t);

      return;
    }

    // Otherwise conservatively detect slowdowns mid-session (eg object spawning, etc)
    if (dt < LOWER_QUALITY_FRAME_LENGTH) {
      this.consecutiveFastFrames++;
      this.debugLog("Fast frame at ", t, dt, this.consecutiveFastFrames);

      if (this.consecutiveFastFrames >= MIN_NUM_CONSECUTIVE_FAST_FRAMES) {
        this.metFastFrameTest = true;

        if (!this.firedFrameStableEvent) {
          this.dispatchEvent(new CustomEvent("framerate_stable", {}));
          this.firedFrameStableEvent = true;
        }
      }
    } else {
      this.consecutiveFastFrames = 0;
    }

    this.timeSinceLastCheck += dt;

    if (this.timeSinceLastCheck > SAMPLING_DURATION_MS) {
      if (this.sampledFrames < MIN_SAMPLES_NEEDED) {
        this.debugLog("Insufficient samples at ", t, dt);
        return;
      }

      this.timeSinceLastCheck = 0;
      this.sampledFrames = 0;

      if (!this.metFastFrameTest) {
        const minPixelRatio =
          window.APP.detailLevel === 0 || window.APP.detailLevel === 1
            ? 1.0
            : window.APP.detailLevel === LOWEST_DETAIL_LEVEL
              ? 0.33
              : 0.5;

        if (this.scene.renderer.getPixelRatio() > minPixelRatio) {
          if (this.scene.renderer.getPixelRatio() === 1.0) {
            console.warn("Dropping resolution to 0.5.");
            this.scene.renderer.setPixelRatio(0.5);
          } else if (this.scene.renderer.getPixelRatio() >= 0.5) {
            console.warn("Dropping resolution to 0.33.");
            this.scene.renderer.setPixelRatio(0.33);
          }
        } else {
          if (window.APP.detailLevel < LOWEST_DETAIL_LEVEL) {
            this.scene.renderer.setPixelRatio(1.0);
            this.dropDetailLevel();
          }
        }
      }

      this.consecutiveFastFrames = 0;
      this.metFastFrameTest = false;
    }
  }
}

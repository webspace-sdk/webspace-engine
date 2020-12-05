const SAMPLING_DURATION_MS = 1000.0 * 4.0;
const LOWER_QUALITY_FRAME_LENGTH = 1000.0 / 40; // Ensure at least 50 FPS
const MIN_SAMPLES_NEEDED = 15;
const RESET_ON_TIME_JUMP_MS = 2000.0;
const MIN_NUM_CONSECUTIVE_FAST_FRAMES = 2;

// Conservative quality adjuster, take frames during a SAMPLING_DURATION_MS
// period and if we never see MIN_NUM_CONSECUTIVE_FAST_FRAMES consecutive fast frames then lower quality.
export class AutoQualitySystem {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.enableTracking = false;
    this.numConsecutiveFastFrames = 0;
    this.metFastFrameTest = false;
    this.sampledFrames = 0;
    this.lastTick = 0;
    this.debugStartTime = performance.now();
  }

  startTracking() {
    if (this.enableTracking) return;

    this.timeSinceLastCheck = 0.0;
    this.enableTracking = true;
  }

  stopTracking() {
    this.enableTracking = false;
  }

  tick() {
    if (!this.enableTracking) return;
    if (this.lastTick === 0) {
      this.lastTick = performance.now();
      return;
    }

    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    this.sampledFrames++;

    if (dt > RESET_ON_TIME_JUMP_MS) {
      // Process was likely suspended
      this.timeSinceLastCheck = 0;
      this.metFastFrameTest = false;
      this.numConsecutiveFastFrames = 0;

      return;
    }

    if (dt < LOWER_QUALITY_FRAME_LENGTH) {
      this.consecutiveFastFrames++;

      if (this.consecutiveFastFrames >= MIN_NUM_CONSECUTIVE_FAST_FRAMES) {
        this.metFastFrameTest = true;
      }
    } else {
      this.consecutiveFastFrames = 0;
    }

    this.timeSinceLastCheck += dt;

    if (this.timeSinceLastCheck > SAMPLING_DURATION_MS) {
      this.timeSinceLastCheck = 0;

      if (this.sampledFrames < MIN_SAMPLES_NEEDED) return;

      this.sampledFrames = 0;

      if (!this.metFastFrameTest) {
        window.APP.detailLevel = Math.min(2, window.APP.detailLevel + 1);
        console.warn("Slow framerate detected New detail level: ", window.APP.detailLevel);

        this.scene.renderer.setPixelRatio(1);
        this.enableTracking = window.APP.detailLevel !== 2; // Stop tracking at lowest detail level
        document.body.classList.add("low-detail");
      }

      this.consecutiveFastFrames = 0;
      this.metFastFrameTest = false;
    }
  }
}

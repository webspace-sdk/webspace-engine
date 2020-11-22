const SAMPLING_DURATION_MS = 1000.0 * 4.0;
const PCT_REQUIRED_FAST_FRAMES = 0.15;
const LOWER_QUALITY_FRAME_LENGTH = 1000.0 / 40; // Ensure at least 40 FPS
const MIN_SAMPLES_NEEDED = 6;
const RESET_ON_TIME_JUMP_MS = 2000.0;

// Keeps a heap of frame times, and every SAMPLING_DURATION_MS we check
// that PCT_REQUIRED_FAST_FRAMES percent of frames met
// LOWER_QUALITY_FRAME_LENGTH, or else we lower the detail level.
export class AutoQualitySystem {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.enableTracking = false;
    this.fastCount = 0;
    this.slowCount = 0;
    this.lastT = 0;
  }

  startTracking() {
    if (this.enableTracking) return;

    this.fastCount = 0;
    this.slowCount = 0;
    this.timeSinceLastCheck = 0.0;
    this.enableTracking = true;
  }

  stopTracking() {
    this.enableTracking = false;
  }

  tick(dt) {
    if (!this.enableTracking) return;

    if (dt > RESET_ON_TIME_JUMP_MS) {
      // Process was likely suspended
      this.slowCount = 0;
      this.fastCount = 0;
      this.timeSinceLastCheck = 0;
      return;
    }

    if (dt > LOWER_QUALITY_FRAME_LENGTH) {
      this.slowCount++;
    } else {
      this.fastCount++;
    }

    this.timeSinceLastCheck += dt;

    if (this.timeSinceLastCheck > SAMPLING_DURATION_MS) {
      this.timeSinceLastCheck = 0;

      const totalFrames = this.fastCount + this.slowCount;
      if (totalFrames < MIN_SAMPLES_NEEDED) return;

      console.log(this.slowCount, totalFrames, totalFrames * 1.0 * PCT_REQUIRED_FAST_FRAMES);
      if (this.slowCount > totalFrames * 1.0 * PCT_REQUIRED_FAST_FRAMES) {
        console.warn("Slow framerate detected, disabling effects, fancy CSS, and reducing pixel ratio to speed it up.");

        window.APP.detailLevel++;
        this.scene.renderer.setPixelRatio(1);
        this.enableTracking = window.APP.detailLevel !== 2; // Stop tracking at lowest detail level
        document.body.classList.add("low-detail");
      }

      this.fastCount = this.slowCount = 0;
    }
  }
}

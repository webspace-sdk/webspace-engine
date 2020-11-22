import Heap from "heap-js";
const SAMPLING_DURATION_MS = 1000.0 * 4.0;
const PCT_REQUIRED_FAST_FRAMES = 0.15;
const LOWER_QUALITY_FRAME_LENGTH = 1000.0 / 45; // Ensure at least 45 FPS
const MIN_SAMPLES_NEEDED = 6;

// Keeps a heap of frame times, and every SAMPLING_DURATION_MS we check
// that PCT_REQUIRED_FAST_FRAMES percent of frames met
// LOWER_QUALITY_FRAME_LENGTH, or else we lower the detail level.
export class AutoQualitySystem {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.enableTracking = false;
  }

  startTracking() {
    if (this.enableTracking) return;

    this.samples = new Heap();
    this.samples.limit = 500;
    this.timeSinceLastCheck = 0.0;
    this.enableTracking = true;
  }

  stopTracking() {
    this.enableTracking = false;
  }

  tick(dt) {
    if (!this.enableTracking) return;

    this.samples.push(dt); // Push new frame onto heap

    this.timeSinceLastCheck += dt;

    if (this.timeSinceLastCheck > SAMPLING_DURATION_MS) {
      this.timeSinceLastCheck = 0;

      if (this.samples.length < MIN_SAMPLES_NEEDED) return;
      let i = 0;
      let isRunningFast = true;

      for (const frameDt of this.samples) {
        if (frameDt > LOWER_QUALITY_FRAME_LENGTH) {
          isRunningFast = false;
          break;
        }

        i++;
        if (i > Math.floor(PCT_REQUIRED_FAST_FRAMES * this.samples.length)) break;
      }

      if (!isRunningFast) {
        console.warn("Slow framerate detected, disabling effects, fancy CSS, and reducing pixel ratio to speed it up.");

        window.APP.detailLevel++;
        this.scene.renderer.setPixelRatio(1);
        this.enableTracking = window.APP.detailLevel === 2; // Stop tracking at lowest detail level
        document.body.classList.add("low-detail");
      }
    }
  }
}

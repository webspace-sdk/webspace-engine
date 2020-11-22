import Heap from "heap-js";
const SAMPLING_DURATION_MS = 1000.0 * 3.0;
const NUM_ALLOWED_OUTLIERS_PCT = 0.15;
const LOWER_QUALITY_FRAME_LENGTH = 1000.0 / 45; // Ensure at least 45 FPS
const MIN_SAMPLES_NEEDED = 6;

// Keeps a heap of frame times, and every SAMPLING_DURATION_MS we check
// sum the fastest frames - NUM_ALLOWED_OUTLIERS_PCT percent of outliers
// to determine average time per frame. Quality is lowered if it exceeds
// LOWER_QUALITY_FRAME_LENGTH.
export class AutoQualitySystem {
  constructor(sceneEl) {
    this.scene = sceneEl;
    this.enableTracking = false;
  }

  startTracking() {
    if (this.enableTracking) return;

    this.samples = new Heap(Heap.maxComparator);
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

      if (this.samples.length > MIN_SAMPLES_NEEDED) {
        let i = 0;
        let c = 0;
        let sum = 0.0;

        for (const frameDt of this.samples) {
          i++;
          if (i < Math.floor(NUM_ALLOWED_OUTLIERS_PCT * this.samples.length)) continue; // Skip slowest outliers

          c++;
          sum += frameDt;
        }

        const averageFrameTime = sum / (c * 1.0);

        if (averageFrameTime > LOWER_QUALITY_FRAME_LENGTH) {
          console.warn(
            "Slow framerate detected, disabling effects, fancy CSS, and reducing pixel ratio to speed it up."
          );

          window.APP.detailLevel++;
          this.scene.renderer.setPixelRatio(1);
          this.enableTracking = window.APP.detailLevel === 2; // Stop tracking at lowest detail level
          document.body.classList.add("low-detail");
        }
      }
    }
  }
}

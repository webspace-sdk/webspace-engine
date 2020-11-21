import Heap from "heap-js";
const SAMPLING_DURATION_MS = 1000.0 * 5.0;
const NUM_ALLOWED_OUTLIERS_PCT = 0.15;
const MAX_AVERAGE_FRAME_LENGTH = 1000.0 / 29.5; // Ensure at least 30 FPS
const MIN_SAMPLES_NEEDED = 10;

// Keeps a heap of frame times, and every SAMPLING_DURATION_MS we check
// sum the fastest frames - NUM_ALLOWED_OUTLIERS_PCT percent of outliers
// to determine average time per frame. Quality is lowered if it exceeds
// MAX_AVERAGE_FRAME_LENGTH.
export class AutoQualitySystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.enableTracking = false;
  }

  startTracking() {
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

        if (averageFrameTime > MAX_AVERAGE_FRAME_LENGTH) {
          console.warn("Slow framerate detected, disabling effects to speed it up.");
          window.APP.disableEffects = true;
          this.enableTracking = false;
        }
      }
    }
  }
}

const SYNC_DURATION_MS = 3000;
const NUM_EXTRA_SYNCS = 3;

// HACK this is a hacky component that is used to mitigate the situation where a first sync is missed on critical
// networked elements. (At the time of this writing, specifically just the user's avatar.) The motivation
// is that there have been a variety of issues resulting in missed avatar instantiation messages, and
// this is meant to ensure we recover from those in the cases where they occur.
//
// This component, when added, will re-send a isFirstSync message for the networked object is it attached to
// every SYNC_DURATION_MS milliseconds.
AFRAME.registerComponent("periodic-full-syncs", {
  init() {
    this.reset();
  },

  tick() {
    if (this.syncCount > NUM_EXTRA_SYNCS) return;

    const now = performance.now();

    if (now - this.lastSync >= SYNC_DURATION_MS && this.el.components && this.el.components.networked) {
      this.lastSync = now;
      this.syncCount++;

      // Sends an undirected first sync message.
      this.el.components.networked.syncAll(null, true);
    }
  },

  reset() {
    this.lastSync = 0;
    this.syncCount = 0;
  }
});

export function restartPeriodicSyncs() {
  [...document.querySelectorAll("[periodic-full-syncs]")].forEach(el => el.components["periodic-full-syncs"].reset());
}

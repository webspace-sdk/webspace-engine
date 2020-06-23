import { isSynchronized, isMine } from "../utils/ownership-utils";
/* global performance */
AFRAME.registerComponent("owned-object-cleanup-timeout", {
  schema: {
    counter: { type: "selector" },
    ttl: { default: 0 }
  },

  init() {
    this.counter = this.data.counter.components["networked-counter"];
    this.timeout = Number.POSITIVE_INFINITY;
  },

  tick() {
    if (isSynchronized(this.el) && isMine(this.el)) {
      const isPinned = this.el.components["pinnable"] && this.el.components["pinnable"].data.pinned;
      if (isMine(this.el) && !isPinned && performance.now() >= this.timeout) {
        this.el.parentNode.removeChild(this.el);
        this.timeout = Number.POSITIVE_INFINITY;
      }
    }
    const isHeld = this.el.sceneEl.systems.interaction.isHeld(this.el);
    if (!isHeld && this.wasHeld && this.counter.timestamps.has(this.el)) {
      this.timeout = performance.now() + this.data.ttl * 1000;
    } else if (isHeld && !this.wasHeld) {
      this.timeout = Number.POSITIVE_INFINITY;
    }
    this.wasHeld = isHeld;
  }
});

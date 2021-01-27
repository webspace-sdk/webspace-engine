import Store from "./hubs/storage/store";
import MediaSearchStore from "./hubs/storage/media-search-store";

export class App {
  constructor() {
    this.scene = null;
    this.quality = "low";
    this.store = new Store();
    this.mediaSearchStore = new MediaSearchStore();

    // Detail levels
    // 0 - Full
    // 1 - Reduce shadow map, no reflections, simple sky, no SSAO, no terrain detail meshes
    // 2 - Also disable shadows and FXAA
    //
    // Start at lowest detail level, so app boots quickly.
    this._detailLevel = 2;
  }

  setQuality(quality) {
    if (this.quality === quality) {
      return false;
    }

    this.quality = quality;

    if (this.scene) {
      this.scene.dispatchEvent(new CustomEvent("quality-changed", { detail: quality }));
    }

    return true;
  }

  get detailLevel() {
    return this._detailLevel;
  }

  set detailLevel(detailLevel) {
    this._detailLevel = detailLevel;

    if (typeof AFRAME !== "undefined") {
      const scene = AFRAME.scenes[0];

      if (scene) {
        scene.emit("detail-level-changed", {});
      }
    }
  }
}

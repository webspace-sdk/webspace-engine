import Store from "./hubs/storage/store";
import MediaSearchStore from "./hubs/storage/media-search-store";
import { ROLES } from "./jel/utils/atom-access-manager";

export class App {
  constructor() {
    this.scene = null;
    this.quality = "low";
    this.store = new Store();
    this.mediaSearchStore = new MediaSearchStore();

    // TODO SHARED, these should be settings
    this.allowUnsavedObjects = true;
    this.createAndEditRole = ROLES.MEMBER;

    // Detail levels
    // 0 - Full
    // 1 - No reflections, simple sky, lower shadow map res
    // 2 - Disable shadows, no terrain detail meshes, disable FXAA
    // 3 - Also disable SSAO, used when software rendering
    //
    // Start at lowest detail level, so app boots quickly.
    this._detailLevel = 3;
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

import { ensureOwnership, getNetworkId, getNetworkedEntity } from "../utils/ownership-utils";
import { HIDE_AT_DISTANCE_MEDIA_VIEW_COMPONENTS, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { normalizeCoord, denormalizeCoord } from "./wrapped-entity-system";

export const MAX_MEDIA_LAYER = 7;
const MAX_CONCURRENT_TRANSITIONS = 4;
const tmpVec3 = new THREE.Vector3();

AFRAME.registerComponent("shared-media", {
  schema: {
    selectedMediaLayer: { default: 0 },
    activeMediaLayers: { default: 1 }
  },

  setActiveLayer(mediaLayer) {
    if (!ensureOwnership(this.el)) return;
    this.el.setAttribute("shared-media", {
      activeMediaLayers: 0x1 << mediaLayer,
      selectedMediaLayer: mediaLayer
    });
  },

  update(oldData) {
    if (oldData.selectedMediaLayer !== this.data.selectedMediaLayer) {
      this.el.sceneEl.emit("scene_selected_media_layer_changed", {
        selectedMediaLayer: this.data.selectedMediaLayer
      });
    }
  }
});

// System which manages media presence based upon media layers and eventually other contexts.
//
// The general contract for this is we publish "desired" media presence state for each network id,
// and this system will eventually let each relevant media component transition itself. Transitions
// are transactions and not cancellable, so before we transition to HIDDEN for example if a transition
// to PRESENT was underway, it will be allowed to complete.
export class MediaPresenceSystem {
  constructor(scene) {
    this.scene = scene;
    this.mediaPresence = new Map();
    this.desiredMediaPresence = new Map();
    this.mediaComponents = new Map();
    this.hidableMediaNetworkIds = new Array();
    this.transitioningNetworkIds = new Set();
    this.avatarPovEl = null;
    this.frame = 0;

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.querySelector("#avatar-pov-node");
    });
  }

  getMediaPresence(component) {
    if (!this.mediaPresence.has(component)) {
      return MEDIA_PRESENCE.UNKNOWN;
    }

    return this.mediaPresence.get(component);
  }

  setMediaPresence(component, presence) {
    this.mediaPresence.set(component, presence);
    this.checkForNewTransitionsNextTick = true;
  }

  tick() {
    this.frame++;

    for (let i = 0; i < this.hidableMediaNetworkIds.length; i++) {
      const networkId = this.hidableMediaNetworkIds[i];
      const { el } = this.mediaComponents.get(networkId);

      this.updateDesiredMediaPresence(el);
    }

    if (!this.checkForNewTransitionsNextTick) return;

    this.checkForNewTransitionsNextTick = false;

    // Look for new transitions
    for (const [networkId, desiredMediaPresence] of this.desiredMediaPresence.entries()) {
      const mediaComponent = this.mediaComponents.get(networkId);
      if (!mediaComponent) continue;
      const mediaPresence = this.getMediaPresence(mediaComponent);

      if (mediaPresence !== MEDIA_PRESENCE.PENDING && mediaPresence !== desiredMediaPresence) {
        if (desiredMediaPresence === MEDIA_PRESENCE.HIDDEN) {
          // if it's hidden, just do it right away since it's cheap.
          mediaComponent.setMediaPresence(desiredMediaPresence);
        } else if (this.transitioningNetworkIds.size < MAX_CONCURRENT_TRANSITIONS) {
          this.beginTransitionOfMediaPresence(networkId, desiredMediaPresence);
        }
      }
    }
  }

  getActiveMediaLayers() {
    const el = document.querySelector("[shared-media]");
    if (!el) {
      console.warn("Trying to get active media layers but shared media space entity in scene.");
      return 1;
    }

    return el.components["shared-media"].data.activeMediaLayers;
  }

  getSelectedMediaLayer() {
    const el = document.querySelector("[shared-media]");
    if (!el) {
      console.warn("Trying to get seleced media layers but shared media space entity in scene.");
      return 0;
    }

    return el.components["shared-media"].data.selectedMediaLayer;
  }

  setActiveLayer(mediaLayer) {
    const el = document.querySelector("[shared-media]");
    if (!el) {
      console.warn("Trying to get active media layers but shared media space entity in scene.");
    }

    el.components["shared-media"].setActiveLayer(mediaLayer);
  }

  selectNextMediaLayer() {
    const currentSelectedMediaLayer = this.getSelectedMediaLayer();
    if (currentSelectedMediaLayer >= MAX_MEDIA_LAYER) return;
    this.setActiveLayer(currentSelectedMediaLayer + 1);
  }

  selectPreviousMediaLayer() {
    const currentSelectedMediaLayer = this.getSelectedMediaLayer();
    if (currentSelectedMediaLayer <= 0) return;
    this.setActiveLayer(currentSelectedMediaLayer - 1);
  }

  isMediaLayerActive(mediaLayer) {
    const activeMediaLayers = this.getActiveMediaLayers();
    return !!((0x1 << mediaLayer) & activeMediaLayers);
  }

  updateDesiredMediaPresence(el) {
    const networkId = getNetworkId(el);
    const mediaLayer = el.components["media-loader"].data.mediaLayer;
    let isWithinRange = true;

    if (this.avatarPovEl) {
      const isHidableWithDistance = !!HIDE_AT_DISTANCE_MEDIA_VIEW_COMPONENTS.find(name => !!el.components[name]);

      if (isHidableWithDistance) {
        isWithinRange = false;

        const avatarPovNode = this.avatarPovEl.object3D;
        avatarPovNode.getWorldPosition(tmpVec3);
        const ax = tmpVec3.x;
        const az = tmpVec3.z;

        el.object3D.getWorldPosition(tmpVec3);
        const ox = denormalizeCoord(normalizeCoord(tmpVec3.x), ax);
        const oz = denormalizeCoord(normalizeCoord(tmpVec3.z), az);

        const distSq = (ax - ox) * (ax - ox) + (az - oz) * (az - oz);
        isWithinRange = distSq <= 250.0;
      }
    }

    const presence =
      isWithinRange && this.isMediaLayerActive(mediaLayer) ? MEDIA_PRESENCE.PRESENT : MEDIA_PRESENCE.HIDDEN;

    if (this.desiredMediaPresence.get(networkId) !== presence) {
      this.desiredMediaPresence.set(networkId, presence);
      this.checkForNewTransitionsNextTick = true;
    }
  }

  async beginTransitionOfMediaPresence(networkId, presence) {
    const mediaComponent = this.mediaComponents.get(networkId);
    this.transitioningNetworkIds.add(networkId);
    try {
      await mediaComponent.setMediaPresence(presence);
      this.checkForNewTransitionsNextTick = true;
    } finally {
      this.transitioningNetworkIds.delete(networkId);
    }
  }

  registerMediaComponent(component) {
    try {
      this.setMediaPresence(component, MEDIA_PRESENCE.INIT);

      getNetworkedEntity(component.el)
        .then(networkedEl => {
          const networkId = getNetworkId(networkedEl);
          this.mediaComponents.set(networkId, component);

          const isHidable = !!HIDE_AT_DISTANCE_MEDIA_VIEW_COMPONENTS.find(n => component.name === n);

          if (isHidable && !this.hidableMediaNetworkIds.includes(networkId)) {
            this.hidableMediaNetworkIds.push(networkId);
          }

          this.updateDesiredMediaPresence(component.el);
        })
        .catch(() => {}); //ignore exception, entity might not be networked
    } catch (e) {
      // NAF/SAF may not exist on scene landing page
    }
  }

  unregisterMediaComponent(component) {
    for (const [networkId, c] of this.mediaComponents) {
      if (c !== component) continue;
      this.mediaComponents.delete(networkId);
      this.desiredMediaPresence.delete(networkId);
      this.mediaPresence.delete(component);
      this.checkForNewTransitionsNextTick = true;

      const idx = this.hidableMediaNetworkIds.indexOf(networkId);
      if (idx !== -1) {
        this.hidableMediaNetworkIds.splice(idx, 1);
      }

      break;
    }
  }
}

import { getNetworkId, getNetworkedEntity } from "../utils/ownership-utils";
import { MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { normalizeCoord, denormalizeCoord } from "./wrapped-entity-system";

export const MAX_MEDIA_LAYER = 7;
const MAX_CONCURRENT_TRANSITIONS = 4;
const tmpVec3 = new THREE.Vector3();
const SQ_DISTANCE_TO_DELAY_PRESENCE = 300.0;

// System which manages media presence based upon media layers and eventually other contexts.
//
// The general contract for this is we publish "desired" media presence state for each network id,
// and this system will eventually let each relevant media component transition itself. Transitions
// are transactions and not cancellable, so before we transition to HIDDEN for example if a transition
// to PRESENT was underway, it will be allowed to complete.
export class MediaPresenceSystem {
  constructor(scene, characterController, terrainSystem) {
    this.scene = scene;
    this.characterController = characterController;
    this.terrainSystem = terrainSystem;
    this.mediaPresence = new Map();
    this.desiredMediaPresence = new Map();
    this.mediaComponents = new Map();
    this.transitioningNetworkIds = new Set();
    this.avatarPovEl = null;
    this.frame = 0;

    // For certain media, we delay setting it from hidden to present for the first time if it is
    // far away, to minimize initial hitching when joining a world.
    this.distanceDelayedNetworkIds = new Set();

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = UI_ROOT.querySelector("#avatar-pov-node");
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

    // Handle setting things to present if they are delayed based on distance.
    // Convert at most one every N frames (depending if moving) to reduce hitching.
    if (this.distanceDelayedNetworkIds.size > 0) {
      const frameDelay = this.characterController.isMoving() ? 30 : 5;

      if (this.frame % frameDelay === 0) {
        for (const networkId of this.distanceDelayedNetworkIds) {
          const el = this.mediaComponents.get(networkId).el;
          const newPresence = this.updateDesiredMediaPresence(el);

          // Do at most one per frame delay
          if (newPresence === MEDIA_PRESENCE.PRESENT) break;
        }
      }
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
    return 1;
  }

  getSelectedMediaLayer() {
    return 0;
  }

  setActiveLayer() {
    // No longer implemented
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

  // This will return a promise that will resolve once all the media that is HIDDEN due to being out
  // of range has been instantiated (or failed) once made PRESENT regardless of range.
  instantiateAllDelayedMedia() {
    const promises = [];

    for (const networkId of this.distanceDelayedNetworkIds) {
      const component = this.mediaComponents.get(networkId);
      if (!component) continue;

      const { el } = component;
      this.distanceDelayedNetworkIds.delete(networkId);

      const newPresence = this.updateDesiredMediaPresence(component.el);

      if (newPresence === MEDIA_PRESENCE.PRESENT) {
        promises.push(
          new Promise(res => {
            el.addEventListener("media-loaded", res, { once: true });
            el.addEventListener("media-loader-failed", res, { once: true });
          })
        );
      }
    }

    return Promise.all(promises);
  }

  // Updates the current presence to PRESENT if it is in the current layer, and is
  // within the right range unless it's component is not limited by distance.
  //
  // If the presence is updated, returns the new value.
  updateDesiredMediaPresence(el) {
    const networkId = getNetworkId(el);
    const mediaLayer = el.components["media-loader"].data.mediaLayer;

    let shouldDelay = false;

    if (this.terrainSystem.worldTypeDelaysMediaPresence()) {
      if (this.distanceDelayedNetworkIds.has(networkId)) {
        if (!this.avatarPovEl) return;

        shouldDelay = true;

        const avatarPovNode = this.avatarPovEl.object3D;
        avatarPovNode.getWorldPosition(tmpVec3);
        const ax = tmpVec3.x;
        const az = tmpVec3.z;

        el.object3D.getWorldPosition(tmpVec3);
        const ox = denormalizeCoord(normalizeCoord(tmpVec3.x), ax);
        const oz = denormalizeCoord(normalizeCoord(tmpVec3.z), az);

        const distSq = (ax - ox) * (ax - ox) + (az - oz) * (az - oz);
        shouldDelay = distSq > SQ_DISTANCE_TO_DELAY_PRESENCE;
      }
    }

    const presence =
      !shouldDelay && this.isMediaLayerActive(mediaLayer) ? MEDIA_PRESENCE.PRESENT : MEDIA_PRESENCE.HIDDEN;

    if (presence === MEDIA_PRESENCE.PRESENT && this.distanceDelayedNetworkIds.has(networkId)) {
      this.distanceDelayedNetworkIds.delete(networkId);
    }

    if (this.desiredMediaPresence.get(networkId) !== presence) {
      this.desiredMediaPresence.set(networkId, presence);
      this.checkForNewTransitionsNextTick = true;
      return presence;
    }

    return null;
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

          this.distanceDelayedNetworkIds.add(networkId);
          this.updateDesiredMediaPresence(component.el);
        })
        .catch(() => {}); //ignore exception, entity might not be networked
    } catch (e) {
      // NAF may not exist on scene landing page
    }
  }

  unregisterMediaComponent(component) {
    for (const [networkId, c] of this.mediaComponents) {
      if (c !== component) continue;
      this.mediaComponents.delete(networkId);
      this.distanceDelayedNetworkIds.delete(networkId);
      this.desiredMediaPresence.delete(networkId);
      this.mediaPresence.delete(component);
      this.checkForNewTransitionsNextTick = true;

      break;
    }
  }
}

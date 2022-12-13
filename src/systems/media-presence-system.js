import {getNetworkedEntity, getNetworkId} from "../utils/ownership-utils";
import {MEDIA_PRESENCE} from "../utils/media-utils";
import {waitForShadowDOMContentLoaded} from "../utils/async-utils";
import {denormalizeCoord, normalizeCoord} from "./wrapped-entity-system";

const MAX_CONCURRENT_TRANSITIONS = 4;
const tmpVec3 = new THREE.Vector3();
const SQ_DISTANCE_TO_DELAY_PRESENCE = 300.0;

// System which manages media presence based upon distance.
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

    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPovEl = DOM_ROOT.querySelector("#avatar-pov-node");
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

  // Updates the current presence to PRESENT if it is in  within the right
  // range unless it's component is not limited by distance.
  //
  // If the presence is updated, returns the new value.
  updateDesiredMediaPresence(el) {
    const networkId = getNetworkId(el);

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

    const presence = !shouldDelay ? MEDIA_PRESENCE.PRESENT : MEDIA_PRESENCE.HIDDEN;

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

import { getNetworkId, getNetworkedEntity } from "../utils/ownership-utils";
import { MEDIA_PRESENCE } from "../../utils/media-utils";

const MAX_CONCURRENT_TRANSITIONS = 4;

export class MediaPresenceSystem {
  constructor(scene) {
    this.scene = scene;
    this.desiredMediaPresence = {};
    this.mediaComponents = {};
    this.transitioningNetworkIds = new Set();
  }

  tick() {
    if (!this.checkForNewTransitionsNextTick) return;

    // Look for new transitions
    for (const [networkId, desiredMediaPresence] of Object.entries(this.desiredMediaPresence)) {
      const mediaComponent = this.mediaComponents[networkId];
      if (!mediaComponent) continue;

      if (
        mediaComponent.mediaPresence !== MEDIA_PRESENCE.PENDING &&
        mediaComponent.mediaPresence !== desiredMediaPresence
      ) {
        if (desiredMediaPresence === MEDIA_PRESENCE.HIDDEN) {
          // if it's hidden, just do it right away since it's cheap.
          mediaComponent.setMediaPresence(desiredMediaPresence);
        } else if (this.transitioningNetworkIds.size < MAX_CONCURRENT_TRANSITIONS) {
          this.beginTransitionOfMediaPresence(networkId, desiredMediaPresence);
        }
      }
    }

    this.checkForNewTransitionsNextTick = false;
  }

  setDesiredMediaPresence(networkId, presence) {
    this.desiredMediaPresence[networkId] = presence;
    this.checkForNewTransitionsNextTick = true;
  }

  async beginTransitionOfMediaPresence(networkId, presence) {
    const mediaComponent = this.mediaComponents[networkId];
    this.transitioningNetworkIds.add(networkId);
    await mediaComponent.setMediaPresence(presence);
    this.transitioningNetworkIds.delete(networkId);
    this.checkForNewTransitionsNextTick = true;
  }

  registerMediaComponent(component) {
    try {
      getNetworkedEntity(component.el)
        .then(networkedEl => {
          const networkId = getNetworkId(networkedEl);
          this.mediaComponents[networkId] = component;
          this.checkForNewTransitionsNextTick = true;
        })
        .catch(() => {}); //ignore exception, entity might not be networked
    } catch (e) {
      // NAF/SAF may not exist on scene landing page
    }
  }

  unregisterMediaComponent(component) {
    try {
      getNetworkedEntity(component.el)
        .then(networkedEl => {
          const networkId = getNetworkId(networkedEl);
          delete this.mediaComponents[networkId];
          this.checkForNewTransitionsNextTick = true;
        })
        .catch(); //ignore exception, entity might not be networked
    } catch (e) {
      // NAF/SAF may not exist on scene landing page
    }
  }
}

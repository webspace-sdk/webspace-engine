import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { groundMedia, MEDIA_INTERACTION_TYPES } from "../../hubs/utils/media-utils";
import { getNetworkedEntity } from "../../jel/utils/ownership-utils";
import "../utils/vox-sync";

AFRAME.registerComponent("media-vox", {
  schema: {
    src: { type: "string" }
  },

  async init() {
    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.registerMediaComponent(this);
    }

    getNetworkedEntity(this.el).then(networkedEl => {
      this.networkedEl = networkedEl;
    });

    this.voxId = null;

    this.visibleMeshIndex = 0;
  },

  async update(oldData) {
    const { src } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    const hasLayer = hasMediaLayer(this.el);

    if (!hasLayer || refresh) {
      const newMediaPresence = hasLayer ? mediaPresenceSystem.getMediaPresence(this) : MEDIA_PRESENCE.PRESENT;
      this.setMediaPresence(newMediaPresence, refresh);
    }
  },

  setMediaPresence(presence, refresh = false) {
    switch (presence) {
      case MEDIA_PRESENCE.PRESENT:
        return this.setMediaToPresent(refresh);
      case MEDIA_PRESENCE.HIDDEN:
        return this.setMediaToHidden(refresh);
    }
  },

  async setMediaToHidden() {
    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    if (this.mesh) {
      this.mesh.visible = false;
    }

    mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.HIDDEN);
  },

  async setMediaToPresent(refresh) {
    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    try {
      if (
        mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.HIDDEN &&
        this.mesh &&
        !this.mesh.visible &&
        !refresh
      ) {
        this.mesh.visible = true;
      }

      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PENDING);

      const { src } = this.data;
      if (!src) return;

      if (!this.mesh) {
        disposeExistingMesh(this.el);

        this.el.emit("model-loading");

        // TODO should be 1,1,1
        const geo = new THREE.BoxBufferGeometry(32.0, 32.0, 32.0);
        const mat = new THREE.MeshBasicMaterial();
        mat.visible = false;
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = false;

        // Register returns vox id
        this.voxId = await SYSTEMS.voxSystem.register(src, this.mesh);
        this.el.object3D.matrixNeedsUpdate = true;
        this.el.setObject3D("mesh", this.mesh);

        this.el.emit("model-loaded", { format: "emoji", model: this.mesh });
      }
    } catch (e) {
      this.el.emit("model-error", { src: this.data.src });
      throw e;
    } finally {
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  handleMediaInteraction(type) {
    if (type === MEDIA_INTERACTION_TYPES.DOWN) {
      groundMedia(this.el);
    }
  },

  remove() {
    disposeExistingMesh(this.el);

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }

    if (this.mesh) {
      SYSTEMS.voxSystem.unregister(this.mesh);
    }
  }
});

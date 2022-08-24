import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { resetMediaRotation, MEDIA_INTERACTION_TYPES } from "../../hubs/utils/media-utils";
import { imageUrlForEmoji } from "../../hubs/utils/media-url-utils";

AFRAME.registerComponent("media-emoji", {
  schema: {
    src: { type: "string" },
    emoji: { type: "string" }
  },

  async init() {
    if (hasMediaLayer(this.el)) {
      SYSTEMS.mediaPresenceSystem.registerMediaComponent(this);
    }

    // Add class indicating the mesh is an instanced mesh, which will
    // cause cursor raycasting to be deferred to the instanced mesh.
    this.el.classList.add("instanced");
    SYSTEMS.cursorTargettingSystem.setDirty();
  },

  async update(oldData) {
    const { src } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    const hasLayer = hasMediaLayer(this.el);

    const initialContents = this.el.components["media-loader"].consumeInitialContents();

    if (initialContents) {
      this.el.setAttribute("media-emoji", { emoji: initialContents });
    }

    if (!hasLayer || refresh) {
      const newMediaPresence = hasLayer ? SYSTEMS.mediaPresenceSystem.getMediaPresence(this) : MEDIA_PRESENCE.PRESENT;
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
    if (this.mesh) {
      this.mesh.visible = false;
    }

    SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.HIDDEN);
  },

  async setMediaToPresent(refresh) {
    try {
      if (
        SYSTEMS.mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.HIDDEN &&
        this.mesh &&
        !this.mesh.visible &&
        !refresh
      ) {
        this.mesh.visible = true;
      }

      SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PENDING);

      const { src } = this.data;
      if (!src) return;

      if (!this.mesh) {
        disposeExistingMesh(this.el);

        this.el.emit("model-loading");

        const geo = new THREE.BoxBufferGeometry(0.65, 0.65, 0.125);
        const mat = new THREE.MeshBasicMaterial();
        mat.visible = false;
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = false;
        this.el.object3D.matrixNeedsUpdate = true;
        this.el.setObject3D("mesh", this.mesh);
        const imageUrl = await imageUrlForEmoji(this.data.emoji, 128);
        await SYSTEMS.voxmojiSystem.register(imageUrl, this.mesh);

        this.el.emit("model-loaded", { format: "emoji", model: this.mesh });
      }
    } catch (e) {
      this.el.emit("model-error", { src: this.data.src });
      throw e;
    } finally {
      SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  handleMediaInteraction(type) {
    if (type === MEDIA_INTERACTION_TYPES.RESET) {
      resetMediaRotation(this.el);
    }
  },

  remove() {
    disposeExistingMesh(this.el);

    if (hasMediaLayer(this.el)) {
      SYSTEMS.mediaPresenceSystem.unregisterMediaComponent(this);
    }

    if (this.mesh) {
      SYSTEMS.voxmojiSystem.unregister(this.mesh);
    }
  }
});

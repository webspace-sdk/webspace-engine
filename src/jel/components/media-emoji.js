import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";

const EMOJI_IMAGE_URL = "https://assets.jel.app/static/emoji";

function emojiUnicode(emoji) {
  if (emoji.length < 4) return emoji.codePointAt(0).toString(16);
  return emoji.codePointAt(0).toString(16) + "-" + emoji.codePointAt(2).toString(16);
}

AFRAME.registerComponent("media-emoji", {
  schema: {
    src: { type: "string" },
    emoji: { type: "string" }
  },

  async init() {
    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.registerMediaComponent(this);
    }
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

      const initialContents = this.el.components["media-loader"].consumeInitialContents();

      let emoji = this.data.emoji;

      if (initialContents) {
        emoji = initialContents;
        this.el.setAttribute("media-emoji", { emoji });
      }

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
        const voxmojiSystem = this.el.sceneEl.systems["hubs-systems"].voxmojiSystem;
        const unicode = emojiUnicode(this.data.emoji).toUpperCase();
        const imageUrl = `${EMOJI_IMAGE_URL}/${unicode}-128.png`;
        await voxmojiSystem.register(imageUrl, this.mesh);

        this.el.emit("model-loaded", { format: "emoji", model: this.mesh });
      }
    } catch (e) {
      this.el.emit("model-error", { src: this.data.src });
      throw e;
    } finally {
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  remove() {
    disposeExistingMesh(this.el);

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }

    if (this.mesh) {
      const voxmojiSystem = this.el.sceneEl.systems["hubs-systems"].voxmojiSystem;
      voxmojiSystem.unregister(this.mesh);
    }
  }
});

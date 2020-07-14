import Quill from "quill";
import { getQuill, hasQuill, destroyQuill } from "../utils/quill-pool";
import { getNetworkId } from "../utils/ownership-utils";
import { fromByteArray } from "base64-js";
import { hasMediaLayer, scaleToAspectRatio, MEDIA_PRESENCE } from "../../utils/media-utils";
import { disposeExistingMesh, disposeTexture } from "../../utils/three-utils";

AFRAME.registerComponent("media-text", {
  schema: {
    src: { type: "string" },
    deltaOps: { default: null }
  },

  async init() {
    this.renderNextFrame = false;
    this.onTextChanged = this.onTextChanged.bind(this);

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.registerMediaComponent(this);
    }
  },

  async update(oldData) {
    const { src } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    // TODO JEL when other attriutes change here like color, etc, update.
    /*if (mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.PRESENT) {
      this.updateColorEtc
    }*/

    const hasLayer = hasMediaLayer(this.el);

    if (!hasLayer || refresh) {
      const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;
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

    this.unbindAndRemoveQuill();
    this.quill = null;

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

        this.texture = new THREE.Texture();
        this.texture.encoding = THREE.sRGBEncoding;
        this.texture.minFilter = THREE.LinearFilter;

        const mat = new THREE.MeshBasicMaterial();
        const geo = new THREE.PlaneBufferGeometry(1, 1, 1, 1, this.texture.flipY);
        mat.side = THREE.DoubleSide;

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.material.map = this.texture;
        this.el.setObject3D("mesh", this.mesh);
        scaleToAspectRatio(this.el, 9.0 / 16.0); // TODO 1080p is default
      }

      this.el.emit("text-loading");

      if (!this.quill || refresh) {
        this.unbindAndRemoveQuill();
        const shared = this.el.components.shared;
        await shared.whenReadyForBinding();
        this.quill = this.bindQuill();

        const initialContents = this.el.components["media-loader"].consumeInitialContents();

        if (initialContents) {
          const delta = this.quill.clipboard.convert(initialContents);
          this.quill.updateContents(delta, Quill.sources.USER);
        }
      }

      // TODO move after first frame loaded
      this.el.emit("text-loaded", { src: this.data.src });
    } finally {
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  tick() {
    if (this.renderNextFrame && this.quill) {
      this.renderNextFrame = false;
      this.render();
    }
  },

  render() {
    const el = this.quill.container;
    const xml = new XMLSerializer().serializeToString(el);
    const ratio = el.offsetHeight / el.offsetWidth;
    const textureSize = 1024; // TODO labels should be smaller
    const scale = (textureSize * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth * scale}px" height="${el.offsetHeight * scale}px">
        <foreignObject width="100%" height="100%" style="transform: scale(${scale});">
          ${xml}
        </foreignObject>
      </svg>
    `;

    const b64 = fromByteArray(new TextEncoder().encode(svg));
    const img = document.createElement("img");
    img.src = `data:image/svg+xml;base64,${b64}`;

    img.onload = () => {
      this.texture.image = img;
      this.texture.needsUpdate = this.mesh.material.needsUpdate = true;
    };
  },

  onTextChanged() {
    this.renderNextFrame = true;
    // TODO priority queue in a system
  },

  bindQuill() {
    const networkId = getNetworkId(this.el);
    if (hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    quill.on("text-change", this.onTextChanged);
    this.el.components.shared.bindRichTextEditor(quill, this.name, "deltaOps");
    return quill;
  },

  unbindAndRemoveQuill() {
    const networkId = getNetworkId(this.el);
    if (!hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    quill.off("text-change", this.onTextChanged);
    this.el.components.shared.unbindRichTextEditor(this.name, "deltaOps");
    destroyQuill(networkId);
    this.quill = null;
  },

  remove() {
    this.unbindAndRemoveQuill();
    disposeExistingMesh(this.el);

    if (this.texture) {
      disposeTexture(this.texture);
    }

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }
  }
});
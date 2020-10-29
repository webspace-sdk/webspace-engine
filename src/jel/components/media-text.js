import Quill from "quill";
import { getQuill, hasQuill, destroyQuill } from "../utils/quill-pool";
import { getNetworkId } from "../utils/ownership-utils";
import {
  hasMediaLayer,
  scaleToAspectRatio,
  MEDIA_PRESENCE,
  MEDIA_INTERACTION_TYPES
} from "../../hubs/utils/media-utils";
import { disposeExistingMesh, disposeTexture } from "../../hubs/utils/three-utils";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToMaterial } from "../../jel/systems/terrain-system";
import { renderQuillToImg } from "../utils/quill-utils";
import { paths } from "../../hubs/systems/userinput/paths";

const SCROLL_SENSITIVITY = 500.0;

AFRAME.registerComponent("media-text", {
  schema: {
    src: { type: "string" },
    deltaOps: { default: null }
  },

  async init() {
    this.renderNextFrame = false;
    this.rerenderQuill = this.rerenderQuill.bind(this);

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

        // Stencil out text so we don't FXAA it.
        const mat = new THREE.MeshBasicMaterial({
          stencilWrite: true,
          stencilFunc: THREE.AlwaysStencilFunc,
          stencilRef: 1,
          stencilZPass: THREE.ReplaceStencilOp
        });
        addVertexCurvingToMaterial(mat);
        const geo = new THREE.PlaneBufferGeometry(1, 1, 1, 1, this.texture.flipY);
        mat.side = THREE.DoubleSide;

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        this.mesh.renderOrder = RENDER_ORDER.MEDIA;
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
    } catch (e) {
      this.el.emit("text-error", { src: this.data.src });
      throw e;
    } finally {
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  tick() {
    const userinput = this.el.sceneEl.systems.userinput;
    const interaction = this.el.sceneEl.systems.interaction;

    const volumeModRight = userinput.get(paths.actions.cursor.right.mediaScroll);
    if (interaction.state.rightRemote.hovered === this.el && volumeModRight) {
      this.scrollBy(volumeModRight);
    }
    const volumeModLeft = userinput.get(paths.actions.cursor.left.mediaScroll);
    if (interaction.state.leftRemote.hovered === this.el && volumeModLeft) {
      this.scrollBy(volumeModLeft);
    }

    if (this.renderNextFrame && this.quill) {
      this.renderNextFrame = false;
      this.render();
    }
  },

  scrollBy(amount) {
    if (!amount || !this.quill) return;
    const scrollDistance = Math.floor(-amount * SCROLL_SENSITIVITY);
    this.quill.container.querySelector(".ql-editor").scrollBy(0, scrollDistance);

    this.renderNextFrame = true;
  },

  render() {
    const img = document.createElement("img");

    img.onload = () => {
      this.texture.image = img;
      this.texture.needsUpdate = this.mesh.material.needsUpdate = true;
    };

    renderQuillToImg(this.quill, img);
  },

  rerenderQuill() {
    this.renderNextFrame = true;
    // TODO priority queue in a system
  },

  bindQuill() {
    const networkId = getNetworkId(this.el);
    if (hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    quill.on("text-change", this.rerenderQuill);
    quill.container.querySelector(".ql-editor").addEventListener("scroll", this.rerenderQuill);

    this.el.components.shared.bindRichTextEditor(quill, this.name, "deltaOps");
    return quill;
  },

  unbindAndRemoveQuill() {
    const networkId = getNetworkId(this.el);
    if (!hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    quill.off("text-change", this.rerenderQuill);
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
  },

  handleMediaInteraction(type) {
    if (type === MEDIA_INTERACTION_TYPES.EDIT && this.quill) {
      this.quill.focus();

      const canvas = this.el.sceneEl.canvas;

      // Temporarily release pointer lock while editor is focused
      if (canvas.requestPointerLock) {
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock();

          canvas.addEventListener(
            "focus",
            () => {
              canvas.requestPointerLock();
            },
            { once: true }
          );
        }
      }
    }
  }
});

import Quill from "quill";
import {
  getQuill,
  hasQuill,
  destroyQuill,
  EDITOR_PADDING_X,
  EDITOR_PADDING_Y,
  EDITOR_WIDTH,
  EDITOR_HEIGHT
} from "../utils/quill-pool";
import { getNetworkId } from "../utils/ownership-utils";
import {
  hasMediaLayer,
  scaleToAspectRatio,
  addAndArrangeMedia,
  MEDIA_PRESENCE,
  MEDIA_INTERACTION_TYPES
} from "../../hubs/utils/media-utils";
import { disposeExistingMesh, disposeTexture } from "../../hubs/utils/three-utils";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToMaterial } from "../../jel/systems/terrain-system";
import { renderQuillToImg, computeQuillContectRect } from "../utils/quill-utils";
import { paths } from "../../hubs/systems/userinput/paths";
import { chicletGeometry } from "../objects/chiclet-geometry.js";

const SCROLL_SENSITIVITY = 500.0;
const FIT_CONTENT_EXTRA_SCALE = 1.5;

AFRAME.registerComponent("media-text", {
  schema: {
    src: { type: "string" },
    deltaOps: { default: null },
    fitContent: { default: false }
  },

  async init() {
    this.renderNextFrame = false;
    this.rerenderQuill = this.rerenderQuill.bind(this);
    this.localSnapCount = 0;
    this.isSnapping = false;
    this.firedTextLoadedEvent = false;

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
        const mat = new THREE.MeshStandardMaterial({
          stencilWrite: true,
          stencilFunc: THREE.AlwaysStencilFunc,
          stencilRef: 1,
          stencilZPass: THREE.ReplaceStencilOp
        });
        mat.color = new THREE.Color(0xffffff);
        mat.emissive = new THREE.Color(0.5, 0.5, 0.5);
        addVertexCurvingToMaterial(mat);
        const geo = (await chicletGeometry).clone();
        mat.side = THREE.DoubleSide;

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        this.mesh.renderOrder = RENDER_ORDER.MEDIA;
        this.mesh.material.map = this.texture;
        this.mesh.material.emissiveMap = this.texture;
        this.el.setObject3D("mesh", this.mesh);

        if (!this.data.fitContent) {
          scaleToAspectRatio(this.el, 9.0 / 16.0);
        }
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

          if (delta.ops.length > 1) {
            // Conversion will add trailing newline, which we don't want.
            const op = delta.ops[delta.ops.length - 1];

            if (op.insert === "\n") {
              delta.ops.pop();
            }
          }

          this.quill.updateContents(delta, Quill.sources.USER);
        }
      }
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

      if (!this.firedTextLoadedEvent) {
        this.firedTextLoadedEvent = true;
        this.el.emit("text-loaded", { src: this.data.src });
      }
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

    if (this.data.fitContent) {
      const [w, h] = computeQuillContectRect(this.quill);

      if (w <= EDITOR_PADDING_X) {
        // No text - show placeholder
        this.texture.repeat.x = 1.0;
        this.texture.repeat.y = 1.0;
        this.texture.offset.x = 0.0;
        this.texture.offset.y = 0.0;
        this.mesh.scale.y = 9.0 / 16.0;
      } else {
        const marginPctX = EDITOR_PADDING_X / EDITOR_WIDTH / 2.0;
        const marginPctY = EDITOR_PADDING_Y / EDITOR_HEIGHT / 2.0;

        this.texture.repeat.x = Math.min(1.0, w / (EDITOR_WIDTH - EDITOR_PADDING_X));
        this.texture.repeat.y = Math.min(1.0, h / (EDITOR_HEIGHT - EDITOR_PADDING_Y));
        this.texture.offset.x = marginPctX;
        this.texture.offset.y = Math.max(0.0, 1.0 - this.texture.repeat.y - marginPctY);
        this.mesh.scale.x = this.texture.repeat.x * 2.0 * FIT_CONTENT_EXTRA_SCALE;
        this.mesh.scale.y = this.texture.repeat.y * FIT_CONTENT_EXTRA_SCALE;
      }

      this.mesh.matrixNeedsUpdate = true;
      this.texture.needsUpdate = true;
    }
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

  getContents() {
    if (!this.quill) return "";
    return this.quill.container.querySelector(".ql-editor").innerHTML;
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
    if (!this.quill) return;
    if (type === MEDIA_INTERACTION_TYPES.EDIT) {
      window.APP.store.handleActivityFlag("mediaTextEdit");
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
    } else if (type === MEDIA_INTERACTION_TYPES.SNAPSHOT) {
      if (this.isSnapping) return;
      this.isSnapping = true;

      const canvas = document.createElement("canvas");
      canvas.height = 1080;
      canvas.width = Math.floor((EDITOR_WIDTH / EDITOR_HEIGHT) * canvas.height);
      const context = canvas.getContext("2d");
      const img = document.createElement("img");

      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.onload = null;
        img.src = "";
        canvas.toBlob(blob => {
          const file = new File([blob], "text.png", { type: "image/png" });
          this.localSnapCount++;
          const { entity } = addAndArrangeMedia(this.el, file, "photo-snapshot", this.localSnapCount);
          entity.addEventListener("image-loaded", () => (this.isSnapping = false), { once: true });
        });
      };

      renderQuillToImg(this.quill, img);
    }
  }
});

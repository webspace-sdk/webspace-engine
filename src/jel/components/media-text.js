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
import { disposeExistingMesh, disposeTexture, almostEqualVec3 } from "../../hubs/utils/three-utils";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToMaterial } from "../../jel/systems/terrain-system";
import { renderQuillToImg, computeQuillContectRect } from "../utils/quill-utils";
import { paths } from "../../hubs/systems/userinput/paths";
import { chicletGeometry } from "../objects/chiclet-geometry.js";

const SCROLL_SENSITIVITY = 500.0;
const FIT_CONTENT_EXTRA_SCALE = 1.5;

const COLOR_PRESETS = [
  [0xffffff, 0x000000],
  [0x000000, 0xffffff],
  [0x111749, 0x98aeeb],
  [0x4c63b6, 0xbed0f7],
  [0x656565, 0xf0f0f0],
  [0xfff8df, 0x666666],
  [0xccffe7, 0x477946],
  [0x477946, 0xb7ffdd],
  [0xffbbbb, 0xb65050],
  [0x732727, 0xeca3a3],
  [0x004770, 0xffcc9d],
  [0x530070, 0xc2d7ff],
  [0x3a1c00, 0xffa471]
].map(([bg, fg]) => [
  new THREE.Vector3(((bg >> 16) & 255) / 255, ((bg >> 8) & 255) / 255, (bg & 255) / 255),
  new THREE.Vector3(((fg >> 16) & 255) / 255, ((fg >> 8) & 255) / 255, (fg & 255) / 255)
]);

const getCycledColorPreset = ({ data: { foregroundColor, backgroundColor } }, direction) => {
  let idx = 0;

  for (let i = 0; i < COLOR_PRESETS.length; i++) {
    const [bg, fg] = COLOR_PRESETS[i];

    if (almostEqualVec3(foregroundColor, fg) && almostEqualVec3(backgroundColor, bg)) {
      idx = i;
      break;
    }
  }

  idx = (idx + direction) % COLOR_PRESETS.length;
  idx = idx === -1 ? COLOR_PRESETS.length - 1 : idx;
  return COLOR_PRESETS[idx];
};

const getNextColorPreset = component => getCycledColorPreset(component, 1);
const getPrevColorPreset = component => getCycledColorPreset(component, -1);

AFRAME.registerComponent("media-text", {
  schema: {
    src: { type: "string" },
    deltaOps: { default: null },
    fitContent: { default: false },
    foregroundColor: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    backgroundColor: { type: "vec3", default: { x: 1, y: 1, z: 1 } }
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
    const { src, foregroundColor, backgroundColor } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    const hasLayer = hasMediaLayer(this.el);

    if (!hasLayer || refresh) {
      const newMediaPresence = hasLayer ? mediaPresenceSystem.getMediaPresence(this) : MEDIA_PRESENCE.PRESENT;
      this.setMediaPresence(newMediaPresence, refresh);
    }

    if (mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.PRESENT) {
      if (
        !almostEqualVec3(oldData.foregroundColor, foregroundColor) ||
        !almostEqualVec3(oldData.backgroundColor, backgroundColor)
      ) {
        this.applyProperMaterialToMesh();
        this.rerenderQuill();
      }
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

        this.unlitMat = new THREE.MeshBasicMaterial({
          stencilWrite: true,
          stencilFunc: THREE.AlwaysStencilFunc,
          stencilRef: 1,
          stencilZPass: THREE.ReplaceStencilOp
        });
        this.unlitMat.side = THREE.DoubleSide;
        this.unlitMat.map = this.texture;
        addVertexCurvingToMaterial(this.unlitMat);

        // Stencil out text so we don't FXAA it.
        this.litMat = new THREE.MeshStandardMaterial({
          stencilWrite: true,
          stencilFunc: THREE.AlwaysStencilFunc,
          stencilRef: 1,
          stencilZPass: THREE.ReplaceStencilOp
        });
        this.litMat.color = new THREE.Color(0xffffff);

        this.litMat.emissive = new THREE.Color(0.25, 0.25, 0.25);
        this.litMat.map = this.texture;
        this.litMat.emissiveMap = this.texture;

        addVertexCurvingToMaterial(this.litMat);

        const geo = (await chicletGeometry).clone();

        this.mesh = new THREE.Mesh(geo, this.unlitMat);
        this.mesh.castShadow = true;
        this.mesh.renderOrder = RENDER_ORDER.MEDIA;
        this.applyProperMaterialToMesh();
        this.el.setObject3D("mesh", this.mesh);

        if (!this.data.fitContent) {
          scaleToAspectRatio(this.el, 9.0 / 16.0);
        }

        this.rerenderQuill();
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

            // This doesn't fix all trailing newlines, for example a one-line label will
            // have a newline when cloned
            if (op.insert === "\n" && !op.attributes) {
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

    this.rerenderQuill();
  },

  render() {
    const img = document.createElement("img");

    img.onload = () => {
      this.texture.image = img;
      this.texture.needsUpdate = this.mesh.material.needsUpdate = true;
    };

    renderQuillToImg(this.quill, img, this.data.foregroundColor, this.data.backgroundColor);

    if (this.data.fitContent) {
      const [w, h] = computeQuillContectRect(this.quill);

      if (w <= EDITOR_PADDING_X + 4.0) {
        // No text - show placeholder
        this.texture.repeat.x = 1.0;
        this.texture.repeat.y = 1.0;
        this.texture.offset.x = 0.0;
        this.texture.offset.y = 0.0;
        this.mesh.scale.x = 1.0;
        this.mesh.scale.y = 9.0 / 16.0;
      } else {
        const marginPctX = EDITOR_PADDING_X / EDITOR_WIDTH / 2.0;
        const marginPctY = EDITOR_PADDING_Y / EDITOR_HEIGHT / 4.0;

        this.texture.repeat.x = Math.min(1.0, w / (EDITOR_WIDTH - EDITOR_PADDING_X));
        this.texture.repeat.y = Math.min(1.0, h / (EDITOR_HEIGHT - EDITOR_PADDING_Y / 2.0));
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

  applyProperMaterialToMesh() {
    // Use unlit material for black on white or white on black to maximize
    // legibility.
    if (
      almostEqualVec3(this.data.backgroundColor, COLOR_PRESETS[0][0]) ||
      almostEqualVec3(this.data.backgroundColor, COLOR_PRESETS[1][0])
    ) {
      this.mesh.material = this.unlitMat;
    } else {
      this.mesh.material = this.litMat;
    }
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
    const nonUsedMaterial = this.mesh.material === this.unlitMat ? this.litMat : this.unlitMat;

    disposeExistingMesh(this.el);
    nonUsedMaterial.dispose();

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

      renderQuillToImg(this.quill, img, this.data.foregroundColor, this.data.backgroundColor);
    } else if (type === MEDIA_INTERACTION_TYPES.NEXT || type === MEDIA_INTERACTION_TYPES.BACK) {
      const [backgroundColor, foregroundColor] =
        type === MEDIA_INTERACTION_TYPES.NEXT ? getNextColorPreset(this) : getPrevColorPreset(this);
      this.el.setAttribute("media-text", { foregroundColor, backgroundColor });
    }
  }
});

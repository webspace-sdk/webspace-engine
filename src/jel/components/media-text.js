import {
  getQuill,
  hasQuill,
  htmlToDelta,
  destroyQuill,
  EDITOR_PADDING_X,
  EDITOR_PADDING_Y,
  EDITOR_WIDTH,
  EDITOR_HEIGHT
} from "../utils/quill-pool";
import { getNetworkId } from "../utils/ownership-utils";
import { temporarilyReleaseCanvasCursorLock } from "../utils/dom-utils";
import {
  hasMediaLayer,
  addAndArrangeRadialMedia,
  MEDIA_PRESENCE,
  MEDIA_INTERACTION_TYPES
} from "../../hubs/utils/media-utils";
import { disposeExistingMesh, disposeTexture, almostEqualVec3 } from "../../hubs/utils/three-utils";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToMaterial } from "../../jel/systems/terrain-system";
import { renderQuillToImg, computeQuillContectRect } from "../utils/quill-utils";
import { paths } from "../../hubs/systems/userinput/paths";
import { chicletGeometry } from "../objects/chiclet-geometry.js";
import { FONT_FACES, MAX_FONT_FACE } from "../utils/quill-utils";

const SCROLL_SENSITIVITY = 500.0;
const FIT_CONTENT_EXTRA_SCALE = 1.5;

export const MEDIA_TEXT_COLOR_PRESETS = [
  [0xffffff, 0x000000],
  [0x000000, 0xffffff],
  [0x656565, 0xf0f0f0],
  [0xfff8df, 0x666666],
  [0x111749, 0x98aeeb],
  [0x4c63b6, 0xbed0f7],
  [0xccffe7, 0x477946],
  [0x134412, 0xb7ffdd],
  [0xffbbbb, 0xb65050],
  [0x732727, 0xeca3a3],
  [0x004770, 0xffcc9d],
  [0x530070, 0xc2d7ff],
  [0x3a1c00, 0xffa471]
].map(([bg, fg]) => [
  new THREE.Vector3(((bg >> 16) & 255) / 255, ((bg >> 8) & 255) / 255, (bg & 255) / 255),
  new THREE.Vector3(((fg >> 16) & 255) / 255, ((fg >> 8) & 255) / 255, (fg & 255) / 255)
]);

export const MEDIA_TEXT_TRANSPARENT_COLOR_PRESETS = [
  [0x000000, 0x000000],
  [0x000000, 0xffffff],
  [0x000000, 0x9446ed],
  [0x000000, 0x3a66db],
  [0x000000, 0x2186eb],
  [0x000000, 0x40c3f7],
  [0x000000, 0x3ae7e1],
  [0x000000, 0x3ebd93],
  [0x000000, 0x8ded2d],
  [0x000000, 0xfadb5f],
  [0x000000, 0xf9703e],
  [0x000000, 0xef4e4e]
].map(([bg, fg]) => [
  new THREE.Vector3(((bg >> 16) & 255) / 255, ((bg >> 8) & 255) / 255, (bg & 255) / 255),
  new THREE.Vector3(((fg >> 16) & 255) / 255, ((fg >> 8) & 255) / 255, (fg & 255) / 255)
]);

const getCycledColorPreset = ({ data: { transparent, foregroundColor, backgroundColor } }, direction) => {
  let index = 0;
  const presets = transparent ? MEDIA_TEXT_TRANSPARENT_COLOR_PRESETS : MEDIA_TEXT_COLOR_PRESETS;

  for (let i = 0; i < presets.length; i++) {
    const [bg, fg] = presets[i];

    if (almostEqualVec3(foregroundColor, fg) && almostEqualVec3(backgroundColor, bg)) {
      index = i;
      break;
    }
  }

  index = (index + direction) % presets.length;
  index = index === -1 ? presets.length - 1 : index;
  return [...presets[index], index];
};

const getNextColorPreset = component => getCycledColorPreset(component, 1);
const getPrevColorPreset = component => getCycledColorPreset(component, -1);

AFRAME.registerComponent("media-text", {
  schema: {
    src: { type: "string" },
    deltaOps: { default: null },
    fitContent: { default: false },
    foregroundColor: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    backgroundColor: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    transparent: { default: false },
    font: { default: 0 }
  },

  init() {
    this.renderNextFrame = false;
    this.rerenderQuill = this.rerenderQuill.bind(this);
    this.localSnapCount = 0;
    this.isSnapping = false;
    this.firedTextLoadedEvent = false;
    this.zoom = 1.0;
    this.textureWidth = 1024;
    this.renderCount = 0;
    this.handleDetailLevelChanged = this.handleDetailLevelChanged.bind(this);

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.registerMediaComponent(this);
    }

    this.el.sceneEl.addEventListener("detail-level-changed", this.handleDetailLevelChanged);
  },

  async update(oldData) {
    const { src, foregroundColor, backgroundColor, font } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    const hasLayer = hasMediaLayer(this.el);

    const initialContents = this.el.components["media-loader"].consumeInitialContents();

    if (initialContents) {
      const delta = htmlToDelta(initialContents);

      if (delta.ops.length > 1) {
        // Conversion will add trailing newline, which we don't want.
        const op = delta.ops[delta.ops.length - 1];

        // This doesn't fix all trailing newlines, for example a one-line label will
        // have a newline when cloned
        if (op.insert === "\n" && !op.attributes) {
          delta.ops.pop();
        }
      }

      // const networked = this.el.components.networked;

      //shared.whenReadyForBinding().then(() => {
      //  shared.initializeRichTextContents(delta, this.name, "deltaOps");
      //});
    }

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

      if (oldData.font !== font) {
        this.applyFont();
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

      const { src, transparent } = this.data;
      if (!src) return;

      if (!this.mesh) {
        disposeExistingMesh(this.el);

        this.texture = new THREE.Texture();
        this.texture.encoding = THREE.sRGBEncoding;
        this.texture.minFilter = THREE.LinearFilter;

        // Stencil out unlit text so we don't FXAA it.
        this.unlitMat = new THREE.MeshBasicMaterial();

        if (!this.data.transparent) {
          this.unlitMat.stencilWrite = true;
          this.unlitMat.stencilFunc = THREE.AlwaysStencilFunc;
          this.unlitMat.stencilRef = 1;
          this.unlitMat.stencilZPass = THREE.ReplaceStencilOp;
        }

        this.unlitMat.map = this.texture;
        this.unlitMat.transparent = !!transparent;
        this.unlitMat.alphaTest = transparent ? 0.1 : null;

        addVertexCurvingToMaterial(this.unlitMat);

        this.litMat = new THREE.MeshStandardMaterial({});
        this.litMat.color = new THREE.Color(0xffffff);

        this.litMat.emissive = new THREE.Color(0.25, 0.25, 0.25);
        this.litMat.map = this.texture;
        this.litMat.emissiveMap = this.texture;
        this.litMat.transparent = !!transparent;
        this.litMat.alphaTest = transparent ? 0.1 : null;

        addVertexCurvingToMaterial(this.litMat);

        const geo = (await chicletGeometry).clone();

        this.mesh = new THREE.Mesh(geo, this.unlitMat);
        this.mesh.castShadow = !transparent;
        this.applyProperMaterialToMesh();
        this.el.setObject3D("mesh", this.mesh);
        this.rerenderQuill();
      }

      this.el.emit("text-loading");

      if (!this.quill || refresh) {
        this.unbindAndRemoveQuill();
        //const networked = this.el.components.networked;
        //await networked.whenReadyForBinding();
        this.quill = this.bindQuill();

        this.applyFont();
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

  handleDetailLevelChanged() {
    this.applyProperMaterialToMesh();
  },

  scrollBy(amount) {
    if (!amount || !this.quill) return;
    const scrollDistance = Math.floor(-amount * SCROLL_SENSITIVITY);
    this.quill.container.querySelector(".ql-editor").scrollBy(0, scrollDistance);

    this.rerenderQuill();
  },

  render() {
    const img = document.createElement("img");

    this.renderCount++;
    const expectedRenderCount = this.renderCount;

    let textureRepeatX = 1.0,
      textureRepeatY = 1.0,
      meshScaleX = 2.0,
      meshScaleY = (2.0 * 9.0) / 16.0;

    // Compute a dynamic zoom + textureWidth based upon the amount of content.
    const [w, h] = computeQuillContectRect(this.quill);
    const isEmpty = w <= EDITOR_PADDING_X + 4.0;

    const contentWidth = this.data.fitContent ? (isEmpty ? EDITOR_WIDTH / 2 : w) : EDITOR_WIDTH;
    const contentHeight = this.data.fitContent ? (isEmpty ? EDITOR_HEIGHT / 2 : h) : EDITOR_HEIGHT;

    if (isEmpty) {
      // No text, show placeholder
      this.zoom = 1.0;
      this.textureWidth = 1024;
    } else if (contentWidth < EDITOR_WIDTH / 4.1 && contentHeight < EDITOR_HEIGHT / 4.1) {
      this.zoom = 4.0;
      this.textureWidth = 768;
    } else if (contentWidth < EDITOR_WIDTH / 3.1 && contentHeight < EDITOR_HEIGHT / 3.1) {
      this.zoom = 3.0;
      this.textureWidth = 768;
    } else if (contentWidth < EDITOR_WIDTH / 2.1 && contentHeight < EDITOR_HEIGHT / 2.1) {
      this.zoom = 2.0;
      this.textureWidth = 1024;
    } else {
      this.zoom = 1.0;
      this.textureWidth = 1024;
    }

    // Compute texture repeat and scale based upon content
    textureRepeatX = Math.min(1.0, (contentWidth / (EDITOR_WIDTH - EDITOR_PADDING_X)) * this.zoom);
    textureRepeatY = Math.min(1.0, (contentHeight / (EDITOR_HEIGHT - EDITOR_PADDING_Y / 2.0)) * this.zoom);
    meshScaleX = textureRepeatX * 2.0 * FIT_CONTENT_EXTRA_SCALE * (1.0 / this.zoom);
    meshScaleY = textureRepeatY * FIT_CONTENT_EXTRA_SCALE * (1.0 / this.zoom);

    // Set scale early here since it is read by spawning animation routines.
    this.mesh.scale.x = meshScaleX;
    this.mesh.scale.y = meshScaleY;
    this.mesh.matrixNeedsUpdate = true;

    img.onload = () => {
      if (this.renderCount !== expectedRenderCount) return;

      // Update texture coordinates and apply scale after image to avoid
      // flicker and weird visual effects.
      this.texture.image = img;

      if (isEmpty) {
        // No text - show placeholder
        this.texture.repeat.x = 1.0;
        this.texture.repeat.y = 1.0;
        this.texture.offset.x = 0.0;
        this.texture.offset.y = 0.0;
      } else {
        const zoom = this.zoom;
        const marginPctX = (EDITOR_PADDING_X / EDITOR_WIDTH / 2.0) * zoom;
        const marginPctY = (EDITOR_PADDING_Y / EDITOR_HEIGHT / 3.0) * zoom;

        this.texture.repeat.x = textureRepeatX;
        this.texture.repeat.y = textureRepeatY;
        this.texture.offset.x = marginPctX - 0.01; // Not sure why this extra offset is needed :P
        this.texture.offset.y = Math.max(0.0, 1.0 - textureRepeatY - marginPctY);
      }

      this.texture.needsUpdate = this.mesh.material.needsUpdate = true;
      this.mesh.matrixNeedsUpdate = true;
    };

    renderQuillToImg(
      this.quill,
      img,
      this.data.foregroundColor,
      this.data.backgroundColor,
      this.zoom,
      this.textureWidth,
      this.data.transparent,
      this.data.font
    );
  },

  rerenderQuill() {
    this.renderNextFrame = true;
    // TODO priority queue in a system
  },

  applyProperMaterialToMesh() {
    if (!this.mesh) return;

    const transparent = this.data.transparent;
    const presets = transparent ? MEDIA_TEXT_TRANSPARENT_COLOR_PRESETS : MEDIA_TEXT_COLOR_PRESETS;

    // Use unlit material for black on white or white on black to maximize legibility or improve perf.
    if (
      this.data.transparent ||
      almostEqualVec3(this.data.backgroundColor, presets[0][0]) ||
      almostEqualVec3(this.data.backgroundColor, presets[1][0]) ||
      window.APP.detailLevel >= 2
    ) {
      this.mesh.material = this.unlitMat;
      this.mesh.renderOrder = this.data.transparent ? RENDER_ORDER.MEDIA : RENDER_ORDER.MEDIA_NO_FXAA;
    } else {
      this.mesh.material = this.litMat;
      this.mesh.renderOrder = RENDER_ORDER.MEDIA;
    }
  },

  bindQuill() {
    const networkId = getNetworkId(this.el);
    if (hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    quill.on("text-change", this.rerenderQuill);
    quill.container.querySelector(".ql-editor").addEventListener("scroll", this.rerenderQuill);

    // this.el.components.networked.bindRichTextEditor(quill, this.name, "deltaOps");
    return quill;
  },

  getQuill() {
    const networkId = getNetworkId(this.el);
    if (!hasQuill(networkId)) return null;
    return getQuill(networkId);
  },

  unbindAndRemoveQuill() {
    const networkId = getNetworkId(this.el);
    if (!hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    quill.off("text-change", this.rerenderQuill);
    quill.container.querySelector(".ql-editor").removeEventListener("scroll", this.rerenderQuill);
    // this.el.components.networked.unbindRichTextEditor(this.name, "deltaOps");
    destroyQuill(networkId);
    this.quill = null;
  },

  getContents() {
    if (!this.quill) return "";
    return this.quill.container.querySelector(".ql-editor").innerHTML;
  },

  remove() {
    this.unbindAndRemoveQuill();
    let nonUsedMaterial;

    if (this.mesh) {
      nonUsedMaterial = this.mesh.material === this.unlitMat ? this.litMat : this.unlitMat;
    }

    disposeExistingMesh(this.el);

    if (nonUsedMaterial) {
      nonUsedMaterial.dispose();
    }

    if (this.texture) {
      disposeTexture(this.texture);
    }

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }

    this.el.sceneEl.removeEventListener("detail-level-changed", this.handleDetailLevelChanged);
  },

  applyFont() {
    if (!this.quill) return;
    const { font } = this.data;
    const classList = this.quill.container.querySelector(".ql-editor").classList;

    classList.remove("font-sans-serif");
    classList.remove("font-serif");
    classList.remove("font-mono");
    classList.remove("font-comic");
    classList.remove("font-comic2");
    classList.remove("font-writing");

    if (font === FONT_FACES.SANS_SERIF) {
      classList.add("font-sans-serif");
    } else if (font === FONT_FACES.SERIF) {
      classList.add("font-serif");
    } else if (font === FONT_FACES.MONO) {
      classList.add("font-mono");
    } else if (font === FONT_FACES.COMIC) {
      classList.add("font-comic");
    } else if (font === FONT_FACES.COMIC2) {
      classList.add("font-comic2");
    } else if (font === FONT_FACES.WRITING) {
      classList.add("font-writing");
    }

    this.rerenderQuill();

    // Hack, quill needs to be re-rendered after a slight delay to deal with
    // cases where CSS relayout may not immediately occur (likely when concurrent
    // work is occuring.)
    //
    // Otherwise text will be clipped when changing fonts since the clientWidth/Height
    // of the inner elements is stale.
    setTimeout(() => this.rerenderQuill(), 500);
  },

  handleMediaInteraction(type) {
    if (!this.quill) return;

    if (type === MEDIA_INTERACTION_TYPES.EDIT) {
      window.APP.store.handleActivityFlag("mediaTextEdit");
      this.quill.focus();

      temporarilyReleaseCanvasCursorLock();
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
          const { entity } = addAndArrangeRadialMedia(this.el, file, "photo-snapshot", this.localSnapCount);
          entity.addEventListener("image-loaded", () => (this.isSnapping = false), { once: true });
        });
      };

      renderQuillToImg(
        this.quill,
        img,
        this.data.foregroundColor,
        this.data.backgroundColor,
        this.zoom,
        this.textureWidth,
        this.data.transparent,
        this.data.font
      );
    } else if (type === MEDIA_INTERACTION_TYPES.NEXT || type === MEDIA_INTERACTION_TYPES.BACK) {
      const [backgroundColor, foregroundColor, index] =
        type === MEDIA_INTERACTION_TYPES.NEXT ? getNextColorPreset(this) : getPrevColorPreset(this);

      window.APP.store.update({ uiState: { mediaTextColorPresetIndex: index } });

      this.el.setAttribute("media-text", { foregroundColor, backgroundColor });
    } else if (type === MEDIA_INTERACTION_TYPES.UP || type === MEDIA_INTERACTION_TYPES.DOWN) {
      let font = (this.data.font + (type === MEDIA_INTERACTION_TYPES.UP ? 1 : -1)) % (MAX_FONT_FACE + 1);
      font = font < 0 ? MAX_FONT_FACE : font;

      this.el.setAttribute("media-text", { font });
    }
  }
});

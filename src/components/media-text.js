import { EDITOR_PADDING_X, EDITOR_PADDING_Y, EDITOR_WIDTH, EDITOR_HEIGHT } from "../utils/quill-pool";
import { temporarilyReleaseCanvasCursorLock } from "../utils/dom-utils";
import { addAndArrangeRadialMedia, MEDIA_PRESENCE, MEDIA_INTERACTION_TYPES } from "../utils/media-utils";
import { gatePermission } from "../utils/permissions-utils";
import { disposeExistingMesh, disposeTexture } from "../utils/three-utils";
import { RENDER_ORDER } from "../constants";
import { addVertexCurvingToMaterial } from "../systems/terrain-system";
import { renderQuillToImg, computeQuillContentRect, MAX_FONT_FACE } from "../utils/quill-utils";
import { paths } from "../systems/userinput/paths";
import { chicletGeometry } from "../objects/chiclet-geometry.js";
import Color from "color";

const FIT_CONTENT_EXTRA_SCALE = 1.5;

export const MEDIA_TEXT_COLOR_PRESETS = [
  ["white", "black"],
  ["black", "white"],
  ["#656565", "#f0f0f0"],
  ["#fff8df", "#666666"],
  ["#111749", "#98aeeb"],
  ["#4c63b6", "#bed0f7"],
  ["#ccffe7", "#477946"],
  ["#134412", "#b7ffdd"],
  ["#ffbbbb", "#b65050"],
  ["#732727", "#eca3a3"],
  ["#004770", "#ffcc9d"],
  ["#530070", "#c2d7ff"],
  ["#3a1c00", "#ffa471"]
];

export const MEDIA_TEXT_TRANSPARENT_COLOR_PRESETS = [
  ["white", "black"],
  ["black", "white"],
  ["transparent", "black"],
  ["transparent", "white"],
  ["transparent", "#9446ed"],
  ["transparent", "#3a66db"],
  ["transparent", "#2186eb"],
  ["transparent", "#40c3f7"],
  ["transparent", "#3ae7e1"],
  ["transparent", "#3ebd93"],
  ["transparent", "#8ded2d"],
  ["transparent", "#fadb5f"],
  ["transparent", "#f9703e"],
  ["transparent", "#ef4e4e"],
  ["black", "#9446ed"],
  ["black", "#3a66db"],
  ["black", "#2186eb"],
  ["black", "#40c3f7"],
  ["black", "#3ae7e1"],
  ["black", "#3ebd93"],
  ["black", "#8ded2d"],
  ["black", "#fadb5f"],
  ["black", "#f9703e"],
  ["black", "#ef4e4e"],
  ["white", "#9446ed"],
  ["white", "#3a66db"],
  ["white", "#2186eb"],
  ["white", "#40c3f7"],
  ["white", "#3ae7e1"],
  ["white", "#3ebd93"],
  ["white", "#8ded2d"],
  ["white", "#fadb5f"],
  ["white", "#f9703e"],
  ["white", "#ef4e4e"]
];

const getCycledColorPreset = ({ data: { transparent, foregroundColor, backgroundColor } }, direction) => {
  let index = 0;
  const presets = transparent ? MEDIA_TEXT_TRANSPARENT_COLOR_PRESETS : MEDIA_TEXT_COLOR_PRESETS;

  for (let i = 0; i < presets.length; i++) {
    const [bg, fg] = presets[i];

    if (foregroundColor === fg && backgroundColor === bg) {
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
    foregroundColor: { default: null },
    backgroundColor: { default: null },
    transparent: { default: false },
    font: { default: 0 }
  },

  init() {
    this.localSnapCount = 0;
    this.isSnapping = false;
    this.firedTextLoadedEvent = false;
    this.zoom = 1.0;
    this.textureWidth = 1024; // This used to be able to be dynamic, but no longer works without artifacts.
    this.renderCount = 0;
    this.markDirty = this.markDirty.bind(this);
    this.handleDetailLevelChanged = this.handleDetailLevelChanged.bind(this);

    SYSTEMS.mediaPresenceSystem.registerMediaComponent(this);
    SYSTEMS.mediaTextSystem.registerMediaTextComponent(this);
    this.el.sceneEl.addEventListener("detail-level-changed", this.handleDetailLevelChanged);
  },

  async update(oldData) {
    const { src, foregroundColor, backgroundColor, font } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    if (refresh) {
      this.setMediaPresence(SYSTEMS.mediaPresenceSystem.getMediaPresence(this), refresh);
    }

    if (SYSTEMS.mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.PRESENT) {
      if (foregroundColor !== oldData.foregroundColor || backgroundColor !== oldData.backgroundColor) {
        this.applyProperMaterialToMesh();
        this.markDirty();
      }

      if (oldData.font !== font) {
        SYSTEMS.mediaTextSystem.applyFont(this, font);
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

    SYSTEMS.mediaTextSystem.unbindQuill(this);

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
        this.markDirty();
      }

      this.el.emit("text-loading");

      const mediaLoader = this.el.components["media-loader"];
      const networked = this.el.components.networked;

      const initialContents = mediaLoader.consumeInitialContents() || null;

      // If this was created by us and starts out with contents,
      // we need to begin syncing so others will received the initial contents.
      const beginSyncing =
        initialContents && networked.data.creator === NAF.clientId && networked.data.owner === NAF.clientId;

      SYSTEMS.mediaTextSystem.initializeTextEditor(this, refresh, initialContents, beginSyncing);
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
      SYSTEMS.mediaTextSystem.scrollBy(this, volumeModRight);
    }
    const volumeModLeft = userinput.get(paths.actions.cursor.left.mediaScroll);
    if (interaction.state.leftRemote.hovered === this.el && volumeModLeft) {
      SYSTEMS.mediaTextSystem.scrollBy(this, volumeModLeft);
    }
  },

  handleDetailLevelChanged() {
    this.applyProperMaterialToMesh();
  },

  render() {
    const quill = SYSTEMS.mediaTextSystem.getQuill(this);
    if (!quill) return;

    const img = document.createElement("img");

    this.renderCount++;
    const expectedRenderCount = this.renderCount;

    let textureRepeatX = 1.0,
      textureRepeatY = 1.0,
      meshScaleX = 2.0,
      meshScaleY = (2.0 * 9.0) / 16.0;

    // Compute a dynamic zoom + textureWidth based upon the amount of content.
    const [w, h] = computeQuillContentRect(quill);
    const isEmpty = w <= EDITOR_PADDING_X + 4.0;

    const contentWidth = this.data.fitContent && !isEmpty ? w : EDITOR_WIDTH;
    const contentHeight = this.data.fitContent && !isEmpty ? h : EDITOR_HEIGHT;

    if (isEmpty) {
      // No text, show placeholder
      this.zoom = 1.0;
    } else if (contentWidth < EDITOR_WIDTH / 4.1 && contentHeight < EDITOR_HEIGHT / 4.1) {
      this.zoom = 4.0;
    } else if (contentWidth < EDITOR_WIDTH / 3.1 && contentHeight < EDITOR_HEIGHT / 3.1) {
      this.zoom = 3.0;
    } else if (contentWidth < EDITOR_WIDTH / 2.1 && contentHeight < EDITOR_HEIGHT / 2.1) {
      this.zoom = 2.0;
    } else {
      this.zoom = 1.0;
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
      quill,
      img,
      this.data.foregroundColor,
      this.data.backgroundColor,
      this.zoom,
      this.textureWidth,
      this.data.transparent,
      this.data.font
    ).then(() => {
      if (!this.firedTextLoadedEvent) {
        this.firedTextLoadedEvent = true;
        this.el.emit("text-loaded", { src: this.data.src });
      }
    });
  },

  markDirty() {
    SYSTEMS.mediaTextSystem.markDirty(this);
  },

  applyProperMaterialToMesh() {
    if (!this.mesh) return;

    let isHighContrastBackground = this.data.backgroundColor === null;

    if (!isHighContrastBackground) {
      try {
        const color = Color(this.data.backgroundColor).rgb();
        isHighContrastBackground =
          (color.red() === 0 && color.green() === 0 && color.blue() === 0) ||
          (color.red() === 255 || color.green() === 255 || color.blue() === 255);
      } catch(e) { } // eslint-disable-line
    }

    // Use unlit material for black on white or white on black to maximize legibility or improve perf.
    if (this.data.transparent || isHighContrastBackground || window.APP.detailLevel >= 2) {
      this.mesh.material = this.unlitMat;
      this.mesh.renderOrder = this.data.transparent ? RENDER_ORDER.MEDIA : RENDER_ORDER.MEDIA_NO_FXAA;
    } else {
      this.mesh.material = this.litMat;
      this.mesh.renderOrder = RENDER_ORDER.MEDIA;
    }
  },

  getContents() {
    const quill = SYSTEMS.mediaTextSystem.getQuill(this);
    if (!quill) return;
    return quill.container.querySelector(".ql-editor").innerHTML;
  },

  remove() {
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

    SYSTEMS.mediaPresenceSystem.unregisterMediaComponent(this);
    SYSTEMS.mediaTextSystem.unregisterMediaTextComponent(this);

    this.el.sceneEl.removeEventListener("detail-level-changed", this.handleDetailLevelChanged);
  },

  handleMediaInteraction(type) {
    const quill = SYSTEMS.mediaTextSystem.getQuill(this);
    if (!quill) return;

    if (!gatePermission("spawn_and_move_media")) return;

    if (type === MEDIA_INTERACTION_TYPES.EDIT) {
      window.APP.store.handleActivityFlag("mediaTextEdit");
      quill.focus();

      // Start off labels and banners as H1s.
      if (this.el.components["media-loader"].data.contentSubtype !== "page") {
        if (quill.getLength() === 1) {
          quill.format("header", "1", "api");
        }
      }

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
        quill,
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

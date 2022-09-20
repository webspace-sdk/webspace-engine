import { quillHtmlToWebspaceHtml } from "../utils/dom-utils";
import { isLockedMedia } from "../../hubs/utils/media-utils";
import { FONT_FACES } from "../utils/quill-utils";
import { normalizeCoord } from "../systems/wrapped-entity-system";
import { getCorsProxyUrl } from "../../hubs/utils/media-url-utils";
import { almostEqualVec3, almostEqualQuaternion } from "../../hubs/utils/three-utils";
import { parseTransformIntoThree } from "../utils/world-importer";
import { STACK_AXIS_CSS_NAMES } from "../../hubs/systems/transform-selected-object";

import Color from "color";

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

const tmpPos2 = new THREE.Vector3();
const tmpQuat2 = new THREE.Quaternion();
const tmpScale2 = new THREE.Vector3();

const ZERO_POS = new THREE.Vector3(0, 0, 0);
const ZERO_ROT = new THREE.Quaternion(0, 0, 0, 1);
const ONE_SCALE = new THREE.Vector3(1, 1, 1);

AFRAME.registerComponent("dom-serialized-entity", {
  init() {
    this.el.sceneEl.systems["hubs-systems"].domSerializeSystem.register(this.el);
  },

  remove() {
    this.el.sceneEl.systems["hubs-systems"].domSerializeSystem.unregister(this.el);
  }
});

const FLUSH_DELAY = 100;

const tagTypeForEl = el => {
  const { src } = el.components["media-loader"].data;

  if (el.components["media-image"]) {
    const imageSrc = el.components["media-image"].data.src;

    if (
      !imageSrc.startsWith("data:") &&
      !imageSrc.startsWith("blob:") &&
      imageSrc !== src &&
      imageSrc.replace(`${getCorsProxyUrl()}/`, "") !== src
    ) {
      return "a";
    } else {
      return "img";
    }
  }

  if (el.components["media-pdf"]) {
    return "embed";
  }

  if (el.components["media-vox"] || el.components["gltf-model-plus"]) {
    return "model";
  }

  if (el.components["media-emoji"]) {
    return "div";
  }

  if (el.components["media-text"]) {
    switch (el.components["media-loader"].data.contentSubtype) {
      case "label":
        return "label";
      case "banner":
        return "marquee";
      default:
        return "div";
    }
  }

  if (el.components["media-video"]) {
    return "video";
  }

  return "unknown";
};

const setAttributeIfChanged = (el, attribute, value) => {
  if (el.getAttribute(attribute) !== value) {
    el.setAttribute(attribute, value);
  }
};

const removeAttributeIfPresent = (el, attribute) => {
  if (el.getAttribute(attribute) !== null) {
    el.removeAttribute(attribute);
  }
};

const tmpRotConvert = new THREE.Vector4();
export const posRotScaleToCssTransform = (pos, rot, scale) => {
  let transform = "";
  if (pos && !almostEqualVec3(pos, ZERO_POS, 0.0001)) {
    transform += `translate3d(${(pos.x * 100).toFixed(0)}cm, ${(pos.y * 100).toFixed(0)}cm, ${(pos.z * 100).toFixed(
      0
    )}cm) `;
  }

  if (rot && !almostEqualQuaternion(rot, ZERO_ROT, 0.0001)) {
    tmpRotConvert.setAxisAngleFromQuaternion(rot);
    transform += `rotate3d(${tmpRotConvert.x.toFixed(3)}, ${tmpRotConvert.y.toFixed(3)}, ${tmpRotConvert.z.toFixed(
      3
    )}, ${tmpRotConvert.w.toFixed(3)}rad) `;
  }

  if (scale && !almostEqualVec3(scale, ONE_SCALE, 0.001)) {
    transform += ` scale3D(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`;
  }

  return transform.trim();
};

const updateDomElForEl = (domEl, el) => {
  const { terrainSystem } = AFRAME.scenes[0].systems["hubs-systems"];
  const { stackAxis } = el.components["media-loader"].data;
  let { src } = el.components["media-loader"].data;

  let style = "";
  let srcTargetAttribute = "src";

  if (el.components["media-image"]) {
    const imageSrc = el.components["media-image"].data.src;

    // If image and content are different URLs, this is a link.
    if (
      !imageSrc.startsWith("data:") &&
      !imageSrc.startsWith("blob:") &&
      imageSrc !== src &&
      imageSrc.replace(`${getCorsProxyUrl()}/`, "") !== src
    ) {
      srcTargetAttribute = "href";
      removeAttributeIfPresent(domEl, "crossorigin");
    } else {
      setAttributeIfChanged(domEl, "crossorigin", "anonymous");
    }

    // This avoids loading the image as part of having the tag inline.
    setAttributeIfChanged(domEl, "loading", "lazy");
  }

  if (el.components["media-pdf"]) {
    const { index } = el.components["media-pdf"].data;

    setAttributeIfChanged(domEl, "type", "application/pdf");
    setAttributeIfChanged(domEl, "data-index", index);
  }

  if (el.components["media-vox"]) {
    setAttributeIfChanged(domEl, "type", "model/vnd.jel-vox");

    // Look up export vox id
    /*const voxId = voxIdForVoxUrl(src);
       let exportableVoxId = await accountChannel.getExportableVox(voxId);

       if (!exportableVoxId) {
         // No exportable vox, publish one.
         const tmpVec = new THREE.Vector3();
         el.object3D.getWorldScale(tmpVec);
         exportableVoxId = await accountChannel.publishVox(voxId, "", "", 0, false, false, tmpVec.x, null, null);
         await voxSystem.copyVoxContent(voxId, exportableVoxId);
       }

       src = src.replaceAll(voxId, exportableVoxId);*/
  }

  if (el.components["gltf-model-plus"]) {
    setAttributeIfChanged(domEl, "type", "model/gltf-binary");
  }

  if (el.components["media-text"]) {
    const mediaText = el.components["media-text"];
    const { fitContent, foregroundColor, backgroundColor, transparent, font } = mediaText.data;

    let fontFamily;

    if (foregroundColor) {
      try {
        Color(foregroundColor);
        style += `color: ${foregroundColor}; `;
      } catch (e) {} // eslint-disable-line no-empty
    }

    if (fitContent) {
      style += `width: min-content; height: min-content; `;
    } else {
      style += `width: ${(mediaText.mesh.scale.x * 100.0).toFixed(4)}cm; height: ${(
        mediaText.mesh.scale.y * 100.0
      ).toFixed(4)}cm; overflow-y: scroll; `;
    }

    if (transparent) {
      style += `background-color: transparent; text-stroke: 4px`;
      if (backgroundColor) {
        try {
          Color(backgroundColor);
          style += ` ${backgroundColor} `;
        } catch (e) {} // eslint-disable-line no-empty
      }

      style += `; `;
    } else {
      if (backgroundColor) {
        try {
          Color(backgroundColor);
          style += `background-color: ${backgroundColor}; `;
        } catch (e) { } // eslint-disable-line
      }
    }

    switch (font) {
      case FONT_FACES.SANS_SERIF:
        fontFamily = "sans-serif";
        break;
      case FONT_FACES.SERIF:
        fontFamily = "serif";
        break;
      case FONT_FACES.MONO:
        fontFamily = "monospaced";
        break;
      case FONT_FACES.COMIC:
        fontFamily = "fantasy";
        break;
      case FONT_FACES.COMIC2:
        fontFamily = "ui-rounded";
        break;
      case FONT_FACES.WRITING:
        fontFamily = "cursive";
        break;
    }

    if (fontFamily) {
      style += `font-family: ${fontFamily}; `;
    }

    const quill = SYSTEMS.mediaTextSystem.getQuill(mediaText);

    if (quill) {
      const html = quill.container.querySelector(".ql-editor").innerHTML;
      domEl.innerHTML = quillHtmlToWebspaceHtml(html);

      // Clean contents cache used for outlining
      domEl.querySelectorAll("[data-contents]").forEach(el => el.removeAttribute("data-contents"));
    }

    setAttributeIfChanged(domEl, "contenteditable", "");

    src = null;
  }

  if (el.components["media-emoji"]) {
    const { emoji } = el.components["media-emoji"].data;

    src = null;
    style += `font-family: emoji; `;
    domEl.innerHTML = emoji;
  }

  if (el.components["media-video"]) {
    const { volume, loop, time, videoPaused } = el.components["media-video"].data;

    setAttributeIfChanged(domEl, "crossorigin", "anonymous");
    setAttributeIfChanged(domEl, "controls", "");
    setAttributeIfChanged(domEl, "preload", "none"); // Prevents browser fetching

    if (videoPaused) {
      setAttributeIfChanged(domEl, "currenttime", time);
      removeAttributeIfPresent(domEl, "autoplay");
    } else {
      setAttributeIfChanged(domEl, "autoplay", "");
      removeAttributeIfPresent(domEl, "currenttime");
    }

    if (loop) {
      setAttributeIfChanged(domEl, "loop", "");
    } else {
      removeAttributeIfPresent(domEl, "loop", "");
    }

    if (volume <= 0) {
      setAttributeIfChanged(domEl, "muted", "");
    } else {
      removeAttributeIfPresent(domEl, "muted", "");
    }
  }

  if (domEl) {
    const { object3D, id } = el;

    if (src) {
      setAttributeIfChanged(domEl, srcTargetAttribute, src);
    } else {
      removeAttributeIfPresent(domEl, srcTargetAttribute);
    }

    if (stackAxis && STACK_AXIS_CSS_NAMES[stackAxis]) {
      setAttributeIfChanged(domEl, "data-stack-axis", STACK_AXIS_CSS_NAMES[stackAxis]);
    } else {
      removeAttributeIfPresent(domEl, "data-stack-axis");
    }

    if (!isLockedMedia(el)) {
      setAttributeIfChanged(domEl, "draggable", "");
    } else {
      removeAttributeIfPresent(domEl, "draggable");
    }

    const newId = id.replaceAll("naf-", "");

    if (domEl.id !== newId) {
      domEl.id = newId;
    }

    object3D.updateMatrices();
    object3D.matrix.decompose(tmpPos, tmpQuat, tmpScale);

    // Normalize Y to be terrain-agnostic
    const height = terrainSystem.getTerrainHeightAtWorldCoord(tmpPos.x, tmpPos.z);
    tmpPos.x = normalizeCoord(tmpPos.x);
    tmpPos.y = normalizeCoord(tmpPos.y - height);
    tmpPos.z = normalizeCoord(tmpPos.z);

    const transform = posRotScaleToCssTransform(tmpPos, tmpQuat, tmpScale);

    if (transform) {
      const existingTransform = domEl.style.transform;

      if (existingTransform) {
        // Check for epsilon difference to avoid DOM churn
        parseTransformIntoThree(existingTransform, tmpPos2, tmpQuat2, tmpScale2);

        if (
          !almostEqualVec3(tmpPos, tmpPos2) ||
          !almostEqualQuaternion(tmpQuat, tmpQuat2, 0.001) ||
          !almostEqualVec3(tmpScale, tmpScale2)
        ) {
          style += `transform: ${transform}; `;
        } else {
          style += `transform: ${existingTransform}; `;
        }
      } else {
        style += `transform: ${transform}; `;
      }
    }

    setAttributeIfChanged(domEl, "style", style);
  }
};

export class DomSerializeSystem {
  constructor(scene) {
    this.scene = scene;
    this.els = [];
    this.pending = [];
    this.onComponentChangedOrTransformed = this.onComponentChangedOrTransformed.bind(this);
    this.onQuillTextChanges = new Map();
    this.onMediaLoaded = this.onMediaLoaded.bind(this);
    this.nextFlushAt = null;
  }

  register(el) {
    this.els.push(el);
    el.addEventListener("media-loaded", this.onMediaLoaded, { once: true });
  }

  unregister(el) {
    this.removeFromDOM(el);

    el.removeEventListener("componentchanged", this.onComponentChangedOrTransformed);
    el.removeEventListener("scale-object-ended", this.onComponentChangedOrTransformed);
    el.removeEventListener("transform-object-stopped", this.onComponentChangedOrTransformed);
    el.removeEventListener("media-loaded", this.onMediaLoaded);

    if (el.components["media-text"]) {
      const quill = SYSTEMS.mediaTextSystem.getQuill(el.components["media-text"]);
      quill.off("text-change", this.onQuillTextChanges.get(quill));
      this.onQuillTextChanges.delete(quill);
    }

    // Ensure not in pending
    this.flush();

    const i = this.els.indexOf(el);

    if (i >= 0) {
      this.els.splice(i, 1);
    }
  }

  onMediaLoaded({ target }) {
    if (!this.els.includes(target)) return;
    this.pending.push(target);
    target.addEventListener("componentchanged", this.onComponentChangedOrTransformed);
    target.addEventListener("scale-object-ended", this.onComponentChangedOrTransformed);
    target.addEventListener("transform-object-ended", this.onComponentChangedOrTransformed);

    if (target.components["media-text"]) {
      const quill = SYSTEMS.mediaTextSystem.getQuill(target.components["media-text"]);
      const handler = () => this.enqueueFlushOf(target);
      this.onQuillTextChanges.set(quill, handler);
      quill.on("text-change", handler);
    }
  }

  onComponentChangedOrTransformed({ target }) {
    this.enqueueFlushOf(target);
  }

  enqueueFlushOf(el) {
    if (!this.els.includes(el)) return;
    if (this.pending.includes(el)) return;

    this.pending.push(el);

    if (this.nextFlushAt === null) {
      this.nextFlushAt = Date.now() + FLUSH_DELAY;
    }
  }

  tick() {
    if (Date.now() > this.nextFlushAt) {
      this.nextFlushAt = null;
      this.flush();
    }
  }

  flush() {
    while (this.pending.length > 0) {
      this.flushEl(this.pending.pop());
    }
  }

  flushEl(el) {
    const elId = el.id.replace("naf-", "");
    let domEl = document.getElementById(elId);
    let shouldAppend = false;

    if (!domEl) {
      domEl = document.createElement(tagTypeForEl(el));
      domEl.id = elId;
      shouldAppend = true;
    }

    updateDomElForEl(domEl, el);

    if (shouldAppend) {
      document.body.appendChild(domEl);
    }
  }

  removeFromDOM(el) {
    for (const domEl of document.body.children) {
      if (el.id.endsWith(domEl.id)) {
        domEl.remove();
        break;
      }
    }
  }
}

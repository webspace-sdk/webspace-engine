import { vecRgbToCssRgb } from "../utils/dom-utils";
import { isLockedMedia } from "../../hubs/utils/media-utils";
import { FONT_FACES } from "../utils/quill-utils";
import { normalizeCoord } from "../systems/wrapped-entity-system";

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpVec4 = new THREE.Vector4();

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
    return imageSrc !== src ? "a" : "img";
  }

  if (el.components["media-pdf"]) {
    return "embed";
  }

  if (el.components["media-vox"] || el.components["gltf-model-plus"]) {
    return "model";
  }

  if (el.components["media-text"] || el.components["media-emoji"]) {
    return "div";
  }

  if (el.components["media-video"]) {
    return "video";
  }

  return "unknown";
};

const updateDomElForEl = (domEl, el) => {
  const { terrainSystem } = AFRAME.scenes[0].systems["hubs-systems"];
  let { src } = el.components["media-loader"].data;

  let style = "";
  let srcTargetAttribute = "src";

  if (el.components["media-image"]) {
    const imageSrc = el.components["media-image"].data.src;

    // If image and content are different URLs, this is a link.
    if (imageSrc !== src) {
      srcTargetAttribute = "href";
    } else {
      domEl.setAttribute("crossorigin", "anonymous");
    }
  }

  if (el.components["media-pdf"]) {
    const { index } = el.components["media-pdf"].data;

    domEl.setAttribute("type", "application/pdf");
    domEl.setAttribute("data-index", index);
  }

  if (el.components["media-vox"]) {
    domEl.setAttribute("type", "model/vnd.jel-vox");

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
    domEl.setAttribute("type", "model/gltf-binary");
  }

  if (el.components["media-text"]) {
    const mediaText = el.components["media-text"];
    const { fitContent, foregroundColor, backgroundColor, transparent, font } = mediaText.data;

    let fontFamily;

    style += `color: ${vecRgbToCssRgb(foregroundColor)}; `;

    if (fitContent) {
      style += `width: min-content; height: min-content; `;
    } else {
      style += `width: ${(mediaText.mesh.scale.x * 100.0).toFixed(4)}cm; height: ${(
        mediaText.mesh.scale.y * 100.0
      ).toFixed(4)}cm; overflow-y: scroll; `;
    }

    if (transparent) {
      style += `background-color: transparent; text-stoke: 4px ${vecRgbToCssRgb(backgroundColor)}; `;
    } else {
      style += `background-color: ${vecRgbToCssRgb(backgroundColor)}; `;
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

    style += `font-family: ${fontFamily}; `;

    if (mediaText.quill) {
      const html = mediaText.quill.container.querySelector(".ql-editor").innerHTML;
      domEl.innerHTML = html;

      // Clean contents cache used for outlining
      domEl.querySelectorAll("[data-contents]").forEach(el => el.removeAttribute("data-contents"));
    }

    domEl.setAttribute("contenteditable", "");

    src = null;
  }

  if (el.components["media-emoji"]) {
    const { emoji } = el.components["media-emoji"].data;

    src = null;
    style += `font-family: emoji; `;
    domEl.innerHTML = emoji;
  }

  if (el.components["media-video"]) {
    const { audioSrc, volume, loop, time, videoPaused } = el.components["media-video"].data;

    domEl.setAttribute("crossorigin", "anonymous");
    domEl.setAttribute("controls", "");

    if (videoPaused) {
      domEl.setAttribute("currenttime", time);
    } else {
      domEl.setAttribute("autoplay", "");
    }

    if (loop) {
      domEl.setAttribute("loop", "");
    }

    if (volume <= 0) {
      domEl.setAttribute("muted", "");
    }

    if (audioSrc && audioSrc !== src) {
      domEl.setAttribute("data-audio-src", audioSrc);
    }
  }

  if (domEl) {
    const { object3D, id } = el;

    if (src) {
      domEl.setAttribute(srcTargetAttribute, src);
    }

    if (!isLockedMedia(el)) {
      domEl.setAttribute("draggable", "");
    } else {
      domEl.removeAttribute("draggable");
    }

    domEl.id = id.replaceAll("naf-", "");
    object3D.updateMatrices();
    object3D.matrix.decompose(tmpPos, tmpQuat, tmpScale);

    // Normalize Y to be terrain-agnostic
    const height = terrainSystem.getTerrainHeightAtWorldCoord(tmpPos.x, tmpPos.z);
    const x = normalizeCoord(tmpPos.x);
    const y = normalizeCoord(tmpPos.y - height);
    const z = normalizeCoord(tmpPos.z);

    // Axis angle
    tmpVec4.setAxisAngleFromQuaternion(tmpQuat);

    style += `transform: translate3d(${(x * 100).toFixed(0)}cm, ${(y * 100).toFixed(0)}cm, ${(z * 100).toFixed(
      0
    )}cm) rotate3d(${tmpVec4.x.toFixed(4)}, ${tmpVec4.y.toFixed(4)}, ${tmpVec4.z.toFixed(4)}, ${tmpVec4.w.toFixed(
      4
    )}rad) scale3D(${tmpScale.x.toFixed(4)}, ${tmpScale.y.toFixed(4)}, ${tmpScale.z.toFixed(4)});`;

    domEl.setAttribute("style", style);
  }
};

export class DomSerializeSystem {
  constructor(scene) {
    this.scene = scene;
    this.els = [];
    this.pending = [];
    this.onComponentChanged = this.onComponentChanged.bind(this);
    this.onQuillTextChanges = new Map();
    this.onMediaLoaded = this.onMediaLoaded.bind(this);
    this.nextFlushAt = null;
  }

  register(el) {
    this.els.push(el);
    el.addEventListener("media-loaded", this.onMediaLoaded, { once: true });
  }

  unregister(el) {
    el.removeEventListener("componentchanged", this.onComponentChanged);
    el.removeEventListener("media-loaded", this.onMediaLoaded);

    if (el.components["media-text"]) {
      const quill = el.components["media-text"].getQuill();
      quill.off("text-change", this.onQuillTextChanges.get(quill));
      this.onQuillTextChanges.delete(quill);
    }

    // Ensure not in pending
    this.flush();

    const i = this.els.indexOf(el);

    if (i >= 0) {
      this.els.splice(i, 1);
    }

    this.removeMissingElementsFromDOM();
  }

  onMediaLoaded({ target }) {
    if (!this.els.includes(target)) return;
    this.pending.push(target);
    target.addEventListener("componentchanged", this.onComponentChanged);

    if (target.components["media-text"]) {
      const quill = target.components["media-text"].getQuill();
      const handler = () => this.enqueueFlushOf(target);
      this.onQuillTextChanges.set(quill, handler);
      quill.on("text-change", handler);
    }
  }

  onComponentChanged({ target }) {
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

    this.removeMissingElementsFromDOM();
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

  removeMissingElementsFromDOM() {
    loop: for (const domEl of document.body.children) {
      for (const el of this.els) {
        if (el.id.endsWith(domEl.id)) {
          continue loop;
        }
      }

      domEl.remove();
    }
  }
}

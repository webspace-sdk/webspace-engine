// Live DOM: lets ordinary page scripts drive the world through the document, the way scripts drive a web page.
//
//   const lamp = document.getElementById("lamp");
//   lamp.style.transform = "translate3d(0cm, 200cm, 0cm) rotateY(1.2rad)";   // moves the object
//   lamp.hidden = true;                                                      // hides it
//   lamp.addEventListener("click", () => ...);                               // in-world clicks
//   sign.innerHTML = "<h1>Score: 5</h1>";                                    // changes a text object
//   document.body.insertAdjacentHTML("beforeend", '<img src="cat.png" style="...">');    // spawns media
//
// The subtlety is document coherence: the document is also the saved world. Changes made by scripts are
// *runtime* state and must not be written back to the origin, while changes made by people in the world
// (dragging, typing, spawning) are *authored* state and must be. This system attributes every body mutation
// to either the engine (authored, bracketed by engineWrite) or a script (runtime), records the authored value
// of anything a script touches, and hands the writeback path an authored copy of the document.
import WorldImporter, { parseTransformIntoThree } from "../utils/world-importer";
import { docToPrettifiedHtml, webspaceHtmlToQuillHtml } from "../utils/dom-utils";
import { htmlToDelta } from "../utils/quill-pool";
import { isValidWorldId, NON_WORLD_TAGS } from "../utils/world-ids";
import { paths } from "./userinput/paths";

const CLICK_MAX_MOVE_PX = 6;
const CLICK_MAX_MS = 500;

const isWorldElement = node =>
  node && node.nodeType === Node.ELEMENT_NODE && node.parentNode === document.body && !NON_WORLD_TAGS.has(node.tagName);

// Browser extensions, dev tools and third-party libraries also insert elements into <body> (overlays, helper
// divs). Only elements in the world's vocabulary become objects: media tags always, and generic <div>/<a>
// elements only when they're placed with a transform. Add data-webspace-ignore to opt any element out.
const MEDIA_TAGS = new Set(["IMG", "VIDEO", "AUDIO", "EMBED", "MODEL", "LABEL", "MARQUEE"]);
const PLACED_TAGS = new Set(["DIV", "A"]);

const looksLikeWorldObject = el => {
  if (el.hasAttribute("data-webspace-ignore")) return false;
  if (MEDIA_TAGS.has(el.tagName)) return true;
  return PLACED_TAGS.has(el.tagName) && /transform\s*:/.test(el.getAttribute("style") || "");
};

// The body child (world object) that contains a node, if any
const worldElementOf = node => {
  while (node && node.parentNode !== document.body) node = node.parentNode;
  return isWorldElement(node) ? node : null;
};

const tmpPos = new THREE.Vector3();
const tmpRot = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpPos2 = new THREE.Vector3();
const tmpRot2 = new THREE.Quaternion();
const tmpScale2 = new THREE.Vector3();

const styleParser = document.createElement("div");

const parseStyle = styleText => {
  styleParser.setAttribute("style", styleText || "");
  const s = styleParser.style;
  const decls = [];
  for (let i = 0; i < s.length; i++) {
    const name = s[i];
    if (name !== "transform") decls.push(`${name}:${s.getPropertyValue(name)}`);
  }
  return {
    transform: s.transform || "",
    opacity: s.opacity,
    mixBlendMode: s.mixBlendMode,
    rest: decls.sort().join(";")
  };
};

// True if two style attribute values describe the same world state (transforms compared numerically).
const equivalentStyles = (a, b) => {
  if (a === b) return true;
  const sa = parseStyle(a);
  const sb = parseStyle(b);
  if (sa.rest !== sb.rest) return false;
  parseTransformIntoThree(sa.transform, tmpPos, tmpRot, tmpScale);
  parseTransformIntoThree(sb.transform, tmpPos2, tmpRot2, tmpScale2);
  return (
    tmpPos.distanceTo(tmpPos2) < 0.011 &&
    Math.abs(tmpRot.dot(tmpRot2)) > 0.99999 &&
    tmpScale.distanceTo(tmpScale2) < 0.011
  );
};

// Deterministic id so every peer running the same script agrees on network ids.
const idForScriptElement = (el, salt) => {
  const s = `${el.outerHTML}|${salt}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `s${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
};

const idIsTaken = (id, node) => {
  const existing = document.getElementById(id);
  return (existing && existing !== node) || !!DOM_ROOT.getElementById(`naf-${id}`);
};

export class LiveDomSystem {
  constructor(scene) {
    this.scene = scene;

    // id -> Map(attributeName -> authored value, or null when absent)
    this.overrides = new Map();
    // id -> authored innerHTML, for world elements whose contents a script changed
    this.innerOverrides = new Map();
    // id -> last authored innerHTML (so the first script change knows what to restore)
    this.authoredInner = new Map();
    // ids of elements inserted by scripts (not part of the authored document)
    this.runtimeAdded = new Set();
    // id -> { html, nextId } for authored elements removed by scripts
    this.runtimeRemoved = new Map();

    this.dirtyIds = new Set();
    this.dirtyTextIds = new Set();
    this.pendingAdds = [];
    this.pendingRemoves = [];
    this.scriptElementCounter = 0;
    this.importedNodes = new WeakSet();
    this.scriptPosedEntities = new WeakSet();
    this.started = false;

    this.observer = new MutationObserver(records => this.process(records, false));

    this.hoveredDomEl = null;
    this.pointerDown = null;
  }

  start() {
    if (this.started) return;
    this.started = true;

    for (const el of document.body.children) {
      if (isWorldElement(el) && el.id) this.authoredInner.set(el.id, el.innerHTML);
    }

    this.observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      subtree: true
    });

    const canvas = this.scene.canvas;

    canvas.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      this.pointerDown = { x: e.clientX, y: e.clientY, t: performance.now(), target: this.hoveredDomEl };
    });

    canvas.addEventListener("pointerup", e => {
      const down = this.pointerDown;
      this.pointerDown = null;
      if (!down || !down.target || down.target !== this.hoveredDomEl) return;
      if (performance.now() - down.t > CLICK_MAX_MS) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_MAX_MOVE_PX) return;
      this.dispatchPointerEvent(down.target, "click", e);
    });
  }

  // Wrap engine code that writes authored state into the light DOM.
  engineWrite(fn) {
    if (!this.started) return fn();

    this.process(this.observer.takeRecords(), false);

    try {
      return fn();
    } finally {
      this.process(this.observer.takeRecords(), true);
    }
  }

  // Pull any queued mutation records so the runtime/authored bookkeeping is current.
  sync() {
    if (this.started) this.process(this.observer.takeRecords(), false);
  }

  process(records, fromEngine) {
    for (const record of records) {
      if (record.type === "attributes" && record.target.parentNode === document.body) {
        this.processAttribute(record, fromEngine);
      } else if (record.type === "childList" && record.target === document.body) {
        if (!fromEngine) this.processBodyChildren(record);
      } else {
        // Contents of a world element changed (text, nested markup, nested attributes)
        const el = worldElementOf(record.target);
        if (!el || !el.id) continue;
        const id = el.id;

        if (fromEngine) {
          if (!this.innerOverrides.has(id)) this.authoredInner.set(id, el.innerHTML);
        } else if (!this.runtimeAdded.has(id)) {
          if (!this.innerOverrides.has(id)) this.innerOverrides.set(id, this.authoredInner.get(id) ?? "");
          this.dirtyTextIds.add(id);
        } else {
          this.dirtyTextIds.add(id);
        }
      }
    }
  }

  processAttribute(record, fromEngine) {
    const el = record.target;
    const attr = record.attributeName;

    // A script-made element that only now got a transform becomes an object
    if (
      !fromEngine &&
      isWorldElement(el) &&
      !this.importedNodes.has(el) &&
      !(el.id && DOM_ROOT.getElementById(`naf-${el.id}`))
    ) {
      if (attr === "style" && looksLikeWorldObject(el)) this.pendingAdds.push(el);
      return;
    }

    if (!isWorldElement(el) || !el.id || attr === "id") return;

    const id = el.id;

    if (fromEngine) {
      // A real authored change (e.g. someone dragged the object) supersedes the script's runtime value.
      // An echo of the runtime value back into the DOM does not.
      const value = el.getAttribute(attr);
      const overrides = this.overrides.get(id);

      if (overrides && overrides.has(attr)) {
        const echo = attr === "style" ? equivalentStyles(value, record.oldValue) : value === record.oldValue;
        if (!echo) overrides.delete(attr);
      }

      return;
    }

    if (!this.runtimeAdded.has(id)) {
      if (!this.overrides.has(id)) this.overrides.set(id, new Map());
      const overrides = this.overrides.get(id);
      if (!overrides.has(attr)) overrides.set(attr, record.oldValue);
    }

    this.dirtyIds.add(id);
  }

  processBodyChildren(record) {
    for (const node of record.addedNodes) {
      if (isWorldElement(node) && looksLikeWorldObject(node)) this.pendingAdds.push(node);
    }

    for (const node of record.removedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE || NON_WORLD_TAGS.has(node.tagName) || !node.id) continue;

      // Allow the node to be re-inserted later (pooling, reordering)
      this.importedNodes.delete(node);

      if (this.runtimeAdded.has(node.id)) {
        this.runtimeAdded.delete(node.id);
      } else if (!this.runtimeRemoved.has(node.id)) {
        const next = record.nextSibling;
        this.runtimeRemoved.set(node.id, { html: node.outerHTML, nextId: next && next.id ? next.id : null });
      }

      this.pendingRemoves.push(node.id);
    }
  }

  isRuntimeRecord(record) {
    if (record.type === "attributes" && record.target.parentNode === document.body) {
      const el = record.target;
      if (!isWorldElement(el)) return false;
      if (record.attributeName === "id" || this.runtimeAdded.has(el.id)) return true;
      const overrides = this.overrides.get(el.id);
      return !!(overrides && overrides.has(record.attributeName));
    }

    if (record.type === "childList" && record.target === document.body) {
      for (const node of [...record.addedNodes, ...record.removedNodes]) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (!(this.runtimeAdded.has(node.id) || this.runtimeRemoved.has(node.id))) return false;
      }
      return true;
    }

    const el = worldElementOf(record.target);
    return !!(el && (this.runtimeAdded.has(el.id) || this.innerOverrides.has(el.id)));
  }

  hasRuntimeState() {
    return (
      this.overrides.size > 0 ||
      this.innerOverrides.size > 0 ||
      this.runtimeAdded.size > 0 ||
      this.runtimeRemoved.size > 0
    );
  }

  // Called when a person edits an object's text in-world: its contents are authored again.
  releaseInnerOverride(id) {
    if (this.innerOverrides.delete(id)) {
      const el = document.getElementById(id);
      if (el) this.authoredInner.set(id, el.innerHTML);
    }
  }

  // HTML of the document as authored: runtime (script) state is reverted.
  authoredHtml(doc = document) {
    this.sync();

    if (doc !== document || !this.hasRuntimeState()) return docToPrettifiedHtml(doc);

    const copy = doc.cloneNode(true); // keeps the doctype
    const body = copy.body;
    const byId = id => body.querySelector(`:scope > [id="${CSS.escape(id)}"]`);

    for (const [id, attrs] of this.overrides) {
      const el = byId(id);
      if (!el) continue;
      for (const [attr, value] of attrs) {
        if (value === null) {
          el.removeAttribute(attr);
        } else {
          el.setAttribute(attr, value);
        }
      }
    }

    for (const [id, html] of this.innerOverrides) {
      const el = byId(id);
      if (el) el.innerHTML = html;
    }

    for (const id of this.runtimeAdded) {
      const el = byId(id);
      if (el) el.remove();
    }

    for (const [, { html, nextId }] of this.runtimeRemoved) {
      const tmp = copy.createElement("template");
      tmp.innerHTML = html;
      const el = tmp.content.firstElementChild;
      const next = nextId ? byId(nextId) : null;
      body.insertBefore(el, next);
    }

    return docToPrettifiedHtml(copy);
  }

  tick() {
    if (!this.started) {
      if (!this.scene.is("document-imported")) return;
      this.start();
    }

    this.sync();

    if (this.pendingRemoves.length > 0) {
      for (const id of this.pendingRemoves) {
        const entity = DOM_ROOT.getElementById(`naf-${id}`);
        if (entity && entity.parentNode && !document.getElementById(id)) {
          entity.parentNode.removeChild(entity);
        }
      }
      this.pendingRemoves.length = 0;
    }

    if (this.pendingAdds.length > 0) {
      const adds = this.pendingAdds.splice(0);
      this.importAdded(adds);
    }

    for (const id of this.dirtyIds) {
      const domEl = document.getElementById(id);
      const entity = DOM_ROOT.getElementById(`naf-${id}`);
      if (domEl && entity) this.applyToEntity(domEl, entity);
    }
    this.dirtyIds.clear();

    for (const id of this.dirtyTextIds) {
      const domEl = document.getElementById(id);
      const entity = DOM_ROOT.getElementById(`naf-${id}`);
      if (domEl && entity) this.applyTextToEntity(domEl, entity);
    }
    this.dirtyTextIds.clear();

    this.updateHover();
    this.updateXRClicks();
  }

  importAdded(nodes) {
    const doc = document.implementation.createHTMLDocument("");

    for (const node of nodes) {
      if (node.parentNode !== document.body || this.importedNodes.has(node)) continue;
      this.importedNodes.add(node);

      if (node.id && this.runtimeRemoved.has(node.id)) {
        // A script re-inserted an authored element it removed earlier
        this.runtimeRemoved.delete(node.id);
      } else {
        // Keep the author's id when it's usable, so getElementById keeps working
        if (!isValidWorldId(node.id) || idIsTaken(node.id, node)) {
          let id;
          do {
            id = idForScriptElement(node, this.scriptElementCounter++);
          } while (idIsTaken(id, node));
          node.id = id;
        }

        this.runtimeAdded.add(node.id);
      }

      doc.body.appendChild(doc.importNode(node, true));
    }

    if (doc.body.children.length > 0) {
      new WorldImporter().importWebspacesDocument(doc, false, false);
    }
  }

  applyToEntity(domEl, entity) {
    const object3D = entity.object3D;

    const { transform, opacity, mixBlendMode } = parseStyle(domEl.getAttribute("style"));

    if (entity.components["media-splat"]) {
      entity.setAttribute("media-splat", {
        opacity: opacity === "" ? 1 : parseFloat(opacity),
        blend: mixBlendMode || "normal"
      });
    }

    if (transform) {
      parseTransformIntoThree(transform, tmpPos, tmpRot, tmpScale);
      object3D.position.copy(tmpPos);
      object3D.quaternion.copy(tmpRot);
      object3D.scale.copy(tmpScale);
      object3D.matrixNeedsUpdate = true;
      this.scriptPosedEntities.add(entity);
    }

    object3D.visible = !domEl.hasAttribute("hidden");

    const loader = entity.components["media-loader"];
    const src = domEl.tagName === "A" ? domEl.getAttribute("href") : domEl.getAttribute("src");

    if (loader && src && src !== loader.data.src) {
      entity.setAttribute("media-loader", { src });
    }
  }

  async applyTextToEntity(domEl, entity) {
    const mediaText = entity.components["media-text"];
    if (!mediaText) return;

    const textSystem = SYSTEMS.mediaTextSystem;
    const quill = textSystem.getQuill(mediaText);
    if (!quill) return;

    const html = await webspaceHtmlToQuillHtml(domEl.innerHTML);

    // Passing the text system as the source keeps this local: every visitor runs the same script, so the
    // change must not also be sent through the shared (CRDT) text document, or it would be applied twice.
    quill.setContents(htmlToDelta(html), textSystem);
  }

  // Entities whose pose is currently driven by a script. The DOM serializer skips writing their pose
  // back (the document already holds it) unless a person moves them.
  isScriptPosed(entity) {
    return this.scriptPosedEntities.has(entity);
  }

  releaseScriptPose(entity) {
    this.scriptPosedEntities.delete(entity);
  }

  // In VR, a trigger pull while a controller ray points at an object is a click.
  updateXRClicks() {
    if (!this.scene.is("vr-mode")) {
      this.xrTriggerDown = null;
      return;
    }

    const userinput = this.scene.systems.userinput;
    const pressed =
      !!userinput.get(paths.device.webxr.right.button.trigger.pressed) ||
      !!userinput.get(paths.device.webxr.left.button.trigger.pressed);

    if (pressed && !this.xrTriggerDown) {
      this.xrTriggerDown = { t: performance.now(), target: this.hoveredDomEl };
    } else if (!pressed && this.xrTriggerDown) {
      const down = this.xrTriggerDown;
      this.xrTriggerDown = null;
      if (down.target && down.target === this.hoveredDomEl && performance.now() - down.t < 1000) {
        this.dispatchPointerEvent(down.target, "click");
      }
    }
  }

  updateHover() {
    const interaction = this.scene.systems.interaction;
    let hovered = interaction && (interaction.state.rightRemote.hovered || interaction.state.leftRemote.hovered);

    while (hovered && !hovered.components?.["media-loader"] && hovered.parentEl) {
      hovered = hovered.parentEl;
    }

    const domEl = hovered && hovered.id ? document.getElementById(hovered.id.replace(/^naf-/, "")) : null;

    if (domEl !== this.hoveredDomEl) {
      if (this.hoveredDomEl) this.dispatchPointerEvent(this.hoveredDomEl, "pointerleave");
      this.hoveredDomEl = domEl;
      if (domEl) this.dispatchPointerEvent(domEl, "pointerenter");
    }
  }

  dispatchPointerEvent(domEl, type, sourceEvent = null) {
    const init = {
      bubbles: type === "click",
      cancelable: true,
      clientX: sourceEvent ? sourceEvent.clientX : 0,
      clientY: sourceEvent ? sourceEvent.clientY : 0
    };

    domEl.dispatchEvent(type === "click" ? new MouseEvent(type, init) : new PointerEvent(type, init));
  }
}

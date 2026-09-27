// Live DOM: lets ordinary page scripts drive the world through the document, the way scripts drive a web page.
//
//   const lamp = document.getElementById("lamp123");
//   lamp.style.transform = "translate3d(0cm, 200cm, 0cm) rotate3d(0, 1, 0, 1.2rad)";   // moves the object
//   lamp.hidden = true;                                                                  // hides it
//   lamp.addEventListener("click", () => ...);                                           // in-world clicks
//   document.body.insertAdjacentHTML("beforeend", '<img src="cat.png" style="...">');    // spawns media
//
// The subtlety is document coherence: the document is also the saved world. Changes made by scripts are
// *runtime* state and must not be written back to the origin, while changes made by people in the world
// (dragging, typing, spawning) are *authored* state and must be. This system attributes every body mutation
// to either the engine (authored, bracketed by engineWrite) or a script (runtime), records the authored value
// of anything a script touches, and hands the writeback path an authored copy of the document.
import WorldImporter, { parseTransformIntoThree } from "../utils/world-importer";
import { docToPrettifiedHtml } from "../utils/dom-utils";

const WATCHED_ATTRIBUTES = ["style", "src", "href", "hidden"];
const NON_WORLD_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "LINK", "META", "NAV"]);
const CLICK_MAX_MOVE_PX = 6;
const CLICK_MAX_MS = 500;

const isWorldElement = node =>
  node && node.nodeType === Node.ELEMENT_NODE && node.parentNode === document.body && !NON_WORLD_TAGS.has(node.tagName);

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
  return { transform: s.transform || "", rest: decls.sort().join(";") };
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

// Deterministic 7-char id so every peer running the same script agrees on network ids.
const idForScriptElement = (el, salt) => {
  const s = `${el.outerHTML}|${salt}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  let id = "";
  for (let i = 0; i < 7; i++) {
    const v = (i < 4 ? h1 >>> (i * 8) : h2 >>> ((i - 4) * 8)) & 0xff;
    id += v % 5 === 0 ? String.fromCharCode(48 + (v % 10)) : String.fromCharCode(97 + (v % 26));
  }
  return id;
};

export class LiveDomSystem {
  constructor(scene) {
    this.scene = scene;

    // id -> Map(attributeName -> authored value or null when absent)
    this.overrides = new Map();
    // ids of elements inserted by scripts (not part of the authored document)
    this.runtimeAdded = new Set();
    // id -> { html, nextId } for authored elements removed by scripts
    this.runtimeRemoved = new Map();

    this.dirtyIds = new Set();
    this.pendingAdds = [];
    this.pendingRemoves = [];
    this.scriptElementCounter = 0;
    this.importedNodes = new WeakSet();
    this.started = false;

    this.observer = new MutationObserver(records => this.process(records, false));

    this.hoveredDomEl = null;
    this.pointerDown = null;
  }

  start() {
    if (this.started) return;
    this.started = true;

    this.observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: WATCHED_ATTRIBUTES,
      subtree: true // attribute changes on body's children are only reported with subtree
    });

    // Anything a script added between the import and now
    for (const el of document.body.children) {
      if (isWorldElement(el) && !(el.id && DOM_ROOT.getElementById(`naf-${el.id}`))) this.pendingAdds.push(el);
    }

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
      if (record.type === "attributes") {
        // Only direct children of body are world objects
        const el = record.target;
        if (!isWorldElement(el) || !el.id) continue;

        const id = el.id;
        const attr = record.attributeName;

        if (fromEngine) {
          // A real authored change (e.g. someone dragged the object) supersedes the script's runtime value.
          // An echo of the runtime value back into the DOM does not.
          const value = el.getAttribute(attr);
          const overrides = this.overrides.get(id);

          if (overrides && overrides.has(attr)) {
            const echo = attr === "style" ? equivalentStyles(value, record.oldValue) : value === record.oldValue;
            if (!echo) overrides.delete(attr);
          }

          continue;
        }

        if (!this.runtimeAdded.has(id)) {
          if (!this.overrides.has(id)) this.overrides.set(id, new Map());
          const overrides = this.overrides.get(id);
          if (!overrides.has(attr)) overrides.set(attr, record.oldValue);
        }

        this.dirtyIds.add(id);
      } else if (record.type === "childList" && record.target === document.body) {
        if (fromEngine) continue;

        for (const node of record.addedNodes) {
          if (!isWorldElement(node)) continue;
          this.pendingAdds.push(node);
        }

        for (const node of record.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE || NON_WORLD_TAGS.has(node.tagName) || !node.id) continue;

          if (this.runtimeAdded.has(node.id)) {
            this.runtimeAdded.delete(node.id);
          } else if (!this.runtimeRemoved.has(node.id)) {
            const next = record.nextSibling;
            this.runtimeRemoved.set(node.id, { html: node.outerHTML, nextId: next && next.id ? next.id : null });
          }

          this.pendingRemoves.push(node.id);
        }
      }
    }
  }

  isRuntimeRecord(record) {
    if (record.type === "attributes") {
      const el = record.target;
      if (!isWorldElement(el)) return false;
      if (this.runtimeAdded.has(el.id)) return true;
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

    return false;
  }

  hasRuntimeState() {
    return this.overrides.size > 0 || this.runtimeAdded.size > 0 || this.runtimeRemoved.size > 0;
  }

  // HTML of the document as authored: runtime (script) state is reverted.
  authoredHtml(doc = document) {
    this.sync();

    if (doc !== document || !this.hasRuntimeState()) return docToPrettifiedHtml(doc);

    const root = doc.documentElement.cloneNode(true);
    const body = root.querySelector("body");
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

    for (const id of this.runtimeAdded) {
      const el = byId(id);
      if (el) el.remove();
    }

    for (const [, { html, nextId }] of this.runtimeRemoved) {
      const tmp = doc.createElement("template");
      tmp.innerHTML = html;
      const el = tmp.content.firstElementChild;
      const next = nextId ? byId(nextId) : null;
      body.insertBefore(el, next);
    }

    return docToPrettifiedHtml(root);
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

    this.updateHover();
  }

  importAdded(nodes) {
    const doc = document.implementation.createHTMLDocument("");

    for (const node of nodes) {
      if (node.parentNode !== document.body || this.importedNodes.has(node)) continue;
      this.importedNodes.add(node);

      const wasRemovedAuthored = !!node.id && this.runtimeRemoved.has(node.id);

      if (wasRemovedAuthored) {
        // A script re-inserted an authored element it removed earlier
        this.runtimeRemoved.delete(node.id);
      } else {
        if (!node.id || !/^[a-z0-9]{7}$/.test(node.id) || DOM_ROOT.getElementById(`naf-${node.id}`)) {
          node.id = idForScriptElement(node, this.scriptElementCounter++);
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

    const { transform } = parseStyle(domEl.getAttribute("style"));

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

  // Entities whose pose is currently driven by a script. The DOM serializer skips writing their pose
  // back (the document already holds it) unless a person moves them.
  get scriptPosedEntities() {
    if (!this._scriptPosed) this._scriptPosed = new WeakSet();
    return this._scriptPosed;
  }

  isScriptPosed(entity) {
    return this.scriptPosedEntities.has(entity);
  }

  releaseScriptPose(entity) {
    this.scriptPosedEntities.delete(entity);
  }

  updateHover() {
    const interaction = this.scene.systems.interaction;
    let hovered = interaction && interaction.state.rightRemote.hovered;

    while (hovered && !hovered.components?.["media-loader"] && hovered.parentEl) {
      hovered = hovered.parentEl;
    }

    const domEl = hovered && hovered.id ? document.getElementById(hovered.id.replace("naf-", "")) : null;

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

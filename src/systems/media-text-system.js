import * as Y from "yjs";
import {destroyQuill, getQuill, htmlToDelta} from "../utils/quill-pool";
import {FONT_FACES} from "../utils/quill-utils";
import {getNetworkId} from "../utils/ownership-utils";

const MAX_COMPONENTS = 128;
const SCROLL_SENSITIVITY = 500.0;

export class MediaTextSystem extends EventTarget {
  constructor(sceneEl) {
    super();
    this.sceneEl = sceneEl;
    this.components = Array(MAX_COMPONENTS).fill(null);
    this.quills = Array(MAX_COMPONENTS).fill(null);
    this.yTextTypes = Array(MAX_COMPONENTS).fill(null);
    this.dirty = Array(MAX_COMPONENTS).fill(false);
    this.textChangeHandlers = Array(MAX_COMPONENTS).fill(null);
    this.markComponentDirtyFns = Array(MAX_COMPONENTS).fill(null);
    this.quillObserverFns = Array(MAX_COMPONENTS).fill(null);
    this.typeObserverFns = Array(MAX_COMPONENTS).fill(null);
    this.pendingDeltas = new Map();

    this.networkIdToComponent = new Map();
    this.maxIndex = -1;
  }

  registerMediaTextComponent(component) {
    const { editRingManager } = window.APP;
    const networkId = getNetworkId(component.el);
    if (!networkId) return;

    this.networkIdToComponent.set(networkId, component);

    for (let i = 0; i <= this.maxIndex; i++) {
      if (this.components[i] === null) {
        this.components[i] = component;
        this.maxIndex = Math.max(this.maxIndex, i);
        return;
      }
    }

    this.components[++this.maxIndex] = component;

    // Text panels use network id as the doc id, since these are unique in the DOM
    editRingManager.registerRingEditableDocument(networkId, this);
  }

  unregisterMediaTextComponent(component) {
    const { editRingManager } = window.APP;
    const index = this.components.indexOf(component);
    if (index === -1) return;

    const networkId = getNetworkId(component.el);
    this.networkIdToComponent.delete(networkId);

    this.unbindQuill(component);

    this.components[index] = null;

    for (let i = 0; i < this.components.length; i++) {
      if (this.components[i] === null) continue;
      this.maxIndex = Math.max(this.maxIndex, i);
    }

    editRingManager.unregisterRingEditableDocument(networkId, this);
  }

  initializeTextEditor(component, force = true, initialContents = null, beginSyncing = false) {
    const { editRingManager } = window.APP;
    const index = this.components.indexOf(component);
    if (index === -1) return;
    const networkId = getNetworkId(component.el);

    if (force) {
      this.unbindQuill(component);
    }

    let quill = this.quills[index];
    if (quill) return;

    this.markComponentDirtyFns[index] = () => this.markDirty(component);
    quill = this.quills[index] = getQuill(networkId);
    let type = this.yTextTypes[index];

    // Type may already exist, if we are syncing it
    if (!type) {
      const ydoc = new Y.Doc();
      type = ydoc.getText("quill");
      this.yTextTypes[index] = type;

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

        type.applyDelta(delta.ops);
      }
    }

    const negatedFormats = {};

    this.typeObserverFns[index] = event => {
      if (event.transaction.origin === this) return;

      const delta = [];
      for (const d of event.delta) {
        if (d.insert !== undefined) {
          // We always explicitly set attributes, otherwise concurrent edits may
          // result in quill assuming that a text insertion shall inherit existing
          // attributes.
          delta.push(Object.assign({}, d, { attributes: Object.assign({}, this.negatedFormats, d.attributes || {}) }));
        } else {
          delta.push(d);
        }
      }

      quill.updateContents(delta, this);
    };

    this.quillObserverFns[index] = (eventType, delta, state, origin) => {
      if (delta && delta.ops) {
        if (origin === "user") {
          editRingManager.sendDeltaSync(networkId, delta);
        }

        for (const op of delta.ops) {
          if (op.attributes) {
            for (const key in op.attributes) {
              if (negatedFormats[key] === undefined) {
                negatedFormats[key] = false;
              }
            }
          }
        }

        const type = this.yTextTypes[index];

        if (origin !== this) {
          // Prevent currence when setting contents from type
          type.doc.transact(() => {
            type.applyDelta(delta.ops);
          }, this);
        }
      }
    };

    quill.setContents(type.toDelta(), this);

    type.observe(this.typeObserverFns[index]);
    quill.on("editor-change", this.quillObserverFns[index]);
    quill.on("text-change", this.markComponentDirtyFns[index]);
    quill.container.querySelector(".ql-editor").addEventListener("scroll", this.markComponentDirtyFns[index]);

    this.applyFont(component);

    if (beginSyncing) {
      editRingManager.joinSyncRing(networkId);
    }
  }

  replaceYTextType(component, ydoc) {
    const type = ydoc.getText("quill");

    if (!type) {
      console.warn("Missing quill type in remote ydoc");
      return;
    }

    const index = this.components.indexOf(component);
    if (index === -1) return;

    const oldType = this.yTextTypes[index];
    if (oldType && this.typeObserverFns[index]) {
      oldType.unobserve(this.typeObserverFns[index]);
    }

    this.yTextTypes[index] = type;

    const quill = this.quills[index];
    if (quill) {
      // Need to blur quill editor if active, otherwise contents won't update
      const qlEditor = quill.container.querySelector(".ql-editor");

      if (qlEditor && DOM_ROOT.activeElement === qlEditor) {
        quill.blur();
      }

      quill.setContents(type.toDelta(), this);
    }

    if (this.typeObserverFns[index]) {
      type.observe(this.typeObserverFns[index]);
    }
  }

  applyFont(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return;
    const quill = this.quills[index];
    if (!quill) return;

    const { font } = component.data;
    const classList = quill.container.querySelector(".ql-editor").classList;

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

    this.markDirty(component);

    // Hack, quill needs to be re-rendered after a slight delay to deal with
    // cases where CSS relayout may not immediately occur (likely when concurrent
    // work is occuring.)
    //
    // Otherwise text will be clipped when changing fonts since the clientWidth/Height
    // of the inner elements is stale.
    setTimeout(() => this.markDirty(component), 500);
  }

  scrollBy(component, amount) {
    const index = this.components.indexOf(component);
    if (index === -1) return;
    const quill = this.quills[index];
    if (!amount || !quill) return;

    const scrollDistance = Math.floor(-amount * SCROLL_SENSITIVITY);
    quill.container.querySelector(".ql-editor").scrollBy(0, scrollDistance);

    this.markDirty(component);
  }

  unbindQuill(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return;
    const quill = this.quills[index];
    if (!quill) return;
    const type = this.yTextTypes[index];
    const networkId = getNetworkId(component.el);

    quill.off("text-change", this.markComponentDirtyFns[index]);
    quill.off("editor-change", this.quillObserverFns[index]);
    quill.container.querySelector(".ql-editor").removeEventListener("scroll", this.markComponentDirtyFns[index]);
    type.unobserve(this.typeObserverFns[index]);
    this.textChangeHandlers[index] = null;
    this.markComponentDirtyFns[index] = null;
    this.quillObserverFns[index] = null;
    this.quills[index] = null;
    this.yTextTypes[index] = null;

    destroyQuill(networkId);
  }

  markDirty(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return;

    this.dirty[index] = true;
  }

  tick() {
    const { editRingManager } = window.APP;

    for (let i = 0; i <= this.maxIndex; i++) {
      const component = this.components[i];
      if (component === null) continue;
      const yjsType = this.yTextTypes[i];

      if (yjsType !== null) {
        const networkId = getNetworkId(component.el);
        if (this.pendingDeltas.has(networkId) && editRingManager.isSyncing(networkId)) {
          const deltas = this.pendingDeltas.get(networkId);

          for (const { ops } of deltas) {
            yjsType.applyDelta(ops);
          }

          this.pendingDeltas.delete(networkId);
        }
      }

      if (this.dirty[i]) {
        component.render();
        this.dirty[i] = false;
      }
    }
  }

  getQuill(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return null;
    return this.quills[index];
  }

  async getFullSync(networkId) {
    const component = this.networkIdToComponent.get(networkId);
    if (!component) return null;

    const index = this.components.indexOf(component);
    if (index === -1) return null;

    const yTextType = this.yTextTypes[index];
    const ydoc = yTextType.doc;
    return Y.encodeStateAsUpdate(ydoc);
  }

  applyFullSync(networkId, payload) {
    const component = this.networkIdToComponent.get(networkId);
    if (!component) return null;

    const index = this.components.indexOf(component);
    if (index === -1) return null;

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(payload));
    this.replaceYTextType(component, ydoc);
  }

  applyDeltaSync(networkId, delta) {
    const component = this.networkIdToComponent.get(networkId);
    if (!component) return null;

    let deltas = this.pendingDeltas.get(networkId);

    if (!deltas) {
      deltas = [];
      this.pendingDeltas.set(networkId, deltas);
    }

    deltas.push(delta);
  }
}

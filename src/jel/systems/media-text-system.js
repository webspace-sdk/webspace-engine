import TextSync from "../utils/text-sync";
import { getQuill, destroyQuill } from "../utils/quill-pool";
import { FONT_FACES } from "../utils/quill-utils";
import { getNetworkId } from "../utils/ownership-utils";

const MAX_COMPONENTS = 128;
const SCROLL_SENSITIVITY = 500.0;

export class MediaTextSystem extends EventTarget {
  constructor(sceneEl) {
    super();
    this.sceneEl = sceneEl;
    this.syncs = Array(MAX_COMPONENTS).fill(null);
    this.components = Array(MAX_COMPONENTS).fill(null);
    this.quills = Array(MAX_COMPONENTS).fill(null);
    this.docs = Array(MAX_COMPONENTS).fill(null);
    this.dirty = Array(MAX_COMPONENTS).fill(false);
    this.textChangeHandlers = Array(MAX_COMPONENTS).fill(null);
    this.markComponentDirtyFns = Array(MAX_COMPONENTS).fill(null);
    this.maxIndex = -1;
  }

  hasSync(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return false;
    return this.syncs[index] !== null;
  }

  async getSync(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return null;
    let sync = this.syncs[index];

    if (sync) {
      // await sync.whenReady();
      return sync;
    }

    sync = new TextSync(component);
    this.syncs[index] = sync;
    // await sync.init();

    return sync;
  }

  registerMediaTextComponent(component) {
    for (let i = 0; i <= this.maxIndex; i++) {
      if (this.components[i] === null) {
        this.components[i] = component;
        this.maxIndex = Math.max(this.maxIndex, i);
        return;
      }
    }

    this.components[++this.maxIndex] = component;
  }

  initializeTextEditor(component, force = true) {
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
    quill.on("text-change", this.markComponentDirtyFns[index]);
    quill.container.querySelector(".ql-editor").addEventListener("scroll", this.markComponentDirtyFns[index]);

    this.applyFont(component);
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
    const networkId = getNetworkId(component.el);

    quill.off("text-change", this.markComponentDirtyFns[index]);
    quill.container.querySelector(".ql-editor").removeEventListener("scroll", this.markComponentDirtyFns[index]);
    this.textChangeHandlers[index] = null;
    this.markComponentDirtyFns[index] = null;
    this.quills[index] = null;
    destroyQuill(networkId);
  }

  unregisterMediaTextComponent(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return;

    this.unbindQuill(component);

    const sync = this.syncs[index];
    if (sync) {
      sync.dispose();
    }

    this.components[index] = null;

    for (let i = 0; i < this.components.length; i++) {
      if (this.components[i] === null) continue;
      this.maxIndex = Math.max(this.maxIndex, i);
    }
  }

  markDirty(component) {
    const index = this.components.indexOf(component);
    if (index === -1) return;

    this.dirty[index] = true;
  }

  tick() {
    for (let i = 0; i <= this.maxIndex; i++) {
      const component = this.components[i];
      if (component === null) continue;

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
}

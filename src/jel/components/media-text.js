import Quill from "quill";
import { getQuill, hasQuill, destroyQuill } from "../utils/quill-pool";
import { getNetworkId } from "../utils/ownership-utils";

AFRAME.registerComponent("media-text", {
  schema: {
    deltaOps: { default: null }
  },

  async init() {
    const shared = this.el.components.shared;
    await shared.whenReadyForBinding();
    const quill = this.bindQuill();

    const { initialContents } = this.el.components["media-loader"].data;

    if (initialContents) {
      const delta = quill.clipboard.convert(initialContents);
      quill.updateContents(delta, Quill.sources.USER);
    }
  },

  bindQuill() {
    const networkId = getNetworkId(this.el);
    if (hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    this.el.components.shared.bindRichTextEditor(quill, this.name, "deltaOps");
    return quill;
  },

  unbindAndRemoveQuill() {
    const networkId = getNetworkId(this.el);
    if (!hasQuill(networkId)) return;

    const quill = getQuill(networkId);
    this.el.components.shared.unbindRichTextEditor(quill, this.name, "deltaOps");
    destroyQuill(networkId);
  },

  remove() {
    this.unbindAndRemoveQuill();
  }
});

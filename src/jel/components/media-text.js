import Quill from "quill";
import { getQuill, hasQuill, destroyQuill } from "../utils/quill-pool";
import { getNetworkId } from "../utils/ownership-utils";

AFRAME.registerComponent("media-text", {
  schema: {
    initialContents: { type: "string" },
    deltaOps: { default: null }
  },

  async init() {
    if (this.data.initialContents) {
      await this.el.components.shared.whenReadyForBinding();

      const quill = this.bindQuill();
      const delta = quill.clipboard.convert(this.data.initialContents);
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

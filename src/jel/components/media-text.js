import Quill from "quill";

let scratchQuill;

function ensureScratchQuill() {
  if (scratchQuill) return;

  const el = document.createElement("div");
  el.setAttribute("id", "scratchQuill");
  document.body.appendChild(el);
  scratchQuill = new Quill("#scratchQuill");
}

function contentsToDeltaOps(contents) {
  ensureScratchQuill();

  scratchQuill.setText("");
  const delta = scratchQuill.clipboard.convert(contents);
  return delta.ops;
}

AFRAME.registerComponent("media-text", {
  schema: {
    initialContents: { type: "string" },
    deltaOps: { default: null }
  },

  init() {
    console.log(this.data);
  }
});

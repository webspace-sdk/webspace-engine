import React, { useEffect } from "react";
//import Quill from "quill";
import { EDITOR_WIDTH, EDITOR_HEIGHT, initQuillPool, getQuill, destroyQuill } from "./quill-pool";
import { computeQuillContectRect } from "./quill-utils";
import { renderQuillToImg } from "./quill-utils";

const networkId = "abc";

export const QuillBasic = () => {
  useEffect(() => {
    const render = () => {
      const quill = getQuill(networkId);
      const img = document.querySelector("#editor-image");
      renderQuillToImg(quill, img, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    };

    initQuillPool().then(() => {
      const quill = getQuill(networkId);
      quill.on("text-change", render);
      const interval = setInterval(() => {
        const overlay = document.createElement("div");
        overlay.setAttribute("class", "overlay");
        quill.container.appendChild(overlay);
        const editor = quill.container.querySelector(`.ql-editor`);
        if (editor) {
          editor.addEventListener("scroll", render);
          editor.focus();
          clearInterval(interval);
        }
      }, 500);
    });
    () => destroyQuill(networkId);
  });

  return (
    <div
      style={{ backgroundColor: "#444444", position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }}
      id="jel-ui-wrap"
    >
      <img width={EDITOR_WIDTH} height={EDITOR_HEIGHT} id="editor-image" />
      <button
        onClick={() => {
          document.querySelector("#quill-abc [contenteditable=true]").focus();
        }}
      >
        Focus
      </button>
    </div>
  );
};

//setInterval(() => {
//  const quill = getQuill(networkId);
//  const [w, h] = computeQuillContectRect(quill);
//  document
//    .querySelector(".overlay")
//    .setAttribute(
//      "style",
//      `position: absolute; top: 8px; left: 8px; background-color: green; width: ${w}px; height: ${h}px; opacity: 0.4; pointer-events: none;`
//    );
//}, 2500);

export default {
  title: "Quill Pool"
};

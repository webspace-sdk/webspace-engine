import React, { useEffect } from "react";
//import Quill from "quill";
import { EDITOR_WIDTH, EDITOR_HEIGHT, initQuillPool, getQuill, destroyQuill } from "../utils/quill-pool";
import { renderQuillToImg } from "../utils/quill-utils";

const networkId = "abc";

export const QuillBasic = () => {
  useEffect(() => {
    const render = () => {
      const quill = getQuill(networkId);
      const img = document.querySelector("#editor-image");
      renderQuillToImg(quill, img);
    };

    initQuillPool().then(() => {
      const quill = getQuill(networkId);
      quill.on("text-change", render);
      const interval = setInterval(() => {
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

export default {
  title: "Quill Pool"
};

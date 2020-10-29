import React, { useEffect } from "react";
//import Quill from "quill";
import { initQuillPool, getQuill, destroyQuill } from "../utils/quill-pool";
import { fromByteArray } from "base64-js";

const networkId = "abc";

const render = quill => {
  const el = quill.container;
  const xml = new XMLSerializer().serializeToString(el);
  const ratio = el.offsetHeight / el.offsetWidth;
  const textureSize = 1024; // TODO labels should be smaller
  const scale = (textureSize * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;

  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth * scale}px" height="${el.offsetHeight * scale}px">
        <foreignObject width="100%" height="100%" style="transform: scale(${scale});">
          ${xml}
        </foreignObject>
      </svg>
    `;

  const b64 = fromByteArray(new TextEncoder().encode(svg));
  const img = document.querySelector("#editor-image");
  img.src = `data:image/svg+xml;base64,${b64}`;
};

export const QuillBasic = () => {
  useEffect(() => {
    initQuillPool().then(() => {
      const quill = getQuill(networkId);
      quill.on("text-change", () => render(quill));
      setTimeout(() => document.querySelector(`.ql-editor`).focus(), 2000);
    });
    () => destroyQuill(networkId);
  });

  return (
    <div
      style={{ backgroundColor: "#444444", position: "absolute", width: "100%", height: "100%", top: 0, left: 0 }}
      id="jel-ui-wrap"
    >
      <img width={355} height={200} id="editor-image" />
    </div>
  );
};

export default {
  title: "Quill Pool"
};

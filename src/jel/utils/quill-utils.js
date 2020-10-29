import { fromByteArray } from "base64-js";

export function renderQuillToImg(quill, img) {
  const el = quill.container;
  const editor = quill.container.querySelector(".ql-editor");
  const xml = new XMLSerializer().serializeToString(el);
  const ratio = el.offsetHeight / el.offsetWidth;
  const textureSize = 1024; // TODO labels should be smaller
  const scale = (textureSize * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;

  // Hide the tooltip for the editor in the rendering
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth * scale}px" height="${el.offsetHeight * scale}px">
        <foreignObject width="100%" height="100%" style="transform: scale(${scale});">
          <style>
            .ql-container {
              border-radius: 0;
            }

            .ql-editor {
              position: absolute;
              overflow: visible !important;
              top: -${editor.scrollTop}px;
            }

            .ql-tooltip {
              display: none;
            }
          </style>
          ${xml}
        </foreignObject>
      </svg>
    `;

  const b64 = fromByteArray(new TextEncoder().encode(svg));
  img.src = `data:image/svg+xml;base64,${b64}`;
}

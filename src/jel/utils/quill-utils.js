import { fromByteArray } from "base64-js";
import { rgbToCssRgb } from "./dom-utils";

export function renderQuillToImg(quill, img, foregroundColor, backgroundColor) {
  const el = quill.container;
  const editor = quill.container.querySelector(".ql-editor");
  let xml = new XMLSerializer().serializeToString(el);
  const ratio = el.offsetHeight / el.offsetWidth;
  const textureSize = 1024; // TODO labels should be smaller
  const scale = (textureSize * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;
  const fgCss = `rgba(${rgbToCssRgb(foregroundColor.x)}, ${rgbToCssRgb(foregroundColor.y)}, ${rgbToCssRgb(
    foregroundColor.z
  )}, 1.0)`;
  const bgCss = `rgba(${rgbToCssRgb(backgroundColor.x)}, ${rgbToCssRgb(backgroundColor.y)}, ${rgbToCssRgb(
    backgroundColor.z
  )}, 1.0)`;

  // Disable other bits only relevant to on-screen UI
  // NOTE - not sure why global h1, h2 bits needed here, but otherwise font is always bold in headers.
  xml = xml.replace(
    "</style>",
    `
    .ql-container {
      border-radius: 0 !important;
    }

    .ql-editor {
      position: absolute;
      overflow: visible !important;
      top: -${editor.scrollTop}px;
      color: ${fgCss} !important;
      background-color: ${bgCss} !important;
    )}, 1.0) !important;
    }

    .ql-tooltip {
      display: none;
    }

    .ql-blank::before {
      display: flex !important;
    }

    h1, h2 {
      font: inherit;
    }
  </style>`
  );

  // Hide the tooltip for the editor in the rendering
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth * scale}px" height="${el.offsetHeight * scale}px">
        <foreignObject width="100%" height="100%" style="transform: scale(${scale});">
          ${xml}
        </foreignObject>
      </svg>
    `;

  const b64 = fromByteArray(new TextEncoder().encode(svg));
  img.src = `data:image/svg+xml;base64,${b64}`;
}

export const isInQuillEditor = () =>
  !!(document.activeElement && document.activeElement.classList.contains("ql-editor"));

export function computeQuillContectRect(quill) {
  const els = quill.container.querySelector(".ql-editor").children;
  let w = 0,
    h = 0;

  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    w = Math.max(w, el.offsetLeft + el.clientWidth);
    h = Math.max(h, el.offsetTop + el.clientHeight);
  }

  return [w, h];
}

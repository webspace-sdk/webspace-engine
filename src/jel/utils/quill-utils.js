import { fromByteArray } from "base64-js";
import { rgbToCssRgb } from "./dom-utils";
import { EDITOR_WIDTH, EDITOR_HEIGHT } from "./quill-pool";

export function renderQuillToImg(quill, img, foregroundColor, backgroundColor, zoom = 1.0, textureWidth = 1024) {
  const el = quill.container;
  const editor = quill.container.querySelector(".ql-editor");
  const styles = quill.container.querySelector("style");
  const editorXml = new XMLSerializer().serializeToString(editor);
  const stylesXml = new XMLSerializer().serializeToString(styles);

  let xml = `
    <div xmlns="http://www.w3.org/1999/xhtml" class="ql-container ql-bubble">
    ${stylesXml}
    ${editorXml}
    </div>
  `;

  const ratio = el.offsetHeight / el.offsetWidth;
  const scale = (textureWidth * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;

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
      width: ${EDITOR_WIDTH}px !important;
      height: ${EDITOR_HEIGHT}px !important;
    }

    .ql-blank::before {
      display: flex !important;
      color: ${fgCss} !important;
    }

    h1, h2 {
      font-weight: inherit !important;
    }
  </style>`
  );

  // Hide the tooltip for the editor in the rendering
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth * scale}px" height="${el.offsetHeight * scale}px">
        <foreignObject width="100%" height="100%" style="transform: scale(${scale * zoom});">
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

export function deltaEndsWith(delta, text) {
  let endText = "";
  for (let i = delta.ops.length - 1; i >= 0 && endText.length < text.length; --i) {
    const op = delta.ops[i];
    if (typeof op.insert !== "string") break;
    endText = op.insert + endText;
  }
  return endText.slice(-1 * text.length) === text;
}

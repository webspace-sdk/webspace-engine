import { fromByteArray } from "base64-js";
import { rgbToCssRgb } from "./dom-utils";
import { EDITOR_WIDTH, EDITOR_HEIGHT } from "./quill-pool";
import {
  ComicFontCSS,
  SerifFontCSS,
  SansSerifFontCSS,
  MonoFontCSS,
  ComicFont2CSS,
  WritingFontCSS
} from "../fonts/quill-fonts";

import QUILL_PRE from "../../assets/jel/stylesheets/quill-pre.scss";
import QUILL_CORE from "quill/dist/quill.core.css";
import QUILL_BUBBLE from "quill/dist/quill.bubble.css";
import QUILL_EMOJI from "quill-emoji/dist/quill-emoji.css";
import QUILL_HIGHLIGHT from "highlight.js/scss/github.scss";

export const QUILL_STYLES = `
  ${QUILL_PRE}
  ${QUILL_CORE}
  ${QUILL_BUBBLE}
  ${QUILL_EMOJI}
  ${QUILL_HIGHLIGHT}
`.replace(/\/\*[^]*?\*\//g, ""); // Strip comments, o/w rendering fails due to spec perhaps

export const FONT_FACES = {
  SANS_SERIF: 0,
  SERIF: 1,
  MONO: 2,
  COMIC: 3,
  COMIC2: 4,
  WRITING: 5
};

export const MAX_FONT_FACE = 6;

const { SANS_SERIF, MONO, COMIC, COMIC2, WRITING } = FONT_FACES;

export function renderQuillToImg(
  quill,
  img,
  foregroundColor,
  backgroundColor,
  zoom = 1.0,
  textureWidth = 1024,
  transparent = false,
  font = SANS_SERIF
) {
  const el = quill.container;
  const editor = quill.container.querySelector(".ql-editor");

  if (transparent) {
    // Copy contents into attributes to perform outlining trick for transparent renders.
    const contentEls = editor.querySelectorAll("p, h1, h2, li");

    for (const contentEl of contentEls) {
      contentEl.setAttribute("data-contents", contentEl.innerText);
    }
  }

  const editorXml = new XMLSerializer().serializeToString(editor);

  let xml = `
    <div xmlns="http://www.w3.org/1999/xhtml" class="ql-container ql-bubble">
    <style xmlns="http://www.w3.org/1999/xhtml">
      ${QUILL_STYLES}
    </style>
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

  const transparentStyles = transparent
    ? `
    .ql-emojiblot {
      vertical-align: inherit !important;
      margin: inherit !important;
    }

    .ap {
      font-size: inherit !important;
      margin: inherit !important;
    }

    h1 .ap {
      font-size: inherit !important;
      margin: inherit !important;
    }

    h2 .ap {
      font-size: inherit !important;
      margin: inherit !important;
    }

    :root {
      background-color: transparent !important;
    }

    .ql-editor p:before,h1:before,h2:before{
      content: attr(data-contents);
      position: absolute;
      text-stroke: 4px white;
      -webkit-text-stroke: 4px white;
      z-index: -2;
    }

    .ql-editor p:after,h1:after,h2:after{
      content: attr(data-contents);
      position: absolute;
      text-stroke: 1px black;
      -webkit-text-stroke: 1px black;
      z-index: -1;
      left: 20px;
    }

    .ql-blank::before {
      display: flex !important;
      color: #eee !important;
      background-color: rgba(64, 64, 64, 0.2);
    }
  `
    : "";

  // NOTE - We have to inject the current font as a data URL otherwise the browser can sometimes
  // render the wrong font or mis-render it. (Perhaps a browser bug.)
  let fontCSS;

  switch (font) {
    case SANS_SERIF:
      fontCSS = SansSerifFontCSS;
      break;
    case MONO:
      fontCSS = MonoFontCSS;
      break;
    case COMIC:
      fontCSS = ComicFontCSS;
      break;
    case COMIC2:
      fontCSS = ComicFont2CSS;
      break;
    case WRITING:
      fontCSS = WritingFontCSS;
      break;
    default:
      fontCSS = SerifFontCSS;
      break;
  }

  // Disable other bits only relevant to on-screen UI
  // NOTE - not sure why global h1, h2 bits needed here, but otherwise font is always bold in headers.
  xml = xml.replace(
    "</style>",
    `

    ${fontCSS}

    :root {
      background-color: ${bgCss} !important;
    }

    .ql-container {
      border-radius: 0 !important;
    }

    .ql-editor {
      position: absolute;
      overflow: visible !important;
      top: -${editor.scrollTop}px;
      color: ${fgCss} !important;
      width: ${EDITOR_WIDTH}px !important;
      height: ${EDITOR_HEIGHT}px !important;
      min-width: ${EDITOR_WIDTH}px !important;
      min-height: ${EDITOR_HEIGHT}px !important;
    }

    .ql-blank::before {
      display: flex !important;
      color: ${fgCss} !important;
    }

    h1, h2 {
      font-weight: inherit !important;
    }

    ${transparentStyles}
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

export const isInQuillEditor = () => !!DOM_ROOT.activeElement?.classList.contains("ql-editor");

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

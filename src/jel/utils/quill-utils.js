import { fromByteArray } from "base64-js";

export function renderQuillToImg(quill, img) {
  const el = quill.container;
  const editor = quill.container.querySelector(".ql-editor");
  let xml = new XMLSerializer().serializeToString(el);
  const ratio = el.offsetHeight / el.offsetWidth;
  const textureSize = 1024; // TODO labels should be smaller
  const scale = (textureSize * Math.min(1.0, 1.0 / ratio)) / el.offsetWidth;

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

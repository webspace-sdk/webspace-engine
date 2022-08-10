import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
hljs.registerLanguage("javascript", javascript);
import { getMessages } from "../../hubs/utils/i18n";

hljs.configure({
  languages: ["javascript"]
});

import "quill-emoji";
import Quill from "quill";

export const EDITOR_WIDTH = 600;
export const EDITOR_HEIGHT = Math.floor(EDITOR_WIDTH * 0.5625);

// These aren't quite accurate but result in proper texturing
export const EDITOR_PADDING_X = 18.0;
export const EDITOR_PADDING_Y = 20.0;

// Create one quill for initial renders of text upon spawn
// Create one quill for on-screen text editor
// Create a map of network id -> quill for each 'active' text being edited for continuous rendering.
const quills = {};

let quillStyles;

export function initQuillPool() {
  return;

  return new Promise(res => {
    // Load quill styles out of <link> tag, which is in its own webpack chunk.
    const cssUrl = document.querySelector("link[href*=quill-styles]").href;

    // Need to load CSS again because webpack does not seem to want to let us add
    // crossorigin=anonymous
    const linkTag = document.createElement("link");
    // Need to add a hacky qs var since chrome mac will re-use cached non-CORS response
    linkTag.setAttribute("href", `${cssUrl}?force`);
    linkTag.setAttribute("rel", "stylesheet");
    linkTag.setAttribute("crossorigin", "anonymous");

    linkTag.onload = () => {
      const styleTag = document.createElement("style");
      styleTag.innerText = Array.from(linkTag.sheet.cssRules).reduce((str, rule) => {
        return str + rule.cssText;
      }, "");

      quillStyles = `
        .ql-container {
          html, body, div, span, applet, object, iframe,
          h1, h2, h3, h4, h5, h6, p, blockquote, pre,
          a, abbr, acronym, address, big, cite, code,
          del, dfn, em, img, ins, kbd, q, s, samp,
          small, strike, strong, sub, sup, tt, var,
          b, u, i, center,
          dl, dt, dd, ol, ul, li,
          fieldset, form, label, legend,
          table, caption, tbody, tfoot, thead, tr, th, td,
          article, aside, canvas, details, embed, 
          figure, figcaption, footer, header, hgroup, 
          menu, nav, output, ruby, section, summary,
          time, mark, audio, video {
            margin: 0;
            padding: 0;
            border: 0;
            font-size: 100%;
            font: inherit;
            vertical-align: baseline;
          }
          /* HTML5 display-role reset for older browsers */
          article, aside, details, figcaption, figure, 
          footer, header, hgroup, menu, nav, section {
            display: block;
          }
          body {
            line-height: 1;
          }
          ol, ul {
            list-style: none;
          }
          blockquote, q {
            quotes: none;
          }
          blockquote:before, blockquote:after,
          q:before, q:after {
            content: '';
            content: none;
          }
          table {
            border-collapse: collapse;
            border-spacing: 0;
          }

          padding-top: 8px !important;
          padding-bottom: 8px !important;

          scrollbar-color: transparent transparent !important;
          scrollbar-width: thin !important;

          pre.ql-syntax {
            font-family: Inconsolata, monospace !important;
            border-radius: 6px !important;
            background-color: #333 !important;
            width: 100% !important;
          }
        }

        .ql-container:hover {
          scrollbar-color: #aaa transparent !important;
        }

        .ql-container:hover ::-webkit-scrollbar-thumb {
          background-color: var(--scroll-thumb-color);
          transition: background-color 0.25s;
        }

        .ql-container ::-webkit-scrollbar-thumb {
          background-color: #aaa !important;
          transition: background-color 0.25s !important;
        }

        .ql-container ::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          visibility: hidden !important;
        }

        .ql-container ::-webkit-scrollbar-thumb {
          background-clip: padding-box !important;
          border: 2px solid transparent !important;
          border-radius: 4px !important;
          background-color: transparen !importantt;
          transition: background-color 0.25s !important;
          min-height: 40px !important;
        }

        .ql-container ::-webkit-scrollbar-corner {
          background-color: transparent !important;
        }

        .ql-container ::-webkit-scrollbar-track {
          border-color: transparent !important;
          background-color: transparent !important;
          border: 2px solid transparent !important;
          visibility: hidden !important;
        }

        .ql-blank::before {
          display: none !important;
          font-size: 32px !important;
          font-style: normal !important;
          color: #888 !important;
          width: 100% !important;
          height: 100% !important;
          justify-content: center !important;
          align-items: center !important;
        }

        .ql-editor {
          font-family: 'Lato';
          font-size: 1.5em !important;
          width: 100% !important;
          padding: 16px 20px !important;
        }

        .ql-editor.font-sans-serif {
          font-family: 'Lato';
        } 

        .ql-editor.font-serif {
          font-family: 'Merriweather';
        } 

        .ql-editor.font-mono {
          font-family: 'Inconsolata';
        } 

        .ql-editor.font-comic {
          font-family: 'Bangers';
        } 

        .ql-editor.font-comic2 {
          font-family: 'Comic Neue';
        } 

        .ql-editor.font-writing {
          font-family: 'Sriracha';
        } 

        .ql-editor.font-writing2 {
          font-family: 'Indie Flower';
        } 

        .ql-editor p, h1, h2, ul, li {
          width: max-content;
          max-width: 100%;
        }

        .ql-editor .ql-align-right,.ql-align-justify,.ql-align-center {
          width: 100% !important;
        }

        /* Emoji tweaks - drop background bc of SVG security */
        .ap {
          display: inline !important;
          background-image: none !important;
        }

        .ql-emojiblot {
          line-height: 100% !important;
          margin: 0px 4px !important;
        }

        .ap {
          vertical-align: baseline !important;
        }

        h1 .ap {
          font-size: 32px !important;
          margin: 0px 4px !important;
        }

        h2 .ap {
          font-size: 24px !important;
          margin: 0px 2px !important;
        }

        ${styleTag.innerHTML}
      `;

      res();
    };

    document.head.appendChild(linkTag);
  });
}

export function hasQuill(networkId) {
  return !!quills[networkId];
}

export function destroyQuill(networkId) {
  const id = `#quill-${networkId}`;
  const node = document.body.shadowRoot.querySelector(id);

  if (node) {
    node.parentElement.removeChild(node);
  }

  if (quills[networkId]) {
    quills[networkId].quill.enable(false);
  }

  delete quills[networkId];
}

export function getQuill(networkId) {
  if (quills[networkId]) return quills[networkId].quill;

  const el = document.createElement("div");
  const id = `quill-${networkId}`;
  el.setAttribute("id", id);
  el.classList.add("quill-editor-wrap");
  el.classList.add("fast-show-when-popped");

  const styleTag = document.createElement("style");
  styleTag.innerHTML = quillStyles;

  const editor = document.createElement("div");
  editor.setAttribute("id", `${id}-editor`);
  editor.setAttribute(
    "style",
    `border-radius: 6px 6px 0 0; box-shadow: 0px 12px 28px #111749cc; z-index: 10; width: ${EDITOR_WIDTH}px; height: ${EDITOR_HEIGHT}px; background-color: white`
  ); // TODO JEL styling based upon colors
  el.prepend(editor);

  const toolbar = {
    container: [
      [{ header: 1 }, { header: 2 }], // custom button values
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["emoji"],
      ["code-block"],

      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }]
    ],
    handlers: { emoji: function() {} }
  };

  document.body.shadowRoot.querySelector("#jel-ui-wrap").appendChild(el);
  const messages = getMessages();

  quills[networkId] = {
    quill: new Quill(`#${id}-editor`, {
      modules: {
        /*
         * TODO highlighting - need to inline CSS
         * syntax: { highlight: c => hljs.highlightAuto(c).value }, */
        toolbar,
        "emoji-textarea": true,
        "emoji-shortname": true
      },
      theme: "bubble",
      placeholder: messages["text-editor.placeholder"]
    }),
    lastUpdated: performance.now()
  };
  editor.prepend(styleTag);

  // Prevent cycling via tab
  document.body.shadowRoot.querySelector(`#${id}-editor [contenteditable=true]`).tabIndex = -1;

  return getQuill(networkId);
}

let scratchQuill = null;

function getScratchQuill() {
  if (!scratchQuill) {
    scratchQuill = getQuill("scratch");
  }

  return scratchQuill;
}

export function htmlToDelta(html) {
  return getScratchQuill().clipboard.convert(html);
}

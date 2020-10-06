import Quill from "quill";

// Create one quill for initial renders of text upon spawn
// Create one quill for on-screen text editor
// Create a map of network id -> quill for each 'active' text being edited for continuous rendering.
const quills = {};

let quillStyles;

export function initQuillPool() {
  // Load quill styles out of <link> tag, which is in its own webpack chunk.
  const cssUrl = document.querySelector("link[href*=quill-styles]").href;

  // Need to load CSS again because webpack does not seem to want to let us add
  // crossorigin=anonymous
  const linkTag = document.createElement("link");
  linkTag.setAttribute("href", cssUrl);
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
      }
      ${styleTag.innerHTML}
    `;
  };

  document.head.appendChild(linkTag);
}

export function hasQuill(networkId) {
  return !!quills[networkId];
}

export function destroyQuill(networkId) {
  const id = `#quill-${networkId}`;
  const node = document.querySelector(id);

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
  el.classList.add("quill-background");
  el.setAttribute("style", `left: ${Object.values(quills).length * 355}px;`);

  const styleTag = document.createElement("style");
  styleTag.innerHTML = quillStyles;

  const editor = document.createElement("div");
  editor.setAttribute("id", `${id}-editor`);
  editor.setAttribute("style", "width: 355px; height: 200px; background-color: white"); // TODO JEL styling based upon colors
  el.prepend(editor);

  document.body.appendChild(el);
  quills[networkId] = { quill: new Quill(`#${id}-editor`, { theme: "snow" }), lastUpdated: performance.now() };
  editor.prepend(styleTag);

  return getQuill(networkId);
}

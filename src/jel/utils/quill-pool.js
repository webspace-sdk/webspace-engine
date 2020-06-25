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

    quillStyles = styleTag.innerHTML;
  };

  document.head.appendChild(linkTag);
}

export function hasQuill(networkId) {
  return !!quills[networkId];
}

export function destroyQuill(networkId) {
  const id = `quill-${networkId}`;
  const node = document.querySelector(id);

  if (node) {
    node.parentEl.removeChild(node);
  }

  delete quills[networkId];
}

export function getQuill(networkId) {
  if (quills[networkId]) return quills[networkId].quill;

  const el = document.createElement("div");
  const id = `quill-${networkId}`;
  el.setAttribute("id", id);
  el.classList.add("quill-background");

  const styleTag = document.createElement("style");
  styleTag.innerHTML = quillStyles;

  const editor = document.createElement("div");
  editor.setAttribute("id", `${id}-editor`);
  editor.setAttribute("style", "background-color: white"); // TODO styling based upon colors
  el.prepend(editor);

  document.body.appendChild(el);
  quills[networkId] = { quill: new Quill(`#${id}-editor`, { theme: "snow" }), lastUpdated: performance.now() };
  editor.prepend(styleTag);

  return getQuill(networkId);
}

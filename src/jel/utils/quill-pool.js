import Quill from "quill";

// Create one quill for initial renders of text upon spawn
// Create one quill for on-screen text editor
// Create a map of network id -> quill for each 'active' text being edited for continuous rendering.
const quills = {};

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

  document.body.appendChild(el);
  quills[networkId] = { quill: new Quill(`#${id}`, { theme: "snow" }), lastUpdated: performance.now() };
  return getQuill(networkId);
}

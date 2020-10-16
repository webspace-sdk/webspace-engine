export const isInEditableField = () =>
  ["TEXTAREA", "INPUT"].includes(document.activeElement && document.activeElement.nodeName) ||
  (document.activeElement && document.activeElement.contentEditable === "true");

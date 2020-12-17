const editableTagNames = ["TEXTAREA", "INPUT"];
export const isInEditableField = () =>
  editableTagNames.includes(document.activeElement && document.activeElement.nodeName) ||
  (document.activeElement &&
    (document.activeElement.contentEditable === "true" ||
      // Hacky, include emoji selector
      (document.activeElement.parentElement &&
        document.activeElement.parentElement.parentElement &&
        document.activeElement.parentElement.parentElement.classList.contains("emoji_completions"))));

export const isFocusedWithin = el => {
  let isFocusedWithin = false;
  let focusedEl = document.activeElement;

  while (focusedEl && focusedEl !== document.body) {
    if (focusedEl === el) {
      isFocusedWithin = true;
      break;
    }

    focusedEl = focusedEl.parentElement;
  }

  return isFocusedWithin;
};

export const toggleFocus = el => {
  if (isFocusedWithin(el)) {
    document.activeElement.blur();
  } else {
    el.focus();
  }
};

export const cancelEventIfFocusedWithin = (e, el) => {
  if (isFocusedWithin(el)) {
    e.preventDefault();
    e.stopPropagation();
  }
};

export const rgbToCssRgb = v => Math.floor(v * 255.0);

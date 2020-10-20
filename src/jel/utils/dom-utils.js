export const isInEditableField = () =>
  ["TEXTAREA", "INPUT"].includes(document.activeElement && document.activeElement.nodeName) ||
  (document.activeElement && document.activeElement.contentEditable === "true");

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

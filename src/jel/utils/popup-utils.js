import { useState, useEffect, useCallback } from "react";
import { usePopper } from "react-popper";
import { toggleFocus } from "./dom-utils";

const EMPTY = {};

export const showTargetBelowElement = (el, outerEl, targetEl, topOffset, leftOffset) => {
  const elRect = el.getBoundingClientRect();
  const outerRect = outerEl.getBoundingClientRect();
  const newTop = elRect.top - outerRect.top;
  const newLeft = elRect.left - outerRect.left;
  targetEl.setAttribute("style", `top: ${newTop + topOffset}px; left: ${newLeft - leftOffset}px;`);
  targetEl.focus();
};

export const showTargetAboveElement = (el, outerEl, targetEl, bottomOffset, leftOffset) => {
  const elRect = el.getBoundingClientRect();
  const outerRect = outerEl.getBoundingClientRect();
  const newBottom = elRect.bottom - outerRect.bottom;
  const newLeft = elRect.left - outerRect.left;
  const height = elRect.bottom - elRect.top;
  targetEl.setAttribute("style", `bottom: ${newBottom + bottomOffset + height}px; left: ${newLeft - leftOffset}px;`);
  targetEl.focus();
};

export function useAtomBoundPopupPopper(focusRef, initialPlacement = "bottom", initialOffset = [0, 0]) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popupElement, setPopupElement] = useState(null);
  const [atomId, setAtomId] = useState(null);
  const [atomMetadata, setAtomMetadata] = useState(null);
  const [placement, setPlacement] = useState(initialPlacement);
  const [offset, setOffset] = useState(initialOffset);
  const [popupOpenOptions, setPopupOpenOptions] = useState(EMPTY);

  const { styles, attributes, update } = usePopper(referenceElement, popupElement, {
    placement: placement,
    scroll: false,
    modifiers: [
      {
        name: "offset",
        options: {
          offset: offset
        }
      },
      {
        name: "eventListeners",
        options: {
          scroll: false,
          resize: true
        }
      }
    ]
  });

  useEffect(
    () => {
      const scene = AFRAME.scenes[0]; // TODO
      scene && scene.addEventListener("side_panel_resize_complete", update);
      () => scene && scene.removeEventListener("side_panel_resize_complete", update);
    },
    [update]
  );

  const show = useCallback(
    (newAtomId, newAtomMetadata, ref, newPlacement, newOffset, newPopupOpenOptions = null) => {
      if (newAtomId) setAtomId(newAtomId);
      if (newAtomMetadata) setAtomMetadata(newAtomMetadata);
      if (newPlacement) setPlacement(newPlacement);
      if (newOffset) setOffset(newOffset);
      if (ref && ref.current) setReferenceElement(ref.current);
      if (newPopupOpenOptions) setPopupOpenOptions(newPopupOpenOptions || EMPTY);

      const elToFocus = focusRef ? focusRef.current : popupElement;
      toggleFocus(elToFocus);
    },
    [focusRef, popupElement]
  );

  const setRef = useCallback(ref => setReferenceElement(ref.current), []);

  return {
    show,
    atomId,
    atomMetadata,
    popupElement,
    setPopup: setPopupElement,
    setRef,
    setPlacement,
    setOffset,
    styles,
    attributes,
    update,
    popupOpenOptions
  };
}

export function usePopupPopper(
  focusRefOrSelector,
  initialPlacement = "bottom",
  initialOffset = [0, 0],
  extraModifiers = []
) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popupElement, setPopupElement] = useState(null);
  const [placement, setPlacement] = useState(initialPlacement);
  const [offset, setOffset] = useState(initialOffset);
  const [popupOpenOptions, setPopupOpenOptions] = useState(EMPTY);

  const { styles, attributes, update } = usePopper(referenceElement, popupElement, {
    placement: placement,
    modifiers: [
      {
        name: "offset",
        options: {
          offset: offset
        }
      },
      {
        name: "eventListeners",
        options: {
          scroll: false,
          resize: true
        }
      },
      ...extraModifiers
    ]
  });

  useEffect(
    () => {
      const scene = AFRAME.scenes[0]; // TODO
      scene && scene.addEventListener("side_panel_resize_complete", update);
      () => scene && scene.removeEventListener("side_panel_resize_complete", update);
    },
    [update]
  );

  const show = useCallback(
    (ref, newPlacement, newOffset, newPopupOpenOptions = null) => {
      if (newPlacement) setPlacement(newPlacement);
      if (newOffset) setOffset(newOffset);
      if (ref && ref.current) setReferenceElement(ref.current);
      if (newPopupOpenOptions) setPopupOpenOptions(newPopupOpenOptions || EMPTY);

      let elToFocus;

      if (typeof focusRefOrSelector === "string") {
        elToFocus = DOM_ROOT.querySelector(focusRefOrSelector);
      } else {
        elToFocus = focusRefOrSelector ? focusRefOrSelector.current : popupElement;
      }

      toggleFocus(elToFocus);
    },
    [focusRefOrSelector, popupElement]
  );

  const setRef = useCallback(ref => setReferenceElement(ref.current), []);

  return {
    show,
    popupElement,
    setPopup: setPopupElement,
    setRef,
    setPlacement,
    setOffset,
    styles,
    attributes,
    popupOpenOptions,
    update
  };
}

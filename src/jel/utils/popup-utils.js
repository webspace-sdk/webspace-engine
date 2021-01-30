import { useState, useCallback } from "react";
import { usePopper } from "react-popper";
import { toggleFocus } from "./dom-utils";

const EMPTY = {};

export function useAtomBoundPopupPopper(focusRef, initialPlacement = "bottom", initialOffset = [0, 0]) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popupElement, setPopupElement] = useState(null);
  const [atomId, setAtomId] = useState(null);
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

  const show = useCallback(
    (newAtomId, ref, newPlacement, newOffset, newPopupOpenOptions = null) => {
      if (newAtomId) setAtomId(newAtomId);
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
      ...extraModifiers,
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

  const show = useCallback(
    (ref, newPlacement, newOffset, newPopupOpenOptions = null) => {
      if (newPlacement) setPlacement(newPlacement);
      if (newOffset) setOffset(newOffset);
      if (ref && ref.current) setReferenceElement(ref.current);
      if (newPopupOpenOptions) setPopupOpenOptions(newPopupOpenOptions || EMPTY);

      let elToFocus;

      if (typeof focusRefOrSelector === "string") {
        elToFocus = document.querySelector(focusRefOrSelector);
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

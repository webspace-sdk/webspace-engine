import { useState, useCallback } from "react";
import { usePopper } from "react-popper";
import { toggleFocus } from "./dom-utils";

const EMPTY = {};

export function useHubBoundPopupPopper(focusRef, initialPlacement = "bottom", initialOffset = [0, 0]) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popupElement, setPopupElement] = useState(null);
  const [hubId, setHubId] = useState(null);
  const [placement, setPlacement] = useState(initialPlacement);
  const [offset, setOffset] = useState(initialOffset);
  const [popupOpenOptions, setPopupOpenOptions] = useState(EMPTY);

  const { styles, attributes } = usePopper(referenceElement, popupElement, {
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
          resize: false
        }
      }
    ]
  });

  const show = useCallback(
    (newHubId, ref, newPlacement, newOffset, newPopupOpenOptions = EMPTY) => {
      if (newHubId !== hubId) setHubId(newHubId);
      if (newPlacement) setPlacement(newPlacement);
      if (newOffset) setOffset(newOffset);
      if (ref && ref.current) setReferenceElement(ref.current);
      if (newPopupOpenOptions) setPopupOpenOptions(newPopupOpenOptions || EMPTY);

      const elToFocus = focusRef ? focusRef.current : popupElement;
      toggleFocus(elToFocus);
    },
    [hubId, focusRef, popupElement]
  );

  const setRef = useCallback(ref => setReferenceElement(ref.current), []);

  return {
    show,
    hubId,
    popupElement,
    setPopup: setPopupElement,
    setRef,
    setPlacement,
    setOffset,
    styles,
    attributes,
    popupOpenOptions
  };
}

export function usePopupPopper(focusRef, initialPlacement = "bottom", initialOffset = [0, 0]) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popupElement, setPopupElement] = useState(null);
  const [placement, setPlacement] = useState(initialPlacement);
  const [offset, setOffset] = useState(initialOffset);
  const [popupOpenOptions, setPopupOpenOptions] = useState(EMPTY);

  const { styles, attributes } = usePopper(referenceElement, popupElement, {
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
          resize: false
        }
      }
    ]
  });

  const show = useCallback(
    (ref, newPlacement, newOffset, newPopupOpenOptions = EMPTY) => {
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
    popupElement,
    setPopup: setPopupElement,
    setRef,
    setPlacement,
    setOffset,
    styles,
    attributes,
    popupOpenOptions
  };
}

import { useState } from "react";
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
    modifiers: [
      {
        name: "offset",
        options: {
          offset: offset
        }
      }
    ]
  });

  const show = (newHubId, ref, newPlacement, newOffset, newPopupOpenOptions = EMPTY) => {
    if (newHubId !== hubId) setHubId(newHubId);
    if (newPlacement && newPlacement !== placement) setPlacement(newPlacement);
    if (newOffset && newOffset !== offset) setOffset(newOffset);
    if (ref && ref.current !== referenceElement) setReferenceElement(ref.current);
    if (newPopupOpenOptions !== popupOpenOptions) setPopupOpenOptions(newPopupOpenOptions || EMPTY);

    const elToFocus = focusRef ? focusRef.current : popupElement;

    if (popupOpenOptions.toggle) {
      toggleFocus(elToFocus);
    } else {
      elToFocus.focus();
    }

    // HACK, once popper has positioned the context/rename popups, remove this ref
    // since otherwise popper will re-render everything if pane is scrolled
    setTimeout(() => setReferenceElement(null), 0);
  };

  return {
    show,
    hubId,
    popupElement,
    setPopup: setPopupElement,
    setRef: ref => setReferenceElement(ref.current),
    setPlacement,
    setOffset,
    styles,
    attributes,
    popupOpenOptions
  };
}

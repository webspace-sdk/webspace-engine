import { useState } from "react";
import { usePopper } from "react-popper";

export function useHubBoundPopupPopper(focusRef, initialPlacement = "bottom", initialOffset = [0, 0]) {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popupElement, setPopupElement] = useState(null);
  const [hubId, setHubId] = useState(null);
  const [placement, setPlacement] = useState(initialPlacement);
  const [offset, setOffset] = useState(initialOffset);
  const [popupOpenOptions, setPopupOpenOptions] = useState({});

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

  const show = (hubId, ref, placement, offset, popupOpenOptions) => {
    setHubId(hubId);
    if (placement) setPlacement(placement);
    if (offset) setOffset(offset);
    if (ref && ref.current) setReferenceElement(ref.current);
    setPopupOpenOptions(popupOpenOptions || {});

    if (focusRef) {
      focusRef.current.focus();
    } else {
      popupElement.focus();
    }

    // HACK, once popper has positioned the context/rename popups, remove this ref
    // since otherwise popper will re-render everything if pane is scrolled
    setTimeout(() => setReferenceElement(null), 0);
  };

  return {
    show,
    hubId,
    setPopup: setPopupElement,
    setRef: ref => setReferenceElement(ref.current),
    setPlacement,
    setOffset,
    styles,
    attributes,
    popupOpenOptions
  };
}

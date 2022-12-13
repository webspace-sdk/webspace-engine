import PropTypes from "prop-types";
import React, { useState, forwardRef, useCallback } from "react";
import ReactDOM from "react-dom";
import EmojiPicker from "./emoji-picker";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("popup-root")));

const EmojiPopup = forwardRef(({ styles, attributes, setPopperElement, onEmojiSelected }, ref) => {
  const [hasBeenFocused, setHasBeenFocused] = useState(false);

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      onFocus={useCallback(
        () => {
          if (!hasBeenFocused) setHasBeenFocused(true);
        },
        [hasBeenFocused]
      )}
      style={styles.popper}
      {...attributes.popper}
    >
      <EmojiPicker
        loadEmojiGrid={hasBeenFocused}
        className="slide-down-when-popped"
        onEmojiSelected={onEmojiSelected}
        ref={ref}
      />
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
});

EmojiPopup.displayName = "EmojiPopup";
EmojiPopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  setPopperElement: PropTypes.func,
  onEmojiSelected: PropTypes.func
};

export default EmojiPopup;

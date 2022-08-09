import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import ReactDOM from "react-dom";
import EmojiPicker from "./emoji-picker";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.body.shadowRoot.getElementById("jel-popup-root")));

const EmojiPopup = forwardRef(({ styles, attributes, setPopperElement, onEmojiSelected }, ref) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <EmojiPicker className="slide-down-when-popped" onEmojiSelected={onEmojiSelected} ref={ref} />
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

import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import ReactDOM from "react-dom";
import NameInputPanel from "./name-input-panel";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const RenamePopup = forwardRef(({ styles, attributes, atomMetadata, setPopperElement, onNameChanged, atomId }, ref) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <NameInputPanel
        className={sharedStyles.slideDownWhenPopped}
        atomId={atomId}
        atomMetadata={atomMetadata}
        onNameChanged={onNameChanged}
        ref={ref}
      />
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
});

RenamePopup.displayName = "RenamePopup";
RenamePopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  atomMetadata: PropTypes.object,
  setPopperElement: PropTypes.func,
  onNameChanged: PropTypes.func,
  atomId: PropTypes.string
};

export default RenamePopup;

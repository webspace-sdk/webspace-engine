import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import ReactDOM from "react-dom";
import ConfirmModalPanel from "./confirm-modal-panel";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const ConfirmModalPopup = forwardRef(({ styles, attributes, setPopperElement, atomId, atomMetadata }, ref) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <ConfirmModalPanel
        className={sharedStyles.slideDownWhenPopped}
        atomId={atomId}
        atomMetadata={atomMetadata}
        ref={ref}
      />
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
});

ConfirmModalPopup.displayName = "ConfirmModalPopup";
ConfirmModalPopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  setPopperElement: PropTypes.func,
  atomId: PropTypes.string,
  atomMetadata: PropTypes.object
};

export default ConfirmModalPopup;

import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import styled from "styled-components";
import ReactDOM from "react-dom";
import ConfirmModalPanel from "./confirm-modal-panel";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.body.shadowRoot.getElementById("jel-popup-root")));

// Extremely hacky modal overlay background
// Modal is not centered so need 2x spillover
const Background = styled.div`
  position: absolute;
  width: 200vw;
  height: 200vh;
  top: -100vh;
  left: -100vw;
  background: rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: -1;
`;

const ConfirmModalPopup = forwardRef(({ styles, attributes, setPopperElement, atomId, atomMetadata }, ref) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <Background className="modal-background" />
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

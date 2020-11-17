import PropTypes from "prop-types";
import React, { forwardRef } from "react";
import ReactDOM from "react-dom";
import HubNameInputPanel from "./hub-name-input-panel";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const HubRenamePopup = forwardRef(
  ({ styles, attributes, hubMetadata, setPopperElement, onNameChanged, hubId }, ref) => {
    const popupInput = (
      <div
        tabIndex={-1} // Ensures can be focused
        className={sharedStyles.showWhenPopped}
        ref={setPopperElement}
        style={styles.popper}
        {...attributes.popper}
      >
        <HubNameInputPanel
          className={sharedStyles.slideDownWhenPopped}
          hubId={hubId}
          hubMetadata={hubMetadata}
          onNameChanged={onNameChanged}
          ref={ref}
        />
      </div>
    );

    return ReactDOM.createPortal(popupInput, popupRoot);
  }
);

HubRenamePopup.displayName = "HubRenamePopup";
HubRenamePopup.propTypes = {
  styles: PropTypes.object,
  attributes: PropTypes.object,
  hubMetadata: PropTypes.object,
  setPopperElement: PropTypes.func,
  onNameChanged: PropTypes.func,
  hubId: PropTypes.string
};

export default HubRenamePopup;

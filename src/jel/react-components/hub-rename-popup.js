import React from "react";
import ReactDOM from "react-dom";
import PopupHubNameInput from "./popup-hub-name-input";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import sharedStyles from "../assets/stylesheets/shared.scss";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

function HubRenamePopup({ styles, attributes, hubMetadata, setPopperElement, onNameChanged, hubId }) {
  const metadata = hubMetadata.getMetadata(hubId);

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupHubNameInput hubId={hubId} hubMetadata={metadata} onNameChanged={onNameChanged} />
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
}

export default HubRenamePopup;

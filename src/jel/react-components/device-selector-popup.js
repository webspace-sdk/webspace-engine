import React from "react";
import ReactDOM from "react-dom";
import sharedStyles from "../assets/stylesheets/shared.scss";
import checkIcon from "../assets/images/icons/check.svgi";
import PopupPanelMenu, { PopupPanelMenuItem, PopupPanelMenuSectionHeader } from "./popup-panel-menu";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const DeviceSelectorPopup = ({ setPopperElement, styles, attributes, children }) => {
  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu>
        <PopupPanelMenuSectionHeader>Input Device</PopupPanelMenuSectionHeader>
        <PopupPanelMenuItem>AT202USB+ Analog Stereo</PopupPanelMenuItem>
        <PopupPanelMenuItem iconSrc={checkIcon}>ThinkPad Thunderbold 3 Dock USB Audio Multichannel</PopupPanelMenuItem>
        <PopupPanelMenuItem>Default Microphone</PopupPanelMenuItem>
      </PopupPanelMenu>
      {children}
    </div>
  );

  return ReactDOM.createPortal(popupInput, popupRoot);
};

export { DeviceSelectorPopup as default };

import React from "react";
import PopupMenu, { PopupMenuItem } from "./popup-menu";
import PopupPanelMenu, { PopupPanelMenuItem, PopupPanelMenuSectionHeader } from "./popup-panel-menu";
import sharedStyles from "../../assets/stylesheets/shared.scss";
import classNames from "classnames";
import addIcon from "../assets/images/icons/add.svgi";
import checkIcon from "../assets/images/icons/check.svgi";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "400px", height: "400px" }}>
    <div style={{ position: "absolute", top: "30px", left: "30px" }}>
      <PopupMenu>
        <PopupMenuItem iconSrc={addIcon}>Add Duplicate</PopupMenuItem>
        <PopupMenuItem>Export...</PopupMenuItem>
      </PopupMenu>
    </div>
  </div>
);

export const Panel = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "400px", height: "400px" }}>
    <div style={{ position: "absolute", top: "30px", left: "30px" }}>
      <PopupPanelMenu>
        <PopupPanelMenuSectionHeader>Input Device</PopupPanelMenuSectionHeader>
        <PopupPanelMenuItem>AT202USB+ Analog Stereo</PopupPanelMenuItem>
        <PopupPanelMenuItem iconSrc={checkIcon}>ThinkPad Thunderbold 3 Dock USB Audio Multichannel</PopupPanelMenuItem>
        <PopupPanelMenuItem>Default Microphone</PopupPanelMenuItem>
      </PopupPanelMenu>
    </div>
  </div>
);

export default {
  title: "Popup Menu"
};

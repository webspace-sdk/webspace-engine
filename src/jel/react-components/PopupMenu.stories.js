import React from "react";
import { PopupMenu, PopupMenuItem } from "./popup-menu";
import sharedStyles from "../assets/stylesheets/shared.scss";
import classNames from "classnames";
import addIcon from "../assets/images/icons/add.svgi";
import trashIcon from "../assets/images/icons/trash.svgi";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "400px", height: "400px" }}>
    <div style={{ position: "absolute", top: "30px", left: "30px" }}>
      <PopupMenu>
        <PopupMenuItem iconSrc={addIcon}>Add Duplicate</PopupMenuItem>
        <PopupMenuItem>Export...</PopupMenuItem>
        <PopupMenuItem iconSrc={trashIcon}>Move to Trash</PopupMenuItem>
      </PopupMenu>
    </div>
  </div>
);

export default {
  title: "Popup Menu"
};

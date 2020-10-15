import React from "react";
import PopupHubNameInput from "./popup-text-input";
import sharedStyles from "../assets/stylesheets/shared.scss";
import classNames from "classnames";

export const Normal = () => (
  <div className={classNames(sharedStyles.basePanel)} style={{ display: "flex", width: "400px", height: "400px" }}>
    <div style={{ position: "absolute", top: "30px", left: "30px" }}>
      <PopupHubNameInput />
    </div>
  </div>
);

export default {
  title: "Popup Text Input"
};

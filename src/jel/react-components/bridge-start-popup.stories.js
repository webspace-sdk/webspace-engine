import React, { useEffect } from "react";
import BridgeStartPopup from "./bridge-start-popup";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

export const Normal = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <BridgeStartPopup styles={{}} attributes={{}} />
    </div>
  );
};

export default {
  title: "Bridge Start Popup"
};

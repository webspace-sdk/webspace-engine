import React, { useEffect } from "react";
import NotificationsPopup from "./notifications-popup";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

export const Normal = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <NotificationsPopup styles={{}} attributes={{}} />
    </div>
  );
};

export default {
  title: "Notifications Popup"
};

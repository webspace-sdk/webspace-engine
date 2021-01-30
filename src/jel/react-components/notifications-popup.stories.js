import React, { useEffect } from "react";
import SpaceNotificationsPopup from "./space-notifications-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";

export const Space = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <SpaceNotificationsPopup styles={{}} attributes={{}} />
    </div>
  );
};

export const Hub = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <HubNotificationsPopup styles={{}} attributes={{}} hub={{ name: "My Hub" }} />
    </div>
  );
};

export default {
  title: "Notifications Popup"
};

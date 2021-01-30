import React, { useEffect } from "react";
import SpaceNotificationsPopup from "./space-notifications-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import AccountChannel from "../utils/account-channel";
import Subscriptions from "../utils/account-channel";

window.APP = { accountChannel: new AccountChannel() };
const subscriptions = new Subscriptions();

export const Space = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <SpaceNotificationsPopup styles={{}} attributes={{}} subscriptions={subscriptions} />
    </div>
  );
};

export const Hub = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  return (
    <div>
      <HubNotificationsPopup styles={{}} attributes={{}} hub={{ name: "My Hub" }} subscriptions={subscriptions} />
    </div>
  );
};

export default {
  title: "Notifications Popup"
};

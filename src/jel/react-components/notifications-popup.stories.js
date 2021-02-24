import React, { useEffect } from "react";
import SpaceNotificationsPopup from "./space-notifications-popup";
import HubNotificationsPopup from "./hub-notifications-popup";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import Subscriptions from "../utils/account-channel";

const subscriptions = new Subscriptions();

export const Space = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  subscriptions.subscribed = false;

  return (
    <div>
      <SpaceNotificationsPopup styles={{}} attributes={{}} subscriptions={subscriptions} />
    </div>
  );
};

export const SpaceSubscribed = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  subscriptions.subscribed = true;

  return (
    <div>
      <SpaceNotificationsPopup styles={{}} attributes={{}} subscriptions={subscriptions} />
    </div>
  );
};

export const Hub = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());

  subscriptions.subscribed = false;
  return (
    <div>
      <HubNotificationsPopup
        styles={{}}
        attributes={{}}
        hub={{ hub_id: "abc123", name: "My Hub" }}
        subscriptions={subscriptions}
        hubSettings={{ abc123: { notify_joins: true } }}
      />
    </div>
  );
};

export const HubSubscribed = () => {
  useEffect(() => document.querySelector(`.${sharedStyles.showWhenPopped}`).focus());
  subscriptions.subscribed = true;

  return (
    <div>
      <HubNotificationsPopup
        styles={{}}
        attributes={{}}
        hub={{ hub_id: "abc123", name: "My Hub" }}
        subscriptions={subscriptions}
        hubSettings={{ abc123: { notify_joins: true } }}
      />
    </div>
  );
};

export default {
  title: "Notifications Popup"
};

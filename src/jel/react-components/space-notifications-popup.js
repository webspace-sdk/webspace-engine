import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import NotificationRequestPanel from "./notification-request-panel";
import { FormattedMessage } from "react-intl";
import { checkboxControlFor, PanelWrap } from "./form-components";
import { membershipSettingsForSpaceId } from "../utils/membership-utils";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const SpaceNotificationsPopup = ({
  setPopperElement,
  styles,
  attributes,
  children,
  subscriptions,
  memberships,
  spaceId
}) => {
  const { accountChannel } = window.APP;
  const [notifySpaceCopresence, setNotifySpaceCopresence] = useState("");
  const [notifyHubCopresence, setNotifyHubCopresence] = useState("");
  const [notifyChat, setNotifyChat] = useState("");
  const [isPushSubscribed, setIsPushSubscribed] = useState(subscriptions && subscriptions.subscribed);

  useEffect(
    () => {
      const handler = () => {
        const membershipSettings = membershipSettingsForSpaceId(spaceId, memberships);
        if (membershipSettings) {
          setNotifySpaceCopresence(membershipSettings.notifySpaceCopresence);
          setNotifyHubCopresence(membershipSettings.notifyHubCopresence);
          setNotifyChat(membershipSettings.notifyChatMode === "all");
        }
      };
      handler();
      accountChannel.addEventListener("account_refresh", handler);
      return () => accountChannel.removeEventListener("account_refresh", handler);
    },
    [accountChannel, memberships, spaceId]
  );

  useEffect(
    () => {
      const handler = () => setIsPushSubscribed(subscriptions.subscribed);
      subscriptions.addEventListener("subscriptions_updated", handler);
      return () => subscriptions.removeEventListener("subscriptions_updated", handler);
    },
    [subscriptions, setIsPushSubscribed]
  );

  const spaceNotifyOnChange = useCallback(
    value => {
      accountChannel.updateMembership(spaceId, value, notifyHubCopresence, notifyChat ? "all" : "none");
    },
    [spaceId, notifyHubCopresence, notifyChat, accountChannel]
  );

  const hubNotifyOnChange = useCallback(
    value => {
      accountChannel.updateMembership(spaceId, notifySpaceCopresence, value, notifyChat ? "all" : "none");
    },
    [spaceId, notifySpaceCopresence, notifyChat, accountChannel]
  );

  const notifyChatOnChange = useCallback(
    value => {
      accountChannel.updateMembership(spaceId, notifySpaceCopresence, notifyHubCopresence, value ? "all" : "none");
    },
    [spaceId, notifySpaceCopresence, notifyHubCopresence, accountChannel]
  );

  const onEnableNotificationsClicked = useCallback(
    e => {
      e.preventDefault();
      subscriptions.subscribe();
    },
    [subscriptions]
  );

  let contents;

  if (isPushSubscribed) {
    contents = (
      <PanelWrap>
        <PanelSectionHeader style={{ marginLeft: 0 }}>
          <FormattedMessage id="space-notifications-popup.space-settings" />
        </PanelSectionHeader>
        {checkboxControlFor(
          "notify_space_copresence",
          "space-notifications-popup.notify_space_copresence",
          notifySpaceCopresence,
          setNotifySpaceCopresence,
          spaceNotifyOnChange
        )}
        {checkboxControlFor(
          "notify_hub_copresence",
          "space-notifications-popup.notify_hub_copresence",
          notifyHubCopresence,
          setNotifyHubCopresence,
          hubNotifyOnChange
        )}
        {checkboxControlFor(
          "notify_chat",
          "space-notifications-popup.notify_chat",
          notifyChat,
          setNotifyChat,
          notifyChatOnChange
        )}
      </PanelWrap>
    );
  } else {
    contents = <NotificationRequestPanel onEnableClicked={onEnableNotificationsClicked} />;
  }

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className={sharedStyles.showWhenPopped}
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "36px 0px", borderRadius: "12px" }} className={sharedStyles.slideUpWhenPopped}>
        {contents}
      </PopupPanelMenu>
      {children}
    </div>
  );

  if (popupRoot) {
    return ReactDOM.createPortal(popupInput, popupRoot);
  } else {
    return popupInput;
  }
};

SpaceNotificationsPopup.propTypes = {
  subscriptions: PropTypes.object,
  spaceId: PropTypes.string
};

export { SpaceNotificationsPopup as default };

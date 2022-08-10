import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import NotificationRequestPanel from "./notification-request-panel";
import { FormattedMessage } from "react-intl";
import { PanelWrap, checkboxControlFor } from "./form-components";
import { hubSettingsForHubId } from "../utils/membership-utils";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = UI_ROOT.getElementById("jel-popup-root")));

const HubNotificationsPopup = ({ setPopperElement, styles, attributes, subscriptions, hubSettings, hub, children }) => {
  const { accountChannel } = window.APP;

  const [notifyJoins, setNotifyJoins] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(subscriptions && subscriptions.subscribed);

  useEffect(
    () => {
      const handler = () => {
        if (!hub) return;
        const settings = hubSettingsForHubId(hub.hub_id, hubSettings);
        if (settings) {
          setNotifyJoins(settings.notifyJoins);
        } else {
          setNotifyJoins(false);
        }
      };
      handler();
      accountChannel.addEventListener("account_refresh", handler);
      return () => accountChannel.removeEventListener("account_refresh", handler);
    },
    [accountChannel, hubSettings, hub]
  );

  useEffect(
    () => {
      const handler = () => setIsPushSubscribed(subscriptions.subscribed);
      subscriptions.addEventListener("subscriptions_updated", handler);
      return () => subscriptions.removeEventListener("subscriptions_updated", handler);
    },
    [subscriptions, setIsPushSubscribed]
  );

  const notifyJoinsOnChange = useCallback(
    value => {
      accountChannel.updateHubSettings(hub.hub_id, value);
    },
    [hub, accountChannel]
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
          <FormattedMessage id="hub-notifications-popup.world-settings" />
        </PanelSectionHeader>
        {checkboxControlFor(
          "notify_joins",
          "hub-notifications-popup.notify_joins",
          notifyJoins,
          setNotifyJoins,
          notifyJoinsOnChange
        )}
      </PanelWrap>
    );
  } else {
    contents = <NotificationRequestPanel onEnableClicked={onEnableNotificationsClicked} />;
  }

  const popupInput = (
    <div
      tabIndex={-1} // Ensures can be focused
      className="show-when-popped"
      ref={setPopperElement}
      style={styles.popper}
      {...attributes.popper}
    >
      <PopupPanelMenu style={{ padding: "32px 0px", borderRadius: "12px" }} className="slide-up-when-popped">
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

HubNotificationsPopup.propTypes = {
  hub: PropTypes.object,
  subscriptions: PropTypes.object,
  hubSettings: PropTypes.array
};

export { HubNotificationsPopup as default };

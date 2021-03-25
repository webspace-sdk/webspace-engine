import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import sharedStyles from "../../assets/jel/stylesheets/shared.scss";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import NotificationRequestPanel from "./notification-request-panel";
import { FormattedMessage } from "react-intl";
import { checkboxControlFor, Label, PanelWrap, Radio, InputWrap } from "./form-components";
import { membershipSettingsForSpaceId } from "../utils/membership-utils";
import styled from "styled-components";

let popupRoot = null;
waitForDOMContentLoaded().then(() => (popupRoot = document.getElementById("jel-popup-root")));

const RadioWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  min-width: 100px;
`;

const SpaceNotificationsPopup = ({
  setPopperElement,
  styles,
  attributes,
  children,
  subscriptions,
  memberships,
  matrix,
  spaceId
}) => {
  const { accountChannel } = window.APP;
  const [notifySpaceCopresence, setNotifySpaceCopresence] = useState("");
  const [notifyHubCopresence, setNotifyHubCopresence] = useState("");
  const [notifyCurrentWorldChat, setNotifyCurrentWorldChat] = useState("");
  const [notifyChannelChat, setNotifyChannelChat] = useState("none");
  const [isPushSubscribed, setIsPushSubscribed] = useState(subscriptions && subscriptions.subscribed);

  useEffect(
    () => {
      const handler = () => {
        const membershipSettings = membershipSettingsForSpaceId(spaceId, memberships);
        if (membershipSettings) {
          setNotifySpaceCopresence(membershipSettings.notifySpaceCopresence);
          setNotifyHubCopresence(membershipSettings.notifyHubCopresence);
          setNotifyCurrentWorldChat(membershipSettings.notifyCurrentWorldChatMode === "all");
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
      if (!matrix || !spaceId) return;

      const handler = async () => {
        const mode = await matrix.getNotifyChannelChatModeForSpace(spaceId);

        if (mode) {
          setNotifyChannelChat(mode);
        }
      };

      matrix.addEventListener("push_rules_changed", handler);
      return () => matrix.removeEventListener("push_rules_changed", handler);
    },
    [spaceId, matrix]
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
      accountChannel.updateMembership(spaceId, value, notifyHubCopresence, notifyCurrentWorldChat ? "all" : "none");
    },
    [spaceId, notifyHubCopresence, notifyCurrentWorldChat, accountChannel]
  );

  const hubNotifyOnChange = useCallback(
    value => {
      accountChannel.updateMembership(spaceId, notifySpaceCopresence, value, notifyCurrentWorldChat ? "all" : "none");
    },
    [spaceId, notifySpaceCopresence, notifyCurrentWorldChat, accountChannel]
  );

  const notifyCurrentWorldChatOnChange = useCallback(
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
          "notify_current_world_chat",
          "space-notifications-popup.notify_current_world_chat",
          notifyCurrentWorldChat,
          setNotifyCurrentWorldChat,
          notifyCurrentWorldChatOnChange
        )}
        <InputWrap style={{ minHeight: "48px", marginLeft: "24px" }}>
          <RadioWrap>
            <Radio
              type="radio"
              id={"channel_chat_mode_all"}
              name={"channel_chat_mode"}
              checked={notifyChannelChat === "all"}
              value={"all"}
            />
            <Label htmlFor="world_type_flat" style={{ cursor: "pointer" }}>
              <FormattedMessage id="environment-settings-popup.world-type-flat" />
            </Label>
          </RadioWrap>
          <RadioWrap>
            <Radio
              type="radio"
              id={"channel_chat_mode_all"}
              name={"channel_chat_mode"}
              checked={notifyChannelChat === "all"}
              value={"all"}
            />
            <Label htmlFor="world_type_flat" style={{ cursor: "pointer" }}>
              <FormattedMessage id="environment-settings-popup.world-type-flat" />
            </Label>
          </RadioWrap>
        </InputWrap>
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
      <PopupPanelMenu style={{ padding: "32px 0px", borderRadius: "12px" }} className={sharedStyles.slideUpWhenPopped}>
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
  spaceId: PropTypes.string,
  matrix: PropTypes.object
};

export { SpaceNotificationsPopup as default };

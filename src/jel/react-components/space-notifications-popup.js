import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import PopupPanelMenu from "./popup-panel-menu";
import PanelSectionHeader from "./panel-section-header";
import NotificationRequestPanel from "./notification-request-panel";
import { FormattedMessage } from "react-intl";
import { checkboxControlFor, Label, PanelWrap, Radio, InputWrap } from "./form-components";
import { membershipSettingsForSpaceId } from "../utils/membership-utils";
import styled from "styled-components";

let popupRoot = null;
waitForShadowDOMContentLoaded().then(() => (popupRoot = DOM_ROOT.getElementById("jel-popup-root")));

const RadioWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  min-width: 200px;
  width: 200px;
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

      handler();
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

  const onNotifyChannelChangeAll = useCallback(
    e => {
      if (e.target.checked) {
        matrix.setNotifyChannelChatModeForSpace(spaceId, "all");
      }
    },
    [matrix, spaceId]
  );

  const onNotifyChannelChangeMentions = useCallback(
    e => {
      if (e.target.checked) {
        matrix.setNotifyChannelChatModeForSpace(spaceId, "mentions");
      }
    },
    [matrix, spaceId]
  );

  const onNotifyChannelChangeNone = useCallback(
    e => {
      if (e.target.checked) {
        matrix.setNotifyChannelChatModeForSpace(spaceId, "none");
      }
    },
    [matrix, spaceId]
  );

  let contents;

  if (isPushSubscribed) {
    contents = (
      <PanelWrap>
        <PanelSectionHeader style={{ marginLeft: 0 }}>
          <FormattedMessage id="space-notifications-popup.join-settings" />
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
        <PanelSectionHeader style={{ marginLeft: 0 }}>
          <FormattedMessage id="space-notifications-popup.chat-settings" />
        </PanelSectionHeader>
        {checkboxControlFor(
          "notify_current_world_chat",
          "space-notifications-popup.notify_current_world_chat",
          notifyCurrentWorldChat,
          setNotifyCurrentWorldChat,
          notifyCurrentWorldChatOnChange
        )}
        <Label>
          <FormattedMessage id="space-notifications-popup.notify_channel_chat" />
        </Label>
        <InputWrap style={{ minHeight: "48px", marginLeft: "24px", flexDirection: "column" }}>
          <RadioWrap>
            <Radio
              type="radio"
              id={"channel_chat_mode_all"}
              name={"channel_chat_mode"}
              checked={notifyChannelChat === "all"}
              onChange={onNotifyChannelChangeAll}
              value={"all"}
            />
            <Label htmlFor="channel_chat_mode_all" style={{ cursor: "pointer" }}>
              <FormattedMessage id="space-notifications-popup.notify_channel_chat_all" />
            </Label>
          </RadioWrap>
          <RadioWrap>
            <Radio
              type="radio"
              id={"channel_chat_mode_mentions"}
              name={"channel_chat_mode"}
              checked={notifyChannelChat === "mentions"}
              onChange={onNotifyChannelChangeMentions}
              value={"mentions"}
            />
            <Label htmlFor="channel_chat_mode_mentions" style={{ cursor: "pointer" }}>
              <FormattedMessage id="space-notifications-popup.notify_channel_chat_mentions" />
            </Label>
          </RadioWrap>
          <RadioWrap>
            <Radio
              type="radio"
              id={"channel_chat_mode_none"}
              name={"channel_chat_mode"}
              checked={notifyChannelChat === "none"}
              onChange={onNotifyChannelChangeNone}
              value={"none"}
            />
            <Label htmlFor="channel_chat_mode_none" style={{ cursor: "pointer" }}>
              <FormattedMessage id="space-notifications-popup.notify_channel_chat_none" />
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

SpaceNotificationsPopup.propTypes = {
  subscriptions: PropTypes.object,
  spaceId: PropTypes.string,
  matrix: PropTypes.object
};

export { SpaceNotificationsPopup as default };

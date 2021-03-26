import PropTypes from "prop-types";
import React, { useState } from "react";
import styled from "styled-components";
import {
  ATOM_NOTIFICATION_TYPES,
  useNameUpdateFromMetadata,
  useNotificationCountUpdatesFromMetadata
} from "../utils/atom-metadata";
import BigTooltip from "./big-tooltip";
import { getMessages } from "../../hubs/utils/i18n";
import discordSpaceIcon from "../../assets/jel/images/icons/discord-space-icon.svgi";

const SpaceNodeIconElement = styled.div`
  width: 64px;
  height: 64px;
  position: relative;

  border-radius: 32px;
  transition: border-radius 0.1s;

  &:hover {
    transition: border-radius 0.1s;
    border-radius: 12px;
  }

  display: flex;
  justify-content: center;
  align-items: center;
`;

const SpaceNodeIconLink = styled.a`
  width: 64px;
  height: 64px;

  border-radius: 32px;
  transition: border-radius 0.1s;

  &:hover {
    transition: border-radius 0.1s;
    border-radius: 12px;
  }

  display: flex;
  justify-content: center;
  align-items: center;
`;

const SpaceNodeIconNonImage = styled.div`
  border: none;
  text-transform: uppercase;
  font-size: var(--secondary-panel-item-text-size);
  font-weight: var(--secondary-panel-item-text-weight);
  color: var(--secondary-panel-item-text-color);
`;

const SpaceNodeIconImage = styled.div`
  color: var(--secondary-panel-item-text-color);
  width: 42px;
  height: 42px;
`;

const SpaceNodeNotification = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: var(--notification-ping-color);
  color: var(--notification-text-color);
  font: var(--notification-count-font);
  line-height: 18px;
  padding-top: 1px;
  padding-right: 1px;
  width: 19px;
  height: 19px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SpaceNodeUnread = styled.div`
  position: absolute;
  bottom: 3px;
  right: 3px;
  background-color: var(--notification-unread-color);
  color: var(--notification-text-color);
  font: var(--notification-count-font);
  line-height: 18px;
  padding-top: 1px;
  padding-right: 1px;
  width: 10px;
  height: 10px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export default function SpaceNodeIcon({ spaceId, spaceMetadata }) {
  const [name, setName] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationType, setNotificationType] = useState(ATOM_NOTIFICATION_TYPES.NONE);
  const icon = null; // TODO

  useNameUpdateFromMetadata(spaceId, spaceMetadata, setName);
  useNotificationCountUpdatesFromMetadata(spaceId, spaceMetadata, setNotificationCount, setNotificationType);

  console.log(spaceId, notificationCount, notificationType);

  let el;
  if (icon) {
    el = (
      <SpaceNodeIconElement className="spaceNodeIcon" style={{ backgroundImage: `url(${icon})` }}>
        {notificationType === ATOM_NOTIFICATION_TYPES.PING_NOTIFICATIONS && (
          <SpaceNodeNotification>{notificationCount > 9 ? " " : notificationCount}</SpaceNodeNotification>
        )}
        {notificationType !== ATOM_NOTIFICATION_TYPES.PING_NOTIFICATIONS &&
          notificationType !== ATOM_NOTIFICATION_TYPES.NONE && <SpaceNodeUnread />}
      </SpaceNodeIconElement>
    );
  } else {
    el = (
      <SpaceNodeIconElement className="spaceNodeIcon">
        <SpaceNodeIconNonImage>{name.substring(0, 1)}</SpaceNodeIconNonImage>
        {notificationType === ATOM_NOTIFICATION_TYPES.PING_NOTIFICATIONS && (
          <SpaceNodeNotification>{notificationCount > 9 ? " " : notificationCount}</SpaceNodeNotification>
        )}
        {notificationType !== ATOM_NOTIFICATION_TYPES.PING_NOTIFICATIONS &&
          notificationType !== ATOM_NOTIFICATION_TYPES.NONE && <SpaceNodeUnread />}
      </SpaceNodeIconElement>
    );
  }

  return (
    <BigTooltip content={name} placement="left">
      {el}
    </BigTooltip>
  );
}

export function AddSpaceIcon() {
  const tip = getMessages()["space-tree.create"];

  return (
    <BigTooltip content={tip} placement="left">
      <SpaceNodeIconLink className="spaceNodeIcon" href="/new" title="" onClick={e => e.stopPropagation()}>
        <SpaceNodeIconNonImage>+</SpaceNodeIconNonImage>
      </SpaceNodeIconLink>
    </BigTooltip>
  );
}

export function JoinDiscordIcon() {
  const tip = getMessages()["space-tree.discord"];

  return (
    <BigTooltip content={tip} placement="left">
      <SpaceNodeIconLink
        className="spaceNodeIcon"
        href="https://discord.gg/RMBamMXBkA"
        title=""
        target="_blank"
        onClick={e => e.stopPropagation()}
      >
        <SpaceNodeIconImage dangerouslySetInnerHTML={{ __html: discordSpaceIcon }} />
      </SpaceNodeIconLink>
    </BigTooltip>
  );
}

SpaceNodeIcon.propTypes = {
  spaceId: PropTypes.string,
  spaceMetadata: PropTypes.object
};

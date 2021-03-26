import PropTypes from "prop-types";
import React, { useRef, useState } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal.svgi";
import addIcon from "../../assets/jel/images/icons/add.svgi";
import {
  ATOM_NOTIFICATION_TYPES,
  useNameUpdateFromMetadata,
  useNotificationCountUpdatesFromMetadata
} from "../utils/atom-metadata";

const HubNodeElement = styled.div`
  display: flex;
  align-items: center;
  position: relative;

  .unread {
    font-weight: var(--panel-selected-text-weight);
    color: var(--panel-unread-text-color);
  }

  &:hover {
    .controls {
      display: flex;
    }

    .title {
      flex-basis: calc(100% - 58px);
    }

    .notifications {
      display: none;
    }
  }
`;

const HubControls = styled.div`
  width: 48px;
  height: 26px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex: 1;
  display: none;
  position: relative;
`;

const HubTitle = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  flex-basis: 100%;
`;

const NotificationCount = styled.div`
  background-color: var(--notification-ping-color);
  color: var(--notification-text-color);
  font: var(--notification-count-font);
  line-height: 20px;
  padding-top: 1px;
  padding-right: 1px;
  width: 20px;
  height: 18px;
  border-radius: 12px;
  margin-right: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const PopupRef = styled.div`
  position: absolute;
  width: 0;
  height: 0;
  left: 10px;
  top: 12px;
`;

const HubNodeTitle = ({ hubId, onDotsClick, showAdd, showDots, onAddClick, hubMetadata }) => {
  const [name, setName] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationType, setNotificationType] = useState(ATOM_NOTIFICATION_TYPES.NONE);

  const popupRef = useRef();

  useNameUpdateFromMetadata(hubId, hubMetadata, setName);
  useNotificationCountUpdatesFromMetadata(hubId, hubMetadata, setNotificationCount, setNotificationType);

  return (
    <HubNodeElement>
      <HubTitle className={notificationType === ATOM_NOTIFICATION_TYPES.NONE ? "title" : "title unread"}>
        {name}
      </HubTitle>
      <HubControls className="controls">
        {showDots && <IconButton iconSrc={dotsIcon} onClick={e => onDotsClick(e, popupRef)} />}
        <PopupRef ref={popupRef} />
        {showAdd && <IconButton iconSrc={addIcon} onClick={onAddClick} />}
      </HubControls>
      {notificationCount > 0 &&
        notificationType === ATOM_NOTIFICATION_TYPES.PING_NOTIFICATIONS && (
          <NotificationCount className="notifications">
            {notificationCount > 9 ? " " : notificationCount}
          </NotificationCount>
        )}
    </HubNodeElement>
  );
};

HubNodeTitle.propTypes = {
  hubId: PropTypes.string,
  onAddClick: PropTypes.func,
  onDotsClick: PropTypes.func,
  popupRef: PropTypes.object,
  showAdd: PropTypes.bool,
  showDots: PropTypes.bool,
  hubMetadata: PropTypes.object
};

export default HubNodeTitle;

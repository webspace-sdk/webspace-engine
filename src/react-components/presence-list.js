import PropTypes from "prop-types";
import styled from "styled-components";
import {FormattedMessage} from "react-intl";
import verticalDotsIcon from "../assets/jel/images/icons/dots-vertical.svgi";
import React, {forwardRef, useCallback, useEffect, useRef, useState} from "react";
import List from "rc-virtual-list";
import PanelSectionHeader from "./panel-section-header";
import {outerHeight} from "../utils/layout-utils";
import {AvatarSwatchBody, AvatarSwatchEyeSrcs, AvatarSwatchVisemeSrcs} from "./avatar-swatch";
import {rgbToCssRgb} from "../utils/dom-utils";
import Tooltip from "./tooltip";
import {getMessages} from "../utils/i18n";
import TinyActionButton from "./tiny-action-button";

const AvatarElement = styled.div`
  width: 58px;
  height: 58px;
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
  flex: 0 0 58px;
`;

const PresenceListMemberItemElement = styled.div`
  height: 58px;
  display: flex;
  justify-content: flex-start;
  margin-left: 24px;

  &:hover .show-on-hover {
    display: flex;
  }

  &:hover .hide-on-hover {
    display: none;
  }

  &.offline {
    opacity: 0.6;
  }
`;

const MemberActionsPlaceholder = styled.div`
  display: flex;
  min-width: 24px;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const MemberActionsPlaceholderIcon = styled.div`
  width: 24px;
  height: 24px;
`;

const MemberName = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: var(--panel-small-banner-text-size);
  color: var(--panel-small-banner-text-color);
  font-weight: var(--panel-small-banner-text-weight);
  margin-left: 8px;
  flex: 1 1;
  min-width: 0;
  margin-right: 16px;
`;

const MemberNameText = styled.div`
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 22px;
`;

const MemberActionButtonWrap = styled.div`
  display: flex;
  min-width: 64px;
  align-items: center;
  justify-content: center;
  display: none;
  margin-right: 8px;
`;

const AvatarSwatchEyes = styled.img`
  position: absolute;
  top: 8px;
  left: 6px;
  width: 46px;
  height: 32px;
`;

const AvatarSwatchMouth = styled.img`
  position: absolute;
  top: 18px;
  left: 9px;
  transform: scale(1, 0.6);
  width: 42px;
  height: 42px;
`;

const PresenceListWorldMemberItem = forwardRef((props, ref) => {
  const {
    onGoToUserClicked: onGoToUserClicked,
    sessionId,
    allowJumpTo,
    showJumpTip,
    state: {
      profile: {
        displayName,
        persona: {
          avatar: {
            primary_color: { r, g, b }
          }
        }
      },
      unmuted
    }
  } = props;

  const store = window.APP.store;
  const messages = getMessages();
  const handleHover = useCallback(
    () => {
      if (showJumpTip && allowJumpTo) {
        store.handleActivityFlag("hasShownJumpedToMember");
      }
    },
    [store, showJumpTip, allowJumpTo]
  );

  return (
    <PresenceListMemberItemElement
      className="presence-list"
      style={{ height: "58px" }}
      onMouseOver={handleHover}
      ref={ref}
    >
      <Tooltip
        visible={!!showJumpTip}
        disabled={!showJumpTip}
        content={messages["jump-to.tip"]}
        placement="left"
        className="hide-when-expanded"
        key={sessionId}
      >
        <AvatarElement style={{ color: `rgb(${rgbToCssRgb(r)}, ${rgbToCssRgb(g)}, ${rgbToCssRgb(b)})` }}>
          <AvatarSwatchBody />
          <AvatarSwatchEyes style={{ visibility: "visible" }} src={AvatarSwatchEyeSrcs[0]} />
          {unmuted && <AvatarSwatchMouth style={{ visibility: "visible" }} src={AvatarSwatchVisemeSrcs[0]} />}
        </AvatarElement>
      </Tooltip>
      <MemberName>
        <MemberNameText>{displayName}</MemberNameText>
      </MemberName>
      {allowJumpTo && (
        <MemberActionButtonWrap className="show-on-hover">
          <TinyActionButton onClick={() => onGoToUserClicked(sessionId)}>
            <FormattedMessage id="presence-list.go-to-avatar" />
          </TinyActionButton>
        </MemberActionButtonWrap>
      )}
      {allowJumpTo && (
        <MemberActionsPlaceholder className="hide-on-hover">
          <MemberActionsPlaceholderIcon dangerouslySetInnerHTML={{ __html: verticalDotsIcon }} />
        </MemberActionsPlaceholder>
      )}
    </PresenceListMemberItemElement>
  );
});

PresenceListWorldMemberItem.displayName = "PresenceListWorldMemberItem";
PresenceListWorldMemberItem.propTypes = {
  state: PropTypes.object,
  sessionId: PropTypes.string,
  allowJumpTo: PropTypes.bool,
  showJumpTip: PropTypes.bool,
  onGoToUserClicked: PropTypes.func
};

const PresenceListHeader = forwardRef(({ messageId, total }, ref) => {
  let message = getMessages()[messageId];

  if (total !== undefined) {
    message += `${total}`;
  }

  return (
    <PanelSectionHeader ref={ref} style={{ height: "16px" }}>
      {message}
    </PanelSectionHeader>
  );
});

PresenceListHeader.displayName = "PresenceListHeader";
PresenceListHeader.propTypes = {
  messageId: PropTypes.string,
  total: PropTypes.number
};

const ListWrap = styled.div`
  height: 100%;
`;

function buildWorldPresenceData(setWorldPresenceData, currentSessionId, store) {
  const worldPresenceData = [];
  if (!NAF.connection.presence?.states) return;

  let addedJumpTip = false;

  for (const state of NAF.connection.presence.states.values()) {
    const clientId = state.client_id;
    if (!clientId) continue;

    if (worldPresenceData.length === 0) {
      worldPresenceData.push({
        key: "this-header",
        messageId: "presence-list.this-header",
        type: "header",
        height: 32
      });
    }

    const allowJumpTo = clientId !== currentSessionId;
    const showJumpTip = false;

    if (!addedJumpTip && allowJumpTo && !store.state.activity.hasShownJumpedToMember) {
      // TODO removed due to event speaker risk showJumpTip = true;
      addedJumpTip = true;
    }

    worldPresenceData.push({ key: clientId, state, type: "world_member", allowJumpTo, showJumpTip, height: 58 });
  }

  setWorldPresenceData(worldPresenceData);
}

function PresenceList({ scene, sessionId, onGoToUserClicked }) {
  const [height, setHeight] = useState(100);
  const outerRef = useRef();
  const [worldPresenceData, setWorldPresenceData] = useState([]);
  const { store } = window.APP;

  useEffect(
    () => {
      if (!scene) return () => {};

      let timeout;

      const handler = () => {
        // Schedule as a subtask and debounce
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => buildWorldPresenceData(setWorldPresenceData, sessionId, store), 500);
      };

      handler();

      scene.addEventListener("presence-synced", handler);
      store.addEventListener("statechanged-activity", handler);

      return () => {
        scene.removeEventListener("presence-synced", handler);
        store.removeEventListener("statechanged-activity", handler);
      };
    },

    [scene, setWorldPresenceData, sessionId, store]
  );

  useEffect(
    () => {
      const setOuterHeight = () => {
        if (outerRef.current) {
          const height = outerHeight(outerRef.current);
          setHeight(height);
        }
      };

      setOuterHeight();
      window.addEventListener("resize", setOuterHeight);
      return () => window.removeEventListener("resize", setOuterHeight);
    },
    [outerRef]
  );

  return (
    <ListWrap ref={outerRef} className="presence-list">
      <List height={height} itemHeight={16} itemKey="key" data={[...worldPresenceData]}>
        {useCallback(
          (item, _, props) => {
            if (item.type === "world_member") {
              return (
                <PresenceListWorldMemberItem
                  sessionId={item.key}
                  onGoToUserClicked={onGoToUserClicked}
                  {...item}
                  {...props}
                />
              );
            } else if (item.type === "header") {
              return <PresenceListHeader {...item} {...props} />;
            }
          },
          [onGoToUserClicked]
        )}
      </List>
    </ListWrap>
  );
}

PresenceList.propTypes = {
  scene: PropTypes.object,
  sessionId: PropTypes.string,
  onGoToUserClicked: PropTypes.func
};

export { PresenceList as default };

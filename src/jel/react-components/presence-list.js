import PropTypes from "prop-types";
import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import verticalDotsIcon from "../../assets/jel/images/icons/dots-vertical.svgi";
import React, { useCallback, useRef, useState, useEffect, forwardRef } from "react";
import List from "rc-virtual-list";
import PanelSectionHeader from "./panel-section-header";
import { outerHeight } from "../utils/layout-utils";
import styles from "../../assets/jel/stylesheets/presence-list.scss";
import { AvatarSwatchBody, AvatarSwatchEyeSrcs, AvatarSwatchVisemeSrcs } from "./avatar-swatch";
import { rgbToCssRgb } from "../utils/dom-utils";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";
import goToIcon from "../../assets/jel/images/icons/go-to.svgi";
import Tooltip from "./tooltip";
import { getMessages } from "../../hubs/utils/i18n";
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
`;

const MemberActionsPlaceholder = styled.div`
  display: flex;
  min-width: 64px;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const MemberActionsPlaceholderIcon = styled.div`
  width: 24px;
  height: 24px;
`;

const PresenceListHubItemElement = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const PresenceListHubName = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 24px;
  margin-right: 12px;
  flex: 1 1;
  min-width: 0;
`;

const PresenceListHubNameText = styled.div`
  color: var(--panel-text-color);
  font-weight: var(--panel-selected-text-weight);
  font-size: var(--panel-small-banner-text-size);
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PresenceListHubVisitButton = styled.button`
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 0 0 28px;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  border-radius: 6px;
  background-color: var(--action-button-background-color);
  border: 1px solid var(--action-button-border-color);
  color: var(--action-button-text-color);
  font-weight: var(--action-button-text-weight);
  font-size: var(--action-button-text-size);
  margin-right: 16px;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }
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

const PresenceListHubVisitButtonIcon = styled.div`
  width: 18px;
  height: 18px;
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

const PresenceListMemberItem = forwardRef((props, ref) => {
  const {
    onGoToUserClicked: onGoToUserClicked,
    sessionId,
    allowJumpTo,
    showJumpTip,
    meta: {
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
      console.log("hover");
      if (showJumpTip && allowJumpTo) {
        store.handleActivityFlag("hasShownJumpedToMember");
      }
    },
    [store, showJumpTip, allowJumpTo]
  );

  return (
    <PresenceListMemberItemElement style={{ height: "58px" }} onMouseOver={handleHover} ref={ref}>
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

PresenceListMemberItem.displayName = "PresenceListMemberItem";
PresenceListMemberItem.propTypes = {
  meta: PropTypes.object,
  sessionId: PropTypes.string,
  allowJumpTo: PropTypes.bool,
  showJumpTip: PropTypes.bool,
  onGoToUserClicked: PropTypes.func
};

const PresenceListHubItem = forwardRef(({ hubId, hubMetadata, onGoToHubClicked }, ref) => {
  const [name, setName] = useState("");

  useNameUpdateFromMetadata(hubId, hubMetadata, setName);

  const messages = getMessages();
  return (
    <PresenceListHubItemElement ref={ref} style={{ height: "48px" }}>
      <PresenceListHubName>
        <PresenceListHubNameText>{name}</PresenceListHubNameText>
      </PresenceListHubName>
      <Tooltip content={messages["presence-list.go-to-world"]} placement="top-end" delay={500}>
        <PresenceListHubVisitButton onClick={() => onGoToHubClicked(hubId)}>
          <PresenceListHubVisitButtonIcon dangerouslySetInnerHTML={{ __html: goToIcon }} />
        </PresenceListHubVisitButton>
      </Tooltip>
    </PresenceListHubItemElement>
  );
});

PresenceListHubItem.displayName = "PresenceListHubItem";
PresenceListHubItem.propTypes = {
  hubId: PropTypes.string,
  hubMetadata: PropTypes.object,
  onGoToHubClicked: PropTypes.func
};

const PresenceListHeader = forwardRef(({ messageId }, ref) => {
  return (
    <PanelSectionHeader ref={ref} style={{ height: "16px" }}>
      <FormattedMessage id={messageId} />
    </PanelSectionHeader>
  );
});

PresenceListHeader.displayName = "PresenceListHeader";
PresenceListHeader.propTypes = {
  messageId: PropTypes.string
};

const ListWrap = styled.div`
  height: 100%;
`;

function buildData(setData, currentSessionId, hubCan, store) {
  const otherHubIdsToSessionMetas = new Map();
  const data = [];
  const spacePresences = (window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state) || {};

  let currentHubId = null;

  if (spacePresences[currentSessionId]) {
    const metas = spacePresences[currentSessionId].metas;
    currentHubId = metas[metas.length - 1].hub_id;
  }

  let addedJumpTip = false;

  for (const [sessionId, presence] of Object.entries(spacePresences)) {
    const meta = presence.metas[presence.metas.length - 1];
    const metaHubId = meta.hub_id;

    if (metaHubId === currentHubId) {
      if (data.length === 0) {
        data.push({ key: "this-header", messageId: "presence-list.this-header", type: "header" });
      }

      const allowJumpTo = sessionId !== currentSessionId;
      let showJumpTip = false;

      if (!addedJumpTip && allowJumpTo && !store.state.activity.hasShownJumpedToMember) {
        showJumpTip = true;
        addedJumpTip = true;
      }

      data.push({ key: sessionId, meta, type: "member", allowJumpTo, showJumpTip });
    } else {
      if (hubCan("join_hub", metaHubId)) {
        if (!otherHubIdsToSessionMetas.has(metaHubId)) {
          otherHubIdsToSessionMetas.set(metaHubId, []);
        }

        const otherSessionMetas = otherHubIdsToSessionMetas.get(metaHubId);
        otherSessionMetas.push(sessionId);
        otherSessionMetas.push(meta);
      }
    }
  }

  if (otherHubIdsToSessionMetas.size > 0) {
    data.push({ key: "active-header", messageId: "presence-list.active-header", type: "header" });
    for (const hubId of [...otherHubIdsToSessionMetas.keys()].sort()) {
      data.push({ key: hubId, hubId, type: "hub" });

      const sessionIdAndMetas = otherHubIdsToSessionMetas.get(hubId);
      for (let i = 0; i < sessionIdAndMetas.length; i += 2) {
        data.push({
          key: sessionIdAndMetas[i],
          meta: sessionIdAndMetas[i + 1],
          type: "member",
          allowJumpTo: false,
          showJumpTip: false
        });
      }
    }
  }

  setData(data);
}

function PresenceList({ scene, sessionId, hubMetadata, onGoToUserClicked, onGoToHubClicked, hubCan }) {
  const [height, setHeight] = useState(100);
  const outerRef = useRef();
  const [data, setData] = useState([]);
  const store = window.APP.store;

  useEffect(
    () => {
      if (!scene) return () => {};

      let timeout;

      const handler = () => {
        // Schedule as a subtask and debounce
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => buildData(setData, sessionId, hubCan, store), 500);
      };

      scene.addEventListener("space-presence-synced", handler);
      store.addEventListener("statechanged-activity", handler);

      return () => {
        scene.removeEventListener("space-presence-synced", handler);
        store.removeEventListener("statechanged-activity", handler);
      };
    },

    [scene, setData, hubCan, sessionId, store]
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
    <ListWrap ref={outerRef} className={styles.presenceList}>
      <List height={height} itemHeight={64} itemKey="key" data={data}>
        {useCallback(
          (item, _, props) => {
            if (item.type === "member") {
              return (
                <PresenceListMemberItem
                  sessionId={item.key}
                  onGoToUserClicked={onGoToUserClicked}
                  {...item}
                  {...props}
                />
              );
            } else if (item.type === "hub") {
              return (
                <PresenceListHubItem
                  {...item}
                  {...props}
                  hubMetadata={hubMetadata}
                  onGoToHubClicked={onGoToHubClicked}
                />
              );
            } else if (item.type === "header") {
              return <PresenceListHeader {...item} {...props} />;
            }
          },
          [hubMetadata, onGoToUserClicked, onGoToHubClicked]
        )}
      </List>
    </ListWrap>
  );
}

PresenceList.propTypes = {
  scene: PropTypes.object,
  sessionId: PropTypes.string,
  hubMetadata: PropTypes.object,
  onGoToHubClicked: PropTypes.func,
  onGoToUserClicked: PropTypes.func,
  hubCan: PropTypes.func
};

export { PresenceList as default };

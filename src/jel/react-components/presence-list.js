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

const AvatarImage = styled.img`
  width: 46px;
  height: 46px;
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

const IdentifierText = styled.div`
  font-size: var(--panel-small-banner-subtext-size);
  font-weight: var(--panel-small-banner-subtext-weight);
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 18px;
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

const PresenceListWorldMemberItem = forwardRef((props, ref) => {
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

PresenceListWorldMemberItem.displayName = "PresenceListWorldMemberItem";
PresenceListWorldMemberItem.propTypes = {
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

const PresenceListSpaceMemberItem = forwardRef((props, ref) => {
  const { userId, name, avatarUrl, showUserId, online } = props;

  return (
    <PresenceListMemberItemElement className={online ? "" : "offline"} style={{ height: "58px" }} ref={ref}>
      <AvatarElement>{avatarUrl && <AvatarImage src={avatarUrl} />}</AvatarElement>
      <MemberName>
        <MemberNameText>{name}</MemberNameText>
        {showUserId && <IdentifierText>{userId.split(":")[0]}</IdentifierText>}
      </MemberName>
    </PresenceListMemberItemElement>
  );
});

PresenceListSpaceMemberItem.displayName = "PresenceListSpaceMemberItem";
PresenceListSpaceMemberItem.propTypes = {
  userId: PropTypes.string,
  showUserId: PropTypes.bool,
  name: PropTypes.string,
  online: PropTypes.bool,
  avatarUrl: PropTypes.string
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

function buildSpacePresenceData(matrix, setSpacePresenceData, spaceMembers, activeWorldHubIds) {
  const spacePresenceData = [];
  const defaultName = getMessages()["chat.default-name"];

  let onlineItem = null,
    offlineItem = null;

  for (const member of spaceMembers) {
    const {
      name,
      rawDisplayName,
      user: { userId, presence }
    } = member;
    const avatarHttpUrl = matrix.getAvatarUrlForMember(member, 64, 64);
    const item = {
      key: userId,
      name: rawDisplayName,
      showUserId: name !== rawDisplayName || rawDisplayName === defaultName,
      avatarUrl: avatarHttpUrl,
      type: "space_member",
      height: 58,
      online: true
    };

    if (presence === "active" || presence === "online") {
      if (onlineItem === null) {
        // push online header
        onlineItem = {
          key: "online-header",
          messageId: "presence-list.online-header",
          type: "header",
          total: 0,
          // Check if this is at the top of the presence list or not to determine height.
          height: !activeWorldHubIds || activeWorldHubIds.length === 0 ? 32 : 64
        };

        spacePresenceData.push(onlineItem);
      }

      onlineItem.total++;

      spacePresenceData.push(item);
    } else {
      if (offlineItem === null) {
        offlineItem = {
          key: "offline-header",
          messageId: "presence-list.offline-header",
          type: "header",
          total: 0,
          height: 32
        };

        spacePresenceData.push(offlineItem);
      }

      // Omit New Members from offline list
      if (rawDisplayName && item.name !== defaultName) {
        spacePresenceData.push(item);
        item.online = false;
        offlineItem.total++;
      }
    }
  }

  setSpacePresenceData(spacePresenceData);
}

function buildWorldPresenceData(
  activeWorldHubIds,
  setActiveWorldHubIds,
  setWorldPresenceData,
  currentSessionId,
  hubCan,
  store
) {
  const otherHubIdsToSessionMetas = new Map();
  const worldPresenceData = [];
  const spacePresences = (window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state) || {};

  let currentHubId = null;
  const newActiveWorldHubIds = new Set();
  let sawNewActiveWorld = false;

  if (spacePresences[currentSessionId]) {
    const metas = spacePresences[currentSessionId].metas;
    currentHubId = metas[metas.length - 1].hub_id;
  }

  let addedJumpTip = false;

  for (const [sessionId, presence] of Object.entries(spacePresences)) {
    const meta = presence.metas[presence.metas.length - 1];
    const metaHubId = meta.hub_id;

    if (metaHubId) {
      newActiveWorldHubIds.add(metaHubId);

      if (!activeWorldHubIds || !activeWorldHubIds.includes(metaHubId)) {
        sawNewActiveWorld = true;
      }
    }

    if (currentHubId && metaHubId && metaHubId === currentHubId) {
      if (worldPresenceData.length === 0) {
        worldPresenceData.push({
          key: "this-header",
          messageId: "presence-list.this-header",
          type: "header",
          height: 32
        });
      }

      const allowJumpTo = sessionId !== currentSessionId;
      const showJumpTip = false;

      if (!addedJumpTip && allowJumpTo && !store.state.activity.hasShownJumpedToMember) {
        // TODO removed due to event speaker risk showJumpTip = true;
        addedJumpTip = true;
      }

      worldPresenceData.push({ key: sessionId, meta, type: "world_member", allowJumpTo, showJumpTip, height: 58 });
    } else if (metaHubId) {
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

  if (sawNewActiveWorld || !activeWorldHubIds || newActiveWorldHubIds.size !== activeWorldHubIds.length) {
    setActiveWorldHubIds([...newActiveWorldHubIds]);
  }

  if (otherHubIdsToSessionMetas.size > 0) {
    worldPresenceData.push({
      key: "active-header",
      messageId: "presence-list.active-header",
      type: "header",
      height: 32
    });
    for (const hubId of [...otherHubIdsToSessionMetas.keys()].sort()) {
      worldPresenceData.push({ key: hubId, hubId, type: "hub", height: 48 });

      const sessionIdAndMetas = otherHubIdsToSessionMetas.get(hubId);
      for (let i = 0; i < sessionIdAndMetas.length; i += 2) {
        worldPresenceData.push({
          key: sessionIdAndMetas[i],
          meta: sessionIdAndMetas[i + 1],
          type: "world_member",
          allowJumpTo: false,
          showJumpTip: false
        });
      }
    }
  }

  setWorldPresenceData(worldPresenceData);
}

function PresenceList({ scene, sessionId, hubMetadata, onGoToUserClicked, onGoToHubClicked, hubCan, isWorld }) {
  const [height, setHeight] = useState(100);
  const outerRef = useRef();
  const [worldPresenceData, setWorldPresenceData] = useState([]);
  const [spacePresenceData, setSpacePresenceData] = useState([]);
  const [activeWorldHubIds, setActiveWorldHubIds] = useState(null);
  const { matrix, store } = window.APP;

  useEffect(
    () => {
      if (!scene || !hubMetadata) return () => {};

      let timeout;

      const handler = () => {
        // Schedule as a subtask and debounce
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(
          () =>
            buildWorldPresenceData(
              activeWorldHubIds,
              setActiveWorldHubIds,
              setWorldPresenceData,
              sessionId,
              hubCan,
              store
            ),
          500
        );
      };

      if (activeWorldHubIds === null) {
        // Initialize state if active worlds haven't been set yet.
        handler();
      } else {
        // Active worlds need to be subscribed to since hubCan may filter
        // them in the list as permissions change.
        for (const hubId of activeWorldHubIds) {
          hubMetadata.subscribeToMetadata(hubId, handler);
        }
      }

      scene.addEventListener("space-presence-synced", handler);
      store.addEventListener("statechanged-activity", handler);

      return () => {
        hubMetadata.unsubscribeFromMetadata(handler);
        scene.removeEventListener("space-presence-synced", handler);
        store.removeEventListener("statechanged-activity", handler);
      };
    },

    [scene, hubMetadata, activeWorldHubIds, setActiveWorldHubIds, setWorldPresenceData, hubCan, sessionId, store]
  );

  useEffect(
    () => {
      if (!matrix) return () => {};

      let timeout;

      const handler = () => {
        // Schedule as a subtask and debounce
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(
          () => buildSpacePresenceData(matrix, setSpacePresenceData, matrix.currentSpaceMembers, activeWorldHubIds),
          500
        );
      };

      handler();
      matrix.addEventListener("current_space_members_updated", handler);

      return () => matrix.removeEventListener("current_space_members_updated", handler);
    },
    [matrix, setSpacePresenceData, activeWorldHubIds]
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
    [outerRef, isWorld]
  );

  return (
    <ListWrap ref={outerRef} className={styles.presenceList}>
      <List height={height} itemHeight={16} itemKey="key" data={[...worldPresenceData, ...spacePresenceData]}>
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
            } else if (item.type === "space_member") {
              return <PresenceListSpaceMemberItem userId={item.key} {...item} {...props} />;
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
  hubCan: PropTypes.func,
  isWorld: PropTypes.bool
};

export { PresenceList as default };

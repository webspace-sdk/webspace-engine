import PropTypes from "prop-types";
import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import React, { useRef, useState, useEffect, forwardRef } from "react";
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

const PresenceListMemberItem = forwardRef(
  (
    {
      meta: {
        profile: {
          displayName,
          persona: {
            avatar: {
              primary_color: { r, g, b }
            }
          }
        }
      }
    },
    ref
  ) => {
    return (
      <PresenceListMemberItemElement style={{ height: "58px" }} ref={ref}>
        <AvatarElement style={{ color: `rgb(${rgbToCssRgb(r)}, ${rgbToCssRgb(g)}, ${rgbToCssRgb(b)})` }}>
          <AvatarSwatchBody />
          <AvatarSwatchEyes style={{ visibility: "visible" }} src={AvatarSwatchEyeSrcs[0]} />
          <AvatarSwatchMouth style={{ visibility: "visible" }} src={AvatarSwatchVisemeSrcs[0]} />
        </AvatarElement>
        <MemberName>
          <MemberNameText>{displayName}</MemberNameText>
        </MemberName>
      </PresenceListMemberItemElement>
    );
  }
);

PresenceListMemberItem.displayName = "PresenceListMemberItem";
PresenceListMemberItem.propTypes = {
  meta: PropTypes.object
};

const PresenceListHubItem = forwardRef(({ hubId, hubMetadata, onGoToClicked }, ref) => {
  const [name, setName] = useState("");

  useNameUpdateFromMetadata(hubId, hubMetadata, setName);

  const messages = getMessages();
  return (
    <PresenceListHubItemElement ref={ref} style={{ height: "48px" }}>
      <PresenceListHubName>
        <PresenceListHubNameText>{name}</PresenceListHubNameText>
      </PresenceListHubName>
      <Tooltip content={messages["presence-list.go-to-world"]} placement="top-end" delay={500}>
        <PresenceListHubVisitButton onClick={() => onGoToClicked(hubId)}>
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
  onGoToClicked: PropTypes.func
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

function PresenceList({ scene, sessionId, hubMetadata, onGoToClicked, hubCan }) {
  const [height, setHeight] = useState(100);
  const outerRef = useRef();
  const [spacePresences, setSpacePresences] = useState(
    (window.APP.spaceChannel && window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state) || {}
  );

  useEffect(
    () => {
      const handler = () => {
        setSpacePresences(
          window.APP.spaceChannel && window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state
        );
      };

      scene.addEventListener("space-presence-synced", handler);
      return () => scene.removeEventListener("space-presence-synced", handler);
    },
    [scene, setSpacePresences]
  );

  const data = [];
  const otherHubIdsToSessionMetas = new Map();

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

  let hubId = null;

  if (spacePresences[sessionId]) {
    const metas = spacePresences[sessionId].metas;
    hubId = metas[metas.length - 1].hub_id;
  }

  for (const [sessionId, presence] of Object.entries(spacePresences)) {
    const meta = presence.metas[presence.metas.length - 1];
    const metaHubId = meta.hub_id;

    if (metaHubId === hubId) {
      if (data.length === 0) {
        data.push({ key: "this-header", messageId: "presence-list.this-header", type: "header" });
      }

      data.push({ key: sessionId, meta, type: "member" });
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
        data.push({ key: sessionIdAndMetas[i], meta: sessionIdAndMetas[i + 1], type: "member" });
      }
    }
  }

  return (
    <ListWrap ref={outerRef} className={styles.presenceList}>
      <List height={height} itemHeight={64} itemKey="key" data={data}>
        {(item, _, props) => {
          if (item.type === "member") {
            return <PresenceListMemberItem {...item} {...props} />;
          } else if (item.type === "hub") {
            return <PresenceListHubItem {...item} {...props} hubMetadata={hubMetadata} onGoToClicked={onGoToClicked} />;
          } else if (item.type === "header") {
            return <PresenceListHeader {...item} {...props} />;
          }
        }}
      </List>
    </ListWrap>
  );
}

PresenceList.propTypes = {
  scene: PropTypes.object,
  sessionId: PropTypes.string,
  hubMetadata: PropTypes.object,
  onGoToClicked: PropTypes.func,
  hubCan: PropTypes.func
};

export { PresenceList as default };

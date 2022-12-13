import PropTypes from "prop-types";
import React, {useState} from "react";
import styled from "styled-components";
import {useNameUpdateFromMetadata} from "../utils/atom-metadata";
import BigTooltip from "./big-tooltip";
import {getMessages} from "../utils/i18n";
import discordSpaceIcon from "../assets/jel/images/icons/discord-space-icon.svgi";

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

export default function SpaceNodeIcon({ spaceId, spaceMetadata }) {
  const [name, setName] = useState("");
  const icon = null; // TODO

  useNameUpdateFromMetadata(spaceId, spaceMetadata, setName);

  let el;
  if (icon) {
    el = <SpaceNodeIconElement className="spaceNodeIcon" style={{ backgroundImage: `url(${icon})` }} />;
  } else {
    el = (
      <SpaceNodeIconElement className="spaceNodeIcon">
        <SpaceNodeIconNonImage>{name.substring(0, 1)}</SpaceNodeIconNonImage>
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

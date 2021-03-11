import PropTypes from "prop-types";
import React, { useRef, useState } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import dotsIcon from "../../assets/jel/images/icons/dots-horizontal.svgi";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";

const ChannelNodeElement = styled.div`
  display: flex;
  align-items: center;
  position: relative;

  &:hover {
    .controls {
      display: flex;
    }

    .title {
      flex-basis: calc(100% - 58px);
    }
  }
`;

const ChannelControls = styled.div`
  width: 48px;
  height: 26px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex: 1;
  display: none;
  position: relative;
`;

const ChannelHash = styled.div`
  font-size: var(--panel-text-size);
  width: 24px;
  font-weight: bold;
`;

const ChannelTitle = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  flex-basis: 100%;
`;

const PopupRef = styled.div`
  position: absolute;
  width: 0;
  height: 0;
  left: 10px;
  top: 12px;
`;

const ChannelNodeTitle = ({ roomId, onDotsClick, showDots, channelMetadata }) => {
  const [name, setName] = useState("");

  const popupRef = useRef();

  useNameUpdateFromMetadata(roomId, channelMetadata, setName);

  return (
    <ChannelNodeElement>
      <ChannelHash>#</ChannelHash>
      <ChannelTitle className="title">{name}</ChannelTitle>
      <ChannelControls className="controls">
        {showDots && <IconButton iconSrc={dotsIcon} onClick={e => onDotsClick(e, popupRef)} />}
        <PopupRef ref={popupRef} />
      </ChannelControls>
    </ChannelNodeElement>
  );
};

ChannelNodeTitle.propTypes = {
  roomId: PropTypes.string,
  onDotsClick: PropTypes.func,
  popupRef: PropTypes.object,
  showDots: PropTypes.bool,
  channelMetadata: PropTypes.object
};

export default ChannelNodeTitle;

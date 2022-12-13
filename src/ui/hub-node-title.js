import PropTypes from "prop-types";
import React, { useRef, useState } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import dotsIcon from "../assets/images/icons/dots-horizontal.svgi";
import { useNameUpdateFromMetadata } from "../utils/atom-metadata";

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

const PopupRef = styled.div`
  position: absolute;
  width: 0;
  height: 0;
  left: 10px;
  top: 12px;
`;

const HubNodeTitle = ({ hubId, onDotsClick, showDots, hubMetadata }) => {
  const [name, setName] = useState("");

  const popupRef = useRef();

  useNameUpdateFromMetadata(hubId, hubMetadata, setName);

  return (
    <HubNodeElement>
      <HubTitle className="title">{name}</HubTitle>
      <HubControls className="controls">
        {showDots && <IconButton iconSrc={dotsIcon} onClick={e => onDotsClick(e, popupRef)} />}
        <PopupRef ref={popupRef} />
      </HubControls>
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

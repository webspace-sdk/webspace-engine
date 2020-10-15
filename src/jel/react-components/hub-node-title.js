import PropTypes from "prop-types";
import React, { useState } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import dotsIcon from "../assets/images/icons/dots-horizontal.svgi";
import addIcon from "../assets/images/icons/add.svgi";
import { useNameUpdateFromHubMetadata } from "../utils/tree-utils";

const HubNodeElement = styled.div`
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

const HubNodeTitle = ({ hubId, onDotsClick, showAdd, onAddClick, hubMetadata }) => {
  const [name, setName] = useState("");

  const popupRef = React.createRef();

  useNameUpdateFromHubMetadata(hubId, hubMetadata, setName);

  return (
    <HubNodeElement>
      <HubTitle className="title">{name}</HubTitle>
      <HubControls className="controls">
        <IconButton iconSrc={dotsIcon} onClick={e => onDotsClick(e, popupRef)} />
        <PopupRef ref={popupRef} />
        {showAdd && <IconButton iconSrc={addIcon} onClick={onAddClick} />}
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
  hubMetadata: PropTypes.object
};

export default HubNodeTitle;

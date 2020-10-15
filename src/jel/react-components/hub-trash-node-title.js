import PropTypes from "prop-types";
import React, { useState } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import restoreIcon from "../assets/images/icons/restore.svgi";
import trashIcon from "../assets/images/icons/trash.svgi";
import Tooltip from "./tooltip";
import { useSingleton } from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { useNameUpdateFromMetadata } from "../utils/tree-utils";
import { getMessages } from "../../hubs/utils/i18n";

const HubTrashNodeElement = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

const HubControls = styled.div`
  width: 48px;
  height: 26px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex: 1;
  position: relative;
`;

const HubTitle = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  flex-basis: calc(100% - 58px);
`;

const HubTrashNodeTitle = function({ hubId, hubMetadata, showRestore, showRemove, onRemoveClick, onRestoreClick }) {
  const [tippySource, tippyTarget] = useSingleton();
  const [name, setName] = useState("");

  useNameUpdateFromMetadata(hubId, hubMetadata, setName);

  const messages = getMessages();

  return (
    <HubTrashNodeElement>
      <HubTitle className="title">{name}</HubTitle>
      <HubControls className="controls">
        <Tooltip delay={500} singleton={tippySource} />
        {showRestore && (
          <Tooltip content={messages["trash.restore"]} placement="bottom" key="restore" singleton={tippyTarget}>
            <IconButton iconSrc={restoreIcon} onClick={e => onRestoreClick(e)} />
          </Tooltip>
        )}
        {showRemove && (
          <Tooltip content={messages["trash.destroy"]} placement="bottom" key="destroy" singleton={tippyTarget}>
            <IconButton iconSrc={trashIcon} onClick={onRemoveClick} />
          </Tooltip>
        )}
      </HubControls>
    </HubTrashNodeElement>
  );
};

HubTrashNodeTitle.propTypes = {
  hubId: PropTypes.string,
  hubMetadata: PropTypes.object,
  showRestore: PropTypes.bool,
  showRemove: PropTypes.bool,
  onRestoreClick: PropTypes.func,
  onRemoveClick: PropTypes.func,
  popupRef: PropTypes.object,
  showAdd: PropTypes.bool
};

export default HubTrashNodeTitle;

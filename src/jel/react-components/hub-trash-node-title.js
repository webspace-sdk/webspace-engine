import PropTypes from "prop-types";
import React, { Component } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import restoreIcon from "../assets/images/icons/restore.svgi";
import trashIcon from "../assets/images/icons/trash.svgi";
import Tippy, { TippySingleton } from "@tippy.js/react";
import "tippy.js/dist/tippy.css";
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

export default class HubTrashNodeTitle extends Component {
  static propTypes = {
    name: PropTypes.string,
    hubId: PropTypes.string,
    showRestore: PropTypes.bool,
    showRemove: PropTypes.bool,
    onRestoreClick: PropTypes.func,
    onRemoveClick: PropTypes.func,
    popupRef: PropTypes.object,
    showAdd: PropTypes.bool
  };

  render() {
    const messages = getMessages();

    const buttons = [];

    if (this.props.showRestore) {
      buttons.push(
        <Tippy content={messages["trash.restore"]} placement="bottom" key="restore">
          <IconButton iconSrc={restoreIcon} onClick={e => this.props.onRestoreClick(e)} />
        </Tippy>
      );
    }

    if (this.props.showRemove) {
      buttons.push(
        <Tippy content={messages["trash.destroy"]} placement="bottom" key="destroy">
          <IconButton iconSrc={trashIcon} onClick={this.props.onRemoveClick} />
        </Tippy>
      );
    }

    return (
      <HubTrashNodeElement>
        <HubTitle className="title">{this.props.name}</HubTitle>
        <HubControls className="controls">
          {buttons.length > 0 && <TippySingleton delay={500}>{buttons}</TippySingleton>}
        </HubControls>
      </HubTrashNodeElement>
    );
  }
}

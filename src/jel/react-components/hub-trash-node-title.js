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
    onRestoreClick: PropTypes.func,
    onDestroyClick: PropTypes.func,
    popupRef: PropTypes.object,
    showAdd: PropTypes.bool
  };

  render() {
    const messages = getMessages();

    return (
      <HubTrashNodeElement>
        <HubTitle className="title">{this.props.name}</HubTitle>
        <HubControls className="controls">
          <TippySingleton delay={500}>
            <Tippy content={messages["trash.restore"]} placement="bottom">
              <IconButton iconSrc={restoreIcon} onClick={e => this.props.onRestoreClick(e)} />
            </Tippy>
            <Tippy content={messages["trash.destroy"]} placement="bottom">
              <IconButton iconSrc={trashIcon} onClick={this.props.onDestroyClick} />
            </Tippy>
          </TippySingleton>
        </HubControls>
      </HubTrashNodeElement>
    );
  }
}

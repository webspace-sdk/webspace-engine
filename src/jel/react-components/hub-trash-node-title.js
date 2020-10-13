import PropTypes from "prop-types";
import React, { Component } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import restoreIcon from "../assets/images/icons/restore.svgi";
import trashIcon from "../assets/images/icons/trash.svgi";

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

const PopupRef = styled.div`
  position: absolute;
  width: 0;
  height: 0;
  left: 10px;
  top: 12px;
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
    return (
      <HubTrashNodeElement>
        <HubTitle className="title">{this.props.name}</HubTitle>
        <HubControls className="controls">
          <IconButton iconSrc={restoreIcon} onClick={e => this.props.onRestoreClick(e)} />
          <IconButton iconSrc={trashIcon} onClick={this.props.onDestroyClick} />
        </HubControls>
      </HubTrashNodeElement>
    );
  }
}

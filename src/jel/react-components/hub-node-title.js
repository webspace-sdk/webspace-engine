import PropTypes from "prop-types";
import React, { Component } from "react";
import styled from "styled-components";
import IconButton from "./icon-button";
import dotsIcon from "../assets/images/icons/dots-horizontal.svgi";
import addIcon from "../assets/images/icons/add.svgi";

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

export default class HubNodeTitle extends Component {
  static propTypes = {
    name: PropTypes.string,
    onAddClick: PropTypes.func,
    onDotsClick: PropTypes.func,
    popupRef: PropTypes.object
  };

  constructor() {
    super();

    this.popupRef = React.createRef();
  }

  render() {
    return (
      <HubNodeElement>
        <HubTitle className="title">{this.props.name}</HubTitle>
        <HubControls className="controls">
          <IconButton iconSrc={dotsIcon} onClick={e => this.props.onDotsClick(e, this.popupRef)} />
          <PopupRef ref={this.popupRef} />
          <IconButton iconSrc={addIcon} onClick={this.props.onAddClick} />
        </HubControls>
      </HubNodeElement>
    );
  }
}

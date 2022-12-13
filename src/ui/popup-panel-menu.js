import styled from "styled-components";
import PropTypes from "prop-types";
import React from "react";

const PopupPanelMenu = styled.div`
  color: var(--panel-text-color);
  background-color: var(--secondary-panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 6px;
  padding: 32px 24px;
  box-shadow: 0px 12px 28px var(--menu-shadow-color);
  max-width: 500px;
  user-select: none;
`;

const PopupPanelMenuSectionHeader = styled.div`
  color: var(--panel-header-text-color);
  font-size: var(--panel-header-text-size);
  font-weight: var(--panel-header-text-weight);
  text-transform: uppercase;
  margin: 32px 16px 8px 16px;

  &:first-child {
    margin-top: 0;
  }
`;

const PopupPanelMenuItemElement = styled.button`
  color: var(--secondary-menu-item-text-color);
  font-size: var(--secondary-menu-item-text-size);
  white-space: nowrap;
  background-color: transparent;
  appearance: none;
  border: 0;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  text-align: left;
  padding: 5px 10px;
  width: 100%;
  border-radius: 3px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  height: 32px;
  line-height: 26px;

  &:hover {
    background-color: var(--secondary-menu-item-hover-background-color);
  }

  &:active {
    color: var(--secondary-menu-item-active-text-color);
    background-color: var(--secondary-menu-item-active-background-color);
  }
`;

const PopupPanelMenuIconElement = styled.div`
  margin-left: 4px;
  margin-right: 14px;
  width: 24px;
  height: 24px;
  min-width: 24px;
  color: var(--secondary-menu-item-icon-color);
`;

const PopupPanelMenuLabel = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
`;

const PopupPanelMenuMessage = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
  margin: 12px 12px 4px 12px;
`;

const PopupPanelMenuArrow = styled.div`
  position: absolute;
  width: 10px;
  height: 10px;

  &:after {
    content: " ";
    position: absolute;
    top: -6px;
    left: 0;
    transform: rotate(45deg);
    width: 10px;
    height: 10px;
    background-color: var(--secondary-panel-background-color);
    box-shadow: -1px -1px 1px rgba(0, 0, 0, 0.1);
  }
`;

function PopupPanelMenuItem(props) {
  const filteredProps = { ...props };
  delete filteredProps.iconSrc;

  return (
    <PopupPanelMenuItemElement {...filteredProps}>
      <PopupPanelMenuIconElement dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
      <PopupPanelMenuLabel>{props.children}</PopupPanelMenuLabel>
    </PopupPanelMenuItemElement>
  );
}

PopupPanelMenuItem.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

export {
  PopupPanelMenu as default,
  PopupPanelMenuItem,
  PopupPanelMenuSectionHeader,
  PopupPanelMenuArrow,
  PopupPanelMenuMessage
};

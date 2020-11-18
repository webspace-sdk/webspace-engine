import styled from "styled-components";
import PropTypes from "prop-types";
import React from "react";

const PopupMenu = styled.div`
  background-color: var(--menu-background-color);
  width: 256px;
  height: fit-content;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 3px;
  border: 1px solid var(--menu-border-color);
  box-shadow: 0px 12px 28px var(--menu-shadow-color);
  user-select: none;
`;

const PopupMenuItemElement = styled.button`
  color: var(--menu-item-text-color);
  font-size: var(--menu-item-text-size);
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
  line-height: 22px;

  &:hover {
    background-color: var(--menu-item-hover-background-color);
  }

  &:active {
    color: var(--menu-item-active-text-color);
    background-color: var(--menu-item-active-background-color);
  }
`;

const PopupMenuIconElement = styled.div`
  margin-left: 4px;
  margin-right: 14px;
  width: 24px;
  height: 24px;
`;

function PopupMenuItem(props) {
  const filteredProps = { ...props };
  delete filteredProps.iconSrc;

  return (
    <PopupMenuItemElement {...filteredProps} tabIndex={-1}>
      <PopupMenuIconElement dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
      <div>{props.children}</div>
    </PopupMenuItemElement>
  );
}

PopupMenuItem.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

export { PopupMenu as default, PopupMenuItem };

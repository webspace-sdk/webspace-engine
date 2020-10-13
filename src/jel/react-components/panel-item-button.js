import PropTypes from "prop-types";
import React from "react";

import styled from "styled-components";

const PanelItemButtonSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
  width: 100%;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const PanelItemButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  width: 100%;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--panel-item-text-color);
  padding: 12px;
  position: relative;
  height: 30px;

  &:hover {
    background-color: var(--panel-item-hover-background-color);
    color: var(--panel-item-hover-text-color);
  }

  &:active {
    background-color: var(--panel-item-active-background-color);
    color: var(--panel-item-active-text-color);
  }
`;

const PanelItemButtonIconHolder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 10px;
`;

const PanelItemButtonIcon = styled.div`
  width: 24px;
  height: 24px;
`;

const TextContainer = styled.div`
  height: calc(var(--panel-text-size) + 2px);
  line-height: calc(var(--panel-text-size) + 4px);
  margin-left: 33px;
`;

function PanelItemButton(props) {
  if (props.iconSrc) {
    const filteredProps = { ...props };
    delete filteredProps.iconSrc;
    delete filteredProps.children;
    return (
      <PanelItemButtonElement {...filteredProps}>
        <PanelItemButtonIconHolder>
          <PanelItemButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
        </PanelItemButtonIconHolder>
        <TextContainer>{props.children}</TextContainer>
      </PanelItemButtonElement>
    );
  } else {
    const filteredProps = { ...props };
    delete filteredProps.children;
    return (
      <PanelItemButtonElement {...props}>
        <TextContainer>{props.children}</TextContainer>
      </PanelItemButtonElement>
    );
  }
}

PanelItemButton.propTypes = {
  iconSrc: PropTypes.string
};

export { PanelItemButtonSection, PanelItemButton };

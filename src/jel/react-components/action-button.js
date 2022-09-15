import PropTypes from "prop-types";
import React, { forwardRef } from "react";

import styled from "styled-components";

const ActionButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--action-button-background-color);
  border: 1px solid var(--action-button-border-color);
  color: var(--action-button-text-color);
  font-weight: var(--action-button-text-weight);
  font-size: var(--action-button-text-size);
  padding: 12px;
  min-width: 196px;
  max-width: 250px;
  border-radius: 6px;
  margin: 12px;
  position: relative;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const ActionButtonIconHolder = styled.div`
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

const ActionButtonIcon = styled.div`
  width: 24px;
  height: 24px;
`;

const TextContainer = styled.div`
  height: calc(var(--action-button-text-size) + 2px);
  line-height: calc(var(--action-button-text-size) + 2px);
`;

const ActionButton = forwardRef((props, ref) => {
  if (props.iconSrc) {
    const filteredProps = { ...props };
    delete filteredProps.iconSrc;
    delete filteredProps.children;
    return (
      <ActionButtonElement {...filteredProps} ref={ref}>
        <ActionButtonIconHolder>
          <ActionButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
        </ActionButtonIconHolder>
        <TextContainer>{props.children}</TextContainer>
      </ActionButtonElement>
    );
  } else {
    const filteredProps = { ...props };
    delete filteredProps.children;
    return (
      <ActionButtonElement {...props}>
        <TextContainer>{props.children}</TextContainer>
      </ActionButtonElement>
    );
  }
});

ActionButton.displayName = "ActionButton";

ActionButton.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

export default ActionButton;

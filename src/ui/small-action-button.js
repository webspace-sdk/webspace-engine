import PropTypes from "prop-types";
import React, { forwardRef } from "react";

import styled from "styled-components";

const SmallActionButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--action-button-background-color);
  border: 1px solid var(--action-button-border-color);
  color: var(--action-button-text-color);
  font-weight: var(--small-action-button-text-weight);
  font-size: var(--small-action-button-text-size);
  padding: 12px 33px;
  min-width: 64px;
  border-radius: 6px;
  margin: 8px;
  position: relative;
  white-space: nowrap;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }

  &:disabled {
    opacity: 0.5;
  }

  &.destructive {
    background-color: var(--action-button-destructive-background-color);
    border: 1px solid var(--action-button-destructive-border-color);
    color: var(--action-button-destructive-text-color);

    &:hover {
      background-color: var(--action-button-destructive-hover-background-color);
      border: 1px solid var(--action-button-destructive-hover-border-color);
    }

    &:active {
      background-color: var(--action-button-destructive-active-background-color);
      border: 1px solid var(--action-button-destructive-active-border-color);
    }
  }
`;

const SmallActionButtonIconHolder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 8px;
`;

const SmallActionButtonIcon = styled.div`
  width: 18px;
  height: 18px;
`;

const TextContainer = styled.div`
  box-sizing: border-box;
  height: calc(var(--small-action-button-text-size) - 9px);
  line-height: calc(var(--small-action-button-text-size) - 10px);
`;

const SmallActionButton = forwardRef((props, ref) => {
  if (props.iconSrc) {
    const filteredProps = { ...props };
    delete filteredProps.iconSrc;
    delete filteredProps.children;
    return (
      <SmallActionButtonElement {...filteredProps} ref={ref}>
        <SmallActionButtonIconHolder>
          <SmallActionButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
        </SmallActionButtonIconHolder>
        <TextContainer>{props.children}</TextContainer>
      </SmallActionButtonElement>
    );
  } else {
    const filteredProps = { ...props };
    delete filteredProps.children;
    return (
      <SmallActionButtonElement {...props} ref={ref}>
        <TextContainer>{props.children}</TextContainer>
      </SmallActionButtonElement>
    );
  }
});

SmallActionButton.displayName = "SmallActionButton";

SmallActionButton.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

export { SmallActionButton as default };

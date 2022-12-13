import PropTypes from "prop-types";
import React, {forwardRef} from "react";

import styled from "styled-components";

const TinyActionButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--action-button-background-color);
  border: 1px solid var(--action-button-border-color);
  color: var(--action-button-text-color);
  font-weight: var(--tiny-action-button-text-weight);
  font-size: var(--tiny-action-button-text-size);
  padding: 4px 18px;
  min-width: 32px;
  border-radius: 6px;
  margin: 8px;
  position: relative;
  white-space: nowrap;
  height: 32px;

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

const TinyActionButtonIconHolder = styled.div`
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

const TinyActionButtonIcon = styled.div`
  width: 18px;
  height: 18px;
`;

const TextContainer = styled.div`
  box-sizing: border-box;
  height: calc(var(--tiny-action-button-text-size) - 9px);
  line-height: calc(var(--tiny-action-button-text-size) - 10px);
`;

const TinyActionButton = forwardRef((props, ref) => {
  if (props.iconSrc) {
    const filteredProps = { ...props };
    delete filteredProps.iconSrc;
    delete filteredProps.children;
    return (
      <TinyActionButtonElement {...filteredProps} ref={ref}>
        <TinyActionButtonIconHolder>
          <TinyActionButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
        </TinyActionButtonIconHolder>
        <TextContainer>{props.children}</TextContainer>
      </TinyActionButtonElement>
    );
  } else {
    const filteredProps = { ...props };
    delete filteredProps.children;
    return (
      <TinyActionButtonElement {...props} ref={ref}>
        <TextContainer>{props.children}</TextContainer>
      </TinyActionButtonElement>
    );
  }
});

TinyActionButton.displayName = "TinyActionButton";

TinyActionButton.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

export { TinyActionButton as default };

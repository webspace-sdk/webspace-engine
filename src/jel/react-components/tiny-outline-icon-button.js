import PropTypes from "prop-types";
import React, { forwardRef } from "react";

import styled from "styled-components";

const TinyOutlineIconButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--tiny-icon-button-background-color);
  border: 0;
  color: var(--action-button-text-color);
  font-weight: var(--tiny-action-button-text-weight);
  font-size: var(--tiny-action-button-text-size);
  padding: 0;
  min-width: 22px;
  border-radius: 6px;
  margin: 8px;
  position: relative;
  white-space: nowrap;
  height: 22px;

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

const TinyOutlineIconButtonIconHolder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 3px;
`;

const TinyOutlineIconButtonIcon = styled.div`
  width: 16px;
  height: 16px;
`;

const TextContainer = styled.div`
  box-sizing: border-box;
  height: calc(var(--tiny-action-button-text-size) - 9px);
  line-height: calc(var(--tiny-action-button-text-size) - 10px);
`;

const TinyOutlineIconButton = forwardRef((props, ref) => {
  const filteredProps = { ...props };
  delete filteredProps.iconSrc;
  delete filteredProps.children;
  return (
    <TinyOutlineIconButtonElement {...filteredProps} ref={ref}>
      <TinyOutlineIconButtonIconHolder>
        <TinyOutlineIconButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
      </TinyOutlineIconButtonIconHolder>
      <TextContainer>{props.children}</TextContainer>
    </TinyOutlineIconButtonElement>
  );
});

TinyOutlineIconButton.displayName = "TinyOutlineIconButton";

TinyOutlineIconButton.propTypes = {
  iconSrc: PropTypes.string,
  children: PropTypes.node
};

export { TinyOutlineIconButton as default };

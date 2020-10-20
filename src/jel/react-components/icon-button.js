import PropTypes from "prop-types";
import React, { forwardRef } from "react";

import styled from "styled-components";

const IconButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  border: 0;
  color: var(--action-button-text-color);
  width: 28px;
  height: 24px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0px 2px;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }
`;

const IconButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const BigIconButtonElement = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  border: 0;
  color: var(--action-button-text-color);
  width: 40px;
  height: 36px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0px 2px;

  &:hover {
    background-color: var(--action-button-hover-background-color);
  }

  &:active {
    background-color: var(--action-button-active-background-color);
  }
`;

const BigIconButtonIcon = styled.div`
  width: 30px;
  height: 30px;
`;

const IconButton = forwardRef((props, ref) => {
  const filteredProps = { ...props };
  delete filteredProps.iconSrc;
  delete filteredProps.children;
  return (
    <IconButtonElement {...filteredProps} ref={ref}>
      <IconButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
    </IconButtonElement>
  );
});

IconButton.displayName = "IconButton";

IconButton.propTypes = {
  iconSrc: PropTypes.string,
  includeBorder: PropTypes.bool
};

const BigIconButton = forwardRef((props, ref) => {
  const filteredProps = { ...props };
  delete filteredProps.iconSrc;
  delete filteredProps.children;
  return (
    <BigIconButtonElement {...filteredProps} ref={ref}>
      <BigIconButtonIcon dangerouslySetInnerHTML={{ __html: props.iconSrc }} />
    </BigIconButtonElement>
  );
});

BigIconButton.displayName = "BigIconButton";

BigIconButton.propTypes = {
  iconSrc: PropTypes.string,
  includeBorder: PropTypes.bool
};

export { IconButton as default, BigIconButton };

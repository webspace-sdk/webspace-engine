//import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import React, { useState, useEffect, useCallback } from "react";

import styled from "styled-components";

export const SNACKBAR_MODES = {
  NORMAL: 1,
  SUPPORT: 2
};

const SnackbarElement = styled.div`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--snackbar-background-color);
  border: 3px solid var(--snackbar-border-color);
  color: var(--snackbar-text-color);
  font-weight: var(--snackbar-text-weight);
  font-size: var(--snackbar-text-size);
  padding: 8px 40px;
  border-radius: 24px;
  margin: 12px;
  position: fixed;
  left: 50%;
  bottom: 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: fit-content;

  transition: transform 0.15s linear, opacity 0.15s linear;
  transform: translate(-50%, 0);

  &.hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -6px);
  }

  z-index: 100;
`;

const Message = styled.div`
  margin-right: 24px;
  text-shadow: 0px 0px 2px var(--menu-shadow-color);
  user-select: none;
  padding: 12px 0;
  line-height: 24px;

  & div {
    font-size: var(--snackbar-small-text-size);
  }
`;

const ActionButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--snackbar-action-button-background-color);
  border: 2px solid var(--snackbar-action-button-border-color);
  color: var(--snackbar-action-button-text-color);
  font-weight: var(--snackbar-action-button-text-weight);
  font-size: var(--snackbar-action-button-text-size);
  text-shadow: 0px 0px 2px var(--menu-shadow-color);
  padding: 8px 33px;
  min-width: 64px;
  border-radius: 6px;
  margin: 8px;
  position: relative;
  white-space: nowrap;

  &:hover {
    background-color: var(--snackbar-action-button-hover-background-color);
  }

  &:active {
    background-color: var(--snackbar-action-button-active-background-color);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

const SecondaryButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--snackbar-secondary-action-button-background-color);
  border: 2px solid var(--snackbar-secondary-action-button-border-color);
  color: var(--snackbar-secondary-action-button-text-color);
  font-weight: var(--snackbar-secondary-action-button-text-weight);
  font-size: var(--snackbar-secondary-action-button-text-size);
  padding: 8px 34px;
  min-width: 64px;
  border-radius: 6px;
  margin: 8px;
  position: relative;
  white-space: nowrap;

  &:hover {
    background-color: var(--snackbar-secondary-action-button-hover-background-color);
  }

  &:active {
    background-color: var(--snackbar-secondary-action-button-active-background-color);
  }

  &:disabled {
    opacity: 0.5;
  }
`;

export default function Snackbar() {
  const [hidden, setIsHidden] = useState(true);
  const accountChannel = window.APP.accountChannel;

  useEffect(
    () => {
      const handler = () => setIsHidden(false);
      accountChannel.addEventListener("support_available", handler);
      return () => accountChannel.removeEventListener("support_available", handler);
    },
    [accountChannel]
  );

  useEffect(
    () => {
      const handler = () => setIsHidden(true);

      accountChannel.addEventListener("support_unavailable", handler);
      return () => accountChannel.removeEventListener("support_unavailable", handler);
    },
    [accountChannel]
  );

  const onSupportConfirm = useCallback(
    () => {
      accountChannel.requestSupport();
      setIsHidden(true);
    },
    [accountChannel, setIsHidden]
  );

  const onSupportDeny = useCallback(
    () => {
      accountChannel.denySupport();
      setIsHidden(true);
    },
    [accountChannel, setIsHidden]
  );

  return (
    <SnackbarElement id="snackbar" className={hidden ? "hidden" : ""}>
      <Message>
        <FormattedMessage id="support.title" />
        <div>
          <FormattedMessage id="support.subtitle" />
        </div>
      </Message>
      <ActionButton onClick={onSupportConfirm}>
        <FormattedMessage id="support.support-confirm" />
      </ActionButton>
      <SecondaryButton onClick={onSupportDeny}>
        <FormattedMessage id="support.support-delay" />
      </SecondaryButton>
    </SnackbarElement>
  );
}

Snackbar.propTypes = {};

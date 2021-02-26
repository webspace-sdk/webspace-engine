import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import React from "react";

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
  padding: 0px 42px;
  border-radius: 32px;
  margin: 12px;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: fit-content;
`;

const Message = styled.div`
  margin-right: 24px;
  text-shadow: 0px 0px 2px var(--menu-shadow-color);
  user-select: none;
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

const TertiaryButton = styled.button`
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: var(--snackbar-tertiary-action-button-background-color);
  border: none;
  color: var(--snackbar-tertiary-action-button-text-color);
  font-weight: var(--snackbar-tertiary-action-button-text-weight);
  font-size: var(--snackbar-tertiary-action-button-text-size);
  padding-left: 32px;
  min-width: 64px;
  border-radius: 6px;
  margin: 8px;
  position: relative;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
  }
`;
export default function Snackbar() {
  return (
    <SnackbarElement>
      <Message>
        <FormattedMessage id="support.available" />
      </Message>
      <ActionButton>
        <FormattedMessage id="support.support-confirm" />
      </ActionButton>
      <SecondaryButton>
        <FormattedMessage id="support.support-delay" />
      </SecondaryButton>
      <TertiaryButton>
        <FormattedMessage id="support.support-deny" />
      </TertiaryButton>
    </SnackbarElement>
  );
}

Snackbar.propTypes = {
  mode: PropTypes.number
};

import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { getMessages } from "../../hubs/utils/i18n";

const LoadingPanelElement = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 10000;
  background-color: #333;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  display: flex;
  transition: opacity 0.25s, visibility 0s linear 0.25s;
  opacity: 0;
  visibility: hidden;

  &.loading {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
  }
`;

const SplashWrap = styled.div`
  position: relative;
  width: 128px;
  height: 128px;
`;

const Tip = styled.div`
  position: absolute;
  top: 148px;
  left: -110px;
  white-space: pre;
  width: 352px;
  line-height: 24px;
  text-align: center;
  color: var(--tooltip-text-color);
`;

const BackLink = styled.a`
  position: absolute;
  top: 208px;
  left: -110px;
  white-space: pre;
  width: 352px;
  line-height: 24px;
  text-align: center;
  color: var(--tooltip-text-color);
  text-decoration: underline;
`;

const LoadingPanel = ({ isLoading, unsupportedMessage, unavailableReason }) => {
  let tipMessage = null;
  const messages = getMessages();
  if (unsupportedMessage) {
    tipMessage = messages[`unsupported.${unsupportedMessage}`];
  } else if (unavailableReason) {
    tipMessage = messages[`unavailable.${unavailableReason}`];
  }

  let backLink = null;

  if (unavailableReason) {
    backLink = <BackLink href="/">{messages["unavailable.go_home"]}</BackLink>;
  }

  return (
    <LoadingPanelElement className={isLoading || unsupportedMessage || unavailableReason ? "loading" : ""}>
      <SplashWrap>
        {tipMessage && <Tip>{tipMessage}</Tip>}
        {backLink}
      </SplashWrap>
    </LoadingPanelElement>
  );
};

LoadingPanel.propTypes = {
  isLoading: PropTypes.bool,
  unsupportedMessage: PropTypes.string,
  unavailableReason: PropTypes.string
};

export default LoadingPanel;

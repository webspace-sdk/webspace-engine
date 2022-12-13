import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { getMessages } from "../utils/i18n";
// import jelLoadingSrc from "!!url-loader!../../assets/images/jel-loading.svg";
// import jelLoadingShadowSrc from "!!url-loader!../../assets/images/jel-loading-shadow.svg";

const LoadingPanelElement = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 10000;
  background-color: var(--secondary-panel-background-color);
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

// const LogoElement = styled.img`
//   position: absolute;
//   top: 0;
//   left: 0;
//   width: 128px;
//   height: 128px;
//   @keyframes float_logo {
//     from {
//       top: -18px;
//     }
//     to {
//       top: -5px;
//     }
//   }
//
//   .loading & {
//     animation: 1.25s ease-in-out 0s infinite alternate float_logo;
//   }
// `;
//
// const LogoShadowElement = styled.img`
//   position: absolute;
//   top: 0;
//   left: 0;
//   width: 128px;
//   height: 128px;
//
//   @keyframes float_logo_shadow {
//     from {
//       transform: scaleX(1.2);
//     }
//     to {
//       transform: scaleX(1);
//     }
//   }
//
//   .loading & {
//     animation: 1.25s ease-in-out 0s infinite alternate float_logo_shadow;
//   }
// `;

const LoadingPanel = ({ isLoading, unsupportedMessage, unavailableReason }) => {
  let tipMessage = null;
  const messages = getMessages();
  if (unsupportedMessage) {
    tipMessage = messages[`unsupported.${unsupportedMessage}`];
  } else if (unavailableReason) {
    tipMessage = messages[`unavailable.${unavailableReason}`];
  }

  return (
    <LoadingPanelElement
      className={isLoading || unsupportedMessage || unavailableReason ? "loading" : "loading-complete"}
    >
      <SplashWrap>{tipMessage && <Tip>{tipMessage}</Tip>}</SplashWrap>
    </LoadingPanelElement>
  );
};

LoadingPanel.propTypes = {
  isLoading: PropTypes.bool,
  unsupportedMessage: PropTypes.string,
  unavailableReason: PropTypes.string
};

export default LoadingPanel;

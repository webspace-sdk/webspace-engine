import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import jelLoadingSrc from "../../assets/jel/images/jel-loading.svg";
import jelLoadingShadowSrc from "../../assets/jel/images/jel-loading-shadow.svg";
import "../../assets/jel/stylesheets/shared.scss";

const LoadingPanelElement = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 100;
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

const LogoElement = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 128px;
  height: 128px;

  .loading & {
    animation: 1.25s ease-in-out 0s infinite alternate float_logo;
  }
`;

const LogoShadowElement = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 128px;
  height: 128px;

  .loading & {
    animation: 1.25s ease-in-out 0s infinite alternate float_logo_shadow;
  }
`;

const SplashWrap = styled.div`
  position: relative;
  width: 128px;
  height: 128px;
`;

const LoadingPanel = ({ isLoading }) => {
  return (
    <LoadingPanelElement className={isLoading ? "loading" : ""}>
      <SplashWrap>
        <LogoShadowElement src={jelLoadingShadowSrc} />
        <LogoElement src={jelLoadingSrc} />
      </SplashWrap>
    </LoadingPanelElement>
  );
};

LoadingPanel.propTypes = {
  isLoading: PropTypes.bool
};

export default LoadingPanel;

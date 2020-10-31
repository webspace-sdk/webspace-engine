import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import jelLoadingSrc from "../assets/images/jel-loading.svg";
import jelLoadingShadowSrc from "../assets/images/jel-loading-shadow.svg";
import "../assets/stylesheets/shared.scss";

const LogoElement = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 128px;
  height: 128px;
  animation: 1.25s ease-in-out 0s infinite alternate float_logo;
`;

const LogoShadowElement = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 128px;
  height: 128px;
  animation: 1.25s ease-in-out 0s infinite alternate float_logo_shadow;
`;

const SplashWrap = styled.div`
  position: relative;
  width: 128px;
  height: 128px;
`;

const LoadingPanelElement = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: #333;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  transition: opacity 0.33s;
`;

const LoadingPanel = ({ isLoading }) => {
  return (
    <LoadingPanelElement style={{ opacity: isLoading ? 1 : 0, pointerEvents: isLoading }}>
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

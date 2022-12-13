import React from "react";
import styled from "styled-components";

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoadingSpinnerElement = styled.div`
  &,
  &:after {
    border-radius: 50%;
    width: 1.5em;
    height: 1.5em;
  }
  & {
    margin: 9px auto;
    font-size: 10px;
    position: relative;
    text-indent: -9999em;
    border-top: 0.13em solid transparent;
    border-right: 0.13em solid transparent;
    border-bottom: 0.13em solid transparent;
    border-left: 0.13em solid var(--dialog-tip-text-color);
    -webkit-transform: translateZ(0);
    -ms-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-animation: load8 1.1s infinite linear;
    animation: load8 1.1s infinite linear;
  }
  @-webkit-keyframes load8 {
    0% {
      -webkit-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }
  @keyframes load8 {
    0% {
      -webkit-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }
`;

const LoadingSpinnerExport = function(props) {
  return (
    <LoadingSpinner {...props} aria-hidden="true">
      <LoadingSpinnerElement />
    </LoadingSpinner>
  );
};

LoadingSpinnerExport.displayName = "LoadingSpinner";

export default LoadingSpinnerExport;

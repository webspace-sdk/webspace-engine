import React from "react";
import styled from "styled-components";
import Tippy from "@tippyjs/react";

const BigTooltipStyled = styled(Tippy)`
  background: var(--big-tooltip-background-color);
  font-size: var(--big-tooltip-text-size);
  font-weight: var(--big-tooltip-text-weight);
  line-height: calc(var(--big-tooltip-text-size) + 4px);
  color: var(--big-tooltip-text-color);
  padding: 4px 8px;

  & .tippy-arrow {
    color: var(--big-tooltip-background-color);
    background: var(--big-tooltip-background-color);
    border-color: var(--big-tooltip-background-color);
  }

  &[data-animation="open"][data-state="hidden"] {
    opacity: 0;
    transform: translateY(2px) scale(0.95, 0.95);
    transition-property: opacity, transform;
    transition-duration: 75ms, 75ms !important;
  }

  &[data-animation="open"][data-state="visible"] {
    opacity: 1;
    transform: translateY(0px) scale(1, 1);
    transition-property: opacity, transform;
    transition-duration: 75ms, 75ms !important;
  }
`;

const BigTooltip = function(props) {
  return <BigTooltipStyled animation="open" {...props} />;
};

export default BigTooltip;

import React from "react";
import styled from "styled-components";
import Tippy from "@tippyjs/react";

const TooltipStyled = styled(Tippy)`
  background: var(--tooltip-background-color);
  font-size: var(--tooltip-text-size);
  font-weight: var(--tooltip-text-weight);
  line-height: calc(var(--tooltip-text-size) + 4px);
  color: var(--tooltip-text-color);

  & .tippy-arrow {
    color: var(--tooltip-background-color);
    background: var(--tooltip-background-color);
    border-color: var(--tooltip-background-color);
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

  .panels-collapsed &.hide-when-expanded {
    display: none;
  }
`;

const Tooltip = function(props) {
  return <TooltipStyled animation="open" {...props} />;
};

export default Tooltip;

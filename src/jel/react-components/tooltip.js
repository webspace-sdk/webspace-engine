import styled from "styled-components";
import Tippy from "@tippyjs/react";

const Tooltip = styled(Tippy)`
  background: var(--tooltip-background-color);
  color: var(--tooltip-text-color);

  & .tippy-arrow {
    color: var(--tooltip-background-color);
    background: var(--tooltip-background-color);
    border-color: var(--tooltip-background-color);
  }
`;

export default Tooltip;

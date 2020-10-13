import styled from "styled-components";

// Note we only use this for trash so border radii assume left side.

const PopupPanel = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 0px 3px 3px 0px;
  box-shadow: 2px 2px 2px var(--menu-shadow-color);
  pointer-events: none;
  padding: 16px 0px;
`;

export { PopupPanel as default };

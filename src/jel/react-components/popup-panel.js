import styled from "styled-components";

// Note we only use this for invite popout from left panel so border radii assume left side.

const PopupPanel = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 0px 4px 4px 0px;
  box-shadow: 12px 12px 28px var(--menu-shadow-color);
  pointer-events: none;
  padding: 16px 0px;
`;

export { PopupPanel as default };

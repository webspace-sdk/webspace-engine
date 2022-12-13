import React from "react";
import styled from "styled-components";
import LeftPanel from "./left-panel";
import RightPanel from "./right-panel";

const Wrap = styled.div`
  color: var(--panel-text-color);
  background-color: var(--panel-background-color);
  font-size: var(--panel-text-size);
  font-weight: var(--panel-text-weight);
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  z-index: 2;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  user-select: none;

  #webspace-ui:focus-within & {
    pointer-events: auto;
  }
`;

function SidePanels(props) {
  return (
    <Wrap id="side-panels-wrap">
      <LeftPanel {...props} />
      <RightPanel {...props} />
    </Wrap>
  );
}

SidePanels.propTypes = {};

export default SidePanels;

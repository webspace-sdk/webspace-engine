import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styled, { ThemeProvider } from "styled-components";
import { dark } from "./theme";
import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";

const Wrap = styled.div`
  color: ${p => p.theme.text};
  pointer-events: none;
  height: 100%;
  top: 0;
  left: var(--scene-left);
  width: calc(100% - var(--scene-right) - var(--scene-left));
  position: fixed;
  z-index: 4;
`;

function JelUI({
  history,
  hub,
  hubCan = () => false,
  spaceCan = () => false,
  onHubDestroyConfirmed,
  memberships,
  spaceId
}) {
  return (
    <ThemeProvider theme={dark}>
      <Wrap>Hello</Wrap>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  navExpanded: PropTypes.bool,
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  orgPresences: PropTypes.object,
  hubPresences: PropTypes.object,
  sessionId: PropTypes.string,
  spaceId: PropTypes.string,
  memberships: PropTypes.array,
  onHubDestroyConfirmed: PropTypes.func
};

export default JelUI;

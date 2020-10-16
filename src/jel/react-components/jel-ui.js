import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import styled, { ThemeProvider } from "styled-components";
import { dark } from "./theme";

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

function JelUI() {
  return (
    <ThemeProvider theme={dark}>
      <Wrap>
        <HubTrail />
      </Wrap>
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
  memberships: PropTypes.array
};

export default JelUI;

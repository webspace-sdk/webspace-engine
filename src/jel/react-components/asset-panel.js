import React, { useState, useCallback, useRef } from "react";
import styled from "styled-components";

const AssetPanelElement = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;
  background-color: var(--channel-header-background-color);
  height: 64px;
`;

export default function AssetPanel() {
  return <AssetPanelElement />;
}

AssetPanel.propTypes = {};

import React, { useState } from "react";
import PropTypes from "prop-types";
import HubTrail from "./hub-trail";
import styled, { ThemeProvider } from "styled-components";
import { dark } from "./theme";
import { useTreeData } from "../utils/tree-utils";
import JelSidePanels from "./jel-side-panels";
import dotsIcon from "../assets/images/icons/dots-horizontal-overlay-shadow.svgi";

const Wrap = styled.div`
  color: ${p => p.theme.text};
  pointer-events: none;
  height: 100%;
  top: 0;
  left: var(--scene-left);
  width: calc(100% - var(--scene-right) - var(--scene-left));
  position: fixed;
  z-index: 4;
  background: linear-gradient(180deg, rgba(64, 64, 64, 0.4) 0%, rgba(32, 32, 32, 0) 128px);
  display: flex;
  flex-direction: column;
`;

const Top = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;
`;

const HubContextButtonElement = styled.button`
  width: content-width;
  margin: 11px 12px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  padding: 6px 10px;
  border: 0;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  outline-style: none;
  background-color: transparent;
  font-weight: var(--canvas-overlay-item-text-weight);
  text-align: left;
  max-width: fit-content;
  text-shadow: 0px 0px 4px;

  &:hover {
    background-color: var(--canvas-overlay-item-hover-background-color);
  }

  &:active {
    background-color: var(--canvas-overlay-item-active-background-color);
  }
`;

const HubContextButtonIcon = styled.div`
  width: 22px;
  height: 22px;
`;

const HubContextButton = props => {
  return (
    <HubContextButtonElement {...props}>
      <HubContextButtonIcon dangerouslySetInnerHTML={{ __html: dotsIcon }} />
    </HubContextButtonElement>
  );
};

function JelUI(props) {
  const { treeManager, history, hubCan, hub } = props;
  const tree = treeManager && treeManager.sharedNav;
  const spaceChannel = window.APP.spaceChannel;
  const hubMetadata = tree && tree.atomMetadata;
  const hubTrailHubIds = (tree && hub && tree.getAtomTrailForAtomId(hub.hub_id)) || (hub && [hub.hub_id]) || [];
  const [, setTreeData] = useState([]);
  const [treeDataVersion, setTreeDataVersion] = useState(0);

  // Consume tree updates so redraws if user manipulates tree
  useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion);

  return (
    <ThemeProvider theme={dark}>
      <div>
        <Wrap>
          <Top>
            {hubMetadata && (
              <HubTrail
                tree={tree}
                history={history}
                hubMetadata={hubMetadata}
                hubCan={hubCan}
                hubIds={hubTrailHubIds}
                onHubNameChanged={(hubId, name) => spaceChannel.updateHub(hubId, { name })}
              />
            )}
            <HubContextButton />
          </Top>
        </Wrap>
        <JelSidePanels {...props} />
      </div>
    </ThemeProvider>
  );
}

JelUI.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  //spaceCan: PropTypes.func,
  hubCan: PropTypes.func
  //orgPresences: PropTypes.object,
  //hubPresences: PropTypes.object,
  //sessionId: PropTypes.string,
  //spaceId: PropTypes.string,
  //memberships: PropTypes.array
};

export default JelUI;

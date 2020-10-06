import React, { useState, useEffect } from "react";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import styled from "styled-components";
import { createHub } from "../../hubs/utils/phoenix-utils";
import "../assets/stylesheets/nav-tree.scss";
import Tree from "rc-tree";
import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import PanelSectionHeader from "./panel-section-header";

const JelWrap = styled.div`
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
`;

const Nav = styled.div`
  pointer-events: auto;
  width: var(--nav-width);
  display: flex;
  flex-direction: column;
`;

const Presence = styled.div`
  pointer-events: auto;
  width: var(--presence-width);
`;

const NavHead = styled.div`
  flex: 0 0 auto;
`;

const NavFoot = styled.div`
  flex: 0 0 auto;
`;

const NavSpill = styled.div`
  overflow-x: hidden;
  overflow-y: auto;
`;

const TestButton = styled.button``;

function useTreeData(tree, setTreeData) {
  useEffect(
    () => {
      if (!tree) return () => {};

      const handleTreeData = () => setTreeData(tree.expandedTreeData);

      tree.addEventListener("expanded_treedata_updated", handleTreeData);
      tree.rebuildExpandedTreeData();

      () => tree.removeEventListener("expanded_treedata_updated", handleTreeData);
    },
    [tree, setTreeData]
  );
}

function useExpandableTree(treeManager) {
  useEffect(
    () => {
      if (!treeManager) return () => {};

      const handleExpandedNodeIdsChanged = () => {
        treeManager.nav.rebuildExpandedTreeData();
        treeManager.trash.rebuildExpandedTreeData();
      };

      treeManager.addEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);

      () => treeManager.removeEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);
    },
    [treeManager]
  );
}

function navigateToHubUrl(history, url, replace = false) {
  const search = history.location.search;
  const path = new URL(url).pathname;
  (replace ? replaceHistoryPath : pushHistoryPath)(history, path, search);
}

function HubTree({ treeManager, history, hub }) {
  const [navTreeData, setNavTreeData] = useState([]);
  const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager && treeManager.nav, setNavTreeData);
  useTreeData(treeManager && treeManager.trash, setTrashTreeData);
  useExpandableTree(treeManager);

  if (!treeManager || !hub) return null;

  const onTreeDragEnter = () => {
    // TODO store + expand
  };

  const onTreeDrop = tree => ({ dragNode, node, dropPosition }) => {
    const dropPos = node.pos.split("-");
    const dropOffset = dropPosition - Number(dropPos[dropPos.length - 1]);
    switch (dropOffset) {
      case -1:
        treeManager[tree].moveAbove(dragNode.key, node.key);
        break;
      case 1:
        treeManager[tree].moveBelow(dragNode.key, node.key);
        break;
      case 0:
        treeManager[tree].moveInto(dragNode.key, node.key);
        break;
    }
  };

  const navSelectedKeys = hub ? [treeManager.nav.getNodeIdForHubId(hub.hub_id)] : [];
  const trashSelectedKeys = hub ? [treeManager.trash.getNodeIdForHubId(hub.hub_id)] : [];

  return (
    <div>
      <Tree
        treeData={navTreeData}
        selectable={true}
        selectedKeys={navSelectedKeys}
        draggable
        onDragEnter={onTreeDragEnter}
        onDrop={onTreeDrop("nav")}
        onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
        expandedKeys={treeManager.expandedNodeIds()}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
      />
      Trash
      <Tree
        treeData={trashTreeData}
        selectable={true}
        selectedKeys={trashSelectedKeys}
        draggable
        expandedKeys={treeManager.expandedNodeIds()}
        onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
        onDragEnter={onTreeDragEnter}
        onDrop={onTreeDrop}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeExpanded(key, expanded)}
      />
    </div>
  );
}

function JelSidePanels({
  treeManager,
  history,
  hub,
  hubCan = () => false,
  spaceCan = () => false,
  onHubDestroyConfirmed,
  spaceIdsToHomeHubUrls,
  spaceId
}) {
  const onCreateClick = async () => {
    const hub = await createHub(spaceId);
    treeManager.nav.addToRoot(hub.hub_id);
  };

  const onTrashClick = () => {
    const nodeId = treeManager.nav.getNodeIdForHubId(hub.hub_id);
    if (!nodeId) return;

    treeManager.moveToTrash(nodeId);
  };

  const onRestoreClick = () => {
    const nodeId = treeManager.trash.getNodeIdForHubId(hub.hub_id);
    if (!nodeId) return;

    treeManager.restoreFromTrash(nodeId);
  };

  const onDestroyClick = async () => {
    const hubId = hub.hub_id;
    const nodeId = treeManager.trash.getNodeIdForHubId(hubId);
    if (!nodeId) return;

    const destroyed = await onHubDestroyConfirmed(hubId);
    if (destroyed) {
      treeManager.removeFromTrash(nodeId);
    }

    const homeHubUrl = spaceIdsToHomeHubUrls.get(spaceId);
    navigateToHubUrl(history, homeHubUrl, true);
  };

  return (
    <WrappedIntlProvider>
      <JelWrap>
        <Nav>
          <NavHead>
            {spaceCan("create_hub") && <TestButton onClick={onCreateClick}>Create World</TestButton>}
            {spaceCan("edit_nav") && hubCan("close_hub") && <TestButton onClick={onTrashClick}>Trash World</TestButton>}
          </NavHead>
          <NavSpill>
            <PanelSectionHeader>
              {" "}
              <FormattedMessage id="nav.shared-worlds" />
            </PanelSectionHeader>
            <HubTree treeManager={treeManager} hub={hub} history={history} />
          </NavSpill>
          <NavFoot>
            {spaceCan("edit_nav") && <TestButton onClick={onRestoreClick}>Restore World</TestButton>}
            {hubCan("close_hub") && <TestButton onClick={onDestroyClick}>Destroy World</TestButton>}
            {spaceIdsToHomeHubUrls && (
              <select
                onChange={e => navigateToHubUrl(history, spaceIdsToHomeHubUrls.get(e.target.value))}
                value={spaceId}
              >
                {[...spaceIdsToHomeHubUrls.keys()].map(sid => (
                  <option key={sid} value={sid}>
                    {sid}
                  </option>
                ))}
              </select>
            )}
          </NavFoot>
        </Nav>
        <Presence>Presence</Presence>
      </JelWrap>
    </WrappedIntlProvider>
  );
}

JelSidePanels.propTypes = {
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
  spaceIdsToHomeHubUrls: PropTypes.object,
  onHubDestroyConfirmed: PropTypes.func
};

HubTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object
};

export default JelSidePanels;

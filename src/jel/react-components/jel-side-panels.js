import React, { useState, useEffect } from "react";
import { WrappedIntlProvider } from "../../hubs/react-components/wrapped-intl-provider";
import { FormattedMessage } from "react-intl";
import { getMessages } from "../../hubs/utils/i18n";
import PropTypes from "prop-types";
import styled from "styled-components";
import { createHub } from "../../hubs/utils/phoenix-utils";
import "../assets/stylesheets/nav-tree.scss";
import Tree from "rc-tree";
import { pushHistoryPath, replaceHistoryPath } from "../../hubs/utils/history";
import PanelSectionHeader from "./panel-section-header";
import ActionButton from "./action-button";
import scrollIntoView from "scroll-into-view-if-needed";
import addIcon from "../assets/images/icons/add.svgi";

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
  box-shadow: 0px 0px 4px;
`;

const Presence = styled.div`
  pointer-events: auto;
  width: var(--presence-width);
  box-shadow: 0px 0px 4px;
`;

const NavHead = styled.div`
  flex: 0 0 auto;
`;

const NavFoot = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-top: 16px;
`;

const NavSpill = styled.div`
  overflow-x: hidden;
  overflow-y: auto;

  scrollbar-color: transparent transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    visibility: hidden;
  }

  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
    border: 2px solid transparent;
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.25s;
    min-height: 40px;
  }

  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  &::-webkit-scrollbar-track {
    border-color: transparent;
    background-color: transparent;
    border: 2px solid transparent;
    visibility: hidden;
  }

  &:hover {
    scrollbar-color: var(--scroll-thumb-color) transparent;

    &::-webkit-scrollbar-thumb {
      background-color: var(--scroll-thumb-color);
      transition: background-color 0.25s;
    }
  }
`;

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
  //const [trashTreeData, setTrashTreeData] = useState([]);

  useTreeData(treeManager && treeManager.nav, setNavTreeData);
  //useTreeData(treeManager && treeManager.trash, setTrashTreeData);
  useExpandableTree(treeManager);

  // Ensure current selected node is always visible
  useEffect(
    () => {
      const node = document.querySelector(".rc-tree-treenode-selected");
      if (node) {
        scrollIntoView(node, { scrollMode: "if-needed", inline: "start" });

        // Undo any horizontal scrolling, we don't want nav to horizontal scroll
        let e = node;

        while (e) {
          e.scrollLeft = 0;
          e = e.parentElement;
        }
      }
      return () => {};
    },
    [hub]
  );

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

  // TODO TRASH
  //const trashSelectedKeys = hub ? [treeManager.trash.getNodeIdForHubId(hub.hub_id)] : [];
  /* Trash
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
      />{" "}
      */

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
    </div>
  );
}

function JelSidePanels({
  treeManager,
  history,
  hub,
  //hubCan = () => false,
  spaceCan = () => false,
  //onHubDestroyConfirmed,
  spaceIdsToHomeHubs,
  spaceId
}) {
  const messages = getMessages();

  const onCreateClick = async () => {
    const hub = await createHub(spaceId);
    treeManager.nav.addToRoot(hub.hub_id);
    navigateToHubUrl(history, hub.url);
  };

  //const onTrashClick = () => {
  //  const nodeId = treeManager.nav.getNodeIdForHubId(hub.hub_id);
  //  if (!nodeId) return;

  //  treeManager.moveToTrash(nodeId);
  //};

  //const onRestoreClick = () => {
  //  const nodeId = treeManager.trash.getNodeIdForHubId(hub.hub_id);
  //  if (!nodeId) return;

  //  treeManager.restoreFromTrash(nodeId);
  //};

  const homeHub = spaceIdsToHomeHubs ? spaceIdsToHomeHubs.get(spaceId) : null;

  //const onDestroyClick = async () => {
  //  const hubId = hub.hub_id;
  //  const nodeId = treeManager.trash.getNodeIdForHubId(hubId);
  //  if (!nodeId) return;

  //  const destroyed = await onHubDestroyConfirmed(hubId);
  //  if (destroyed) {
  //    treeManager.removeFromTrash(nodeId);
  //  }

  //  navigateToHubUrl(history, homeHub.url, true);
  //};

  // For now private tree is just home hub
  const privateSelectedKeys = hub && homeHub && hub.hub_id === homeHub.hub_id ? [hub.hub_id] : [];

  const privateTreeData = homeHub
    ? [
        {
          key: homeHub.hub_id,
          title: messages["nav.home-world"],
          url: homeHub.url,
          hubId: homeHub.hub_id,
          isLeaf: true
        }
      ]
    : [];

  //{spaceCan("edit_nav") && hubCan("close_hub") && <TestButton onClick={onTrashClick}>Trash World</TestButton>}
  //{spaceCan("edit_nav") && <TestButton onClick={onRestoreClick}>Restore World</TestButton>}
  //{hubCan("close_hub") && <TestButton onClick={onDestroyClick}>Destroy World</TestButton>}
  //
  return (
    <WrappedIntlProvider>
      <JelWrap>
        <Nav>
          <NavHead />
          <NavSpill>
            <PanelSectionHeader>
              <FormattedMessage id="nav.private-worlds" />
            </PanelSectionHeader>
            <Tree
              treeData={privateTreeData}
              selectable={true}
              selectedKeys={privateSelectedKeys}
              onSelect={(selectedKeys, { node: { url } }) => navigateToHubUrl(history, url)}
            />
            <PanelSectionHeader>
              <FormattedMessage id="nav.shared-worlds" />
            </PanelSectionHeader>
            <HubTree treeManager={treeManager} hub={hub} history={history} />
          </NavSpill>
          <NavFoot>
            {spaceCan("create_hub") && (
              <ActionButton iconSrc={addIcon} onClick={onCreateClick} style={{ width: "80%" }}>
                <FormattedMessage id="nav.create-world" />
              </ActionButton>
            )}
            {spaceIdsToHomeHubs && (
              <select
                onChange={e => navigateToHubUrl(history, spaceIdsToHomeHubs.get(e.target.value).url)}
                value={spaceId}
              >
                {[...spaceIdsToHomeHubs.keys()].map(sid => (
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
  spaceIdsToHomeHubs: PropTypes.object,
  onHubDestroyConfirmed: PropTypes.func
};

HubTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object
};

export default JelSidePanels;

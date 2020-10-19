import PropTypes from "prop-types";
import React, { useState, useCallback } from "react";
import Tree from "rc-tree";
import {
  addNewHubToTree,
  createTreeDropHandler,
  useTreeData,
  useExpandableTree,
  useScrollToSelectedTreeNode
} from "../utils/tree-utils";
import HubNodeTitle from "./hub-node-title";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import "../assets/stylesheets/hub-tree.scss";

function HubTree({ treeManager, history, hub, spaceCan, setHubRenameReferenceElement, showHubContextMenuPopup }) {
  const [navTreeData, setNavTreeData] = useState([]);
  const [navTreeDataVersion, setNavTreeDataVersion] = useState(0);

  const tree = treeManager && treeManager.sharedNav;
  const atomMetadata = tree && tree.atomMetadata;

  useTreeData(tree, navTreeDataVersion, setNavTreeData, setNavTreeDataVersion);
  useExpandableTree(treeManager);

  // Ensure current selected node is always visible
  useScrollToSelectedTreeNode(navTreeData, hub);

  const navTitleControl = useCallback(
    data => (
      <HubNodeTitle
        hubId={data.atomId}
        showAdd={spaceCan("create_hub")}
        showDots={true}
        hubMetadata={atomMetadata}
        onAddClick={e => {
          e.stopPropagation(); // Otherwise this will perform a tree node click event
          addNewHubToTree(history, treeManager, hub.space_id, data.atomId);
        }}
        onDotsClick={(e, ref) => {
          e.stopPropagation(); // Otherwise this will perform a tree node click event
          showHubContextMenuPopup(data.atomId, ref, "bottom-start");
          setHubRenameReferenceElement(ref);
        }}
      />
    ),
    [history, hub, treeManager, atomMetadata, showHubContextMenuPopup, setHubRenameReferenceElement, spaceCan]
  );

  if (!treeManager || !hub) return null;

  treeManager.setNavTitleControl(navTitleControl);

  const navSelectedKeys = hub ? [tree.getNodeIdForAtomId(hub.hub_id)] : [];

  return (
    <div>
      <Tree
        prefixCls="hub-tree"
        treeData={navTreeData}
        selectable={true}
        selectedKeys={navSelectedKeys}
        draggable
        onDragEnter={({ node }) => treeManager.setNodeIsExpanded(node.key, true)}
        onDrop={createTreeDropHandler(treeManager, tree)}
        onSelect={(selectedKeys, { node: { atomId } }) => {
          const metadata = tree.atomMetadata.getMetadata(atomId);

          if (metadata) {
            navigateToHubUrl(history, metadata.url);
          }
        }}
        expandedKeys={treeManager.sharedExpandedNodeIds()}
        onExpand={(expandedKeys, { expanded, node: { key } }) => treeManager.setNodeIsExpanded(key, expanded)}
      />
    </div>
  );
}

HubTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  spaceChannel: PropTypes.object,
  memberships: PropTypes.array,
  setHubRenameReferenceElement: PropTypes.func,
  showHubContextMenuPopup: PropTypes.func
};

export default HubTree;

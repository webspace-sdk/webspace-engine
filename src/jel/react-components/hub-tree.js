import PropTypes from "prop-types";
import React, { useState, useCallback, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import Tree from "rc-tree";
import styled from "styled-components";
import {
  addNewHubToTree,
  useTreeDropHandler,
  useTreeData,
  useExpandableTree,
  useScrollToSelectedTreeNode
} from "../utils/tree-utils";
import HubNodeTitle from "./hub-node-title";
import { navigateToHubUrl } from "../utils/jel-url-utils";

const EmptyMessage = styled.div`
  margin-left: 16px;
  margin-top: 8px;
  font-size: var(--panel-header-text-size);
  line-height: calc(var(--panel-header-text-size) + 2px);
  white-space: pre;
`;

function HubTree({ treeManager, history, hub, spaceCan, setAtomRenameReferenceElement, showHubContextMenuPopup }) {
  const [navTreeData, setNavTreeData] = useState([]);
  const [navTreeDataVersion, setNavTreeDataVersion] = useState(0);

  const tree = treeManager && treeManager.worldNav;
  const atomMetadata = tree && tree.atomMetadata;

  useTreeData(tree, navTreeDataVersion, setNavTreeData, setNavTreeDataVersion);
  useExpandableTree(treeManager, tree);

  // Ensure current selected node is always visible
  useScrollToSelectedTreeNode(navTreeData, hub);

  const navTitleControl = useCallback(
    data => {
      const showAdd = !!spaceCan("create_world_hub");

      return (
        <HubNodeTitle
          hubId={data.atomId}
          showAdd={showAdd}
          hubMetadata={atomMetadata}
          onAddClick={async e => {
            e.stopPropagation(); // Otherwise this will perform a tree node click event
            const newHub = await addNewHubToTree(treeManager, hub.space_id, data.atomId);
            await atomMetadata.ensureMetadataForIds([newHub.hub_id]);
            const metadata = atomMetadata.getMetadata(newHub.hub_id);
            navigateToHubUrl(history, metadata.url);
          }}
          onDotsClick={(e, ref) => {
            e.stopPropagation(); // Otherwise this will perform a tree node click event
            showHubContextMenuPopup(data.atomId, atomMetadata, ref, "bottom-start", [0, 0], {
              hideRename: false,
              isCurrentWorld: false
            });
            setAtomRenameReferenceElement(ref);
          }}
        />
      );
    },
    [history, hub, treeManager, atomMetadata, showHubContextMenuPopup, setAtomRenameReferenceElement, spaceCan]
  );

  const onDragEnter = useCallback(({ node }) => treeManager.setNodeIsExpanded(node.key, true, tree), [
    treeManager,
    tree
  ]);
  const onDrop = useTreeDropHandler(treeManager, tree, false);
  const onSelect = useCallback(
    (selectedKeys, { node: { atomId } }) => {
      const metadata = tree.atomMetadata.getMetadata(atomId);

      if (metadata) {
        navigateToHubUrl(history, metadata.url);
      }
    },
    [tree, history]
  );
  const onExpand = useCallback(
    (expandedKeys, { expanded, node: { key } }) => treeManager.setNodeIsExpanded(key, expanded, tree),
    [treeManager, tree]
  );

  const navSelectedKeys = useMemo(() => (hub && tree ? [tree.getNodeIdForAtomId(hub.hub_id)] : []), [hub, tree]);

  if (!treeManager || !hub) return null;

  treeManager.setNavTitleControl(navTitleControl);

  const draggable = spaceCan("create_world_hub");

  return (
    <div>
      <Tree
        prefixCls="atom-tree"
        treeData={navTreeData}
        selectable={true}
        selectedKeys={navSelectedKeys}
        draggable={draggable}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
        allowDrop={true}
        onSelect={onSelect}
        expandedKeys={treeManager.navExpandedNodeIds()}
        onExpand={onExpand}
      />
      {navTreeData.length === 0 && (
        <EmptyMessage>
          <FormattedMessage id="nav.worlds-empty" />
        </EmptyMessage>
      )}
    </div>
  );
}

HubTree.propTypes = {
  treeManager: PropTypes.object,
  type: PropTypes.string,
  history: PropTypes.object,
  hub: PropTypes.object,
  spaceCan: PropTypes.func,
  hubCan: PropTypes.func,
  setAtomRenameReferenceElement: PropTypes.func,
  showHubContextMenuPopup: PropTypes.func
};

export default HubTree;

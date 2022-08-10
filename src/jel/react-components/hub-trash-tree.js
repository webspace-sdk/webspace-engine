import PropTypes from "prop-types";
import React, { useState, useCallback, useMemo } from "react";
import classNames from "classnames";
import Tree from "rc-tree";
import styled from "styled-components";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { useTreeData, findChildrenAtomsInTreeData } from "../utils/tree-utils";
import HubTrashNodeTitle from "./hub-trash-node-title";
import { FormattedMessage } from "react-intl";

const TrashWrap = styled.div``;

function HubTrashTree({ treeManager, hubMetadata, tree, history, hub, hubCan, onRestore, onRemove }) {
  const [trashTreeData, setTrashTreeData] = useState([]);
  const [trashTreeDataVersion, setTrashTreeDataVersion] = useState(0);

  useTreeData(tree, trashTreeDataVersion, setTrashTreeData, setTrashTreeDataVersion);

  const trashNavTitleControl = useCallback(
    data => (
      <HubTrashNodeTitle
        hubId={data.atomId}
        hubMetadata={hubMetadata}
        showRestore={hubCan("trash_hub", data.atomId)}
        showRemove={hubCan("remove_hub", data.atomId)}
        onRestoreClick={e => {
          e.preventDefault();
          e.stopPropagation();

          const hubId = data.atomId;
          const nodeId = tree.getNodeIdForAtomId(hubId);
          if (!nodeId) return;

          const trashTreeData = treeManager.getNestedTrashTreeData();

          // If the node we want to restore has a parent that is trashed, we need to move it below the root so it will show up.
          const parentNodeId = tree.getParentNodeId(nodeId);

          if (parentNodeId) {
            const parentHubId = tree.getAtomIdForNodeId(parentNodeId);
            const hubMetadata = tree.atomMetadata;
            const parentMetadata = hubMetadata && hubMetadata.getMetadata(parentHubId);
            if (parentMetadata && parentMetadata.state === "trashed") {
              tree.moveBelowRoot(nodeId);
            }
          }

          // Restore this node and all the children we have permission to restore
          const restorableHubIds = findChildrenAtomsInTreeData(trashTreeData, hubId).filter(
            hubId => hubCan("trash_hub", hubId) && hubCan("join_hub", hubId)
          );

          if (onRestore) {
            onRestore(hubId, [hubId, ...restorableHubIds]);
          }
        }}
        onRemoveClick={e => {
          e.preventDefault();
          e.stopPropagation();

          const hubId = data.atomId;
          const nodeId = tree.getNodeIdForAtomId(hubId);

          if (!nodeId) return;

          const hubIdToRemove = data.atomId;

          tree.remove(nodeId);

          // Rebuild trash to reflect that the node has been removed
          tree.rebuildFilteredTreeData();

          if (onRemove) {
            onRemove(hubIdToRemove);
          }
        }}
      />
    ),
    [treeManager, tree, hubMetadata, hubCan, onRemove, onRestore]
  );

  const trashNav = treeManager && treeManager.trashNav;
  const navSelectedKeys = useMemo(() => (hub && trashNav ? [trashNav.getNodeIdForAtomId(hub.hub_id)] : []), [
    hub,
    trashNav
  ]);
  const onSelect = useCallback((selectedKeys, { node: { url } }) => navigateToHubUrl(history, url), [history]);

  if (!treeManager || !tree || !hub) return null;

  treeManager.setTrashNavTitleControl(trashNavTitleControl);

  if (!trashTreeData || trashTreeData.length === 0) {
    return (
      <TrashWrap>
        <FormattedMessage id="trash.empty" />
      </TrashWrap>
    );
  }

  return (
    <TrashWrap>
      <Tree
        prefixCls="atom-tree"
        onSelect={onSelect}
        className={classNames("hub-trash-tree")}
        treeData={trashTreeData}
        selectedKeys={navSelectedKeys}
        selectable={true}
        expandable={false}
        draggable={false}
      />
    </TrashWrap>
  );
}

HubTrashTree.propTypes = {
  treeManager: PropTypes.object,
  tree: PropTypes.object,
  history: PropTypes.object,
  hub: PropTypes.object,
  hubMetadata: PropTypes.object,
  hubCan: PropTypes.func,
  onRestore: PropTypes.func,
  onRemove: PropTypes.func
};

export default HubTrashTree;

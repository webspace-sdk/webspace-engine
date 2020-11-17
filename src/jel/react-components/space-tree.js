import PropTypes from "prop-types";
import React, { useState, useCallback, useMemo } from "react";
import Tree from "rc-tree";
import SpaceNodeIcon from "./space-node-icon";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { useTreeDropHandler, useTreeData, useScrollToSelectedTreeNode } from "../utils/tree-utils";
import "../../assets/jel/stylesheets/space-tree.scss";

function SpaceTree({ treeManager, history, space, memberships }) {
  const [spaceTreeData, setSpaceTreeData] = useState([]);
  const [spaceTreeDataVersion, setSpaceTreeDataVersion] = useState(0);
  const tree = treeManager && treeManager.privateSpace;
  const spaceMetadata = tree && tree.atomMetadata;
  useTreeData(tree, spaceTreeDataVersion, setSpaceTreeData, setSpaceTreeDataVersion);
  useScrollToSelectedTreeNode(spaceTreeData, space);

  const spaceSelectedKeys = useMemo(() => (space && tree ? [tree.getNodeIdForAtomId(space.space_id)] : []), [
    space,
    tree
  ]);
  const icon = useCallback(item => <SpaceNodeIcon spaceId={item.atomId} spaceMetadata={spaceMetadata} />, [
    spaceMetadata
  ]);
  const onSelect = useCallback(
    (selectedKeys, { node: { atomId } }) => navigateToHubUrl(history, homeHubForSpaceId(atomId, memberships).url),
    [history, memberships]
  );

  return (
    <div>
      <Tree
        prefixCls="space-tree"
        treeData={spaceTreeData}
        icon={icon}
        selectable={true}
        selectedKeys={spaceSelectedKeys}
        draggable
        onDrop={useTreeDropHandler(treeManager, tree, false)}
        onSelect={onSelect}
      />
    </div>
  );
}

SpaceTree.propTypes = {
  treeManager: PropTypes.object,
  history: PropTypes.object,
  space: PropTypes.object,
  memberships: PropTypes.array
};

export default SpaceTree;

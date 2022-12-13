import PropTypes from "prop-types";
import React, { useState, useCallback, useMemo } from "react";
import Tree from "rc-tree";
import SpaceNodeIcon, { AddSpaceIcon, JoinDiscordIcon } from "./space-node-icon";
import { navigateToHubUrl } from "../utils/url-utils";
import { getInitialHubForSpaceId, homeHubForSpaceId } from "../utils/membership-utils";
import { useTreeDropHandler, useTreeData, useScrollToSelectedTreeNode } from "../utils/tree-utils";

const addSpaceIconTreeItem = { key: "add", children: null, isLeaf: true };
const joinDiscordSpaceIconTreeItem = { key: "discord", children: null, isLeaf: true };

function SpaceTree({ treeManager, space, memberships }) {
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
  const icon = useCallback(
    item => {
      if (item.eventKey === "add") {
        return <AddSpaceIcon />;
      } else if (item.eventKey === "discord") {
        return <JoinDiscordIcon />;
      } else {
        return <SpaceNodeIcon spaceId={item.atomId} spaceMetadata={spaceMetadata} />;
      }
    },
    [spaceMetadata]
  );
  const onSelect = useCallback(
    async (selectedKeys, { node: { atomId } }) => {
      const targetHub = (await getInitialHubForSpaceId(atomId)) || homeHubForSpaceId(atomId, memberships);
      navigateToHubUrl(targetHub.url);
    },
    [memberships]
  );

  return (
    <div>
      <Tree
        prefixCls="space-tree"
        treeData={[...spaceTreeData, joinDiscordSpaceIconTreeItem, addSpaceIconTreeItem]}
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
  space: PropTypes.object,
  memberships: PropTypes.array
};

export default SpaceTree;

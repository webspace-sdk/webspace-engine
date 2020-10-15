import PropTypes from "prop-types";
import React, { useState } from "react";
import Tree from "rc-tree";
import SpaceNodeIcon from "./space-node-icon";
import { navigateToHubUrl } from "../utils/jel-url-utils";
import { homeHubForSpaceId } from "../utils/membership-utils";
import { createTreeDropHandler, useTreeData, useScrollToSelectedTreeNode } from "../utils/tree-utils";
import "../assets/stylesheets/space-tree.scss";

function SpaceTree({ treeManager, history, space, memberships }) {
  const [spaceTreeData, setSpaceTreeData] = useState([]);
  const [spaceTreeDataVersion, setSpaceTreeDataVersion] = useState(0);
  const tree = treeManager && treeManager.privateSpace;
  useTreeData(tree, spaceTreeDataVersion, setSpaceTreeData, setSpaceTreeDataVersion);
  useScrollToSelectedTreeNode(space);

  const spaceSelectedKeys = space && treeManager ? [tree.getNodeIdForAtomId(space.space_id)] : [];

  return (
    <div>
      <Tree
        prefixCls="space-tree"
        treeData={spaceTreeData}
        icon={spaceTreeData => <SpaceNodeIcon spaceTreeData={spaceTreeData} />}
        selectable={true}
        selectedKeys={spaceSelectedKeys}
        draggable
        onDrop={createTreeDropHandler(treeManager, tree, false)}
        onSelect={(selectedKeys, { node: { atomId } }) =>
          navigateToHubUrl(history, homeHubForSpaceId(atomId, memberships).url)
        }
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

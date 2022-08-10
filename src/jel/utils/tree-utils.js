import scrollIntoView from "scroll-into-view-if-needed";
import { useEffect, useCallback } from "react";
import { createHub } from "../../hubs/utils/phoenix-utils";

export function useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion) {
  useEffect(
    () => {
      if (!tree) return () => {};

      const handleTreeData = () => {
        setTreeData(tree.filteredTreeData);
        setTreeDataVersion(tree.filteredTreeDataVersion);
      };

      // Tree itself changed because effect was fired
      setTreeData(tree.filteredTreeData);

      // Tree internal state changed
      tree.addEventListener("filtered_treedata_updated", handleTreeData);
      return () => tree.removeEventListener("filtered_treedata_updated", handleTreeData);
    },
    [tree, setTreeData, treeDataVersion, setTreeDataVersion]
  );
}

export function useExpandableTree(treeManager, tree) {
  useEffect(
    () => {
      if (!treeManager) return () => {};

      const handleExpandedNodeIdsChanged = () => tree.rebuildFilteredTreeData();

      treeManager.addEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);

      () => treeManager.removeEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);
    },
    [treeManager, tree]
  );
}

export function useScrollToSelectedTreeNode(treeData, atom) {
  useEffect(
    () => {
      const node = UI_ROOT.querySelector(".atom-tree-treenode-selected");

      if (node) {
        scrollIntoView(node, { scrollMode: "if-needed", inline: "start" });
        // Undo any horizontal scrolling, we don't want nav to horizontal scroll
        let e = node;
        while (e) {
          e.scrollLeft = 0;
          e = e.parentElement;
        }

        // Undo the scroll this algorithm can induce on the outer wrap, which is undesired.
        UI_ROOT.querySelector("#jel-side-panels-wrap").scrollTop = 0;
      }
      return () => {};
    },
    [treeData, atom]
  );
}

export const useTreeDropHandler = (treeManager, tree, allowNesting = true) =>
  useCallback(
    ({ dragNode, node, dropPosition }) => {
      const dropPos = node.pos.split("-");
      const dropOffset = dropPosition - Number(dropPos[dropPos.length - 1]);
      switch (dropOffset) {
        case -1:
          tree.moveAbove(dragNode.key, node.key);
          break;
        case 1:
          tree.moveBelow(dragNode.key, node.key);
          break;
        case 0:
          if (allowNesting) {
            tree.moveInto(dragNode.key, node.key);
            treeManager.setNodeIsExpanded(node.key, true, tree);
          }
          break;
      }
    },
    [treeManager, tree, allowNesting]
  );

// Returns all the children atoms in the given tree data under atomId's node,
// with the deepest nodes last.
export function findChildrenAtomsInTreeData(treeData, atomId) {
  const atomIds = [];

  const walk = (n, collect) => {
    if (collect) {
      atomIds.push(n.atomId);
    } else if (n.atomId === atomId) {
      collect = true;
    }

    if (n.children) {
      for (let i = 0; i < n.children.length; i++) {
        const c = n.children[i];
        walk(c, collect);
      }
    }
  };

  walk({ children: treeData, atomId: null }, false);
  return atomIds;
}

export function isAtomInSubtree(tree, subtreeAtomId, targetAtomId) {
  let nodeId = tree.getNodeIdForAtomId(targetAtomId);
  if (!nodeId) return false;

  do {
    if (tree.getAtomIdForNodeId(nodeId) === subtreeAtomId) {
      return true;
    }

    nodeId = tree.getParentNodeId(nodeId);
  } while (nodeId);

  return false;
}

export async function addNewHubToTree(
  treeManager,
  spaceId,
  type,
  insertUnderAtomId,
  name = null,
  template = null,
  worldType = null,
  worldSeed = null,
  worldColors = null,
  spawnPosition = null,
  spawnRotation = null,
  spawnRadius = null
) {
  const tree = type === "world" ? treeManager.worldNav : treeManager.channelNav;
  const hub = await createHub(
    spaceId,
    type,
    name,
    template,
    worldType,
    worldSeed,
    worldColors,
    spawnPosition,
    spawnRotation,
    spawnRadius
  );
  const insertUnderNodeId = insertUnderAtomId ? tree.getNodeIdForAtomId(insertUnderAtomId) : null;

  if (insertUnderNodeId) {
    tree.insertUnder(hub.hub_id, insertUnderNodeId);
    treeManager.setNodeIsExpanded(insertUnderNodeId, true, tree);
  } else {
    tree.addToRoot(hub.hub_id);
  }

  return hub;
}

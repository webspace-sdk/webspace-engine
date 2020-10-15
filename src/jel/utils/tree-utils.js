import scrollIntoView from "scroll-into-view-if-needed";
import { useEffect } from "react";
import { createHub } from "../../hubs/utils/phoenix-utils";
import { navigateToHubUrl } from "./jel-url-utils";
import { getMessages } from "../../hubs/utils/i18n";
const DEFAULT_HUB_NAME = getMessages()["hub.unnamed-title"];

export function useTreeData(tree, treeDataVersion, setTreeData, setTreeDataVersion) {
  useEffect(
    () => {
      if (!tree) return () => {};

      const handleTreeData = () => {
        setTreeData(tree.filteredTreeData);
        setTreeDataVersion(treeDataVersion + 1);
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

export function useExpandableTree(treeManager) {
  useEffect(
    () => {
      if (!treeManager) return () => {};

      const handleExpandedNodeIdsChanged = () => {
        treeManager.sharedNav.rebuildFilteredTreeData();
      };

      treeManager.addEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);

      () => treeManager.removeEventListener("expanded_nodes_updated", handleExpandedNodeIdsChanged);
    },
    [treeManager]
  );
}

export function useScrollToSelectedTreeNode(atom) {
  useEffect(
    () => {
      const node = document.querySelector(".hub-tree-treenode-selected");
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
    [atom]
  );
}

export const createTreeDropHandler = (treeManager, tree, allowNesting = true) => ({ dragNode, node, dropPosition }) => {
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
        treeManager.setNodeIsExpanded(node.key, true);
      }
      break;
  }
};

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

export async function addNewHubToTree(history, treeManager, spaceId, insertUnderAtomId) {
  const tree = treeManager.sharedNav;
  const hub = await createHub(spaceId);
  const insertUnderNodeId = insertUnderAtomId ? tree.getNodeIdForAtomId(insertUnderAtomId) : null;

  if (insertUnderNodeId) {
    treeManager.sharedNav.insertUnder(hub.hub_id, insertUnderNodeId);
    treeManager.setNodeIsExpanded(insertUnderNodeId, true);
  } else {
    treeManager.sharedNav.addToRoot(hub.hub_id);
  }

  navigateToHubUrl(history, hub.url);
}

export function useNameUpdateFromHubMetadata(hubId, hubMetadata, setName) {
  useEffect(
    () => {
      const updateName = () => {
        let name = null;

        if (hubMetadata.hasMetadata(hubId)) {
          name = hubMetadata.getMetadata(hubId).name;
        }

        setName(name || DEFAULT_HUB_NAME);
      };

      updateName();
      hubMetadata.subscribeToMetadata(hubId, updateName);
      return () => hubMetadata.unsubscribeFromMetadata(updateName);
    },
    [hubId, hubMetadata, setName]
  );
}

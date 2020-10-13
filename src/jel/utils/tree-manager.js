import TreeSync, { TREE_PROJECTION_TYPE } from "./tree-sync";

const EXPANDED_TREE_NODE_STORE_KEY = "__JelExpandedTreeNodes";

class ExpandedTreeNodes {
  constructor() {
    if (localStorage.getItem(EXPANDED_TREE_NODE_STORE_KEY) === null) {
      localStorage.setItem(EXPANDED_TREE_NODE_STORE_KEY, JSON.stringify({}));
    }
  }

  isExpanded(nodeId) {
    this.ensureCache();
    return !!this.cache[nodeId];
  }

  expandedNodeIds() {
    this.ensureCache();
    return Object.keys(this.cache);
  }

  set(nodeId) {
    this.ensureCache();
    this.cache[nodeId] = true;
    localStorage.setItem(EXPANDED_TREE_NODE_STORE_KEY, JSON.stringify(this.cache));
  }

  unset(nodeId) {
    this.ensureCache();
    delete this.cache[nodeId];
    localStorage.setItem(EXPANDED_TREE_NODE_STORE_KEY, JSON.stringify(this.cache));
  }

  ensureCache() {
    if (!this.cache) {
      this.cache = JSON.parse(localStorage[EXPANDED_TREE_NODE_STORE_KEY]);
    }
  }
}

class TreeManager extends EventTarget {
  constructor(spaceMetadata, hubMetadata) {
    super();
    this.privateExpandedTreeNodes = new ExpandedTreeNodes();
    this.sharedExpandedTreeNodes = new ExpandedTreeNodes();

    // Private space tree
    this.privateSpace = new TreeSync("space", this.privateExpandedTreeNodes, spaceMetadata);
    this.hasPrivateSpaceTree = false;

    const filterByMetadata = filter => node => {
      if (!hubMetadata.hasMetadata(node.h)) return false;
      return filter(hubMetadata.getMetadata(node.h));
    };

    const isNotTrashed = filterByMetadata(m => !m.is_trashed && m.permissions.join_hub);
    const isTrashed = filterByMetadata(m => m.is_trashed && m.permissions.join_hub);

    this.sharedNav = new TreeSync("nav", this.sharedExpandedTreeNodes, hubMetadata, isNotTrashed);
    this.trashNav = new TreeSync("nav", null, hubMetadata, isTrashed, TREE_PROJECTION_TYPE.FLAT);
  }

  async init(connection, memberships) {
    await Promise.all([
      await this.privateSpace.init(connection),
      await this.sharedNav.init(connection),
      await this.trashNav.init(connection)
    ]);

    await this.syncMembershipsToPrivateSpaceTree(memberships);
  }

  setNavTitleControl(titleControl) {
    this.sharedNav.setTitleControl(titleControl);
  }

  setTrashNavTitleControl(titleControl) {
    this.trashNav.setTitleControl(titleControl);
  }

  setAccountCollectionId(collectionId) {
    this.hasPrivateSpaceTree = true;
    this.privateSpace.setCollectionId(collectionId);
  }

  setSpaceCollectionId(collectionId) {
    this.sharedNav.setCollectionId(collectionId);
    this.trashNav.setCollectionId(collectionId);
  }

  setNodeIsExpanded(nodeId, expanded) {
    // TODO private hubs
    if (expanded) {
      // Expand node + all parents
      let nid = nodeId;

      do {
        this.sharedExpandedTreeNodes.set(nid);
        nid = this.sharedNav.getParentNodeId(nid);
      } while (nid);
    } else {
      this.sharedExpandedTreeNodes.unset(nodeId);
    }

    this.dispatchEvent(new CustomEvent("expanded_nodes_updated"));
  }

  sharedExpandedNodeIds() {
    return this.sharedExpandedTreeNodes.expandedNodeIds();
  }

  removeSubtreeFromTree(nodeId, fromTree) {
    // Compute the tree again to avoid filtering by expanded nodes in the UI, in order
    // to find the actual full closure of nodes to remove.
    const treeData = fromTree.computeTree();

    // Remove bottom up
    const removeWalk = (children, remove) => {
      for (const child of children) {
        const removeChild = remove || child.key === nodeId;

        if (child.children) {
          removeWalk(child.children, removeChild);
        }

        if (removeChild) {
          fromTree.remove(child.key);
        }
      }
    };

    removeWalk(treeData, false);
  }

  moveSubtreeToTree(nodeId, fromTree, toTree) {
    // Compute the tree again to avoid filtering by expanded nodes in the UI, in order
    // to find the actual full closure of nodes to move.
    const treeData = fromTree.computeTree();

    // Copy top-down
    const copyWalk = (children, copy) => {
      for (const child of children) {
        const copyChild = copy || child.key === nodeId;

        if (copyChild) {
          const node = fromTree.doc.data[child.key];
          toTree.insertOrUpdate(child.key, node);
        }

        if (child.children) {
          copyWalk(child.children, copyChild);
        }

        if (copyChild) {
          fromTree.remove(child.key);
        }
      }
    };

    copyWalk(treeData, false);
  }

  async syncMembershipsToPrivateSpaceTree(memberships) {
    if (!this.hasPrivateSpaceTree) return;

    const tree = this.privateSpace;
    tree.rebuildFilteredTreeData();

    [...memberships].sort(m => m.joined_at).forEach(({ space: { space_id } }) => {
      tree.addToRootIfNotExists(space_id);
    });

    // Remove memberships no longer value.
    const spaceIdsToRemove = new Set();

    const walk = nodes => {
      for (const { atomId, children } of nodes) {
        const membership = memberships.find(m => m.space.space_id === atomId);

        if (!membership) {
          spaceIdsToRemove.add(atomId);
        }

        if (children) {
          const childAtomId = walk(children);
          if (childAtomId) return childAtomId;
        }
      }

      return null;
    };

    walk(tree.filteredTreeData);

    for (const spaceId of spaceIdsToRemove) {
      const nodeId = tree.getNodeIdForAtomId(spaceId);

      if (nodeId) {
        tree.remove(nodeId);
      }
    }
  }
}

export default TreeManager;

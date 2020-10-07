import TreeSync from "./tree-sync";

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
  constructor(hubMetadata) {
    super();
    this.expandedTreeNodes = new ExpandedTreeNodes();
    this.nav = new TreeSync("nav", this.expandedTreeNodes, hubMetadata);
    this.trash = new TreeSync("trash", this.expandedTreeNodes, hubMetadata);
  }

  async init(connection) {
    await Promise.all([await this.nav.init(connection), await this.trash.init(connection)]);
  }

  setCollectionId(collectionId) {
    this.nav.setCollectionId(collectionId);
    this.trash.setCollectionId(collectionId);
  }

  setNodeExpanded(nodeId, expanded) {
    if (expanded) {
      this.expandedTreeNodes.set(nodeId);
    } else {
      this.expandedTreeNodes.unset(nodeId);
    }

    this.dispatchEvent(new CustomEvent("expanded_nodes_updated"));
  }

  expandedNodeIds() {
    return this.expandedTreeNodes.expandedNodeIds();
  }

  moveToTrash(nodeId) {
    this.moveSubtreeToTree(nodeId, this.nav, this.trash);
  }

  restoreFromTrash(nodeId) {
    this.moveSubtreeToTree(nodeId, this.trash, this.nav);
  }

  removeFromTrash(nodeId) {
    this.trash.remove(nodeId);
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
}

export default TreeManager;

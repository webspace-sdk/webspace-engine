import TreeSync, { TREE_PROJECTION_TYPE } from "./tree-sync";

const EXPANDED_TREE_NODE_STORE_KEY = "__JelExpandedTreeNodes";

class ExpandedTreeNodes {
  constructor() {
    if (localStorage.getItem(EXPANDED_TREE_NODE_STORE_KEY) === null) {
      localStorage.setItem(EXPANDED_TREE_NODE_STORE_KEY, JSON.stringify({}));
    }

    this.cache = null;
    this.cacheKeys = null;
  }

  isExpanded(nodeId) {
    this.ensureCache();
    return this.cache.has(nodeId);
  }

  expandedNodeIds() {
    this.ensureCache();
    return this.cacheKeys;
  }

  set(nodeId) {
    this.ensureCache();
    this.cache.add(nodeId);
    this.cacheKeys = null;
    this.writeCache();
  }

  unset(nodeId) {
    this.ensureCache();
    this.cache.delete(nodeId);
    this.cacheKeys = null;
    this.writeCache();
  }

  writeCache() {
    const out = {};
    for (const nodeId of this.cache) {
      out[nodeId] = true;
    }

    localStorage.setItem(EXPANDED_TREE_NODE_STORE_KEY, JSON.stringify(out));
  }

  ensureCache() {
    if (!this.cache) {
      this.cache = new Set([...Object.keys(JSON.parse(localStorage.getItem(EXPANDED_TREE_NODE_STORE_KEY)))]);
    }

    if (!this.cacheKeys) {
      this.cacheKeys = [...this.cache.keys()];
    }
  }
}

class TreeManager extends EventTarget {
  constructor(spaceMetadata, hubMetadata) {
    super();
    this.navExpandedTreeNodes = new ExpandedTreeNodes();

    this.worldNav = new TreeSync("index.html", this.navExpandedTreeNodes, hubMetadata, TREE_PROJECTION_TYPE.NESTED);

    this.trashNav = new TreeSync("trash.html", null, hubMetadata, TREE_PROJECTION_TYPE.FLAT);
    this.trashNested = new TreeSync("trash.html", null, hubMetadata, TREE_PROJECTION_TYPE.NESTED);
  }

  async init() {
    await Promise.all([await this.worldNav.init(), await this.trashNav.init(), await this.trashNested.init()]);
  }

  setNavTitleControl(titleControl) {
    this.worldNav.setTitleControl(titleControl);
  }

  setTrashNavTitleControl(titleControl) {
    this.trashNav.setTitleControl(titleControl);
  }

  rebuildSharedTrashTree() {
    this.trashNav.rebuildFilteredTreeData();
  }

  // Returns a nested representation of the trash
  getNestedTrashTreeData() {
    this.trashNested.rebuildFilteredTreeData();
    return this.trashNested.filteredTreeData;
  }

  setNodeIsExpanded(nodeId, expanded, tree) {
    // TODO private hubs
    if (expanded) {
      // Expand node + all parents
      let nid = nodeId;

      do {
        this.navExpandedTreeNodes.set(nid);
        nid = tree.getParentNodeId(nid);
      } while (nid);
    } else {
      this.navExpandedTreeNodes.unset(nodeId);
    }

    this.dispatchEvent(new CustomEvent("expanded_nodes_updated"));
  }

  navExpandedNodeIds() {
    return this.navExpandedTreeNodes.expandedNodeIds();
  }
}

export default TreeManager;

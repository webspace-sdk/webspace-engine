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
    this.privateExpandedTreeNodes = new ExpandedTreeNodes();
    this.navExpandedTreeNodes = new ExpandedTreeNodes();

    // Private space tree
    this.privateSpace = new TreeSync(
      "space",
      this.privateExpandedTreeNodes,
      spaceMetadata,
      () => true,
      TREE_PROJECTION_TYPE.NESTED,
      () => true
    );

    const filterAtomIdByMetadata = filter => atomId => {
      if (!hubMetadata.hasMetadata(atomId)) return false;
      return filter(hubMetadata.getMetadata(atomId));
    };

    const filterNodeByMetadata = filter => node => {
      if (!hubMetadata.hasMetadata(node.h)) return false;
      return filter(hubMetadata.getMetadata(node.h));
    };

    const isWorld = filterAtomIdByMetadata(m => m.type === "world");
    const isChannel = filterAtomIdByMetadata(m => m.type === "channel");
    const isActiveWorld = filterNodeByMetadata(
      m => m.state === "active" && m.type === "world" && m.permissions.join_hub
    );
    const isActiveChannel = filterNodeByMetadata(
      m => m.state === "active" && m.type === "channel" && m.permissions.join_hub
    );
    const isTrashed = filterNodeByMetadata(m => m.state === "trashed" && m.permissions.join_hub);

    this.worldNav = new TreeSync(
      "nav",
      this.navExpandedTreeNodes,
      hubMetadata,
      isActiveWorld,
      TREE_PROJECTION_TYPE.NESTED,
      isWorld
    );
    this.channelNav = new TreeSync(
      "nav",
      this.navExpandedTreeNodes,
      hubMetadata,
      isActiveChannel,
      TREE_PROJECTION_TYPE.NESTED,
      isChannel
    );
    this.trashNav = new TreeSync("nav", null, hubMetadata, isTrashed, TREE_PROJECTION_TYPE.FLAT);
    this.trashNested = new TreeSync("nav", null, hubMetadata, isTrashed, TREE_PROJECTION_TYPE.NESTED);

    this.worldNav.addEventListener("filtered_treedata_updated", () => this.syncMatrixRoomOrdersFromTree(this.worldNav));
    this.channelNav.addEventListener("filtered_treedata_updated", () =>
      this.syncMatrixRoomOrdersFromTree(this.channelNav)
    );
  }

  async init(connection) {
    await Promise.all([
      await this.privateSpace.init(connection),
      await this.worldNav.init(connection),
      await this.channelNav.init(connection),
      await this.trashNav.init(connection),
      await this.trashNested.init(connection)
    ]);
  }

  setNavTitleControl(titleControl) {
    this.worldNav.setTitleControl(titleControl);
    this.channelNav.setTitleControl(titleControl);
  }

  setTrashNavTitleControl(titleControl) {
    this.trashNav.setTitleControl(titleControl);
  }

  setSpaceCollectionId(collectionId) {
    this.worldNav.setCollectionId(collectionId);
    this.channelNav.setCollectionId(collectionId);
    this.trashNav.setCollectionId(collectionId);
    this.trashNested.setCollectionId(collectionId);
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

  async syncMatrixRoomOrdersFromTree({ filteredTreeData }) {
    const { matrix } = window.APP;
    let order = 0;

    const walk = nodes => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        matrix.updateRoomOrderForHubId(node.atomId, order);
        order++;

        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };

    walk(filteredTreeData);
  }
}

export default TreeManager;

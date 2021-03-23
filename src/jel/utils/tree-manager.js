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
    this.sharedExpandedTreeNodes = new ExpandedTreeNodes();

    // Private space tree
    this.privateSpace = new TreeSync(
      "space",
      this.privateExpandedTreeNodes,
      spaceMetadata,
      () => true,
      TREE_PROJECTION_TYPE.NESTED,
      true
    );
    this.hasPrivateSpaceTree = false;

    const filterByMetadata = filter => node => {
      if (!hubMetadata.hasMetadata(node.h)) return false;
      return filter(hubMetadata.getMetadata(node.h));
    };

    const isActive = filterByMetadata(m => m.state === "active" && m.permissions.join_hub);
    const isTrashed = filterByMetadata(m => m.state === "trashed" && m.permissions.join_hub);

    this.sharedNav = new TreeSync(
      "nav",
      this.sharedExpandedTreeNodes,
      hubMetadata,
      isActive,
      TREE_PROJECTION_TYPE.NESTED,
      true
    );
    this.trashNav = new TreeSync("nav", null, hubMetadata, isTrashed, TREE_PROJECTION_TYPE.FLAT, false);
    this.trashNested = new TreeSync("nav", null, hubMetadata, isTrashed, TREE_PROJECTION_TYPE.NESTED, false);
  }

  async init(connection, memberships) {
    await Promise.all([
      await this.privateSpace.init(connection),
      await this.sharedNav.init(connection),
      await this.trashNav.init(connection),
      await this.trashNested.init(connection)
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

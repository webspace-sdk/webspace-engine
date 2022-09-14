import TreeSync, { TREE_PROJECTION_TYPE } from "./tree-sync";
import { getSpaceIdFromHistory } from "./jel-url-utils";

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

    this.worldNav = new TreeSync(
      "index.html",
      this.navExpandedTreeNodes,
      hubMetadata,
      TREE_PROJECTION_TYPE.NESTED,
      this.initializeIndexNavDoc.bind(this),
      this.modifyIndexNavDoc.bind(this)
    );

    this.trashNav = new TreeSync("trash.html", null, hubMetadata, TREE_PROJECTION_TYPE.FLAT);
    this.trashNested = new TreeSync("trash.html", null, hubMetadata, TREE_PROJECTION_TYPE.NESTED);

    this.treeSyncs = [this.worldNav, this.trashNav, this.trashNested];
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
    this.trashNav.rebuildTreeData();
  }

  // Returns a nested representation of the trash
  getNestedTrashTreeData() {
    this.trashNested.rebuildTreeData();
    return this.trashNested.treeData;
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

  // Run when initializing index.html nav doc, return true if modified
  // so it is saved
  initializeIndexNavDoc(doc) {
    let modified = false;
    const filename = document.location.pathname.split("/").pop();
    let navEl = doc.querySelector("nav");
    if (!navEl) {
      navEl = doc.createElement("nav");
      doc.body.appendChild(navEl);
      modified = true;
    }
    let listEl = navEl.querySelector("ul");
    if (!listEl) {
      listEl = doc.createElement("ul");
      navEl.appendChild(listEl);
      modified = true;
    }
    let aEl = listEl.querySelector(`a[href="${filename}"]`);
    if (!aEl || aEl.innerText !== document.title) {
      if (!aEl) {
        aEl = doc.createElement("a");
      }
      aEl.href = filename;
      aEl.innerText = document.title;
      const liEl = doc.createElement("li");
      liEl.appendChild(aEl);
      listEl.appendChild(liEl);
      modified = true;
    }
    return modified;
  }

  // Run before saving the index.html doc
  async modifyIndexNavDoc(doc) {
    const { spaceMetadata } = window.APP;
    const spaceId = await getSpaceIdFromHistory();
    const metadata = await spaceMetadata.getOrFetchMetadata(spaceId);

    // Set the title based on the current known metadata, which may have been changed on rename
    if (metadata && metadata.name) {
      doc.title = metadata.name;
    }

    const aEl = doc.querySelector("nav ul li a");

    // Index should redirect to first world.
    if (aEl) {
      let refreshTag = doc.querySelector('meta[http-equiv="refresh"]');

      if (!refreshTag) {
        refreshTag = doc.createElement("meta");
      }

      refreshTag.setAttribute("http-equiv", "refresh");
      refreshTag.setAttribute("content", `0;url=${aEl.href}`);
      doc.head.appendChild(refreshTag);
    }
  }

  async updateTree(docPath, docUrl, body) {
    const doc = new DOMParser().parseFromString(body, "text/html");

    for (const treeSync of this.treeSyncs) {
      if (treeSync.docPath === docPath) {
        await treeSync.updateTreeDocument(doc, docUrl);
      }
    }
  }
}

export default TreeManager;

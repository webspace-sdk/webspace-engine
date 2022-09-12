import { EventTarget } from "event-target-shim";

// Nested will generate a nested tree with leaves, flat will generate all the nodes
// in a flat list, with the deepest nodes last.
const TREE_PROJECTION_TYPE = {
  NESTED: 0,
  FLAT: 1
};

class TreeSync extends EventTarget {
  constructor(docPath, expandedTreeNodes, atomMetadata, projectionType = TREE_PROJECTION_TYPE.NESTED) {
    super();
    this.docPath = docPath;
    this.expandedTreeNodes = expandedTreeNodes;
    this.atomMetadata = atomMetadata;
    this.titleControl = null;
    this.projectionType = projectionType;
    this.filteredTreeData = [];
    this.filteredTreeDataVersion = 0;
    this.subscribedAtomIds = new Set();
    this.atomIdToFilteredTreeDataItem = new Map();
  }

  setTitleControl(titleControl) {
    if (!this.filteredTreeData || this.filteredTreeData.length === 0) return;

    this.titleControl = titleControl;

    const walk = children => {
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        node.title = titleControl;

        if (node.children) {
          walk(node.children);
        }
      }
    };

    walk(this.filteredTreeData);
  }

  async init() {
    if (!this.docPath) return;

    await this.fetchDoc();
    await this.rebuildFilteredTreeData();

    //const doc = connection.get(this.collectionId, this.docPath);
    //this.doc = doc;

    //return new Promise(res => {
    //  doc.subscribe(async () => {
    //    doc.on("op", () => this.rebuildFilteredTreeData());
    //    this.rebuildFilteredTreeData();
    //    res();
    //  });
    //});
  }

  async fetchDoc() {
    const { atomAccessManager } = window.APP;
    let url = this.docPath;
    try {
      url = await atomAccessManager.contentUrlForRelativePath(this.docPath);
    } catch (e) {
      console.warn("Error getting url to ", this.docPath, " file might be missing.");
    }

    let body = null;
    try {
      const response = await fetch(url);
      body = await response.text();
    } catch (e) {
      body = "<html><body></body></html>";
    }

    this.doc = new DOMParser().parseFromString(body, "text/html");
  }

  addToRoot(atomId) {}

  addToRootIfNotExists(atomId) {
    const nodeId = this.getNodeIdForAtomId(atomId);

    if (!nodeId) {
      this.addToRoot(atomId);
    }
  }

  getParentNodeId(nodeId) {
    return (this.doc.data[nodeId] || {}).p;
  }

  getAtomIdForNodeId(nodeId) {
    return (this.doc.data[nodeId] || {}).h;
  }

  getAtomTrailForAtomId(atomId) {
    return [];
    // const atomTrail = [];

    // let nid = this.getNodeIdForAtomId(atomId);

    // do {
    //   const node = this.doc.data[nid];

    //   if (node) {
    //     atomTrail.unshift(node.h);
    //     nid = node && node.p;
    //   } else {
    //     break;
    //   }
    // } while (nid);

    // return atomTrail.length === 0 ? null : atomTrail;
  }

  moveInto(nodeId, withinNodeId) {}

  moveAbove(nodeId, aboveNodeId) {}

  moveBelowRoot(nodeId) {}

  moveBelow(nodeId, belowNodeId) {}

  insertBelow(atomId, belowNodeId) {}

  // Inserts a new node for atomId as the first child of underNodeId
  insertUnder(atomId, underNodeId) {}

  async remove(nodeId) {}

  async computeTree() {
    if (!this.doc) return [];

    const { atomMetadata, doc } = this;

    const treeData = [];

    const isFlatProjection = this.projectionType === TREE_PROJECTION_TYPE.FLAT;

    const walk = async (domNode, items) => {
      for (const el of domNode.children) {
        const url = el.getAttribute("href");
        if (!url) continue;

        const name = el.textContent;
        const atomId = await atomMetadata.getAtomIdFromUrl(url);

        atomMetadata.localUpdate(atomId, { name, url });

        if (el.children.length > 0) {
          const children = [];

          items.push({
            key: atomId,
            title: this.titleControl,
            children,
            atomId,
            isLeaf: isFlatProjection
          });

          await walk(el, isFlatProjection ? children : items);
        } else {
          items.push({
            key: atomId,
            title: this.titleControl,
            atomId,
            isLeaf: true
          });
        }
      }
    };

    const navEl = doc.querySelector("nav");
    if (navEl) await walk(navEl, treeData);

    return treeData;
  }

  isAtomIdFiltered(atomId) {
    const nodeId = this.getNodeIdForAtomId(atomId);
    if (!nodeId) return false;
    const node = this.doc.data[nodeId];
    return !this.nodeFilter(node);
  }

  async rebuildFilteredTreeData() {
    const { atomMetadata, subscribedAtomIds } = this;

    this.filteredTreeDataVersion++;

    const isExpanded = nodeId => !this.expandedTreeNodes || this.expandedTreeNodes.isExpanded(nodeId);

    const newTreeData = await this.computeTree(isExpanded);

    if (newTreeData) {
      // If the tree data has changed, we need to subscribe to all the nodes
      // in the underlying document so that the tree will reflect the visibliity
      // properly. The map of atom ids to items is updated, and the event is fired
      // to refresh the UI.
      for (const atomId of subscribedAtomIds) {
        atomMetadata.unsubscribeFromMetadata(atomId, this.rebuildFilteredTreeData);
      }

      subscribedAtomIds.clear();

      // for (const node of Object.values(this.doc.data)) {
      //   subscribedAtomIds.add(node.h);
      // }

      this.atomIdToFilteredTreeDataItem.clear();

      const walk = children => {
        for (let i = 0; i < children.length; i++) {
          const item = children[i];
          this.atomIdToFilteredTreeDataItem.set(item.atomId, item);

          if (item.children) {
            walk(item.children);
          }
        }
      };

      walk(newTreeData);

      this.filteredTreeData = newTreeData;
      this.dispatchEvent(new CustomEvent("filtered_treedata_updated"));
    }

    for (const atomId of subscribedAtomIds) {
      atomMetadata.subscribeToMetadata(atomId, this.rebuildFilteredTreeData);
    }

    atomMetadata.ensureMetadataForIds(subscribedAtomIds);
  }

  getNodeIdForAtomId(atomId) {
    return atomId;
  }
}

export { TreeSync as default, TREE_PROJECTION_TYPE };

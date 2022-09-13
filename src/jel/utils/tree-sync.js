import { EventTarget } from "event-target-shim";

// Nested will generate a nested tree with leaves, flat will generate all the nodes
// in a flat list, with the deepest nodes last.
const TREE_PROJECTION_TYPE = {
  NESTED: 0,
  FLAT: 1
};

class TreeSync extends EventTarget {
  constructor(
    docPath,
    expandedTreeNodes,
    atomMetadata,
    projectionType = TREE_PROJECTION_TYPE.NESTED,
    docInitializer = () => false,
    docWriteModifier = () => {}
  ) {
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
    this.atomIdToDocEl = new Map();
    this.parentNodeIds = new Map();

    this.docInitializer = docInitializer;
    this.docWriteModifier = docWriteModifier;
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

    const { atomAccessManager } = window.APP;

    await this.fetchAndRebuildTree();

    const shouldWrite = this.docInitializer(this.doc);

    if (shouldWrite) {
      if (atomAccessManager.spaceCan("edit_nav")) {
        await this.writeTree();
      } else {
        atomAccessManager.addEventListener(
          "permissions_updated",
          async () => {
            if (atomAccessManager.spaceCan("edit_nav")) {
              await this.writeTree();
            }
          },
          { once: true }
        );
      }
    }
  }

  async writeTree() {
    const { docPath, doc } = this;
    if (!docPath || !doc) return;
    const { atomAccessManager, hubChannel } = window.APP;

    this.docWriteModifier(doc);

    hubChannel.broadcastMessage({ docPath, body: new XMLSerializer().serializeToString(doc) }, "update_nav");
    await atomAccessManager.writeDocument(doc, docPath);
  }

  async fetchAndRebuildTree() {
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

    const doc = new DOMParser().parseFromString(body, "text/html");
    await this.updateTreeDocument(doc);
  }

  addToRoot(atomId) {
    const { name, url } = this.atomMetadata.get(atomId);
    const el = this.doc.createElement("a");
    el.setAttribute("href", url);
    el.innerText = name;

    const nav = this.doc.querySelector("nav");
    nav.appendChild(el);
  }

  addToRootIfNotExists(atomId) {
    const nodeId = this.getNodeIdForAtomId(atomId);

    if (!nodeId) {
      this.addToRoot(atomId);
    }
  }

  getParentNodeId(nodeId) {
    return this.parentNodeIds.get(nodeId);
  }

  getAtomIdForNodeId(nodeId) {
    return nodeId;
  }

  getAtomTrailForAtomId(/*atomId*/) {
    return [];
  }

  moveInto(/*nodeId, withinNodeId*/) {
    console.warn("Unimplemented drop into");
  }

  moveAbove(nodeId, aboveNodeId) {
    const el = this.atomIdToDocEl.get(this.getAtomIdForNodeId(nodeId));
    const aboveEl = this.atomIdToDocEl.get(this.getAtomIdForNodeId(aboveNodeId));
    el.remove();
    aboveEl.parentNode.insertBefore(el, aboveEl);

    this.writeTree();
  }

  moveBelowRoot(/*nodeId*/) {
    console.warn("Unimplmented move below root");
  }

  moveBelow(nodeId, belowNodeId) {
    const el = this.atomIdToDocEl.get(this.getAtomIdForNodeId(nodeId));
    const belowEl = this.atomIdToDocEl.get(this.getAtomIdForNodeId(belowNodeId));
    el.remove();
    belowEl.parentNode.insertAfter(el, belowEl);

    this.writeTree();
  }

  // Inserts a new node for atomId as the first child of underNodeId
  async insertUnder(/*atomName, atomUrl, underNodeId*/) {
    console.warn("Insert under unimplemented");
  }

  async remove(nodeId) {
    const el = this.atomIdToDocEl.get(this.getAtomIdForNodeId(nodeId));
    el.remove();
    await this.writeTree();
  }

  async computeTree() {
    if (!this.doc) return [];

    const { atomMetadata, doc, parentNodeIds, atomIdToDocEl } = this;
    atomIdToDocEl.clear();
    parentNodeIds.clear();

    const treeData = [];

    const isFlatProjection = this.projectionType === TREE_PROJECTION_TYPE.FLAT;

    const walk = async (domNode, items, parentAtomId) => {
      for (const el of domNode.children) {
        const url = el.getAttribute("href");
        if (!url) continue;

        const name = el.textContent;
        const atomId = await atomMetadata.getAtomIdFromUrl(url);

        atomMetadata.localUpdate(atomId, { name, url });
        atomIdToDocEl.set(atomId, el);

        if (el.children.length > 0) {
          const children = [];

          items.push({
            key: atomId,
            title: this.titleControl,
            children,
            atomId,
            isLeaf: isFlatProjection
          });

          await walk(el, isFlatProjection ? children : items, parentAtomId);
        } else {
          items.push({
            key: atomId,
            title: this.titleControl,
            atomId,
            isLeaf: true
          });
        }

        parentNodeIds.set(atomId, parentAtomId);
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

  updateTreeDocument(doc) {
    this.doc = doc;
    return this.rebuildFilteredTreeData();
  }
}

export { TreeSync as default, TREE_PROJECTION_TYPE };

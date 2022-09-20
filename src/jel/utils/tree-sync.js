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
    this.treeData = [];
    this.treeDataVersion = 0;
    this.subscribedAtomIds = new Set();
    this.atomIdToTreeDataItem = new Map();
    this.atomIdToDocEl = new Map();
    this.parentNodeIds = new Map();

    this.docInitializer = docInitializer;
    this.docWriteModifier = docWriteModifier;

    this.rebuildTreeData = this.rebuildTreeData.bind(this);
  }

  setTitleControl(titleControl) {
    if (!this.treeData || this.treeData.length === 0) return;

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

    walk(this.treeData);
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
    const { docPath, docUrl, doc } = this;
    if (!docPath || !doc || !docUrl) return;
    const { atomAccessManager, hubChannel } = window.APP;

    await this.docWriteModifier(doc);

    hubChannel.broadcastMessage({ docPath, docUrl, body: new XMLSerializer().serializeToString(doc) }, "update_nav");
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

    let docUrl = this.docPath;

    try {
      docUrl = new URL(docUrl).toString();
    } catch (e) {
      docUrl = new URL(docUrl, document.location.href).toString();
    }

    let body = null;
    try {
      const response = await fetch(url);

      if (response.status === 200) {
        body = await response.text();
      } else {
        body = "<html><body></body></html>";
      }
    } catch (e) {
      body = "<html><body></body></html>";
    }

    const doc = new DOMParser().parseFromString(body, "text/html");
    await this.updateTreeDocument(doc, docUrl);
  }

  addToRoot(atomId) {
    const { name, url } = this.atomMetadata.get(atomId);
    const liEl = this.doc.createElement("li");
    const linkEl = this.doc.createElement("a");
    linkEl.setAttribute("href", url);
    linkEl.innerText = name;
    liEl.appendChild(linkEl);
    this.doc.querySelector("nav").appendChild(liEl);
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

  getAtomTrailForAtomId(atomId) {
    return [atomId];
  }

  getAtomMetadataFromDOM(atomId) {
    const aEl = this.atomIdToDocEl.get(atomId)?.querySelector("a");

    if (aEl) {
      return { name: aEl.innerText, url: aEl.getAttribute("href") };
    }

    return {};
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
    belowEl.parentNode.insertBefore(el, belowEl.nextSibling);

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
        const aEl = el.querySelector("a");
        const url = aEl.getAttribute("href");
        if (!url) continue;

        const atomId = await atomMetadata.getAtomIdFromUrl(url);

        atomIdToDocEl.set(atomId, el);

        const subList = el.querySelector("ul");

        if (subList) {
          const children = [];

          items.push({
            key: atomId,
            title: this.titleControl,
            children,
            atomId,
            isLeaf: isFlatProjection
          });

          await walk(subList, isFlatProjection ? children : items, parentAtomId);
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

    const listEl = doc.querySelector("nav ul");
    if (listEl) await walk(listEl, treeData);

    return treeData;
  }

  async rebuildTreeData() {
    const { atomMetadata, subscribedAtomIds } = this;

    this.treeDataVersion++;

    const isExpanded = nodeId => !this.expandedTreeNodes || this.expandedTreeNodes.isExpanded(nodeId);

    const newTreeData = await this.computeTree(isExpanded);

    if (newTreeData) {
      subscribedAtomIds.clear();

      for (const atomId of this.atomIdToDocEl.keys()) {
        subscribedAtomIds.add(atomId);
      }

      this.atomIdToTreeDataItem.clear();

      const walk = children => {
        for (let i = 0; i < children.length; i++) {
          const item = children[i];
          this.atomIdToTreeDataItem.set(item.atomId, item);

          if (item.children) {
            walk(item.children);
          }
        }
      };

      walk(newTreeData);

      this.treeData = newTreeData;
      this.dispatchEvent(new CustomEvent("treedata_updated"));
    }

    atomMetadata.ensureMetadataForIds(subscribedAtomIds);
  }

  getNodeIdForAtomId(atomId) {
    return atomId;
  }

  updateTreeDocument(doc, docUrl) {
    this.doc = doc;
    this.docUrl = docUrl;

    return this.rebuildTreeData();
  }
}

export { TreeSync as default, TREE_PROJECTION_TYPE };

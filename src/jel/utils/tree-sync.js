import { EventTarget } from "event-target-shim";
import { DEFAULT_HUB_NAME } from "../../hubs/utils/media-utils";
import { isSubset } from "./set-utils";

// Nested will generate a nested tree with leaves, flat will generate all the nodes
// in a flat list, with the deepest nodes last.
const TREE_PROJECTION_TYPE = {
  NESTED: 0,
  FLAT: 1
};

// tree doc data structure is:
// nodeId -> { h: "hubId", r: "prevNodeId", p: "parentNodeId" }

function createNodeId() {
  return Math.random()
    .toString(36)
    .substring(2, 9);
}

class TreeSync extends EventTarget {
  constructor(
    docId,
    expandedTreeNodes,
    atomMetadata,
    nodeFilter = () => true,
    projectionType = TREE_PROJECTION_TYPE.NESTED,
    autoRefresh = false
  ) {
    super();
    this.docId = docId;
    this.expandedTreeNodes = expandedTreeNodes;
    this.atomMetadata = atomMetadata;
    this.titleControl = null;
    this.nodeFilter = nodeFilter;
    this.projectionType = projectionType;
    this.autoRefresh = autoRefresh;
    this.filteredTreeData = [];
    this.subscribedAtomIds = new Set();
    this.atomIdToFilteredTreeDataItem = new Map();
  }

  setCollectionId(collectionId) {
    this.collectionId = collectionId;
  }

  setTitleControl(titleControl) {
    if (this.filteredTreeData.length === 0) return;

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

  init(connection) {
    if (!this.collectionId || !this.docId) return Promise.resolve();

    const doc = connection.get(this.collectionId, this.docId);
    this.doc = doc;

    return new Promise(res => {
      doc.subscribe(async () => {
        doc.on("op", this.rebuildFilteredTreeDataIfAutoRefresh);
        this.rebuildFilteredTreeDataIfAutoRefresh();
        res();
      });
    });
  }

  rebuildFilteredTreeDataIfAutoRefresh = updatedIds => {
    if (this.autoRefresh) {
      this.rebuildFilteredTreeData(updatedIds);
    }
  };

  addToRoot(atomId) {
    if (Object.entries(this.doc.data).length === 0) {
      this.addInitialItem(atomId);
    } else {
      const belowNodeId = this.findTailNodeIdUnder(null);
      this.insertBelow(atomId, belowNodeId);
    }
  }

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

  moveInto(nodeId, withinNodeId) {
    const node = this.doc.data[nodeId];
    if (node.p === withinNodeId) return; // Already done

    const tailNodeId = this.findTailNodeIdUnder(withinNodeId);

    if (tailNodeId) {
      // Already have a tail under the new parent, just move below that one.
      this.moveBelow(nodeId, tailNodeId);
    } else {
      // New tail under a parent.
      const ops = [];

      // Point the node previously pointing to the moved node to the moved node's back link.
      for (const [nid, n] of Object.entries(this.doc.data)) {
        if (n.r !== nodeId) continue;

        ops.push({
          p: [nid, "r"],
          od: nodeId,
          oi: node.r
        });

        break;
      }

      // Add the new node
      ops.push({
        p: [nodeId],
        od: node,
        oi: {
          h: node.h,
          r: null,
          p: withinNodeId
        }
      });

      this.doc.submitOp(ops);
    }
  }

  moveAbove(nodeId, aboveNodeId) {
    const node = this.doc.data[nodeId];
    const aboveNode = this.doc.data[aboveNodeId];
    if (aboveNode.r === nodeId) return; // Already done

    const ops = [];

    // Replace back link in node pointing to the moved node.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== nodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: nodeId,
        oi: node.r
      });

      break;
    }

    // Add the new node
    ops.push({
      p: [nodeId],
      od: node,
      oi: {
        h: node.h,
        r: aboveNode.r,
        p: aboveNode.p
      }
    });

    // Update the back reference of the node being inserted above
    ops.push({
      p: [aboveNodeId, "r"],
      od: aboveNode.r,
      oi: nodeId
    });

    this.doc.submitOp(ops);
  }

  moveBelowRoot(nodeId) {
    const node = this.doc.data[nodeId];
    if (node.r === null && node.p === null) return; // Already done

    const ops = [];

    // Point the node previously pointing to the moved node to the moved node's back link.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== nodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: nodeId,
        oi: node.r
      });

      break;
    }

    // Add the new node to the top of root
    ops.push({
      p: [nodeId],
      od: node,
      oi: {
        h: node.h,
        r: null,
        p: null
      }
    });

    // Point the node previously pointing to the top to the new node.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.p !== null || n.r !== null) continue;

      ops.push({
        p: [nid, "r"],
        od: null,
        oi: nodeId
      });

      break;
    }

    this.doc.submitOp(ops);
  }

  moveBelow(nodeId, belowNodeId) {
    const node = this.doc.data[nodeId];
    if (node.r === belowNodeId) return; // Already done
    const belowNode = this.doc.data[belowNodeId];

    const ops = [];

    // Point the node previously pointing to the moved node to the moved node's back link.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== nodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: nodeId,
        oi: node.r
      });

      break;
    }

    // Add the new node
    ops.push({
      p: [nodeId],
      od: node,
      oi: {
        h: node.h,
        r: belowNodeId,
        p: belowNode.p
      }
    });

    // Point the node previously pointing to the below node to the new node.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== belowNodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: belowNodeId,
        oi: nodeId
      });

      break;
    }

    this.doc.submitOp(ops);
  }

  insertBelow(atomId, belowNodeId) {
    const belowNode = this.doc.data[belowNodeId];

    this.doc.submitOp([
      {
        p: [createNodeId()],
        oi: {
          h: atomId,
          r: belowNodeId,
          p: belowNode.p
        }
      }
    ]);
  }

  // Inserts a new node for atomId as the first child of underNodeId
  insertUnder(atomId, underNodeId) {
    const nodeId = createNodeId();

    this.doc.submitOp([
      {
        p: [nodeId],
        oi: {
          h: atomId,
          r: null,
          p: underNodeId
        }
      }
    ]);

    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.p !== underNodeId || n.r) break;

      // Update back ref of old node at top
      this.doc.submitOp([
        {
          p: [nid, "r"],
          od: n.r,
          oi: nodeId
        }
      ]);
    }

    return nodeId;
  }

  remove(nodeId) {
    const treeData = this.computeTree();

    // Move all children to node's parent
    const moveWalk = (parent, children, moveBelowNode) => {
      for (const child of children) {
        if (child.children) {
          if (child.key === nodeId) {
            moveWalk(child, child.children, parent);
          } else if (!moveBelowNode) {
            moveWalk(child, child.children, null);
          }
        }

        if (moveBelowNode) {
          this.moveBelow(child.key, parent.key);
        }
      }
    };

    moveWalk(null, treeData, null);

    const node = this.doc.data[nodeId];

    const ops = [];

    // Replace back link in node pointing to the moved node.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== nodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: nodeId,
        oi: node.r
      });

      break;
    }

    // Remove the node
    ops.push({
      p: [nodeId],
      od: node
    });

    this.doc.submitOp(ops);
  }

  findTailNodeIdUnder(underParentId) {
    const seenChildren = new Set();

    const entries = Object.entries(this.doc.data);

    for (const [, node] of entries) {
      if (!node.r) continue;
      seenChildren.add(node.r);
    }

    for (const [nodeId, node] of entries) {
      if (seenChildren.has(nodeId)) continue;
      if (node.p === underParentId) return nodeId;
    }

    return null;
  }

  addInitialItem(atomId) {
    const nodeId = createNodeId();
    this.doc.submitOp([
      {
        p: [nodeId],
        oi: {
          h: atomId,
          r: null,
          p: null,
          d: 0
        }
      }
    ]);
  }

  computeTree(nodeFilter = () => true, parentFilter = () => true, visitor = null) {
    // The goal here is to convert the OT document to the UI's tree data structure.
    const depths = new Map();
    const tailNodes = new Set();
    const seenChildren = new Set();
    const parentNodes = new Set();
    const filteredNodes = new Set();

    const entries = Object.entries(this.doc.data);

    // First build a set of "tail" nodes which are the last child node under each parent
    // Also keep a map of node ids to depths.
    for (const [nodeId, node] of entries) {
      if (node.r) {
        if (seenChildren.has(node.r)) {
          // Duplicate backreference, meaning the doc is in an inconsistent state.
          //
          // This is a known condition given the fact that several operations are required to perform
          // a move. As such, stop here and assume it will resolve in the next update.
          return;
        }

        seenChildren.add(node.r);
      }

      if (node.p && nodeFilter(node)) {
        parentNodes.add(node.p);
        if (!parentFilter(node.p)) continue;
      }

      if (!nodeFilter(node)) {
        filteredNodes.add(nodeId);
      }

      const depth = this.getNodeDepth(node);
      depths.set(nodeId, depth);
    }

    for (const [nodeId, node] of entries) {
      if (seenChildren.has(nodeId)) continue;

      if (node.p && !parentFilter(node.p)) continue;
      tailNodes.add(nodeId);
    }

    const treeData = [];
    const nodeIdToChildren = new Map();
    nodeIdToChildren.set(null, treeData);

    let depth = 0;
    let done;

    const isNestedProjection = this.projectionType === TREE_PROJECTION_TYPE.NESTED;
    const isFlatProjection = this.projectionType === TREE_PROJECTION_TYPE.FLAT;

    // Build each layer of the tree data
    do {
      done = true;

      for (const [nodeId, node] of entries) {
        if (depths.get(nodeId) !== depth) continue;

        // Build recurive filter iff we're not doing flat projection
        // since flat projection doesn't care about parents being filtered.
        if (isNestedProjection && node.p && filteredNodes.has(node.p)) filteredNodes.add(nodeId);

        if (!tailNodes.has(nodeId)) continue;
        if (node.p && !parentFilter(node.p)) continue;

        // Tail node for the current depth, build the child list for this node's parent.
        done = false;
        const children = nodeIdToChildren.get(isNestedProjection ? node.p : null);

        let n = node;
        let nid = nodeId;

        do {
          const subchildren = [];
          nodeIdToChildren.set(nid, subchildren);
          let item;

          if (!filteredNodes.has(nid) && children) {
            const atomId = n.h;
            let nodeName = "";
            let nodeUrl = null;
            let nodeTitle = null;

            if (this.atomMetadata.hasMetadata(n.h)) {
              const nodeData = this.getNodeDataFromMetadata(n.h);
              nodeName = nodeData.name;
              nodeUrl = nodeData.url;
              nodeTitle = nodeData.title;
            }

            if (parentNodes.has(nid)) {
              item = {
                key: nid,
                name: nodeName,
                title: nodeTitle,
                children: subchildren,
                url: nodeUrl,
                atomId,
                isLeaf: isFlatProjection
              };
            } else {
              item = {
                key: nid,
                name: nodeName,
                title: nodeTitle,
                url: nodeUrl,
                atomId,
                isLeaf: true
              };
            }

            children.unshift(item);
          }

          if (visitor) visitor(nid, n, item);

          nid = n.r;

          if (nid) {
            n = this.doc.data[nid];
          }
        } while (nid);
      }

      depth++;
    } while (!done);

    return treeData;
  }

  isAtomIdFiltered(atomId) {
    const nodeId = this.getNodeIdForAtomId(atomId);
    if (!nodeId) return false;
    const node = this.doc.data[nodeId];
    return !this.nodeFilter(node);
  }

  rebuildFilteredTreeData(updatedIds) {
    const { atomMetadata, subscribedAtomIds, atomIdToFilteredTreeDataItem } = this;

    const hasAlreadyGeneratedItems = updatedIds && isSubset(updatedIds, new Set(atomIdToFilteredTreeDataItem.keys()));

    let performInPlaceUpdate = hasAlreadyGeneratedItems;

    if (hasAlreadyGeneratedItems) {
      // Edge case, if an updated node has been filtered out, we regen since its items need to be removed.
      for (const atomId of updatedIds) {
        if (this.isAtomIdFiltered(atomId)) {
          performInPlaceUpdate = false;
          break;
        }
      }
    }

    if (performInPlaceUpdate) {
      // Check to see if we can perform an in-place update instead of re-generating everything.
      // This is possible if all updatedIds exist in the existing filteredTreeData.
      for (const atomId of updatedIds) {
        const item = atomIdToFilteredTreeDataItem.get(atomId);
        const nodeData = this.getNodeDataFromMetadata(atomId);
        item.name = nodeData.name;
        item.url = nodeData.url;
        item.title = nodeData.title;
      }

      this.dispatchEvent(new CustomEvent("filtered_treedata_updated"));
    } else {
      for (const atomId of subscribedAtomIds) {
        atomMetadata.unsubscribeFromMetadata(atomId, this.rebuildFilteredTreeDataIfAutoRefresh);
      }

      const isExpanded = nodeId => !this.expandedTreeNodes || this.expandedTreeNodes.isExpanded(nodeId);

      this.atomIdToFilteredTreeDataItem.clear();
      subscribedAtomIds.clear();

      this.filteredTreeData = this.computeTree(this.nodeFilter, isExpanded, (nodeId, node, item) => {
        // This visitor is passed every document node that is expanded, even if it is filtered
        // via the node filter. So we add all the relevant atoms to the subscriber list,
        // and then subscribe, and also maintain a map to generated treedata for in-place updating.
        subscribedAtomIds.add(node.h);

        if (item) {
          this.atomIdToFilteredTreeDataItem.set(node.h, item);
        }
      });

      this.dispatchEvent(new CustomEvent("filtered_treedata_updated"));

      for (const atomId of subscribedAtomIds) {
        atomMetadata.subscribeToMetadata(atomId, this.rebuildFilteredTreeDataIfAutoRefresh);
      }

      atomMetadata.ensureMetadataForIds(subscribedAtomIds);
    }
  }

  insertOrUpdate(nodeId, n) {
    const existing = this.doc.data[nodeId];
    const node = JSON.parse(JSON.stringify(n));
    const { p, r } = node;

    // If parent is missing, ignore it.
    if (!this.doc.data[p]) {
      node.p = null;
    }

    // If backlink is missing, point to the tail of the parent.
    if (!this.doc.data[r]) {
      node.r = null;

      const tailId = this.findTailNodeIdUnder(node.p);

      if (tailId) {
        node.r = tailId;
      }
    }

    if (existing) {
      this.doc.submitOp([
        {
          p: [nodeId],
          od: existing,
          oi: node
        }
      ]);
    } else {
      this.doc.submitOp([
        {
          p: [nodeId],
          oi: node
        }
      ]);
    }
  }

  getNodeDepth(node) {
    let n = node;
    let d = -1;

    do {
      d++;
      n = this.doc.data[n.p];
    } while (n);

    return d;
  }

  getNodeIdForAtomId(atomIdToFind) {
    const walk = nodes => {
      for (const { key, atomId, children } of nodes) {
        if (atomId === atomIdToFind) return key;

        if (children) {
          const childAtomId = walk(children);
          if (childAtomId) return childAtomId;
        }
      }

      return null;
    };

    return walk(this.filteredTreeData || []);
  }

  getNodeDataFromMetadata(atomId) {
    const { name, url } = this.atomMetadata.getMetadata(atomId);
    return { name: name || DEFAULT_HUB_NAME, url, title: this.titleControl || name || DEFAULT_HUB_NAME };
  }
}

export { TreeSync as default, TREE_PROJECTION_TYPE };

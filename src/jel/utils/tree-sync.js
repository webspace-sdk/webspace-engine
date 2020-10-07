import { EventTarget } from "event-target-shim";
import { DEFAULT_HUB_NAME } from "../../hubs/utils/media-utils";

// tree doc data structure is:
// nodeId -> { h: "hubId", r: "prevNodeId", p: "parentNodeId" }

function createNodeId() {
  return Math.random()
    .toString(36)
    .substring(2, 9);
}

class TreeSync extends EventTarget {
  constructor(docId, expandedTreeNodes, atomMetadata) {
    super();
    this.docId = docId;
    this.expandedTreeNodes = expandedTreeNodes;
    this.atomMetadata = atomMetadata;
  }

  setCollectionId(collectionId) {
    this.collectionId = collectionId;
  }

  init(connection) {
    if (!this.collectionId || !this.docId) return Promise.resolved();

    const doc = connection.get(this.collectionId, this.docId);
    this.doc = doc;

    return new Promise(res => {
      doc.subscribe(async () => {
        doc.on("op", this.handleNavOp);
        res();
      });
    });
  }

  handleNavOp = () => this.rebuildExpandedTreeData();
  handleMetadataUpdate = () => this.rebuildExpandedTreeData();

  addToRoot(atomId) {
    if (Object.entries(this.doc.data).length === 0) {
      this.addInitialItem(atomId);
    } else {
      const [nodeId, node] = this.findTailUnder(null);
      this.insertBelow(atomId, nodeId, node);
    }
  }

  moveInto(nodeId, withinNodeId) {
    const node = this.doc.data[nodeId];
    if (node.p === withinNodeId) return; // Already done

    const [tailNodeId] = this.findTailUnder(withinNodeId);

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

  insertBelow(atomId, belowNodeId, belowNode) {
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

  findTailUnder(underParentId) {
    const seenChildren = new Set();

    const entries = Object.entries(this.doc.data);

    for (const [, node] of entries) {
      if (!node.r) continue;
      seenChildren.add(node.r);
    }

    for (const [nodeId, node] of entries) {
      if (seenChildren.has(nodeId)) continue;
      if (node.p === underParentId) return [nodeId, node];
    }

    return [null, null];
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

  computeTree(parentFilter = () => true, visitor = null) {
    // The goal here is to convert the OT document to the UI's tree data structure.
    const depths = new Map();
    const tailNodes = new Set();
    const seenChildren = new Set();
    const parentNodes = new Set();

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

      if (node.p) {
        parentNodes.add(node.p);
        if (!parentFilter(node.p)) continue;
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

    // Build each layer of the tree data
    do {
      done = true;

      for (const [nodeId, node] of entries) {
        if (depths.get(nodeId) !== depth) continue;
        if (!tailNodes.has(nodeId)) continue;
        if (node.p && !parentFilter(node.p)) continue;

        // Tail node for the current depth, build the child list for this node's parent.
        done = false;
        const children = nodeIdToChildren.get(node.p);

        let n = node;
        let nid = nodeId;

        do {
          if (visitor) visitor(nid, n);

          const atomId = n.h;
          let nodeTitle = "";
          let nodeUrl = null;

          if (this.atomMetadata.hasMetadata(n.h)) {
            const { name, url } = this.atomMetadata.getMetadata(atomId);
            nodeTitle = name || DEFAULT_HUB_NAME;
            nodeUrl = url;
          }

          if (parentNodes.has(nid)) {
            const subchildren = [];
            nodeIdToChildren.set(nid, subchildren);
            children.unshift({
              key: nid,
              title: nodeTitle,
              children: subchildren,
              url: nodeUrl,
              atomId,
              isLeaf: false
            });
          } else {
            children.unshift({ key: nid, title: nodeTitle, url: nodeUrl, atomId, isLeaf: true });
          }

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

  rebuildExpandedTreeData() {
    if (this.expandedIds) {
      for (const atomId of this.expandedIds) {
        this.atomMetadata.unsubscribeFromMetadata(atomId, this.handleMetadataUpdate);
      }
    }

    this.expandedIds = new Set();

    const isExpanded = nodeId => this.expandedTreeNodes.isExpanded(nodeId); // Filter
    const fillIds = (nodeId, node) => this.expandedIds.add(node.h); // Visitor

    this.expandedTreeData = this.computeTree(isExpanded, fillIds);
    this.dispatchEvent(new CustomEvent("expanded_treedata_updated"));

    for (const atomId of this.expandedIds) {
      this.atomMetadata.subscribeToMetadata(atomId, this.handleMetadataUpdate);
    }

    this.atomMetadata.ensureMetadataForIds(this.expandedIds);
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

      const [tailId] = this.findTailUnder(node.p);

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

    return walk(this.expandedTreeData || []);
  }
}

export default TreeSync;

import { EventTarget } from "event-target-shim";

// tree doc data structure is:
// nodeId -> { h: "hubId", r: "prevNodeId", p: "parentNodeId" }

function createNodeId() {
  return Math.random()
    .toString(36)
    .substring(2, 9);
}

class NavSync extends EventTarget {
  setCollectionId(collectionId) {
    this.collectionId = collectionId;
    // TODO create a set of hub ids here that, when updated, should rebuild tree
  }

  init(connection) {
    const doc = connection.get(this.collectionId, "nav");
    this.doc = doc;

    return new Promise(res => {
      doc.subscribe(async () => {
        doc.on("op", this.handleNavOp.bind(this));
        res();
      });
    });
  }

  handleNavOp() {
    this.buildTree();
  }

  addToRoot(hubId) {
    if (Object.entries(this.doc.data).length === 0) {
      this.addInitialItem(hubId);
    } else {
      const [nodeId, node] = this.findTailUnder(null);
      this.insertBelow(hubId, nodeId, node);
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

  insertBelow(hubId, belowNodeId, belowNode) {
    this.doc.submitOp([
      {
        p: [createNodeId()],
        oi: {
          h: hubId,
          r: belowNodeId,
          p: belowNode.p
        }
      }
    ]);
  }

  findTailUnder(underParentId) {
    const seenChildren = new Set();

    const entries = Object.entries(this.doc.data);

    for (const [, node] of entries) {
      seenChildren.add(node.r);
    }

    for (const [nodeId, node] of entries) {
      if (seenChildren.has(nodeId)) continue;
      if (node.p === underParentId) return [nodeId, node];
    }

    return null;
  }

  addInitialItem(hubId) {
    const nodeId = createNodeId();
    this.doc.submitOp([
      {
        p: [nodeId],
        oi: {
          h: hubId,
          r: null,
          p: null,
          d: 0,
          t: true
        }
      }
    ]);
  }

  buildTree() {
    // The goal here is to convert the OT document to the UI's tree data structure.
    const depths = new Map();
    const tailNodes = new Set();
    const seenChildren = new Set();
    const parentNodes = new Set();

    const entries = Object.entries(this.doc.data);

    // First build a set of "tail" nodes which are the last child node under each parent
    // Also keep a map of node ids to depths.
    for (const [nodeId, node] of entries) {
      // TOOD skip if parent not expanded
      const depth = this.getNodeDepth(node);
      depths.set(nodeId, depth);
      seenChildren.add(node.r);
      parentNodes.add(node.p);
    }

    for (const [nodeId] of entries) {
      // TOOD skip if parent not expanded
      if (seenChildren.has(nodeId)) continue;
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

        // TODO skip if parent node not expanded

        // Tail node for the current depth, build the child list for this node's parent.
        done = false;
        const children = nodeIdToChildren.get(node.p);

        let n = node;
        let nid = nodeId;

        do {
          if (parentNodes.has(nid)) {
            const subchildren = [];
            nodeIdToChildren.set(nid, subchildren);
            children.unshift({ key: nid, title: nid, children: subchildren });
          } else {
            children.unshift({ key: nid, title: nid, isLeaf: true });
          }

          nid = n.r;

          if (nid) {
            n = this.doc.data[nid];
          }
        } while (nid);
      }

      depth++;
    } while (!done);

    this.treeData = treeData;
    this.dispatchEvent(new CustomEvent("treedata_updated"));
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
}

export default NavSync;

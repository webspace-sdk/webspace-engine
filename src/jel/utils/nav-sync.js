import { EventTarget } from "event-target-shim";

// tree doc data structure is:
// nodeId -> { h: "hubId", r: "prevNodeId", p: "parentNodeId", d: depth, t: <true/false if tail> }
//
// Algorithm:
//   For depth 0 .. n
//     Find tail nodes for a given parent
//       If parent is not expanded, skip.
//       Recursively build list by walking backwards
//
// Operations:
//
// Drop node X above node Y
//   - Find Z with prevNodeId pointing X (maybe keep parent ref in tree data)
//   - Update Z.prevNodeId to X.prevNodeId
//   - Update X.prevNodeId to Y.prevNodeId and X.parentId = Y.parentId, X.depth = Y.depth
//   - Update Y.prevNodeId to X.nodeId
//
// Drop node X below node Y
//   - Update X.prevNodeId = Y.nodeId, X.parentNodeId = Y.parentNodeId, X.tail = Y.tail, X.depth = Y.depth
//   - if Y is tail, update Y.tail = false
//
// Drop node X on node Y
//   - Perform operations of dropping node X below node Z, where Z is tail under node Y
//
// Add new to root
//   - Perform operations of dropping node X below node Z, where Z is tail and parentId = nil

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
    this.buildAndEmitTree();
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

    const prevNodeId = node.r;
    const prevNode = this.doc.data[prevNodeId];
    const wasTail = node.t;
    const aboveNodePrevNode = aboveNode.r;

    const newNode = {
      h: node.h,
      r: aboveNodePrevNode,
      p: aboveNode.p,
      d: aboveNode.d,
      t: false
    };

    const ops = [];

    // Replace back link in node pointing to the moved node.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== nodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: nodeId,
        oi: prevNodeId
      });

      break;
    }

    ops.push({
      p: [nodeId],
      od: node,
      oi: newNode
    });

    if (wasTail && prevNode) {
      ops.push({
        p: [prevNodeId, "t"],
        od: false,
        oi: true
      });
    }

    ops.push({
      p: [aboveNodeId, "r"],
      od: aboveNodePrevNode,
      oi: nodeId
    });

    this.doc.submitOp(ops);
  }

  moveBelow(nodeId, belowNodeId) {
    const node = this.doc.data[nodeId];
    if (node.r === belowNodeId) return; // Already done
    const belowNode = this.doc.data[belowNodeId];
    const prevNodeId = node.r;
    const wasTail = node.t;
    const willBeTail = belowNode.t;
    let previousNodeBelowBelowNodeId = null;

    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== belowNodeId) continue;
      previousNodeBelowBelowNodeId = nid;
      break;
    }

    const newNode = {
      h: node.h,
      r: belowNodeId,
      p: belowNode.p,
      d: belowNode.d,
      t: willBeTail
    };

    const ops = [];

    if (willBeTail) {
      ops.push({
        p: [belowNodeId, "t"],
        od: true,
        oi: false
      });
    }

    // Replace back link in node pointing to the moved node.
    for (const [nid, n] of Object.entries(this.doc.data)) {
      if (n.r !== nodeId) continue;

      ops.push({
        p: [nid, "r"],
        od: nodeId,
        oi: prevNodeId
      });

      break;
    }

    ops.push({
      p: [nodeId],
      od: node,
      oi: newNode
    });

    if (previousNodeBelowBelowNodeId) {
      ops.push({
        p: [previousNodeBelowBelowNodeId, "r"],
        od: belowNodeId,
        oi: nodeId
      });
    }

    if (wasTail && prevNodeId) {
      ops.push({
        p: [prevNodeId, "t"],
        od: false,
        oi: true
      });
    }

    this.doc.submitOp(ops);
  }

  insertBelow(hubId, belowNodeId, belowNode) {
    const newNode = {
      h: hubId,
      r: belowNodeId,
      p: belowNode.p,
      d: belowNode.d,
      t: true
    };

    this.doc.submitOp([
      {
        p: [belowNodeId, "t"],
        od: belowNode.t,
        oi: false
      },
      {
        p: [createNodeId()],
        oi: newNode
      }
    ]);
  }

  findTailUnder(underParentId) {
    for (const entry of Object.entries(this.doc.data)) {
      const [, { t, p }] = entry;

      if (t && p === underParentId) {
        return entry;
      }
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

  buildAndEmitTree() {
    const treeData = [];
    const childMap = new Map();
    childMap.set(null, treeData);

    let depth = 0;
    let sawAtDepth;

    do {
      sawAtDepth = false;
      const entries = Object.entries(this.doc.data);

      for (const [nodeId, node] of entries) {
        if (node.d !== depth) continue;
        if (!node.t) continue;

        // TODO if not expanded, skip

        // Tail node for the current depth, build the child list for this node's parent.
        sawAtDepth = true;
        const children = childMap.get(node.p);

        let n = node;
        let nid = nodeId;

        do {
          const subchildren = [];
          childMap.set(nid, subchildren);
          children.unshift({ key: nid, title: nid, children: subchildren });

          nid = n.r;

          if (nid) {
            n = this.doc.data[nid];
          }
        } while (nid);

        sawAtDepth = true;
      }

      depth++;
    } while (sawAtDepth);

    // DFS to set leaves
    const walk = children => {
      const l = children.length;

      for (let i = 0; i < l; i++) {
        const n = children[i];

        if (n.children.length === 0) {
          delete n.children;
          n.isLeaf = true;
        } else {
          walk(n.children);
        }
      }
    };

    walk(treeData);

    this.treeData = treeData;
    this.dispatchEvent(new CustomEvent("treedata_updated"));
  }
}

export default NavSync;

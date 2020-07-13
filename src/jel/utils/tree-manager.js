import TreeSync from "./tree-sync";

class TreeManager {
  constructor() {
    this.nav = new TreeSync("nav");
    this.trash = new TreeSync("trash");
  }

  async init(connection) {
    await Promise.all([await this.nav.init(connection), await this.trash.init(connection)]);
  }

  setCollectionId(collectionId) {
    this.nav.setCollectionId(collectionId);
    this.trash.setCollectionId(collectionId);
  }

  moveToTrash(nodeId) {
    this.moveToTree(nodeId, this.nav, this.trash);
  }

  restoreFromTrash(nodeId) {
    this.moveToTree(nodeId, this.trash, this.nav);
  }

  destroyFromTrash(nodeId) {
    this.removeFromTree(nodeId, this.trash);
  }

  removeFromTree(nodeId, fromTree) {
    const removeWalk = (children, remove) => {
      for (const child of children) {
        const removeChild = remove || child.key === nodeId;

        if (child.children) {
          removeWalk(child.children, removeChild);
        }

        if (removeChild) {
          fromTree.remove(child.key);
        }
      }
    };

    removeWalk(fromTree.treeData, false);
  }

  moveToTree(nodeId, fromTree, toTree) {
    const copyWalk = (children, copy) => {
      for (const child of children) {
        const copyChild = copy || child.key === nodeId;

        if (copyChild) {
          const node = fromTree.doc.data[child.key];
          toTree.insertOrUpdate(child.key, node);
        }

        if (child.children) {
          copyWalk(child.children, copyChild);
        }

        if (copyChild) {
          fromTree.remove(child.key);
        }
      }
    };

    copyWalk(fromTree.treeData, false);
  }
}

export default TreeManager;

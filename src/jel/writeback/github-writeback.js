import Octokat from "octokat";
import { fromByteArray } from "base64-js";

const ORIGIN_STATE = {
  UNINITIALIZED: 1,
  INVALID_TOKEN: 2,
  INVALID_REPO: 3,
  INVALID_PATH: 4,
  VALID: 5
};

export default class GitHubWriteback {
  constructor(user, repo, token, filename, branch = "master", root = "") {
    this.user = user;
    this.repo = repo;
    this.token = token;
    this.filename = filename;
    this.branch = branch;
    this.root = root;
    this.originState = ORIGIN_STATE.UNINITIALIZED;
    this.isOpening = false;
    this.isWriting = false;
    this.assetBlobCache = new Map();

    this.githubRepo = null;
  }

  async init() {
    if (this.token) {
      await this.open();
    }
  }

  get isOpen() {
    return this.originState === ORIGIN_STATE.VALID;
  }

  async open() {
    if (this.isOpen) return true;

    while (this.isOpening) {
      await new Promise(res => setTimeout(res, 250));
    }

    if (this.isOpen) return true;
    this.isOpening = true;

    try {
      if (!this.token) {
        this.originState = ORIGIN_STATE.INVALID_TOKEN;
        return false;
      }

      const github = new Octokat({ token: this.token });

      const repo = await github.repos(this.user, this.repo);

      try {
        await repo.git.refs(`heads/${this.branch}`).fetch();
      } catch (e) {
        if (e.message.indexOf("Bad credentials") !== -1) {
          this.originState = ORIGIN_STATE.INVALID_TOKEN;
        } else {
          this.originState = ORIGIN_STATE.INVALID_REPO;
        }
        return false;
      }

      this.githubRepo = repo;
      const file = await this._fileForPath(this.filename);

      if (!file) {
        this.originState = ORIGIN_STATE.INVALID_PATH;
        return false;
      }

      const blob = await repo.git.blobs(file.sha).fetch();
      const content = atob(blob.content);

      // Sanity check, look for at least one id that matches in the content
      // This is conservative enough to deal with slower deploys, but still
      // better than nothing.
      const ids = new Set();

      for (const el of document.body.children) {
        if (el.id) {
          ids.add(el.id);
        }
      }

      if (ids.size === 0) {
        this.originState = ORIGIN_STATE.VALID;
        return true;
      }

      let found = false;
      for (const id of ids) {
        if (content.indexOf(id) !== -1) {
          found = true;
          break;
        }
      }

      if (found) {
        this.originState = ORIGIN_STATE.VALID;
        return true;
      } else {
        this.originState = ORIGIN_STATE.INVALID_PATH;
        return false;
      }
    } catch (e) {
      this.originState = ORIGIN_STATE.INVALID_TOKEN;
      return false;
    } finally {
      this.isOpening = false;
    }
  }

  get requiresSetup() {
    return (
      !this.token || this.originState === ORIGIN_STATE.INVALID_TOKEN || this.originState === ORIGIN_STATE.INVALID_REPO
    );
  }

  getFullTreePathToFile(path) {
    return `${this.root ? `${this.root}/` : ""}${path}`;
  }

  async write(content, path = null) {
    if (!this.isOpen) return;

    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }
    const repo = this.githubRepo;

    let b64 = null;

    if (typeof content === "string") {
      b64 = btoa(content);
    } else if (content instanceof Blob || content instanceof File) {
      b64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(fromByteArray(new Uint8Array(reader.result)));
        reader.onerror = rej;
        reader.readAsArrayBuffer(content);
      });
    } else if (content instanceof ArrayBuffer) {
      b64 = fromByteArray(new Uint8Array(content));
    } else {
      throw new Error("Invalid content type");
    }

    const blobPromise = repo.git.blobs.create({ content: b64, encoding: "base64" });
    const destPath = this.getFullTreePathToFile(path || this.filename);
    const branch = await repo.git.refs(`heads/${this.branch || "master"}`).fetch();

    const blob = await blobPromise;

    const tree = await repo.git.trees.create({
      tree: [{ path: destPath, sha: blob.sha, mode: "100644", type: "blob" }],
      base_tree: branch.object.sha
    });
    const commit = await repo.git.commits.create({
      message: `Update Webspace world ${document.title}`,
      tree: tree.sha,
      parents: [branch.object.sha]
    });
    await branch.update({ sha: commit.sha });
    return true;
  }

  async close() {}

  async fileExists(filePath) {
    return !!(await this._fileForPath(filePath));
  }

  async contentUrlForRelativePath(path) {
    if (this.assetBlobCache.has(path)) {
      return URL.createObjectURL(this.assetBlobCache.get(path));
    }

    return path;
  }

  async uploadAsset(fileOrBlob, fileName) {
    await this.write(fileOrBlob, `assets/${fileName}`);
    this.assetBlobCache.set(`assets/${fileName}`, fileOrBlob);

    return { url: `assets/${encodeURIComponent(fileName)}`, contentType: fileOrBlob.type };
  }

  async _getTreeForPath(path) {
    const branch = await this.githubRepo.git.refs(`heads/${this.branch}`).fetch();
    let tree = await this.githubRepo.git.trees(branch.object.sha).fetch();

    const parts = path.split("/");

    while (parts.length && parts[0].length > 0) {
      const part = parts.shift();
      const subtree = tree.tree.find(f => f.path === part && f.type === "tree");
      if (!subtree) return null;
      tree = await this.githubRepo.git.trees(subtree.sha).fetch();
    }

    return tree;
  }

  async _fileForPath(filePath) {
    const fullPath = this.getFullTreePathToFile(filePath);
    const filename = fullPath.split("/").pop();
    const dir = fullPath
      .split("/")
      .slice(0, -1)
      .join("/");

    const tree = await this._getTreeForPath(dir);
    if (!tree) return;

    // See if the file exists in the tree
    return tree.tree.find(f => f.path === filename && f.type === "blob");
  }
}

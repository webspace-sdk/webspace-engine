import Octokat from "octokat";
import { fromByteArray } from "base64-js";
import { WRITEBACK_ORIGIN_STATE } from "../utils/atom-access-manager";

export default class GitHubWriteback {
  constructor(options = {}) {
    const pathParts = document.location.pathname.split("/");
    this.filename = decodeURIComponent(pathParts.pop());
    this.root = pathParts
      .map(decodeURIComponent)
      .join("/")
      .substring(1);
    this.originState = WRITEBACK_ORIGIN_STATE.UNINITIALIZED;

    this.isOpening = false;
    this.isWriting = false;
    this.assetBlobCache = new Map();
    this.originType = "github";

    if (options.user) {
      this.user = options.user;
    }

    if (options.org) {
      this.org = options.org;
    }

    if (options.repo) {
      this.repo = options.repo;
    }

    if (options.secret) {
      this.secret = options.secret;
    }

    if (options.branch) {
      this.branch = options.branch;
    }

    this.githubRepo = null;
  }

  async init() {
    if (this.secret) {
      await this.open();
    }
  }

  get isOpen() {
    return this.originState === WRITEBACK_ORIGIN_STATE.VALID;
  }

  async open(options = {}) {
    if (this.isOpen) return true;

    this.user = options.user || this.user;
    this.org = options.org || this.org;
    this.secret = options.secret || this.secret;
    this.repo = options.repo || this.repo;
    this.branch = options.branch || this.branch;

    while (this.isOpening) {
      await new Promise(res => setTimeout(res, 250));
    }

    if (this.isOpen) return true;
    this.isOpening = true;

    try {
      if (!this.secret) {
        this.originState = WRITEBACK_ORIGIN_STATE.INVALID_CREDENTIALS;
        return false;
      }

      const github = new Octokat({ token: this.secret });

      const repo = await github.repos(this.org || this.user, this.repo);

      if (!this.branch) {
        this.branch = (await repo.fetch()).defaultBranch;
      }

      try {
        await repo.git.refs(`heads/${this.branch}`).fetch();
      } catch (e) {
        if (e.message.indexOf("Bad credentials") !== -1) {
          this.originState = WRITEBACK_ORIGIN_STATE.INVALID_CREDENTIALS;
        } else {
          this.originState = WRITEBACK_ORIGIN_STATE.INVALID_REPO;
        }
        return false;
      }

      this.githubRepo = repo;
      const file = await this._fileForPath(this.filename);

      if (!file) {
        this.originState = WRITEBACK_ORIGIN_STATE.INVALID_PATH;
        return false;
      }

      //const blob = await repo.git.blobs(file.sha).fetch();
      //const content = atob(blob.content);

      // Sanity check, look for at least one id that matches in the content
      // This is conservative enough to deal with slower deploys, but still
      // better than nothing.
      //
      // NOTE: Taken out for now since if you create an object on a blank page, this
      // will fail. Should be a simpler check like script tag matching.
      // const ids = new Set();

      // for (const el of document.body.children) {
      //   if (el.id) {
      //     ids.add(el.id);
      //   }
      // }

      // if (ids.size === 0) {
      //   this.originState = WRITEBACK_ORIGIN_STATE.VALID;
      //   return true;
      // }

      // let found = false;
      // for (const id of ids) {
      //   if (content.indexOf(id) !== -1) {
      //     found = true;
      //     break;
      //   }
      // }

      // if (found) {
      //   this.originState = WRITEBACK_ORIGIN_STATE.VALID;
      //   return true;
      // } else {
      //   this.originState = WRITEBACK_ORIGIN_STATE.INVALID_PATH;
      //   return false;
      // }

      this.originState = WRITEBACK_ORIGIN_STATE.VALID;
      return true;
    } catch (e) {
      this.originState = WRITEBACK_ORIGIN_STATE.INVALID_CREDENTIALS;
      return false;
    } finally {
      this.isOpening = false;
    }
  }

  get requiresSetup() {
    return (
      !this.secret ||
      this.originState === WRITEBACK_ORIGIN_STATE.INVALID_CREDENTIALS ||
      this.originState === WRITEBACK_ORIGIN_STATE.INVALID_REPO
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

    let sendContent = null;
    let sendEncoding = null;

    if (typeof content === "string") {
      sendContent = content;
      sendEncoding = "utf-8";
    } else if (content instanceof Blob || content instanceof File) {
      sendContent = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(fromByteArray(new Uint8Array(reader.result)));
        reader.onerror = rej;
        reader.readAsArrayBuffer(content);
      });
      sendEncoding = "base64";
    } else if (content instanceof ArrayBuffer) {
      sendContent = fromByteArray(new Uint8Array(content));
      sendEncoding = "base64";
    } else {
      throw new Error("Invalid content type");
    }

    const blobPromise = repo.git.blobs.create({ content: sendContent, encoding: sendEncoding });
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

  async uploadAsset(fileOrBlob, fileName, doNotCache = false) {
    await this.write(fileOrBlob, `assets/${fileName}`);

    if (!doNotCache) {
      this.assetBlobCache.set(`assets/${fileName}`, fileOrBlob);
    }

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

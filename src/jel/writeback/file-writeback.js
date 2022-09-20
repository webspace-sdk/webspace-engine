import { getSpaceIdFromHistory } from "../utils/jel-url-utils";
import GitHubWriteback from "./github-writeback";

export default class FileWriteback {
  constructor(db, dirHandle = null, pageHandle = null) {
    this.db = db;
    this.dirHandle = dirHandle;
    this.pageHandle = pageHandle;
    this.isWriting = false;
    this.isOpening = false;
    this.blobCache = new Map();
    this.gitWriteback = new GitHubWriteback(
      "gfodor",
      "gfodor.github.io",
      localStorage.getItem("github-token"),
      decodeURIComponent(document.location.pathname.split("/").pop()),
      "webspace"
    );
  }

  async init() {
    if (this.dirHandle) {
      this.dirHandlePerm = await this.dirHandle.queryPermission({ mode: "readwrite" });
    }

    if (this.pageHandle) {
      this.pageHandlePerm = await this.pageHandle.queryPermission({ mode: "readwrite" });
    }
  }

  get isOpen() {
    return this.dirHandle && this.pageHandle && this.pageHandlePerm === "granted";
  }

  get requiresSetup() {
    return this.pageHandle === null && this.dirHandle === null;
  }

  async open() {
    if (this.isOpen) return true;

    while (this.isOpening) {
      await new Promise(res => setTimeout(res, 250));
    }

    this.isOpening = true;

    try {
      if (this.pageHandle) {
        if (this.pageHandlePerm === "prompt") {
          await this.pageHandle.requestPermission({ mode: "readwrite" });
          this.pageHandlePerm = await this.pageHandle.queryPermission({ mode: "readwrite" });
        }
      } else {
        const fileParts = document.location.pathname.split("/");

        const containingDir = decodeURIComponent(fileParts[fileParts.length - 2]);
        const file = decodeURIComponent(fileParts[fileParts.length - 1]);

        if (!this.dirHandle) {
          const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
          if (dirHandle.name !== containingDir) return;
          this.dirHandle = dirHandle;
          this.dirHandlePerm = await this.dirHandle.queryPermission({ mode: "readwrite" });
        }

        if (this.dirHandlePerm === "prompt") {
          await this.dirHandle.requestPermission({ mode: "readwrite" });
          this.dirHandlePerm = await this.dirHandle.queryPermission({ mode: "readwrite" });
        }

        this.pageHandle = null;

        for await (const [key, value] of this.dirHandle.entries()) {
          if (key !== file) continue;

          this.pageHandle = value;
          this.pageHandlePerm = await this.pageHandle.queryPermission({ mode: "readwrite" });
          break;
        }
      }

      if (this.dirHandle) {
        const spaceId = await getSpaceIdFromHistory();

        await new Promise(res => {
          this.db
            .transaction("space-file-handles", "readwrite")
            .objectStore("space-file-handles")
            .put({ space_id: spaceId, dirHandle: this.dirHandle })
            .addEventListener("success", res);
        });

        if (this.pageHandle) {
          await new Promise(res => {
            this.db
              .transaction("url-file-handles", "readwrite")
              .objectStore("url-file-handles")
              .put({ url: document.location.href, dirHandle: this.dirHandle, pageHandle: this.pageHandle })
              .addEventListener("success", res);
          });
        }
      }

      return this.isOpen;
    } finally {
      this.isOpening = false;
    }
  }

  async write(content, path = null) {
    if (!this.isOpen) return;
    if (!content || content.length === 0) return;

    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }

    this.isWriting = true;

    try {
      let writable;

      // TODO store additional handles for index
      if (path) {
        const handle = await this.dirHandle.getFileHandle(path, { create: true });
        writable = await handle.createWritable();
      } else {
        writable = await this.pageHandle.createWritable();
      }

      await writable.write(content);
      await writable.close();
      await this.gitWriteback.write(content, path);
    } finally {
      this.isWriting = false;
    }
  }

  async close() {
    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }

    this.dirHandle = null;
    this.pageHandle = null;
    this.open = false;
  }

  async getHandleForPath(path) {
    const pathParts = path.split("/");
    let handle = this.dirHandle;

    while (pathParts.length > 0) {
      const nextPart = pathParts[0];
      pathParts.shift();

      if (pathParts.length === 0) {
        handle = await handle.getFileHandle(nextPart);
      } else {
        handle = await handle.getDirectoryHandle(nextPart);
      }

      if (!handle) return null;
    }

    return handle;
  }

  async fileExists(path) {
    const pathParts = path.split("/");
    let handle = this.dirHandle;

    while (pathParts.length > 0) {
      const nextPart = pathParts[0];
      pathParts.shift();

      if (pathParts.length === 0) {
        try {
          await handle.getFileHandle(nextPart);
          return true;
        } catch (e) {
          return false;
        }
      } else {
        handle = await handle.getDirectoryHandle(nextPart);
      }

      if (!handle) return false;
    }

    return false;
  }

  async directoryExists(path) {
    const pathParts = path.split("/");
    let handle = this.dirHandle;

    while (pathParts.length > 0) {
      const nextPart = pathParts[0];
      pathParts.shift();
      handle = await handle.getDirectoryHandle(nextPart);
      if (!handle) return false;
    }

    return true;
  }

  async contentUrlForRelativePath(path) {
    if (this.blobCache.has(path)) {
      return this.blobCache.get(path);
    }

    const handle = await this.getHandleForPath(path);

    if (handle) {
      const blobUrl = URL.createObjectURL(await handle.getFile());
      this.blobCache.set(path, blobUrl);
      return blobUrl;
    } else {
      return null;
    }
  }

  async uploadAsset(fileOrBlob) {
    const assetsHandle = await this.dirHandle.getDirectoryHandle("assets", { create: true });

    let fileName = null;
    const contentType = fileOrBlob.type || "application/octet-stream";

    if (fileOrBlob instanceof File) {
      fileName = fileOrBlob.name;
    } else {
      const fileExtension = fileOrBlob.type.split("/")[1];

      // choose a filename with a random string
      fileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}.${fileExtension}`;
    }

    const fileHandle = await assetsHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(fileOrBlob);
    await writable.close();

    return { url: `assets/${encodeURIComponent(fileName)}`, contentType };
  }
}

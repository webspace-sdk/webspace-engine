import { getSpaceIdFromHistory } from "../utils/url-utils";
import { WRITEBACK_ORIGIN_STATE } from "../utils/atom-access-manager";

export default class FileWriteback {
  constructor() {
    this.isWriting = false;
    this.isOpening = false;
    this.pageHandle = null;
    this.dirHandle = null;
    this.blobCache = new Map();
    this.originState = WRITEBACK_ORIGIN_STATE.UNINITIALIZED;
    this.originType = "file";
  }

  init() {
    const updatePerms = async () => {
      if (this.dirHandle) {
        this.dirHandlePerm = await this.dirHandle.queryPermission({ mode: "readwrite" });
      }

      if (this.pageHandle) {
        this.pageHandlePerm = await this.pageHandle.queryPermission({ mode: "readwrite" });
      }

      this.originState = this.isOpen ? WRITEBACK_ORIGIN_STATE.VALID : WRITEBACK_ORIGIN_STATE.INVALID_PATH;
    };

    return new Promise(res => {
      const req = indexedDB.open("file-handles", 1);

      req.addEventListener("success", ({ target: { result } }) => {
        const db = result;
        this.db = db;

        db.transaction("url-file-handles")
          .objectStore("url-file-handles")
          .get(document.location.href)
          .addEventListener("success", async ({ target: { result } }) => {
            if (result) {
              this.dirHandle = result.dirHandle;
              this.pageHandle = result.pageHandle;

              await updatePerms();

              res();
            } else {
              // No file handle in db, try to get the dir at least.
              getSpaceIdFromHistory().then(spaceId => {
                db.transaction("space-file-handles")
                  .objectStore("space-file-handles")
                  .get(spaceId)
                  .addEventListener("success", async ({ target: { result } }) => {
                    if (result) {
                      this.dirHandle = result.dirHandle;
                    }

                    await updatePerms();

                    res();
                  });
              });
            }
          });
      });

      req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
        db.createObjectStore("space-file-handles", { keyPath: "space_id" });
        db.createObjectStore("url-file-handles", { keyPath: "url" });
      });
    });
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

    if (this.isOpen) return true;

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
          if (dirHandle.name !== containingDir) {
            this.originState = WRITEBACK_ORIGIN_STATE.INVALID_PATH;
            return;
          }

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

      this.originState = this.isOpen ? WRITEBACK_ORIGIN_STATE.VALID : WRITEBACK_ORIGIN_STATE.INVALID_PATH;

      return this.isOpen;
    } finally {
      this.isOpening = false;
    }
  }

  async write(content, path = null, progressCallback = () => {}) {
    if (!this.isOpen) return;
    if (!content || content.length === 0) return;

    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }

    this.isWriting = true;

    try {
      progressCallback(0);

      let writable;

      // TODO store additional handles for index
      if (path) {
        const handle = await this.dirHandle.getFileHandle(path, { create: true });
        writable = await handle.createWritable();
      } else {
        writable = await this.pageHandle.createWritable();
      }

      progressCallback(0.05);
      await writable.write(content);
      progressCallback(0.95);
      await writable.close();
    } finally {
      this.isWriting = false;
      progressCallback(1);
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
        try {
          handle = await handle.getDirectoryHandle(nextPart);
        } catch (e) {
          return false;
        }
      }

      if (!handle) return false;
    }

    return false;
  }

  async contentUrlForRelativePath(path) {
    if (this.blobCache.has(path)) {
      const url = this.blobCache.get(path);
      try {
        await fetch(url);
        return url;
      } catch (e) {
        // Blob is no longer valid, remove it from the cache.
        URL.revokeObjectURL(url);
        this.blobCache.delete(path);
      }
    }

    const handle = await this._getHandleForPath(path);

    if (handle) {
      const blobUrl = URL.createObjectURL(await handle.getFile());
      this.blobCache.set(path, blobUrl);
      return blobUrl;
    } else {
      return null;
    }
  }

  async uploadAsset(fileOrBlob, fileName, uploadProgressCallback = () => {}) {
    const assetsHandle = await this.dirHandle.getDirectoryHandle("assets", { create: true });

    uploadProgressCallback(0);
    const contentType = fileOrBlob.type || "application/octet-stream";
    const fileHandle = await assetsHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    uploadProgressCallback(0.05);
    await writable.write(fileOrBlob);
    uploadProgressCallback(0.85);
    await writable.close();
    uploadProgressCallback(1);

    return { url: `assets/${encodeURIComponent(fileName)}`, contentType };
  }

  async _getHandleForPath(path) {
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

  updatePresenceWithOriginInfo() {}

  rawOriginUrlForRelativePath() {
    throw new Error("Not implemented");
  }
}

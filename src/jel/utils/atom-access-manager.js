import { EventTarget } from "event-target-shim";
import { getSpaceIdFromHistory, getHubIdFromHistory } from "./jel-url-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { signString, verifyString } from "../../hubs/utils/crypto";
import { fromByteArray } from "base64-js";
import { META_TAG_PREFIX } from "./dom-utils";

const OWNER_PUBLIC_KEY_META_TAG_NAME = `${META_TAG_PREFIX}.keys.owner`;

const ATOM_TYPES = {
  HUB: 0,
  SPACE: 1,
  VOX: 2
};

const ROLES = {
  NONE: 0,
  OWNER: 0x80
};

const VALID_PERMISSIONS = {
  [ATOM_TYPES.HUB]: [
    "update_hub_meta",
    "update_hub_roles",
    "join_hub",
    "close_hub",
    "trash_hub",
    "remove_hub",
    "mute_users",
    "kick_users",
    "tweet",
    "spawn_camera",
    "spawn_drawing",
    "spawn_and_move_media",
    "spawn_emoji",
    "fly",
    "upload_files"
  ],
  [ATOM_TYPES.SPACE]: ["create_world_hub", "view_nav", "edit_nav", "update_space_meta", "create_invite"],
  [ATOM_TYPES.VOX]: ["view_vox", "edit_vox"]
};

class FileWriteback {
  constructor(db, dirHandle = null, pageHandle = null) {
    this.db = db;
    this.dirHandle = dirHandle;
    this.pageHandle = pageHandle;
    this.isWriting = false;
    this.isOpening = false;
    this.blobCache = new Map();
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

        const containingDir = fileParts[fileParts.length - 2];
        const file = fileParts[fileParts.length - 1];

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

  async write(content) {
    if (!this.isOpen) return;
    if (!content || content.length === 0) return;

    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }

    this.isWriting = true;

    try {
      const writable = await this.pageHandle.createWritable();
      await writable.write(content);
      await writable.close();
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

    return { url: `assets/${fileName}`, contentType };
  }
}

const prettifyXml = sourceXml => {
  const xmlDoc = new DOMParser().parseFromString(sourceXml, "application/xml");
  const xsltDoc = new DOMParser().parseFromString(
    [
      // describes how we want to modify the XML - indent everything
      '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
      '  <xsl:strip-space elements="*"/>',
      '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
      '    <xsl:value-of select="normalize-space(.)"/>',
      "  </xsl:template>",
      '  <xsl:template match="node()|@*">',
      '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
      "  </xsl:template>",
      '  <xsl:output indent="yes"/>',
      "</xsl:stylesheet>"
    ].join("\n"),
    "application/xml"
  );

  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);
  const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
  const resultXml = new XMLSerializer().serializeToString(resultDoc);

  return resultXml;
};

const MAX_WRITE_RATE_MS = 1000;

export default class AtomAccessManager extends EventTarget {
  constructor() {
    super();

    this.publicKeys = new Map();
    this.roles = new Map();

    this.isEditingAvailable = false;
    this.init();

    this.writeback = null;
    this.lastWriteTime = null;
    this.writeTimeout = null;

    this.refreshOnWritebackOpen = false;
  }

  init() {
    if (document.location.protocol === "file:") {
      this.initFileWriteback();
      this.isEditingAvailable = true;

      // Editing available should be false if this isn't "our" file, and was
      // spawned via an invite.
    }

    this.mutationObserver = new MutationObserver(() => {
      if (!this.writeback) return;

      const write = () => {
        const html = prettifyXml(new XMLSerializer().serializeToString(document));

        if (html && html.length > 0) {
          this.writeback.write(html);
        } else {
          console.warn("Tried to write empty html");
        }

        this.lastWriteTime = Date.now();

        if (this.writeTimeout) {
          clearTimeout(this.writeTimeout);
          this.writeTimeout = null;
        }
      };

      if (this.lastWriteTime && Date.now() - this.lastWriteTime < MAX_WRITE_RATE_MS) {
        if (!this.writeTimeout) {
          this.writeTimeout = setTimeout(write, MAX_WRITE_RATE_MS);
        }
      } else if (!this.writeTimeout) {
        write();
      }
    });

    this.updateRoles();

    waitForDOMContentLoaded().then(() => {
      this.mutationObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true
      });

      // Set my role after client id is set, other roles are set after public keys updated from challenges
      document.body.addEventListener("connected", () => this.updateRoles());

      document.body.addEventListener("clientDisconnected", ({ detail: { clientId } }) => {
        this.roles.delete(clientId);
        this.publicKeys.delete(clientId);
        this.dispatchEvent(new CustomEvent("permissions_updated", {}));
      });
    });
  }

  get writebackRequiresSetup() {
    return !this.writeback || this.writeback.requiresSetup;
  }

  async openWriteback() {
    const result = await this.writeback.open();

    if (result) {
      this.dispatchEvent(new CustomEvent("permissions_updated", {}));
      this.ensurePublicKeyInMetaTags();

      if (this.refreshOnWritebackOpen) {
        document.location.reload();
      }
    }

    return result;
  }

  async ensurePublicKeyInMetaTags() {
    const publicKey = JSON.parse(JSON.stringify(window.APP.store.state.credentials.public_key));
    const hubId = await getHubIdFromHistory();
    publicKey.hub_id = hubId;

    const metaTagContent = btoa(JSON.stringify(publicKey));
    let found = false;

    for (const el of [...document.querySelectorAll(`meta[name='${OWNER_PUBLIC_KEY_META_TAG_NAME}']`)]) {
      const content = el.getAttribute("content");

      try {
        // This routine also clears out meta tags from other hub ids if this page was copied from elsewhere.
        if (hubId !== JSON.parse(atob(content))?.hub_id) {
          el.remove();
        }
      } catch (e) {
        // Can't parse, remove it
        el.remove();
      }

      if (content === metaTagContent) {
        found = true;
      }
    }

    if (!found) {
      const el = document.createElement("meta");
      el.setAttribute("name", OWNER_PUBLIC_KEY_META_TAG_NAME);
      el.setAttribute("content", metaTagContent);
      document.head.appendChild(el);
    }

    await this.updateRoles();
  }

  initFileWriteback() {
    const req = indexedDB.open("file-handles", 1);

    req.addEventListener("success", ({ target: { result } }) => {
      const db = result;

      db.transaction("url-file-handles")
        .objectStore("url-file-handles")
        .get(document.location.href)
        .addEventListener("success", async ({ target: { result } }) => {
          if (result) {
            const { dirHandle, pageHandle } = result;
            const currentPerm = await pageHandle.queryPermission({ mode: "readwrite" });

            if (currentPerm === "granted") {
              this.isEditingAvailable = false;
            }

            this.writeback = new FileWriteback(db, dirHandle, pageHandle);
            await this.writeback.init();

            if (currentPerm !== "denied") {
              this.dispatchEvent(new CustomEvent("permissions_updated", {}));
            }
          } else {
            // No file handle in db, try to get the dir at least.
            getSpaceIdFromHistory().then(spaceId => {
              db.transaction("space-file-handles")
                .objectStore("space-file-handles")
                .get(spaceId)
                .addEventListener("success", async ({ target: { result } }) => {
                  if (result) {
                    const dirHandle = result.dirHandle;
                    this.writeback = new FileWriteback(db, dirHandle);
                  } else {
                    this.writeback = new FileWriteback(db);
                  }

                  await this.writeback.init();
                });
            });
          }
        });
    });

    req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
      db.createObjectStore("space-file-handles", { keyPath: "space_id" });
      db.createObjectStore("url-file-handles", { keyPath: "url" });
    });
  }

  async ensureWritebackOpen(refreshAfterOpen = false) {
    if (this.writeback?.isOpen) return true;

    if (this.writebackRequiresSetup) {
      AFRAME.scenes[0].emit("action_open_writeback", { showInCenter: true });
      // If we need to read files and don't have writeback access,
      // just reload the page
      this.refreshOnWritebackOpen = refreshAfterOpen;
      return false;
    }

    try {
      return await this.openWriteback();
    } catch (e) {
      // User activation may be needed, try one more time
      await new Promise(res => document.addEventListener("mousedown", res));
      return await this.openWriteback();
    }
  }

  async contentUrlForRelativePath(path) {
    if (!(await this.ensureWritebackOpen(true))) return;
    return await this.writeback.contentUrlForRelativePath(path);
  }

  async uploadAsset(fileOrBlob) {
    if (!(await this.ensureWritebackOpen())) return;
    return await this.writeback.uploadAsset(fileOrBlob);
  }

  setCurrentHubId(hubId) {
    this.currentHubId = hubId;
  }

  hubCan(permission, hubId = null, sessionId = null) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.HUB].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (hubId !== null && this.currentHubId !== hubId) return false;

    if (sessionId !== null && sessionId !== NAF.clientId) {
      return this.roles.get(sessionId) === ROLES.OWNER;
    } else {
      return this.writeback?.isOpen;
    }
  }

  spaceCan(permission) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.SPACE].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    return this.writeback?.isOpen;
  }

  voxCan(permission) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.VOX].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    return false;
  }

  async closeWriteback() {
    await this.writeback?.close();
    this.writeback = null;
  }

  async getChallengeResponse(challenge) {
    const { store } = window.APP;
    const privateKeyJwk = store.state.credentials.private_key;
    const challengeSignature = await signString(challenge, privateKeyJwk);
    const clientIdSignature = await signString(NAF.clientId, privateKeyJwk);
    return {
      challengeSignature: fromByteArray(new Uint8Array(challengeSignature)),
      clientIdSignature: fromByteArray(new Uint8Array(clientIdSignature))
    };
  }

  async verifyChallengeResponse(challenge, publicKey, challengeSignature, clientIdSignature, fromClientId) {
    if (!(await verifyString(challenge, publicKey, challengeSignature))) return;
    if (!(await verifyString(fromClientId, publicKey, clientIdSignature))) return;

    this.publicKeys.set(new TextDecoder().decode(fromClientId), publicKey);
    await this.updateRoles();
    this.dispatchEvent(new CustomEvent("permissions_updated", {}));
  }

  async updateRoles() {
    const ownerPublicKeys = new Set();
    const hubId = await getHubIdFromHistory();

    for (const metaTag of [...document.head.querySelectorAll(`meta[name='${OWNER_PUBLIC_KEY_META_TAG_NAME}']`)]) {
      const content = JSON.parse(atob(metaTag.getAttribute("content")));
      if (content.hub_id !== hubId) continue;
      ownerPublicKeys.add(`${content.x}${content.y}`);
    }

    if (NAF.clientId && !this.publicKeys.has(NAF.clientId)) {
      const myPublicKey = window.APP.store.state.credentials.public_key;
      if (myPublicKey) {
        this.publicKeys.set(NAF.clientId, myPublicKey);
      }
    }

    const newRoles = new Map();

    for (const [clientId, publicKey] of this.publicKeys) {
      const role = ownerPublicKeys.has(`${publicKey.x}${publicKey.y}`) ? ROLES.OWNER : ROLES.NONE;
      newRoles.set(clientId, role);
    }

    let changed = false;

    if (newRoles.size !== this.roles.size) {
      changed = true;
    } else {
      loop: for (const [clientIdX, roleX] of this.roles) {
        for (const [clientIdY, roleY] of newRoles) {
          if (clientIdX === clientIdY && roleX !== roleY) {
            changed = true;
            break loop;
          }
        }
      }
    }

    if (changed) {
      this.roles = newRoles;
      this.dispatchEvent(new CustomEvent("permissions_updated", {}));
    }
  }
}

import { EventTarget } from "event-target-shim";
import { getHubIdFromHistory } from "./url-utils";
import { waitForDOMContentLoaded } from "./async-utils";
import { docToPrettifiedHtml, META_TAG_PREFIX } from "./dom-utils";
import { signString, verifyString } from "./crypto";
import { fromByteArray } from "base64-js";
import FileWriteback from "../writeback/file-writeback";
import GitHubWriteback from "../writeback/github-writeback";
import { ROLES } from "./permissions-utils";
import { getUrlFromVoxId } from "./vox-utils";
import SERVICE_WORKER_JS from "!!raw-loader!../webspace.service.js";

const OWNER_PUBLIC_KEY_META_TAG_NAME = `${META_TAG_PREFIX}.keys.owner`;

export const WRITEBACK_ORIGIN_STATE = {
  UNINITIALIZED: 1,
  INVALID_CREDENTIALS: 2,
  INVALID_REPO: 3,
  INVALID_PATH: 4,
  VALID: 5
};

const ATOM_TYPES = {
  HUB: 0,
  SPACE: 1,
  VOX: 2
};

const VALID_PERMISSIONS = {
  [ATOM_TYPES.HUB]: [
    "update_hub_meta",
    "update_hub_roles",
    "join_hub",
    "close_hub",
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

const MAX_WRITE_RATE_MS = 10000;

export default class AtomAccessManager extends EventTarget {
  constructor() {
    super();

    this.publicKeys = new Map();
    this.roles = new Map();
    this.writeback = null;

    this.lastWriteTime = null;
    this.writeTimeout = null;

    this.refreshOnWritebackOpen = false;

    this.documentIsDirty = false;
    this.remoteUploadResolvers = new Map();
    this.hub = null;
  }

  beginWatchingHubMetadata(hubId) {
    const { hubMetadata } = window.APP;
    this.hub = hubMetadata.getMetadata(hubId);
    this.dispatchEvent(new CustomEvent("permissions_updated", {}));

    let previousSaveChangesToOrigin = this.saveChangesToOrigin;
    let previousContentChangeRole = this.contentChangeRole;

    hubMetadata.subscribeToMetadata(hubId, () => {
      this.hub = hubMetadata?.getMetadata(hubId);

      if (
        previousSaveChangesToOrigin !== this.saveChangesToOrigin ||
        previousContentChangeRole !== this.contentChangeRole
      ) {
        previousSaveChangesToOrigin = this.saveChangesToOrigin;
        previousContentChangeRole = this.contentChangeRole;

        this.dispatchEvent(new CustomEvent("permissions_updated", {}));
      }
    });
  }

  get saveChangesToOrigin() {
    return !!(this.hub && this.hub.save_changes_to_origin);
  }

  get contentChangeRole() {
    return (this.hub && this.hub.content_change_role) || ROLES.NONE;
  }

  get isWritebackOpen() {
    return !!this.writeback?.isOpen;
  }

  init() {
    let writeback = null;

    const { store } = window.APP;

    if (document.location.protocol === "file:") {
      writeback = new FileWriteback();
    } else {
      if (store.state.writeback) {
        switch (store.state.writeback.type) {
          case "github":
            writeback = new GitHubWriteback(store.state.writeback);
            break;
        }
      }
    }

    if (writeback) {
      this.setAndInitWriteback(writeback);
    }

    let isWriting = false;

    const write = async (immediately = false) => {
      if (!this.saveChangesToOrigin) return;

      if (this.writeTimeout) {
        clearTimeout(this.writeTimeout);
        this.writeTimeout = null;
      }

      if (isWriting || !this.writeback) {
        if (immediately) {
          if (this.writeback) {
            while (isWriting) {
              await new Promise(res => setTimeout(res, 100));
            }
          } else {
            return;
          }
        } else {
          this.writeTimeout = setTimeout(write, MAX_WRITE_RATE_MS);
          return;
        }
      }

      isWriting = true;
      try {
        if (this.isMasterWriter()) {
          await this.writeDocument(document);
        }
      } finally {
        isWriting = false;
      }

      if (this.writeTimeout === null) {
        this.documentIsDirty = false;
        this.dispatchEvent(new CustomEvent("document-dirty-state-changed"));
      }

      this.lastWriteTime = Date.now();
    };

    this.mutationObserver = new MutationObserver(arr => {
      // Deal with mutations we ignore. <style> tags from styled-components is one.
      let sawUnignoredRecord = false;

      for (const record of arr) {
        if (record.type === "attributes" || record.type === "characterData" || record.addedNodes.length > 0) {
          sawUnignoredRecord = true;
          break;
        }

        let ignoredStyleCount = 0;

        for (const node of record.removedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName === "STYLE" &&
            typeof node.getAttribute("data-styled") === "string"
          ) {
            ignoredStyleCount++;
          }
        }

        if (ignoredStyleCount !== record.removedNodes.length) {
          sawUnignoredRecord = true;
          break;
        }
      }

      if (!sawUnignoredRecord) return;

      if (this.writeTimeout) {
        clearTimeout(this.writeTimeout);
      }

      this.documentIsDirty = true;
      this.dispatchEvent(new CustomEvent("document-dirty-state-changed"));
      this.writeTimeout = setTimeout(write, MAX_WRITE_RATE_MS);
    });

    // TODO add handler when saveChangesToOrigin is set to true that marks document dirty
    window.addEventListener("beforeunload", e => {
      if (!this.hasUnsavedChanges) return;

      e.preventDefault();
      e.returnValue = "Unsaved changes are still being written. Do you want to leave and lose these changes?";

      if (!isWriting) {
        write(true);
      }

      SYSTEMS.voxSystem.performWriteback();
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
      document.body.addEventListener("connected", () => {
        this.updateRoles();
        this.updatePresenceWithWriterStatus();
        this.subscribeToUploadCompleteMessages();
      });

      document.body.addEventListener("clientDisconnected", ({ detail: { clientId } }) => {
        this.roles.delete(clientId);
        this.publicKeys.delete(clientId);
        this.dispatchEvent(new CustomEvent("permissions_updated", {}));
      });
    });
  }

  setAndInitWriteback(writeback) {
    this.writeback = writeback;

    if (this.writeback) {
      this.writeback.init().then(() => {
        if (this.writeback.isOpen) {
          this.handleWritebackOpened();
        }
      });
    }
  }

  get hasUnsavedChanges() {
    if (!this.isMasterWriter()) return false;
    if (!this.documentIsDirty && !SYSTEMS.voxSystem.hasPendingWritebackFlush()) return false;
    if (!this.saveChangesToOrigin) return false;
    return true;
  }

  get writebackOriginType() {
    return this.writeback?.originType || "none";
  }

  get writebackRequiresSetup() {
    return !this.writeback || this.writeback.requiresSetup;
  }

  async openWriteback(options = {}) {
    if (this.writeback?.isOpen) return true;

    const result = await this.writeback.open(options);

    if (result) {
      this.handleWritebackOpened();

      if (this.refreshOnWritebackOpen) {
        document.location.reload();
      }
    }

    return result;
  }

  writebackOriginState() {
    return this.writeback?.originState || WRITEBACK_ORIGIN_STATE.UNINITIALIZED;
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

  async ensureServiceWorker() {
    if (!this.writeback?.isOpen) return;

    if (!(await this.fileExists("webspace.service.js"))) {
      this.writeback.write(SERVICE_WORKER_JS, "webspace.service.js");
    }
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
    if (document.location.protocol === "file:") {
      if (!(await this.ensureWritebackOpen(true))) return;
    }

    // First, check presence for origin information (which may include us), and fetch directly from
    // a raw origin URL if possible, since site deployment may cause lag.
    for (const writerPresence of this.getWriterPresenceStates()) {
      if (!writerPresence.origin) continue;

      switch (writerPresence.origin.type) {
        case "github":
          return GitHubWriteback.rawOriginUrlForRelativePath(writerPresence.origin, path);
      }
    }

    if (this.writeback?.isOpen) {
      return await this.writeback.contentUrlForRelativePath(path);
    } else {
      return path;
    }
  }

  async writeDocument(doc, path = null) {
    const html = docToPrettifiedHtml(doc);

    if (html && html.length > 0) {
      return await this.writeback.write(html, path);
    } else {
      console.warn("Tried to write empty html");
    }
  }

  async fileExists(path) {
    if (!(await this.ensureWritebackOpen(true))) {
      throw new Error("Writeback not open");
    }

    return await this.writeback.fileExists(path);
  }

  async uploadAsset(fileOrBlobOrPromiseToFileOrBlob, fileNameOrPromiseToFileName = null) {
    let fileOrBlob = fileOrBlobOrPromiseToFileOrBlob;
    let fileName = fileNameOrPromiseToFileName;

    // Check if the first argument is a promise, if so, resolve it
    if (fileOrBlobOrPromiseToFileOrBlob instanceof Promise) {
      fileOrBlob = await fileOrBlobOrPromiseToFileOrBlob;
    }

    if (fileNameOrPromiseToFileName instanceof Promise) {
      fileName = await fileNameOrPromiseToFileName;
    }

    if (!this.writeback?.isOpen && this.hasAnotherWriterInPresence()) {
      // Upload via webrtc
      return await this.uploadAssetToWriterInPresence(fileOrBlob);
    }

    return await this.tryUploadAssetDirectly(fileOrBlob, fileName);
  }

  async uploadAssetToWriterInPresence(fileOrBlob) {
    const clientIds = new Set();

    for (const [, presence] of NAF.connection.presence.states) {
      const clientId = presence.client_id;
      if (clientId !== NAF.clientId && presence.writer && this.roles.get(clientId) === ROLES.OWNER) {
        clientIds.add(clientId);
      }
    }

    // Choose a random client id to try
    const clientId = [...clientIds][Math.floor(Math.random() * clientIds.size)];

    const reader = new FileReader();
    reader.readAsDataURL(fileOrBlob);

    const contents = (await new Promise(res => (reader.onloadend = () => res(reader.result)))).split(",")[1];
    const contentType = fileOrBlob.type || "application/octet-stream";

    const name = this.getFilenameForFileOrBlob(fileOrBlob);
    const id = Math.random()
      .toString(36)
      .substring(2, 7);

    const promise = new Promise(res => this.remoteUploadResolvers.set(id, res));

    this.dispatchEvent(new CustomEvent("upload-progress", { detail: { progress: 0 } }));
    window.APP.hubChannel.sendMessage({ id, contents, contentType, name }, "upload_asset_request", clientId);

    return await promise;
  }

  async tryUploadAssetDirectly(fileOrBlob, fileName = null) {
    if (!this.saveChangesToOrigin) return;
    if (!(await this.ensureWritebackOpen())) return;

    fileName = fileName || this.getFilenameForFileOrBlob(fileOrBlob);

    return await this.writeback.uploadAsset(fileOrBlob, fileName, progress => {
      this.dispatchEvent(new CustomEvent("upload-progress", { detail: { progress } }));
    });
  }

  getFilenameForFileOrBlob(fileOrBlob) {
    let fileName = null;

    if (fileOrBlob instanceof File) {
      fileName = fileOrBlob.name;
    } else {
      const fileExtension = fileOrBlob.type.split("/")[1];

      // choose a filename with a random string
      fileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}.${fileExtension}`;
    }

    return fileName;
  }

  setCurrentHubId(hubId) {
    this.currentHubId = hubId;
  }

  hubCan(permission, hubId = null, sessionId = null) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.HUB].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (hubId !== null && this.currentHubId !== hubId) return false;

    const contentChangeRole = this.contentChangeRole;

    const isContentPermission = permission.startsWith("spawn_") || permission === "upload_files";
    const isRegardingSelf = sessionId === null || sessionId === NAF.clientId;
    const selfIsDefactoOwner = !!this.writeback?.isOpen;

    if (isContentPermission) {
      if (!contentChangeRole) return false;
      if (isRegardingSelf && selfIsDefactoOwner) return true;

      if (permission === "upload_files") {
        if (!this.saveChangesToOrigin) return false;

        const hasNecessaryWritability = this.writeback?.isOpen || this.hasAnotherWriterInPresence();

        return (
          hasNecessaryWritability && (this.roles.get(sessionId) === ROLES.OWNER || contentChangeRole === ROLES.MEMBER)
        );
      } else {
        if (contentChangeRole === ROLES.MEMBER) return true;
        return this.roles.get(sessionId) === ROLES.OWNER;
      }
    } else {
      if (isRegardingSelf && selfIsDefactoOwner) return true;
      return this.roles.get(sessionId) === ROLES.OWNER;
    }
  }

  spaceCan(permission, sessionId = null) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.SPACE].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (permission === "view_nav") return true;

    const isRegardingSelf = sessionId === null || sessionId === NAF.clientId;
    const selfIsDefactoOwner = !!this.writeback?.isOpen;
    if (isRegardingSelf && selfIsDefactoOwner) return true;
    return this.roles.get(sessionId) === ROLES.OWNER;
  }

  voxCan(permission, voxId = null, sessionId = null) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.VOX].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (permission === "view_vox") return true;

    const voxUrl = getUrlFromVoxId(voxId);

    if (new URL(voxUrl, document.location.href).origin !== document.location.origin) {
      return false;
    }

    const contentChangeRole = this.contentChangeRole;
    const isRegardingSelf = sessionId === null || sessionId === NAF.clientId;
    const selfIsDefactoOwner = !!this.writeback?.isOpen;

    if (isRegardingSelf && selfIsDefactoOwner) return true;

    return this.roles.get(sessionId) === ROLES.OWNER || contentChangeRole === ROLES.MEMBER;
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

  updatePresenceWithWriterStatus() {
    if (!NAF.connection.presence) return;
    if (!this.writeback?.isOpen) return;
    NAF.connection.presence.setLocalStateField("writer", true);
    this.writeback.updatePresenceWithOriginInfo();
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

  subscribeToUploadCompleteMessages() {
    NAF.connection.subscribeToDataChannel("upload_asset_complete", (_type, { body: { url, contentType, id } }) => {
      if (this.remoteUploadResolvers.has(id)) {
        this.remoteUploadResolvers.get(id)({ url, contentType });
        this.remoteUploadResolvers.delete(id);
        this.dispatchEvent(new CustomEvent("upload-progress", { detail: { progress: 1 } }));
      }
    });
  }

  // The "Master writer" is the client id in presence with the lowest client id also registered as a writer and a known owner.
  //
  // This concept is needed to try to reduce the amount of writes going back to origin concurrently.
  isMasterWriter() {
    if (!this.writeback?.isOpen) return false;
    let masterWriterClientId = null;

    for (const [, presence] of NAF.connection.presence.states) {
      const clientId = presence.client_id;

      if (presence.writer && this.roles.get(clientId) === ROLES.OWNER) {
        if (!masterWriterClientId || clientId < masterWriterClientId) {
          masterWriterClientId = clientId;
        }
      }
    }

    return masterWriterClientId === NAF.clientId || masterWriterClientId === null;
  }

  // Returns true if there's another peer in presence that we know is writing.
  hasAnotherWriterInPresence() {
    const presences = this.getWriterPresenceStates();
    return presences.length > 0 && !presences.find(p => p.client_id === NAF.clientId);
  }

  getWriterPresenceStates() {
    const states = [];

    if (NAF.connection.presence?.states) {
      for (const [, presence] of NAF.connection.presence.states) {
        const clientId = presence.client_id;
        if (presence.writer && this.roles.get(clientId) === ROLES.OWNER) {
          states.push(presence);
        }
      }
    }

    return states;
  }

  handleWritebackOpened() {
    this.dispatchEvent(new CustomEvent("permissions_updated", {}));
    this.ensurePublicKeyInMetaTags();
    this.ensureServiceWorker();
    this.updatePresenceWithWriterStatus();
  }
}

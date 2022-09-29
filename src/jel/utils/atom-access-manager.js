import { EventTarget } from "event-target-shim";
import { getHubIdFromHistory } from "./jel-url-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { signString, verifyString } from "../../hubs/utils/crypto";
import { fromByteArray } from "base64-js";
import FileWriteback from "../writeback/file-writeback";
import GitHubWriteback from "../writeback/github-writeback";
import { META_TAG_PREFIX } from "./dom-utils";

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

export const ROLES = {
  NONE: 0,
  OWNER: 0x80,
  MEMBER: 0x01
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

const MAX_WRITE_RATE_MS = 10000;

export default class AtomAccessManager extends EventTarget {
  constructor() {
    super();

    this.publicKeys = new Map();
    this.roles = new Map();
    this.writeback = null;

    this.init();

    this.lastWriteTime = null;
    this.writeTimeout = null;

    this.refreshOnWritebackOpen = false;

    this.documentIsDirty = false;
    this.remoteUploadResolvers = new Map();
  }

  get isEditingAvailable() {
    if (this.writeback?.isOpen) return false;
    return true;
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

    window.addEventListener("beforeunload", e => {
      if (!this.documentIsDirty) return;
      if (this.hasAnotherWriterInPresence()) return;

      e.preventDefault();
      e.returnValue = "Unsaved changes are still being written. Do you want to leave and lose these changes?";

      if (!isWriting) {
        write(true);
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

  async ensureWritingComplete() {
    while (this.documentIsDirty && this.isMasterWriter()) {
      await new Promise(res => setTimeout(res, 100));
    }
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

    if (this.writeback?.isOpen) {
      return await this.writeback.contentUrlForRelativePath(path);
    } else {
      return path;
    }
  }

  async writeDocument(document, path = null) {
    const html = prettifyXml(new XMLSerializer().serializeToString(document));

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

  async uploadAsset(fileOrBlob, fileName = null) {
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

    window.APP.hubChannel.sendMessage({ id, contents, contentType, name }, "upload_asset_request", clientId);

    return await promise;
  }

  async tryUploadAssetDirectly(fileOrBlob, fileName = null) {
    if (!(await this.ensureWritebackOpen())) return;

    fileName = fileName || this.getFilenameForFileOrBlob(fileOrBlob);
    return await this.writeback.uploadAsset(fileOrBlob, fileName);
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

    const allowUnsavedObjects = window.APP.allowUnsavedObjects;
    const createAndEditRole = window.APP.createAndEditRole;

    if (allowUnsavedObjects) return true;

    if (sessionId !== null && sessionId !== NAF.clientId) {
      return this.roles.get(sessionId) === ROLES.OWNER || createAndEditRole === ROLES.MEMBER;
    } else {
      return this.writeback?.isOpen;
    }
  }

  spaceCan(permission, sessionId = null) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.SPACE].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (sessionId !== null && sessionId !== NAF.clientId) {
      return this.roles.get(sessionId) === ROLES.OWNER;
    }

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

  updatePresenceWithWriterStatus() {
    if (!NAF.connection.presence) return;
    if (!this.writeback?.isOpen) return;
    NAF.connection.presence.setLocalStateField("writer", true);
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
    NAF.connection.subscribeToDataChannel(
      "upload_asset_complete",
      (_type, { body: { url, contentType, id } }, fromSessionId) => {
        if (this.remoteUploadResolvers.has(id)) {
          this.remoteUploadResolvers.get(id)({ url, contentType });
          this.remoteUploadResolvers.delete(id);
        }
      }
    );
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
    if (!NAF.connection.presence?.states) return false;

    for (const [, presence] of NAF.connection.presence.states) {
      const clientId = presence.client_id;
      if (clientId !== NAF.clientId && presence.writer && this.roles.get(clientId) === ROLES.OWNER) {
        return true;
      }
    }

    return false;
  }

  handleWritebackOpened() {
    this.dispatchEvent(new CustomEvent("permissions_updated", {}));
    this.ensurePublicKeyInMetaTags();
    this.updatePresenceWithWriterStatus();
  }
}

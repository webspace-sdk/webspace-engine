import { EventTarget } from "event-target-shim";
import { getSpaceIdFromHistory, getHubIdFromHistory } from "./jel-url-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { signString, verifyString } from "../../hubs/utils/crypto";
import { fromByteArray } from "base64-js";

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
  [ATOM_TYPES.SPACE]: [
    "create_world_hub",
    "create_channel_hub",
    "view_nav",
    "edit_nav",
    "update_space_meta",
    "create_invite",
    "go_home",
    "publish_world_template"
  ],
  [ATOM_TYPES.VOX]: ["view_vox", "edit_vox"]
};

class FileWriteback {
  constructor(db, handle = null) {
    this.handle = handle;
    this.db = db;
    this.isWriting = false;
  }

  async init() {
    if (this.handle) {
      this.handlePerm = await this.handle.queryPermission({ mode: "readwrite" });
    }
  }

  get isOpen() {
    return this.handle && this.handlePerm === "granted";
  }

  get requiresSetup() {
    return this.handle === null;
  }

  async open() {
    if (this.isOpen) return;

    if (this.handle && this.handlePerm === "prompt") {
      await this.handle.requestPermission({ mode: "readwrite" });
      this.handlePerm = await this.handle.queryPermission({ mode: "readwrite" });
    } else {
      const fileParts = document.location.pathname.split("/");

      const containingDir = fileParts[fileParts.length - 2];
      const file = fileParts[fileParts.length - 1];

      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });

      if (dirHandle.name === containingDir) {
        this.handle = null;

        for await (const [key, value] of dirHandle.entries()) {
          if (key === file) {
            this.handle = value;

            const writable = await this.handle.createWritable();
            writable.close();

            this.handlePerm = await this.handle.queryPermission({ mode: "readwrite" });
            break;
          }
        }
      }
    }

    const spaceId = await getSpaceIdFromHistory();

    await this.db
      .transaction("space-file-handles", "readwrite")
      .objectStore("space-file-handles")
      .put({ space_id: spaceId, handle: this.handle });

    await this.db
      .transaction("url-file-handles", "readwrite")
      .objectStore("url-file-handles")
      .put({ url: document.location.href, handle: this.handle });

    return this.isOpen;
  }

  async write(content) {
    if (!this.isOpen) return;

    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }

    this.isWriting = true;

    try {
      const writable = await this.handle.createWritable();
      writable.write(content);
      writable.close();
    } finally {
      this.isWriting = false;
    }
  }

  async close() {
    while (this.isWriting) {
      await new Promise(res => setTimeout(res, 100));
    }

    this.handle = null;
    this.open = false;
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
    this.isEditingAvailable = false;
    this.init();

    this.writeback = null;
    this.lastWriteTime = null;
    this.writeTimeout = null;
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

    waitForDOMContentLoaded().then(() => {
      this.mutationObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true
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
    }

    return result;
  }

  async ensurePublicKeyInMetaTags() {
    const metaTagName = "webspace-owner-public-key";
    const publicKey = JSON.parse(JSON.stringify(window.APP.store.state.credentials.public_key));
    const hubId = await getHubIdFromHistory();
    publicKey.hub_id = hubId;

    const metaTagContent = btoa(JSON.stringify(publicKey));
    let found = false;

    for (const el of [...document.querySelectorAll(`meta[name='${metaTagName}']`)]) {
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
      el.setAttribute("name", metaTagName);
      el.setAttribute("content", metaTagContent);
      document.head.appendChild(el);
    }
  }

  initFileWriteback() {
    const req = indexedDB.open("file-handles", 1);

    req.addEventListener("success", ({ target: { result } }) => {
      const db = result;

      db.transaction("url-file-handles")
        .objectStore("url-file-handles")
        .get(document.location.href)
        .addEventListener("success", async ({ target: { result } }) => {
          const fallthroughToSpaceHandle = () => {
            getSpaceIdFromHistory().then(spaceId => {
              db.transaction("space-file-handles")
                .objectStore("space-file-handles")
                .get(spaceId)
                .addEventListener("success", async ({ target: { result } }) => {
                  if (result) {
                    const handle = result.handle;
                    this.writeback = new FileWriteback(db, handle);
                  } else {
                    this.writeback = new FileWriteback(db);
                  }

                  await this.writeback.init();
                });
            });
          };

          if (result) {
            const handle = result.handle;
            const currentPerm = await handle.queryPermission({ mode: "readwrite" });

            if (currentPerm === "granted") {
              this.isEditingAvailable = false;
            }

            this.writeback = new FileWriteback(db, handle);
            await this.writeback.init();

            if (currentPerm !== "denied") {
              this.dispatchEvent(new CustomEvent("permissions_updated", {}));
            } else {
              fallthroughToSpaceHandle();
            }
          } else {
            fallthroughToSpaceHandle();
          }
        });
    });

    req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
      db.createObjectStore("space-file-handles", { keyPath: "space_id" });
      db.createObjectStore("url-file-handles", { keyPath: "url" });
    });
  }

  setCurrentHubId(hubId) {
    this.currentHubId = hubId;
  }

  hubCan(permission, hubId = null) {
    if (!VALID_PERMISSIONS[ATOM_TYPES.HUB].includes(permission))
      throw new Error(`Invalid permission name: ${permission}`);

    if (hubId === null) {
      hubId = this.currentHubId;
    }

    if (hubId !== null && this.currentHubId !== hubId) return false;

    if (this.writeback?.isOpen) {
      return true;
    }

    return false;
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

  async getChallengeSignature(challenge) {
    const { store } = window.APP;
    const privateKeyJwk = store.state.credentials.private_key;
    const signed = await signString(challenge, privateKeyJwk);
    return fromByteArray(new Uint8Array(signed));
  }

  async verifyChallengeResponse(challenge, publicKey, signature, fromSessionId) {
    if (!(await verifyString(challenge, publicKey, signature))) return;
    this.publicKeys.set(fromSessionId, publicKey);
    this.dispatchEvent(new CustomEvent("permissions_updated", {}));
  }
}

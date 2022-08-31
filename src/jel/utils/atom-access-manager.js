import { EventTarget } from "event-target-shim";
import { getSpaceIdFromHistory } from "./jel-url-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

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

  get ready() {
    return this.handle !== null;
  }

  async configure() {
    const fileParts = document.location.pathname.split("/");

    const containingDir = fileParts[fileParts.length - 2];
    const file = fileParts[fileParts.length - 1];

    const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });

    if (dirHandle.name !== containingDir) {
      return false;
    }

    this.handle = null;

    for await (const [key, value] of dirHandle.entries()) {
      if (key === file) {
        this.handle = value;
        break;
      }
    }

    if (this.handle === null) {
      return false;
    }

    const spaceId = await getSpaceIdFromHistory();

    await this.db
      .transaction("space-file-handles", "readwrite")
      .objectStore("space-file-handles")
      .put({ space_id: spaceId, handle: this.handle });

    const writable = await this.handle.createWritable();
    writable.close();

    return true;
  }

  async write(content) {
    if (this.handle === null) return;

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
      this.mutationObserver.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true
      });
    });
  }

  async configure() {
    const result = await this.writeback.configure();

    if (result) {
      this.dispatchEvent(new CustomEvent("permissions_updated", {}));
    }

    return result;
  }

  initFileWriteback() {
    const req = indexedDB.open("file-handles", 1);

    req.addEventListener("success", ({ target: { result } }) => {
      const db = result;

      getSpaceIdFromHistory().then(spaceId => {
        db.transaction("space-file-handles")
          .objectStore("space-file-handles")
          .get(spaceId)
          .addEventListener("success", async ({ target: { result } }) => {
            if (result) {
              const handle = result.handle;
              const currentPerm = await handle.queryPermission({ mode: "readwrite" });
              console.log("current perm", currentPerm);

              if (currentPerm !== "denied") {
                this.isEditingAvailable = false;
                this.dispatchEvent(new CustomEvent("permissions_updated", {}));

                if (currentPerm === "prompt") {
                  try {
                    await handle.requestPermission({ mode: "readwrite" });
                  } catch (e) {
                    // Wait for user activation
                    await new Promise(res => window.addEventListener("mousedown", res, { once: true }));
                    await handle.requestPermission({ mode: "readwrite" });
                  }

                  // Degrade this session, use a new session to keep filehandle open.
                  window.open(document.location, "_blank");
                  this.dispatchEvent(new CustomEvent("secondary_session_opened"));
                }

                this.writeback = new FileWriteback(db, handle);
                this.dispatchEvent(new CustomEvent("permissions_updated", {}));
              }
            }

            if (this.writeback === null) {
              this.writeback = new FileWriteback(db);
            }
          });
      });
    });

    req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
      db.createObjectStore("space-file-handles", { keyPath: "space_id" });
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

    if (this.writeback?.ready) {
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
}

import { EventTarget } from "event-target-shim";
import { getSpaceIdFromHistory } from "./jel-url-utils";

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

    return true;
  }
}

export default class AtomAccessManager extends EventTarget {
  constructor() {
    super();

    this.isEditingAvailable = false;
    this.init();

    this.writeback = null;
  }

  init() {
    if (document.location.protocol === "file:") {
      this.initFileWriteback();
      this.isEditingAvailable = true;

      // Editing available should be false if this isn't "our" file, and was
      // spawned via an invite.
    }
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
}

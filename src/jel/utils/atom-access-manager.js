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
  constructor(handle = null) {
    this.handle = handle;
  }

  get ready() {
    return this.handle !== null;
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

  initFileWriteback() {
    const dirPath = document.location.pathname.substring(0, document.location.pathname.lastIndexOf("/"));
    const fileParts = document.location.pathname.split("/");

    const containingDir = fileParts[fileParts.length - 2];
    const file = fileParts[fileParts.length - 1];
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
              if (handle.queryPermission({ mode: "readwrite" }).state === "granted") {
                await handle.requestPermission({ mode: "readwrite" });
                this.writeback = new FileWriteback(handle);
                this.dispatchEvent(new CustomEvent("permissions_updated", {}));
              }
            }

            if (this.writeback === null) {
              this.writeback = new FileWriteback();
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

  isEditingAvailable() {
    return true;
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

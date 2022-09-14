import { EventTarget } from "event-target-shim";

export default class SpaceChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
  }

  trashHubs(hub_ids) {
    this.channel.push("trash_hubs", { hub_ids });
  }

  restoreHubs(hub_ids) {
    this.channel.push("restore_hubs", { hub_ids });
  }

  removeHubs(hub_ids) {
    this.channel.push("remove_hubs", { hub_ids });
  }

  updateOpenVoxIds = voxIds => {
    if (this.channel) {
      this.channel.push("update_open_vox_ids", { vox_ids: voxIds });
    }
  };
}

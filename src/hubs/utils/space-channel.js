import { EventTarget } from "event-target-shim";

export default class SpaceChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
  }

  updateOpenVoxIds = voxIds => {
    if (this.channel) {
      this.channel.push("update_open_vox_ids", { vox_ids: voxIds });
    }
  };
}

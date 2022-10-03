import { EventTarget } from "event-target-shim";

export default class AccountChannel extends EventTarget {
  constructor(store) {
    super();
    this.memberships = [];
    this.hubSettings = [];
    this.store = store;
  }

  fetchVoxPermsToken = voxId => {
    return new Promise((resolve, reject) => {
      this.channel
        .push("refresh_vox_perms_token", { vox_id: voxId })
        .receive("ok", res => {
          resolve({ permsToken: res.perms_token });
        })
        .receive("error", reject);
    });
  };

  getVoxMetas(voxIds) {
    return new Promise(res => {
      this.channel.push("get_vox_metas", { vox_ids: [...voxIds] }).receive("ok", ({ vox }) => res(vox));
    });
  }

  subscribeToVox = voxId => {
    // TODO VOX
  };

  unsubscribeFromVox = voxId => {
    // TODO VOX
  };

  markVoxEdited = voxId => {
    // TODO VOX
  };

  publishVox = (
    voxId,
    collection,
    category,
    stackAxis,
    stackSnapPosition,
    stackSnapScale,
    scale,
    thumbFileId,
    previewFileId
  ) => {
    // TODO VOX
    return new Promise(res => {
      this.channel
        .push("publish_vox", {
          vox_id: voxId,
          collection,
          category,
          stack_axis: stackAxis,
          stack_snap_position: stackSnapPosition,
          stack_snap_scale: stackSnapScale,
          scale,
          thumb_file_id: thumbFileId,
          preview_file_id: previewFileId
        })
        .receive("ok", async ({ published_to_vox_id: publishedVoxId }) => {
          res(publishedVoxId);
        });
    });
  };

  getExistingBakedVox = (voxId, hubId) => {
    return new Promise(res => {
      this.channel
        .push("get_existing_baked_vox", { vox_id: voxId, hub_id: hubId })
        .receive("ok", async ({ baked_vox_id: bakedVoxId }) => {
          res(bakedVoxId);
        });
    });
  };

  getExportableVox = voxId => {
    return new Promise(res => {
      this.channel
        .push("get_exportable_vox", { vox_id: voxId })
        .receive("ok", async ({ exportable_vox_id: exportableVoxId }) => {
          res(exportableVoxId);
        });
    });
  };

  updateVox = (voxId, newVoxFields) => {
    if (!this.channel) return;
    const { atomAccessManager, voxMetadata } = window.APP;
    const canUpdateVoxMeta = atomAccessManager.voxCan("edit_vox", voxId);
    if (!canUpdateVoxMeta) return "unauthorized";
    this.channel.push("update_vox", { ...newVoxFields, vox_id: voxId });
    voxMetadata.localUpdate(voxId, newVoxFields);
  };
}

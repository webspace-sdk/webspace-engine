import {EventTarget} from "event-target-shim";

export default class AccountChannel extends EventTarget {
  constructor(store) {
    super();
    this.memberships = [];
    this.hubSettings = [];
    this.store = store;
  }

  //  publishVox = (
  //    voxId,
  //    collection,
  //    category,
  //    stackAxis,
  //    stackSnapPosition,
  //    stackSnapScale,
  //    scale,
  //    thumbFileId,
  //    previewFileId
  //  ) => {
  //    return new Promise(res => {
  //      this.channel
  //        .push("publish_vox", {
  //          vox_id: voxId,
  //          collection,
  //          category,
  //          stack_axis: stackAxis,
  //          stack_snap_position: stackSnapPosition,
  //          stack_snap_scale: stackSnapScale,
  //          scale,
  //          thumb_file_id: thumbFileId,
  //          preview_file_id: previewFileId
  //        })
  //        .receive("ok", async ({ published_to_vox_id: publishedVoxId }) => {
  //          res(publishedVoxId);
  //        });
  //    });
  //  };
}

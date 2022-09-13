import { EventTarget } from "event-target-shim";

export default class DynaChannel extends EventTarget {
  constructor(store, navTree) {
    super();
    this.store = store;
    this.flushSpaceMetaTimeout = null;
  }

  getSpaceMetas(/*spaceIds*/) {
    // TODO shared
    //return new Promise(res => {
    //  this.channel.push("get_space_metas", { space_ids: [...spaceIds] }).receive("ok", ({ spaces }) => res(spaces));
    //});
  }

  updateSpace = (spaceId, newSpaceFields) => {
    // TODO SHARED
    const spaceMetadata = window.APP.spaceMetadata;
    const canUpdateSpaceMeta = spaceMetadata.can("update_space_meta", spaceId);
    if (!canUpdateSpaceMeta) return "unauthorized";
    spaceMetadata.localUpdate(spaceId, newSpaceFields);

    if (this.flushSpaceMetatimeout) clearTimeout(this.flushSpaceMetatimeout);

    this.flushSpaceMetaTimeout = setTimeout(() => {
      spaceMetadata.flushLocalUpdates();
    }, 3000);
  };
}

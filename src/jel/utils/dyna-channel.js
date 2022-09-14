import { EventTarget } from "event-target-shim";

export default class DynaChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this.flushSpaceMetaTimeout = null;
  }

  updateSpace = (spaceId, newSpaceFields) => {
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

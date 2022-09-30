import { EventTarget } from "event-target-shim";

export default class DynaChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
    this.flushSpaceMetaTimeout = null;
  }

  updateSpace = (spaceId, newSpaceFields) => {
    const { spaceMetadata, atomAccessManager } = window.APP;
    const canUpdateSpaceMeta = atomAccessManager.spaceCan("update_space_meta");
    if (!canUpdateSpaceMeta) return "unauthorized";
    spaceMetadata.localUpdate(spaceId, newSpaceFields);

    if (this.flushSpaceMetatimeout) clearTimeout(this.flushSpaceMetatimeout);

    this.flushSpaceMetaTimeout = setTimeout(() => {
      spaceMetadata.flushLocalUpdates();
    }, 3000);
  };
}

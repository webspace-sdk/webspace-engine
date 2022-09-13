import { EventTarget } from "event-target-shim";

export default class DynaChannel extends EventTarget {
  constructor(store) {
    super();
    this.store = store;
  }

  get signedIn() {
    return this._signedIn;
  }

  getSpaceMetas(/*spaceIds*/) {
    // TODO shared
    //return new Promise(res => {
    //  this.channel.push("get_space_metas", { space_ids: [...spaceIds] }).receive("ok", ({ spaces }) => res(spaces));
    //});
  }

  updateSpace = (spaceId, newSpaceFields) => {
    // TODO SHARED
    if (!this.channel) return;
    const spaceMetadata = window.APP.spaceMetadata;
    const canUpdateSpaceMeta = spaceMetadata.can("update_space_meta", spaceId);
    if (!canUpdateSpaceMeta) return "unauthorized";
    if (newSpaceFields.roles && !canUpdateSpaceMeta) return "unauthorized";
    this.channel.push("update_space", { ...newSpaceFields, space_id: spaceId });
    spaceMetadata.localUpdate(spaceId, newSpaceFields);
  };
}

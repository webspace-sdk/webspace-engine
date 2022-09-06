// Brief overview of client authorization can be found in the wiki:
// https://github.com/mozilla/hubs/wiki/Hubs-authorization
export function canMove(el) {
  const isHoldableButton = el.components.tags && el.components.tags.data.holdableButton;
  const mediaLoader = el.components["media-loader"];
  const isMedia = !!mediaLoader;
  const canMove = window.APP.atomAccessManager.hubCan("spawn_and_move_media");
  const isLocked = mediaLoader && mediaLoader.data.locked;
  return isHoldableButton || (isMedia && canMove && !isLocked);
}

export function canCloneOrSnapshot(el) {
  const isHoldableButton = el.components.tags && el.components.tags.data.holdableButton;
  const mediaLoader = el.components["media-loader"];
  const isMedia = !!mediaLoader;
  const canSpawn = window.APP.atomAccessManager.hubCan("spawn_and_move_media");
  return isHoldableButton || (isMedia && canSpawn);
}

export function showHoverEffect(el) {
  const isMedia = !!el.components["media-loader"];
  return isMedia && canMove(el);
}

export function gatePermissionPredicate(predicate) {
  if (predicate) return true;

  if (window.APP.atomAccessManager.isEditingAvailable) {
    AFRAME.scenes[0].emit("action_open_writeback");
  }

  return false;
}

export function gatePermission(permission) {
  const hasPerm = window.APP.atomAccessManager.hubCan(permission);
  return gatePermissionPredicate(hasPerm);
}

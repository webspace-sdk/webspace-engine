AFRAME.registerSystem("permissions", {
  onPermissionsUpdated(handler) {
    window.APP.atomAccessManager.addEventListener("permissions_updated", handler);
  },
  can(permissionName) {
    return !!window.APP.atomAccessManager.hubCan(permissionName);
  }
});

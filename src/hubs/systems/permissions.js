AFRAME.registerSystem("permissions", {
  onPermissionsUpdated(handler) {
    window.APP.hubChannel.addEventListener("permissions_updated", handler);
  },
  can(permissionName) {
    return !!window.APP.hubChannel.can(permissionName);
  },
  fetchPermissions() {
    return window.APP.hubChannel.fetchPermissions();
  }
});

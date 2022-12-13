AFRAME.registerComponent("visible-if-permitted", {
  schema: {
    type: "string"
  },
  init() {
    this.updateVisibility = this.updateVisibility.bind(this);
    this.updateVisibility();
    window.APP.atomAccessManager.addEventListener("permissions_updated", this.updateVisibility);
  },
  updateVisibility() {
    this.el.object3D.visible = this.el.sceneEl.systems.permissions.can(this.data);
  },
  remove() {
    window.APP.atomAccessManager.removeEventListener("permissions_updated", this.updateVisibility);
  }
});

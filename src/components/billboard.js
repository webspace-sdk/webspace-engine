// Billboard component that only updates visible objects and only those in the camera view on mobile VR.
AFRAME.registerComponent("billboard", {
  init: function() {
    this.target = new THREE.Vector3();
    this._updateBillboard = this._updateBillboard.bind(this);
  },

  tick() {
    this._updateBillboard();
  },

  _updateBillboard: function() {
    if (!this.el.object3D.visible) return;

    const camera = this.el.sceneEl.camera;
    const object3D = this.el.object3D;

    if (camera) {
      // Set the camera world position as the target.
      this.target.setFromMatrixPosition(camera.matrixWorld);
      object3D.lookAt(this.target);
      object3D.matrixNeedsUpdate = true;
    }
  }
});

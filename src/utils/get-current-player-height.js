export const getCurrentPlayerHeight = (function() {
  let avatarPOV;
  let avatarRig;
  return function getCurrentPlayerHeight(world) {
    avatarPOV = avatarPOV || DOM_ROOT.getElementById("avatar-pov-node");
    avatarRig = avatarRig || DOM_ROOT.getElementById("avatar-rig");
    avatarRig.object3D.updateMatrices();
    avatarPOV.object3D.updateMatrices();
    if (world) {
      return avatarPOV.object3D.matrixWorld.elements[13] - avatarRig.object3D.matrixWorld.elements[13];
    }
    return avatarPOV.object3D.matrix.elements[13];
  };
})();

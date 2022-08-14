import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import { almostEqualQuaternion } from "../../hubs/utils/three-utils";

const fromQuaternion = new THREE.Quaternion();
const lookAtMatrix = new THREE.Matrix4();
const toQuaternion = new THREE.Quaternion();
const newQuaternion = new THREE.Quaternion();

const avatarPos = new THREE.Vector3();
const targetPos = new THREE.Vector3();
const { Quaternion } = THREE;

AFRAME.registerComponent("look-at-self", {
  init() {
    this.bodyHelper = null;
    this.avatarPovNode = null;

    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPovNode = DOM_ROOT.querySelector("#avatar-pov-node");
    });
  },

  tick(t, dt) {
    if (!this.avatarPovNode) return;

    if (!this.bodyHelper) {
      const bodyHelper = this.el.components["body-helper"];
      if (!bodyHelper) return;
      this.bodyHelper = bodyHelper;
    }

    const { el, bodyHelper, avatarPovNode } = this;
    const { type } = bodyHelper.data;

    if (type === "kinematic") {
      // Lerp to look at avatar
      const target = el.object3D;
      const avatar = avatarPovNode.object3D;

      // Note: presumes target has no parent
      avatar.getWorldPosition(avatarPos);
      target.getWorldPosition(targetPos);
      target.getWorldQuaternion(fromQuaternion);

      lookAtMatrix.lookAt(avatarPos, targetPos, target.up);
      toQuaternion.setFromRotationMatrix(lookAtMatrix);

      Quaternion.slerp(fromQuaternion, toQuaternion, newQuaternion, (dt * 8) / 1000);

      if (!almostEqualQuaternion(newQuaternion, fromQuaternion)) {
        target.quaternion.copy(newQuaternion);
        target.matrixNeedsUpdate = true;
      }
    }
  }
});

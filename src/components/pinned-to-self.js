import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import { almostEqualVec3 } from "../utils/three-utils";

const tmpAvatarPos = new THREE.Vector3();
const tmpTargetPos = new THREE.Vector3();

AFRAME.registerComponent("pinned-to-self", {
  init() {
    this.bodyHelper = null;
    this.offset = null;
    this.avatarPovNode = null;
    this.previousBodyType = null;

    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPovNode = DOM_ROOT.querySelector("#avatar-pov-node");
    });
  },

  tick() {
    if (!this.avatarPovNode) return;

    if (!this.bodyHelper) {
      const bodyHelper = this.el.components["body-helper"];
      if (!bodyHelper) return;
      this.bodyHelper = bodyHelper;
    }

    const { el, bodyHelper, offset, previousBodyType, avatarPovNode } = this;
    const { type } = bodyHelper.data;

    if (previousBodyType === null) {
      this.previousBodyType = type;
      return;
    }

    let setOffset = false;
    let snapToOffset = false;

    if (type === "kinematic") {
      if (offset === null || previousBodyType === "dynamic") {
        setOffset = true;
      } else {
        snapToOffset = true;
      }
    }

    if (setOffset) {
      avatarPovNode.object3D.getWorldPosition(tmpAvatarPos);
      el.object3D.getWorldPosition(tmpTargetPos);

      if (offset === null) {
        this.offset = new THREE.Vector3();
      }

      this.offset.subVectors(tmpTargetPos, tmpAvatarPos);
    } else if (snapToOffset) {
      avatarPovNode.object3D.getWorldPosition(tmpAvatarPos);
      tmpTargetPos.addVectors(tmpAvatarPos, offset);

      if (!almostEqualVec3(el.object3D.position, tmpTargetPos)) {
        el.object3D.position.copy(tmpTargetPos);
        el.object3D.matrixNeedsUpdate = true;
      }
    }

    this.previousBodyType = type;
  }
});

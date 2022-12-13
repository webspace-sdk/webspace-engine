const COLLISION_LAYERS = require("../constants-2").COLLISION_LAYERS;
import {isMine, isSynchronized} from "../utils/ownership-utils";

AFRAME.registerComponent("set-unowned-body-kinematic", {
  init() {
    this.setBodyKinematic = this.setBodyKinematic.bind(this);
  },
  play() {
    this.el.addEventListener("ownership-lost", this.setBodyKinematic);

    if (!this.didThisOnce) {
      // Do this in play instead of init so that the ammo-body and networked components are done
      this.didThisOnce = true;

      if (!isSynchronized(this.el) || !isMine(this.el)) {
        this.setBodyKinematic();
      }
    }
  },
  pause() {
    this.el.removeEventListener("ownership-lost", this.setBodyKinematic);
  },
  setBodyKinematic() {
    const collisionFilterGroup = this.el.components["body-helper"].data.collisionFilterGroup;

    if (collisionFilterGroup === COLLISION_LAYERS.INTERACTABLES) {
      this.el.setAttribute("body-helper", {
        type: "kinematic",
        collisionFilterMask: COLLISION_LAYERS.UNOWNED_INTERACTABLE
      });
    } else {
      this.el.setAttribute("body-helper", {
        type: "kinematic"
      });
    }

    if (this.el.components["floaty-object"]) {
      this.el.components["floaty-object"].locked = true;
    }
  }
});

import { paths } from "./userinput/paths";
import { applyNativePoseToCamera } from "../utils/pose-updates";

const rotatePitchAndYaw = (function() {
  const opq = new THREE.Quaternion();
  const owq = new THREE.Quaternion();
  const oq = new THREE.Quaternion();
  const pq = new THREE.Quaternion();
  const yq = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  const right = new THREE.Vector3();
  const v = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  return function rotatePitchAndYaw(o, p, y) {
    o.parent.updateMatrices();
    o.updateMatrices();
    o.parent.getWorldQuaternion(opq);
    o.getWorldQuaternion(owq);
    oq.copy(o.quaternion);
    v.set(0, 1, 0).applyQuaternion(oq);
    const initialUpDot = v.dot(UP);
    v.set(0, 0, 1).applyQuaternion(oq);
    const initialForwardDotUp = Math.abs(v.dot(UP));
    right.set(1, 0, 0).applyQuaternion(owq);
    pq.setFromAxisAngle(right, p);
    yq.setFromAxisAngle(UP, y);

    q.copy(owq)
      .premultiply(pq)
      .premultiply(yq)
      .premultiply(opq.invert());
    v.set(0, 1, 0).applyQuaternion(q);
    const newUpDot = v.dot(UP);
    v.set(0, 0, 1).applyQuaternion(q);
    const newForwardDotUp = Math.abs(v.dot(UP));
    // Ensure our pitch is in an accepted range and our head would not be flipped upside down
    if ((newForwardDotUp > 0.9 && newForwardDotUp > initialForwardDotUp) || (newUpDot < 0 && newUpDot < initialUpDot)) {
      // TODO: Apply a partial rotation that does not exceed the bounds for nicer UX
      return;
    } else {
      o.quaternion.copy(q);
      o.matrixNeedsUpdate = true;
      o.updateMatrices();
    }
  };
})();

AFRAME.registerComponent("camera-rotator", {
  init() {
    this.on = true;
    this.el.sceneEl.systems["hubs-systems"].cameraRotatorSystem.register(this.el);
  },

  remove() {
    this.el.sceneEl.systems["hubs-systems"].cameraRotatorSystem.unregister(this.el);
  }
});

let scenePreviewNode;

export class CameraRotatorSystem {
  constructor(scene) {
    this.scene = scene;
    this.els = [];

    this.pendingXRotation = 0;
    this.scene.addEventListener("rotateX", e => (this.pendingXRotation += e.detail));
  }

  register(el) {
    this.els.push(el);
  }

  unregister(el) {
    this.els.splice(this.els.indexOf(el), 1);
  }

  tick = (function() {
    return function() {
      const { scene } = this;
      const userinput = scene.systems.userinput;
      scenePreviewNode = scenePreviewNode || DOM_ROOT.getElementById("scene-preview-node");
      const lobby = !scene.is("entered");
      let rotated = false;

      const cameraDelta = userinput.get(lobby ? paths.actions.lobbyCameraDelta : paths.actions.cameraDelta);

      for (let i = 0; i < this.els.length; i++) {
        const el = this.els[i];
        const rotator = el.components["camera-rotator"];
        if (!rotator.on) continue;

        const camera = el.getObject3D("camera") || el.object3D;

        if (window.Native) {
          applyNativePoseToCamera(camera);
          rotated = true;
        } else {
          if (cameraDelta) {
            rotated = true;
            rotatePitchAndYaw(camera, this.pendingXRotation + cameraDelta[1], cameraDelta[0]);
          } else if (this.pendingXRotation) {
            rotated = true;
            rotatePitchAndYaw(camera, this.pendingXRotation, 0);
          }
        }

        if (rotated) {
          camera.matrixNeedsUpdate = true;
          camera.updateMatrices();
        }
      }
    };
  })();
}

import { RENDER_ORDER } from "../../hubs/constants";
import { paths } from "../../hubs/systems/userinput/paths";

const wPos = new THREE.Vector3();
const wRot = new THREE.Quaternion();

export const GUIDE_PLANE_MODES = {
  DISABLED: 0,
  Z: 1,
  Y: 2,
  X: 3,
  CAMERA: 4
};

const MAX_GUIDE_PLANE_MODE = 4;

// Draws 3D world gizmos
export class HelpersSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;

    // Visualization plane used for assisting with object placement
    this.guidePlaneMesh = new THREE.Mesh(
      new THREE.CircleGeometry(3, 64),
      new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilRef: 1,
        stencilZPass: THREE.ReplaceStencilOp,
        opacity: 0.2
      })
    );

    this.transformSystem = sceneEl.systems["transform-selected-object"];
    this.scaleSystem = sceneEl.systems["scale-object"];
    this.interaction = sceneEl.systems.interaction;

    this.guidePlane = new THREE.Group();
    this.guidePlane.add(this.guidePlaneMesh);
    this.guidePlane.renderOrder = RENDER_ORDER.HELPERS;
    this.guidePlaneMode = GUIDE_PLANE_MODES.DISABLED;
    this.guidePlaneEl = null;

    sceneEl.object3D.add(this.guidePlane);
  }

  setGuidePlaneMode(mode) {
    this.guidePlaneMesh.material.visible = mode !== GUIDE_PLANE_MODES.DISABLED;
    this.guidePlaneMode = mode;

    switch (this.guidePlaneMode) {
      case GUIDE_PLANE_MODES.Z:
        this.guidePlaneMesh.rotation.x = 0;
        this.guidePlaneMesh.rotation.y = 0;
        break;
      case GUIDE_PLANE_MODES.Y:
        this.guidePlaneMesh.rotation.x = Math.PI / 2.0;
        this.guidePlaneMesh.rotation.y = 0;
        break;
      case GUIDE_PLANE_MODES.X:
        this.guidePlaneMesh.rotation.x = 0;
        this.guidePlaneMesh.rotation.y = Math.PI / 2.0;
        break;
      case GUIDE_PLANE_MODES.CAMERA:
        // Aligned with camera
        this.sceneEl.camera.getWorldQuaternion(wRot);
        this.guidePlaneMesh.quaternion.copy(wRot);
        break;
    }

    this.guidePlaneMesh.matrixNeedsUpdate = true;
  }

  cycleGuidePlaneMode(direction) {
    let newMode = this.guidePlaneMode + direction;
    newMode = newMode < 0 ? MAX_GUIDE_PLANE_MODE : newMode % (MAX_GUIDE_PLANE_MODE + 1);

    this.setGuidePlaneMode(newMode);
  }

  tick() {
    const { userinput } = this.sceneEl.systems;

    const held =
      this.interaction.state.leftHand.held ||
      this.interaction.state.rightHand.held ||
      this.interaction.state.rightRemote.held ||
      this.interaction.state.leftRemote.held;

    const target = (held && held.object3D) || (!this.scaleSystem.isScaling && this.transformSystem.target);

    if (target) {
      this.guidePlaneMesh.material.visible = this.guidePlaneMode !== GUIDE_PLANE_MODES.DISABLED;
    } else {
      this.guidePlaneMesh.material.visible = false;
    }

    if (userinput.get(paths.actions.nextGuidePlaneMode)) {
      this.cycleGuidePlaneMode(1);
    } else if (userinput.get(paths.actions.prevGuidePlaneMode)) {
      this.cycleGuidePlaneMode(-1);
    }

    if (!this.guidePlaneMesh.material.visible) return;

    target.getWorldPosition(wPos);
    this.guidePlane.position.copy(wPos);

    if (this.guidePlaneMode !== GUIDE_PLANE_MODES.CAMERA) {
      target.getWorldQuaternion(wRot);
      this.guidePlane.quaternion.copy(wRot);
    }

    this.guidePlane.matrixNeedsUpdate = true;
  }
}

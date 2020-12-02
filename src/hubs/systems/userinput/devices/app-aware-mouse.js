import { sets } from "../sets";
import { paths } from "../paths";
import { Pose } from "../pose";
import { findRemoteHoverTarget } from "../../interactions";
import { getNetworkedTemplate } from "../../../../jel/utils/ownership-utils";
import { canMove } from "../../../utils/permissions-utils";

const wKeyPath = paths.device.keyboard.key("w");
const aKeyPath = paths.device.keyboard.key("a");
const sKeyPath = paths.device.keyboard.key("s");
const dKeyPath = paths.device.keyboard.key("d");
const shiftKeyPath = paths.device.keyboard.key("shift");
const upKeyPath = paths.device.keyboard.key("arrowup");
const downKeyPath = paths.device.keyboard.key("arrowdown");
const leftKeyPath = paths.device.keyboard.key("arrowleft");
const rightKeyPath = paths.device.keyboard.key("arrowright");

const calculateCursorPose = function(camera, coords, origin, direction, cursorPose) {
  camera.updateMatrices();
  origin.setFromMatrixPosition(camera.matrixWorld);
  direction
    .set(coords[0], coords[1], 0.5)
    .unproject(camera)
    .sub(origin)
    .normalize();
  cursorPose.fromOriginAndDirection(origin, direction);
  return cursorPose;
};

export class AppAwareMouseDevice {
  constructor() {
    this.prevButtonLeft = false;
    this.clickedOnAnything = false;
    this.lockClickCoordDelta = [0, 0];
    this.transformStartCoordDelta = [0, 0];
    this.prevCoords = [Infinity, Infinity];
    this.cursorPose = new Pose();
    this.prevCursorPose = new Pose();
    this.origin = new THREE.Vector3();
    this.prevOrigin = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.prevDirection = new THREE.Vector3();
    this.transformSystem = null;
  }

  write(frame) {
    this.prevCursorPose.copy(this.cursorPose);
    this.prevOrigin.copy(this.origin);
    this.prevDirection.copy(this.prevDirection);

    if (!this.cursorController) {
      const rightCursorController = document.getElementById("right-cursor-controller");

      if (rightCursorController && rightCursorController.components) {
        this.cursorController = rightCursorController.components["cursor-controller"];
      }
    }

    if (!this.camera) {
      const viewingCamera = document.getElementById("viewing-camera");

      if (viewingCamera && viewingCamera.components) {
        this.camera = viewingCamera.components.camera.camera;
      }
    }

    const buttonLeft = frame.get(paths.device.mouse.buttonLeft);
    const buttonRight = frame.get(paths.device.mouse.buttonRight);
    const mouseLookKey = frame.get(shiftKeyPath);
    const userinput = AFRAME.scenes[0].systems.userinput;

    if (buttonLeft && !this.prevButtonLeft && this.cursorController) {
      const rawIntersections = [];
      this.cursorController.raycaster.intersectObjects(
        AFRAME.scenes[0].systems["hubs-systems"].cursorTargettingSystem.targets,
        true,
        rawIntersections
      );
      const intersection = rawIntersections.find(x => x.object.el);
      const remoteHoverTarget = intersection && findRemoteHoverTarget(intersection.object);
      const isInteractable =
        intersection &&
        intersection.object.el.matches(
          ".interactable, .interactable *, .occupiable-waypoint-icon, .teleport-waypoint-icon"
        );
      const template = remoteHoverTarget && getNetworkedTemplate(remoteHoverTarget);
      const isStaticControlledMedia = template && template === "#static-controlled-media";
      const isStaticMedia = template && template === "#static-media";
      this.clickedOnAnything =
        (isInteractable &&
          (remoteHoverTarget && canMove(remoteHoverTarget)) &&
          !isStaticControlledMedia &&
          !isStaticMedia) ||
        userinput.activeSets.includes(sets.rightCursorHoldingPen) ||
        userinput.activeSets.includes(sets.rightCursorHoldingInteractable) ||
        userinput.activeSets.includes(sets.rightCursorHoldingCamera);
    }
    this.prevButtonLeft = buttonLeft;

    if (!buttonLeft) {
      this.clickedOnAnything = false;
    }

    const lockedMode = !!document.pointerLockElement;

    this.transformSystem = this.transformSystem || AFRAME.scenes[0].systems["transform-selected-object"];
    this.scaleSystem = this.transformSystem || AFRAME.scenes[0].systems["scale-object"];
    this.cameraSystem = this.cameraSystem || AFRAME.scenes[0].systems["hubs-systems"].cameraSystem;
    const isTransforming =
      (this.transformSystem && this.transformSystem.transforming) ||
      (this.scalingSystem && this.scalingSystem.isScaling);

    // Reset gaze cursor to center if user moves or clicks on environment
    if (lockedMode) {
      // HACK, can't read character acceleration yet here, so just look at keys (which are added before mouse.)
      const isMoving =
        userinput.get(wKeyPath) ||
        userinput.get(aKeyPath) ||
        userinput.get(sKeyPath) ||
        userinput.get(dKeyPath) ||
        userinput.get(upKeyPath) ||
        userinput.get(downKeyPath) ||
        userinput.get(leftKeyPath) ||
        userinput.get(rightKeyPath);

      if (!this.clickedOnAnything && (buttonLeft || isMoving)) {
        this.lockClickCoordDelta[0] = 0;
        this.lockClickCoordDelta[1] = 0;
      }
    }

    const movementXY = frame.get(paths.device.mouse.movementXY);
    const movementXScreen = movementXY[0] / 1000.0;
    const movementYScreen = -movementXY[1] / 1000.0;

    if (lockedMode && (this.clickedOnAnything || isTransforming)) {
      this.lockClickCoordDelta[0] += movementXScreen;
      this.lockClickCoordDelta[1] += movementYScreen;

      if (isTransforming) {
        this.transformStartCoordDelta[0] += movementXScreen;
        this.transformStartCoordDelta[1] += movementYScreen;
      }
    }

    if (lockedMode && !isTransforming) {
      // Return cursor to original position before transforming began.
      if (this.transformStartCoordDelta[0] !== 0 || this.transformStartCoordDelta[0] !== 0) {
        this.lockClickCoordDelta[0] -= this.transformStartCoordDelta[0];
        this.lockClickCoordDelta[1] -= this.transformStartCoordDelta[1];
      }

      this.transformStartCoordDelta[0] = 0;
      this.transformStartCoordDelta[1] = 0;
    }

    // Move camera out of lock mode on RMB, or, in lock mode, when not holding something or
    // when holding something after panning past a certain FOV angle.
    const shouldMoveCamera =
      buttonRight ||
      (mouseLookKey && !isTransforming) ||
      (lockedMode && !this.clickedOnAnything && !isTransforming) ||
      (lockedMode &&
        (Math.abs(this.lockClickCoordDelta[0]) > 0.2 || Math.abs(this.lockClickCoordDelta[1]) > 0.2) &&
        !isTransforming) ||
      !this.cameraSystem.isInAvatarView();

    const coords = frame.get(paths.device.mouse.coords);

    if (this.prevCoords[0] !== Infinity) {
      const dCoordX = coords[0] - this.prevCoords[0];
      const dCoordY = coords[1] - this.prevCoords[1];

      if (shouldMoveCamera) {
        if (lockedMode) {
          frame.setVector2(
            paths.actions.cameraDelta,
            movementXScreen * -Math.PI,
            movementYScreen * ((2 * Math.PI) / 3)
          );
        } else {
          if (buttonRight || mouseLookKey) {
            window.APP.store.handleActivityFlag("rightDrag"); // Unfortunate naming :(
          }
          frame.setVector2(paths.actions.cameraDelta, dCoordX * -Math.PI, dCoordY * ((2 * Math.PI) / 3));
        }
      }
    }

    this.prevCoords[0] = coords[0];
    this.prevCoords[1] = coords[1];

    if (this.camera) {
      if (lockedMode) {
        frame.setPose(
          paths.device.smartMouse.cursorPose,
          calculateCursorPose(this.camera, this.lockClickCoordDelta, this.origin, this.direction, this.cursorPose)
        );
      } else {
        frame.setPose(
          paths.device.smartMouse.cursorPose,
          calculateCursorPose(this.camera, coords, this.origin, this.direction, this.cursorPose)
        );
      }
    }
  }
}

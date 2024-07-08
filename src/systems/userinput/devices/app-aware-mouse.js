import { sets } from "../sets";
import { paths } from "../paths";
import { Pose } from "../pose";
import { findRemoteHoverTarget } from "../../interactions";
import { getNetworkedTemplate } from "../../../utils/ownership-utils";
import { canMove } from "../../../utils/permissions-utils";
import {
  CURSOR_LOCK_STATES,
  HAS_ANNOYING_CURSOR_LOCK_POPUP,
  getCursorLockState,
  getLastKnownUnlockedCursorCoords,
  beginEphemeralCursorLock,
  beginPersistentCursorLock,
  releaseEphemeralCursorLock,
  isCursorLocked,
  isInEditableField
} from "../../../utils/dom-utils";

const wKeyPath = paths.device.keyboard.key("w");
const aKeyPath = paths.device.keyboard.key("a");
const sKeyPath = paths.device.keyboard.key("s");
const dKeyPath = paths.device.keyboard.key("d");
const spaceKeyPath = paths.device.keyboard.key(" ");
const shiftKeyPath = paths.device.keyboard.key("shift");
const tabKeyPath = paths.device.keyboard.key("tab");
const upKeyPath = paths.device.keyboard.key("arrowup");
const downKeyPath = paths.device.keyboard.key("arrowdown");
const leftKeyPath = paths.device.keyboard.key("arrowleft");
const rightKeyPath = paths.device.keyboard.key("arrowright");
const anyKeyPath = paths.device.keyboard.any;

const HIDE_CURSOR_AFTER_IDLE_MS = 2000.0;

const calculateCursorPose = function(camera, cursorX, cursorY, origin, direction, cursorPose) {
  camera.updateMatrices();
  origin.setFromMatrixPosition(camera.matrixWorld);

  direction.set(cursorX, cursorY, -0.5);
  SYSTEMS.cameraSystem.unprojectCameraOn(direction);
  direction.sub(origin).normalize();

  cursorPose.fromOriginAndDirection(origin, direction);
  return cursorPose;
};

export class AppAwareMouseDevice {
  constructor() {
    this.prevButtonRight = false;
    this.prevGrabKey = false;
    this.isGrabbingForMove = false;
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
    this.hideCursorAfterIdleTime = Infinity;
  }

  write(frame) {
    this.prevCursorPose.copy(this.cursorPose);
    this.prevOrigin.copy(this.origin);
    this.prevDirection.copy(this.prevDirection);

    if (!this.cursorController) {
      const rightCursorController = DOM_ROOT.getElementById("right-cursor-controller");

      if (rightCursorController && rightCursorController.components) {
        this.cursorController = rightCursorController.components["cursor-controller"];
      }
    }

    if (!this.camera) {
      const viewingCamera = DOM_ROOT.getElementById("viewing-camera");

      if (viewingCamera && viewingCamera.components) {
        this.camera = viewingCamera.components.camera.camera;
      }
    }

    this.transformSystem = this.transformSystem || AFRAME.scenes[0].systems["transform-selected-object"];
    this.scaleSystem = this.scaleSystem || AFRAME.scenes[0].systems["scale-object"];
    const isTransforming =
      !!(this.transformSystem && this.transformSystem.transforming) ||
      !!(this.scaleSystem && this.scaleSystem.isScaling);

    const isGrabTransforming = this.transformSystem.isGrabTransforming();
    const isSnappableTransforming = this.transformSystem.isSnappableTransforming();
    const isNonGrabTransforming = isTransforming && !isGrabTransforming;

    const { cameraSystem, cursorTargettingSystem } = SYSTEMS;
    const buttonLeft = frame.get(paths.device.mouse.buttonLeft);
    const buttonMiddle = frame.get(paths.device.mouse.buttonMiddle);
    const buttonRight = frame.get(paths.device.mouse.buttonRight);
    const inspectPanKey = frame.get(spaceKeyPath);
    const mouseLookKey = frame.get(shiftKeyPath) && !isInEditableField() && !isSnappableTransforming;
    const grabKey = frame.get(tabKeyPath);
    const userinput = AFRAME.scenes[0].systems.userinput;

    if (((buttonRight && !this.prevButtonRight) || (grabKey && !this.prevGrabKey)) && this.cursorController) {
      const rawIntersections = [];
      this.cursorController.raycaster.intersectObjects(cursorTargettingSystem.targets, true, rawIntersections);
      const intersection = rawIntersections.find(x => x.object.el && x.object.material);
      const remoteHoverTarget = intersection && findRemoteHoverTarget(intersection.object, intersection.instanceId);
      const isInteractable = intersection && intersection.object.el.matches(".interactable, .interactable *");
      const template = remoteHoverTarget && getNetworkedTemplate(remoteHoverTarget);
      const isStaticControlledMedia = template && template === "#static-controlled-media";
      const isStaticMedia = template && template === "#static-media";
      this.isGrabbingForMove =
        (isInteractable &&
          (remoteHoverTarget && canMove(remoteHoverTarget)) &&
          !isStaticControlledMedia &&
          !isStaticMedia) ||
        userinput.activeSets.includes(sets.rightCursorHoldingPen) ||
        userinput.activeSets.includes(sets.rightCursorHoldingInteractable) ||
        userinput.activeSets.includes(sets.rightCursorHoldingCamera);
    }
    this.prevButtonRight = buttonRight;
    this.prevGrabKey = grabKey;

    if ((!buttonRight && !grabKey) || isGrabTransforming) {
      this.isGrabbingForMove = false;
    }

    const isHoveringUI = userinput.activeSets.includes(sets.rightCursorHoveringOnUI);
    const isInspecting = cameraSystem.isInspecting();

    let isMouseLookingGesture;

    if (isInspecting) {
      isMouseLookingGesture = buttonMiddle || buttonRight || inspectPanKey; // Rotate or pan
    } else {
      isMouseLookingGesture =
        mouseLookKey || // Holding shift
        (buttonLeft && (!isHoveringUI || isCursorLocked())); // Mouse look
    }

    // Handle ephemeral mouse locking for look key/button
    if (document.hasFocus()) {
      if (isMouseLookingGesture) {
        if (HAS_ANNOYING_CURSOR_LOCK_POPUP) {
          beginPersistentCursorLock();
        } else {
          beginEphemeralCursorLock();
        }
      } else if (!isNonGrabTransforming) {
        releaseEphemeralCursorLock();
      }
    }

    const lockState = getCursorLockState();
    const useGazeCursor =
      lockState === CURSOR_LOCK_STATES.LOCKED_PERSISTENT ||
      (lockState === CURSOR_LOCK_STATES.LOCKED_EPHEMERAL && isMouseLookingGesture);
    const cursorIsLocked = isCursorLocked();

    // Reset gaze cursor to center if user moves or clicks on environment
    if (cursorIsLocked) {
      // HACK, can't read character acceleration yet here, so just look at keys (which are added before mouse.)
      const isAvatarMoving =
        userinput.get(wKeyPath) ||
        userinput.get(aKeyPath) ||
        userinput.get(sKeyPath) ||
        userinput.get(dKeyPath) ||
        userinput.get(upKeyPath) ||
        userinput.get(downKeyPath) ||
        userinput.get(leftKeyPath) ||
        userinput.get(rightKeyPath);

      if (!this.isGrabbingForMove && ((buttonLeft && !isTransforming) || buttonRight || isAvatarMoving)) {
        this.lockClickCoordDelta[0] = 0;
        this.lockClickCoordDelta[1] = 0;
      }
    } else {
      this.lockClickCoordDelta[0] = 0;
      this.lockClickCoordDelta[1] = 0;
    }

    const anyKeyPressed = userinput.get(anyKeyPath);
    const movementXY = frame.get(paths.device.mouse.movementXY);
    const movementXScreen = movementXY[0] / 1000.0;
    const movementYScreen = -movementXY[1] / 1000.0;

    if (Math.abs(movementXScreen) > 0.0 || Math.abs(movementYScreen) > 0.0 || (anyKeyPressed && !mouseLookKey)) {
      this.hideCursorAfterIdleTime = performance.now() + HIDE_CURSOR_AFTER_IDLE_MS;
    }

    if (cursorIsLocked && (this.isGrabbingForMove || isTransforming)) {
      this.lockClickCoordDelta[0] += movementXScreen;
      this.lockClickCoordDelta[1] += movementYScreen;
    }

    const now = performance.now();

    // Handle screen space gaze cursor that uses CSS
    const showCSSCursor = true; /*!!(
      useGazeCursor &&
      this.lockClickCoordDelta[0] === 0 &&
      this.lockClickCoordDelta[1] === 0 &&
      !isNonGrabTransforming &&
      !isInspecting &&
      !this.isGrabbingForMove &&
      now < this.hideCursorAfterIdleTime &&
      !SYSTEMS.directorSystem.trackingCamera
    );*/

    // The 3D cursor visibility is coordinated via CSS classes on the body.
    const show3DCursor = !!(
      !AFRAME.scenes[0].is("pointer-exited") &&
      !isNonGrabTransforming &&
      !(isInspecting && isMouseLookingGesture) &&
      !this.isGrabbingForMove &&
      !showCSSCursor &&
      (!isMouseLookingGesture || this.lockClickCoordDelta[0] !== 0 || this.lockClickCoordDelta[1] !== 0) &&
      now < this.hideCursorAfterIdleTime &&
      !SYSTEMS.directorSystem.trackingCamera
    );

    const uiClassList = UI.classList;
    const gazeCursorClassList = DOM_ROOT.getElementById("gaze-cursor").classList;

    if (showCSSCursor !== gazeCursorClassList.contains("show")) {
      gazeCursorClassList.toggle("show");
    }

    if (show3DCursor !== uiClassList.contains("show-3d-cursor")) {
      uiClassList.toggle("show-3d-cursor");
    }

    if (cursorIsLocked) {
      if (isNonGrabTransforming) {
        this.transformStartCoordDelta[0] += movementXScreen;
        this.transformStartCoordDelta[1] += movementYScreen;
      } else {
        // Return cursor to original position before transforming began.
        if (cursorIsLocked && (this.transformStartCoordDelta[0] !== 0 || this.transformStartCoordDelta[0] !== 0)) {
          this.lockClickCoordDelta[0] -= this.transformStartCoordDelta[0];
          this.lockClickCoordDelta[1] -= this.transformStartCoordDelta[1];
        }

        if (!this.isGrabbingForMove) {
          this.transformStartCoordDelta[0] = 0;
          this.transformStartCoordDelta[1] = 0;
        }
      }
    }

    // Move camera out of lock mode on LMB, or, in lock mode, when not holding something or
    // when holding something after panning past a certain FOV angle.
    const shouldMoveCamera =
      (cursorIsLocked && !this.isGrabbingForMove && !isNonGrabTransforming) ||
      (cursorIsLocked &&
        (Math.abs(this.lockClickCoordDelta[0]) > 0.2 || Math.abs(this.lockClickCoordDelta[1]) > 0.2) &&
        !isNonGrabTransforming) ||
      !cameraSystem.isInAvatarView();

    const coords = frame.get(paths.device.mouse.coords);

    if (this.prevCoords[0] !== Infinity) {
      const dCoordX = coords[0] - this.prevCoords[0];
      const dCoordY = coords[1] - this.prevCoords[1];

      if (shouldMoveCamera) {
        if (cursorIsLocked) {
          frame.setVector2(
            paths.actions.cameraDelta,
            movementXScreen * -Math.PI,
            movementYScreen * ((2 * Math.PI) / 3)
          );
        } else {
          frame.setVector2(paths.actions.cameraDelta, dCoordX * -Math.PI, dCoordY * ((2 * Math.PI) / 3));
        }
      }
    }

    this.prevCoords[0] = coords[0];
    this.prevCoords[1] = coords[1];

    if (this.camera) {
      if (cursorIsLocked) {
        let lockCursorInitialX = 0,
          lockCursorInitialY = 0;

        if (!useGazeCursor) {
          // This is the case when the user has a ephemeral cursor lock for eg a tansform: we don't want to reposition
          // the cursor to the center of the screen since that will cause the transform to apply the delta between
          // the screen position of the cursor before locking and the center.
          const [x, y] = getLastKnownUnlockedCursorCoords();
          lockCursorInitialX = x;
          lockCursorInitialY = y;
        }

        const poseX = Math.max(-0.8, Math.min(0.8, lockCursorInitialX + this.lockClickCoordDelta[0]));
        const poseY = Math.max(-0.8, Math.min(0.8, lockCursorInitialY + this.lockClickCoordDelta[1]));

        // Clamp final screen space pose for cursor so dragging object over edge does not go past end of screen
        frame.setPose(
          paths.device.smartMouse.cursorPose,
          calculateCursorPose(this.camera, poseX, poseY, this.origin, this.direction, this.cursorPose)
        );
      } else {
        frame.setPose(
          paths.device.smartMouse.cursorPose,
          calculateCursorPose(this.camera, coords[0], coords[1], this.origin, this.direction, this.cursorPose)
        );
      }
    }
  }
}

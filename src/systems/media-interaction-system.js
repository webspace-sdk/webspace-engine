import { paths } from "./userinput/paths";
import {
  getMediaViewComponent,
  performAnimatedRemove,
  MEDIA_INTERACTION_TYPES,
  LOCKED_MEDIA_DISALLOWED_INTERACTIONS,
  RESETABLE_MEDIA_VIEW_COMPONENTS,
  cloneMedia,
  isLockedMedia
} from "../utils/media-utils";
import { gatePermission, canCloneOrSnapshot } from "../utils/permissions-utils";
import { GUIDE_PLANE_MODES } from "./helpers-system";
import { TRANSFORM_MODE } from "./transform-selected-object";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import { ensureOwnership, getNetworkedEntitySync, isSynchronized } from "../utils/ownership-utils";
import { getSpawnInFrontZOffsetForEntity } from "../utils/three-utils";
import {
  cursorIsVisible,
  releaseEphemeralCursorLock,
  beginEphemeralCursorLock,
  beginPersistentCursorLock,
  HAS_ANNOYING_CURSOR_LOCK_POPUP
} from "../utils/dom-utils";
import qsTruthy from "../utils/qs_truthy";
import { SOUND_LOCK, SOUND_UNLOCK } from "./sound-effects-system";

const REMOVE_ACTION_MAX_DELAY_MS = 500.0;
const isDirectorMode = qsTruthy("director");

// System which manages keyboard-based media interactions
export class MediaInteractionSystem {
  constructor(scene, soundEffectsSystem) {
    this.scene = scene;
    this.rightHand = null;
    this.transformSystem = null;
    this.scalingSystem = null;
    this.lastRemoveActionTarget = null;
    this.soundEffectsSystem = soundEffectsSystem;

    waitForShadowDOMContentLoaded().then(() => {
      this.rightHand = DOM_ROOT.getElementById("player-right-controller");
    });
  }

  tick() {
    const { scene, rightHand } = this;
    const { voxSystem } = SYSTEMS;

    if (!rightHand) return;
    // if (!SYSTEMS.cameraSystem.cameraViewAllowsManipulation()) return;

    const canSpawnAndMove = window.APP.atomAccessManager.hubCan("spawn_and_move_media");

    this.userinput = this.userinput || scene.systems.userinput;
    this.transformSystem = this.transformSystem || this.scene.systems["transform-selected-object"];

    this.interaction = this.interaction || scene.systems.interaction;
    const interaction = this.interaction;
    const hoverEl = interaction.state.rightRemote.hovered || interaction.state.leftRemote.hovered;
    const heldEl = interaction.state.rightRemote.held || interaction.state.leftRemote.held;

    if (this.userinput.get(paths.actions.mediaTransformReleaseAction) && canSpawnAndMove) {
      this.transformSystem.stopTransform();
      releaseEphemeralCursorLock();
      return;
    }

    if (this.userinput.get(paths.actions.mediaScaleReleaseAction) && canSpawnAndMove) {
      this.scaleSystem = this.scaleSystem || this.scene.systems["scale-object"];
      this.scaleSystem.endScaling();
      releaseEphemeralCursorLock();
      return;
    }

    const rightHeld = interaction.state.rightRemote.held;

    // Stop sliding if held was dropped or slide key lifted
    if (
      (this.userinput.get(paths.actions.mediaSlideReleaseAction) &&
        this.transformSystem.mode === TRANSFORM_MODE.SLIDE) ||
      (this.userinput.get(paths.actions.mediaMoveXReleaseAction) &&
        this.transformSystem.mode === TRANSFORM_MODE.MOVEX) ||
      (this.userinput.get(paths.actions.mediaMoveYReleaseAction) &&
        this.transformSystem.mode === TRANSFORM_MODE.MOVEY) ||
      (this.userinput.get(paths.actions.mediaMoveZReleaseAction) &&
        this.transformSystem.mode === TRANSFORM_MODE.MOVEZ) ||
      (this.transformSystem.mode === TRANSFORM_MODE.LIFT && this.userinput.get(paths.actions.mediaLiftReleaseAction)) ||
      this.userinput.get(paths.actions.mashRelease) ||
      ((this.transformSystem.mode === TRANSFORM_MODE.SLIDE ||
        this.transformSystem.mode === TRANSFORM_MODE.MOVEX ||
        this.transformSystem.mode === TRANSFORM_MODE.MOVEY ||
        this.transformSystem.mode === TRANSFORM_MODE.MOVEZ ||
        this.transformSystem.mode === TRANSFORM_MODE.LIFT ||
        this.transformSystem.mode === TRANSFORM_MODE.STACK) &&
        this.transformSystem.transforming &&
        (!rightHeld && !voxSystem.assetPanelDraggingVoxId) &&
        canSpawnAndMove)
    ) {
      this.transformSystem.stopTransform();
      releaseEphemeralCursorLock();
      SYSTEMS.helpersSystem.setGuidePlaneMode(GUIDE_PLANE_MODES.DISABLED);

      return;
    }

    if (heldEl) {
      this.handleHeld(heldEl);
    } else if (hoverEl) {
      this.handleHover(hoverEl);
    }
  }

  handleHover(hoverEl) {
    console.log(cursorIsVisible());
    // Do not allow engaging media interactions if cursor has been hidden.
    if (!cursorIsVisible()) return;

    let interactionType = null;
    const isSynced = isSynchronized(hoverEl);
    const targetEl = isSynced ? getNetworkedEntitySync(hoverEl) : hoverEl;

    if (this.userinput.get(paths.actions.mediaPrimaryAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.PRIMARY;
    } else if (this.userinput.get(paths.actions.mediaNextAction)) {
      if (!isDirectorMode) {
        interactionType = MEDIA_INTERACTION_TYPES.NEXT;
      } else {
        SYSTEMS.directorSystem.beginLerpingTrackedObject();
      }
    } else if (this.userinput.get(paths.actions.mediaBackAction)) {
      if (!isDirectorMode) {
        interactionType = MEDIA_INTERACTION_TYPES.BACK;
      } else {
        // Director mode
        SYSTEMS.directorSystem.setTrackedObject(hoverEl);
      }
    } else if (this.userinput.get(paths.actions.mediaUpAction)) {
      if (!isDirectorMode) {
        interactionType = MEDIA_INTERACTION_TYPES.UP;
      } else {
        // Director mode
        SYSTEMS.directorSystem.beginTrackingCamera();
      }
    } else if (this.userinput.get(paths.actions.mediaDownOrResetAction)) {
      if (!isDirectorMode) {
        const component = getMediaViewComponent(hoverEl);

        if (RESETABLE_MEDIA_VIEW_COMPONENTS.includes(component.name)) {
          interactionType = MEDIA_INTERACTION_TYPES.RESET;
        } else {
          interactionType = MEDIA_INTERACTION_TYPES.DOWN;
        }
      } else {
        SYSTEMS.directorSystem.restart();
      }
    } else if (this.userinput.get(paths.actions.mediaSnapshotAction)) {
      if (canCloneOrSnapshot(hoverEl)) {
        interactionType = MEDIA_INTERACTION_TYPES.SNAPSHOT;
      } else {
        if (!gatePermission("spawn_and_move_media")) return;
      }
    } else if (this.userinput.get(paths.actions.mediaRotateAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.ROTATE;
    } else if (this.userinput.get(paths.actions.mediaScaleAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.SCALE;
    } else if (this.userinput.get(paths.actions.mediaCloneAction)) {
      if (canCloneOrSnapshot(hoverEl)) {
        interactionType = MEDIA_INTERACTION_TYPES.CLONE;
      } else {
        if (!gatePermission("spawn_and_move_media")) return;
      }
    } else if (this.userinput.get(paths.actions.mediaEditAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.EDIT;
    } else if (this.userinput.get(paths.actions.mediaOpenAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.OPEN;
    } else if (this.userinput.get(paths.actions.mediaToggleLockAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.TOGGLE_LOCK;
    } else if (this.userinput.get(paths.actions.mediaRemoveAction)) {
      if (this.lastRemoveActionTarget !== hoverEl) {
        this.lastRemoveActionTarget = hoverEl;
        setTimeout(() => (this.lastRemoveActionTarget = null), REMOVE_ACTION_MAX_DELAY_MS);
      } else {
        interactionType = MEDIA_INTERACTION_TYPES.REMOVE;
        window.APP.store.handleActivityFlag("mediaRemove");
      }
    }

    if (interactionType !== null) {
      const component = getMediaViewComponent(hoverEl);
      const isLocked = isLockedMedia(hoverEl);
      const lockAllows = !isLocked || !LOCKED_MEDIA_DISALLOWED_INTERACTIONS.includes(interactionType);

      if (component && lockAllows) {
        if (interactionType === MEDIA_INTERACTION_TYPES.CLONE) {
          if (!gatePermission("spawn_and_move_media")) return;
          const sourceEntity = component.el;
          const { entity } = cloneMedia(sourceEntity);
          const sourceScale = sourceEntity.object3D.scale;

          entity.object3D.scale.copy(sourceScale);
          entity.object3D.matrixNeedsUpdate = true;

          const zOffset = getSpawnInFrontZOffsetForEntity(sourceEntity);

          entity.setAttribute("offset-relative-to", {
            target: "#avatar-pov-node",
            offset: { x: 0, y: 0, z: zOffset }
          });
        } else {
          if (isSynced && !ensureOwnership(targetEl)) return;

          if (interactionType === MEDIA_INTERACTION_TYPES.ROTATE) {
            if (!gatePermission("spawn_and_move_media")) return;

            if (HAS_ANNOYING_CURSOR_LOCK_POPUP) {
              beginPersistentCursorLock();
            } else {
              beginEphemeralCursorLock();
            }

            this.transformSystem.startTransform(targetEl.object3D, this.rightHand.object3D, {
              mode: TRANSFORM_MODE.AXIS
            });
          } else if (interactionType === MEDIA_INTERACTION_TYPES.SCALE) {
            if (!gatePermission("spawn_and_move_media")) return;

            if (HAS_ANNOYING_CURSOR_LOCK_POPUP) {
              beginPersistentCursorLock();
            } else {
              beginEphemeralCursorLock();
            }

            this.scaleSystem = this.scaleSystem || this.scene.systems["scale-object"];
            this.scaleSystem.startScaling(targetEl.object3D, this.rightHand.object3D);
          } else if (interactionType === MEDIA_INTERACTION_TYPES.REMOVE) {
            if (!gatePermission("spawn_and_move_media")) return;
            performAnimatedRemove(targetEl);
          } else if (interactionType === MEDIA_INTERACTION_TYPES.TOGGLE_LOCK) {
            if (!gatePermission("spawn_and_move_media")) return;
            this.soundEffectsSystem.playSoundOneShot(isLocked ? SOUND_UNLOCK : SOUND_LOCK);
            hoverEl.setAttribute("media-loader", { locked: !isLocked });
          } else {
            component.handleMediaInteraction(interactionType);
          }
        }
      }
    }
  }

  handleHeld(heldEl) {
    let interactionType = null;
    const interaction = this.interaction;
    const isSynced = isSynchronized(heldEl);
    const targetEl = isSynced ? getNetworkedEntitySync(heldEl) : heldEl;

    if (this.userinput.get(paths.actions.mediaSlideAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.SLIDE;
    }

    if (this.userinput.get(paths.actions.mediaLiftAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.LIFT;
    }

    if (this.userinput.get(paths.actions.mediaMoveXAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.MOVEX;
    }

    if (this.userinput.get(paths.actions.mediaMoveYAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.MOVEY;
    }

    if (this.userinput.get(paths.actions.mediaMoveZAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.MOVEZ;
    }

    if (this.userinput.get(paths.actions.mash)) {
      interactionType = MEDIA_INTERACTION_TYPES.STACK;
    }

    if (interactionType !== null) {
      const component = getMediaViewComponent(heldEl);

      if (component) {
        if (isSynced && !ensureOwnership(targetEl)) return;

        if (!this.transformSystem.transforming) {
          const { rightRemote } = interaction.state;
          const rightHeld = rightRemote.held;

          if (rightHeld) {
            if (rightRemote.constraining) {
              // Restore to prehold transform so we can avoid drift from brief
              // cursor constraint hold (eg when ctrl-drag duplicating.)
              targetEl.object3D.setMatrix(rightRemote.preHoldMatrix);
              targetEl.object3D.updateMatrices();
            }

            rightRemote.constraining = false;

            let mode;
            switch (interactionType) {
              case MEDIA_INTERACTION_TYPES.SLIDE:
                mode = TRANSFORM_MODE.SLIDE;
                break;
              case MEDIA_INTERACTION_TYPES.LIFT:
                mode = TRANSFORM_MODE.LIFT;
                break;
              case MEDIA_INTERACTION_TYPES.MOVEX:
                mode = TRANSFORM_MODE.MOVEX;
                break;
              case MEDIA_INTERACTION_TYPES.MOVEY:
                mode = TRANSFORM_MODE.MOVEY;
                break;
              case MEDIA_INTERACTION_TYPES.MOVEZ:
                mode = TRANSFORM_MODE.MOVEZ;
                break;
              case MEDIA_INTERACTION_TYPES.STACK:
                mode = TRANSFORM_MODE.STACK;
                break;
            }

            this.transformSystem.startTransform(targetEl.object3D, this.rightHand.object3D, { mode });

            // Show guide plane during slide or lift
            if (
              interactionType !== MEDIA_INTERACTION_TYPES.STACK &&
              interactionType !== MEDIA_INTERACTION_TYPES.MOVEX &&
              interactionType !== MEDIA_INTERACTION_TYPES.MOVEY &&
              interactionType !== MEDIA_INTERACTION_TYPES.MOVEZ
            ) {
              SYSTEMS.helpersSystem.setGuidePlaneMode(
                interactionType === MEDIA_INTERACTION_TYPES.SLIDE ? GUIDE_PLANE_MODES.CAMERA : GUIDE_PLANE_MODES.WORLDY
              );
            }
          }
        } else {
          component.handleMediaInteraction(interactionType);
        }
      }
    }
  }
}

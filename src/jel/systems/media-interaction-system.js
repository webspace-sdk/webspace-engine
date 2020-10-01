import { paths } from "../../hubs/systems/userinput/paths";
import { getMediaViewComponent, performAnimatedRemove, MEDIA_INTERACTION_TYPES } from "../../hubs/utils/media-utils";
import { TRANSFORM_MODE } from "../../hubs/components/transform-object-button";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { ensureOwnership, getNetworkedEntity } from "../../jel/utils/ownership-utils";

const REMOVE_ACTION_MAX_DELAY_MS = 500.0;

// System which manages keyboard-based media interactions
export class MediaInteractionSystem {
  constructor(scene) {
    this.scene = scene;
    this.rightHand = null;
    this.transformSystem = null;
    this.scalingSystem = null;
    this.lastRemoveActionTarget = null;

    waitForDOMContentLoaded().then(() => {
      this.rightHand = document.getElementById("player-right-controller");
    });
  }

  tick() {
    const { scene, rightHand } = this;

    if (!rightHand) return;

    this.userinput = this.userinput || scene.systems.userinput;
    if (this.userinput.get(paths.actions.mediaTransformReleaseAction)) {
      this.transformSystem = this.transformSystem || this.scene.systems["transform-selected-object"];
      this.transformSystem.stopTransform();
      return;
    }

    if (this.userinput.get(paths.actions.mediaScaleReleaseAction)) {
      this.scaleSystem = this.scaleSystem || this.scene.systems["scale-object"];
      this.scaleSystem.endScaling();
      return;
    }

    this.interaction = this.interaction || scene.systems.interaction;
    const hoverEl = this.interaction.state.rightRemote.hovered || this.interaction.state.leftRemote.hovered;

    if (!hoverEl) return;
    let interactionType = null;

    if (this.userinput.get(paths.actions.mediaPrimaryAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.PRIMARY;
    } else if (this.userinput.get(paths.actions.mediaNextAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.NEXT;
    } else if (this.userinput.get(paths.actions.mediaBackAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.BACK;
    } else if (this.userinput.get(paths.actions.mediaUpAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.UP;
    } else if (this.userinput.get(paths.actions.mediaDownAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.DOWN;
    } else if (this.userinput.get(paths.actions.mediaSnapshotAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.SNAPSHOT;
    } else if (this.userinput.get(paths.actions.mediaRotateAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.ROTATE;
    } else if (this.userinput.get(paths.actions.mediaScaleAction)) {
      interactionType = MEDIA_INTERACTION_TYPES.SCALE;
    } else if (this.userinput.get(paths.actions.mediaRemoveAction)) {
      if (this.lastRemoveActionTarget !== hoverEl) {
        this.lastRemoveActionTarget = hoverEl;
        setTimeout(() => (this.lastRemoveActionTarget = null), REMOVE_ACTION_MAX_DELAY_MS);
      } else {
        interactionType = MEDIA_INTERACTION_TYPES.REMOVE;
      }
    }

    if (interactionType !== null) {
      const component = getMediaViewComponent(hoverEl);

      if (component) {
        getNetworkedEntity(hoverEl).then(targetEl => {
          if (!ensureOwnership(targetEl)) return;

          if (interactionType === MEDIA_INTERACTION_TYPES.ROTATE) {
            this.transformSystem = this.transformSystem || this.scene.systems["transform-selected-object"];
            this.transformSystem.startTransform(targetEl.object3D, this.rightHand.object3D, {
              mode: TRANSFORM_MODE.CURSOR
            });
          } else if (interactionType === MEDIA_INTERACTION_TYPES.SCALE) {
            this.scaleSystem = this.scaleSystem || this.scene.systems["scale-object"];
            this.scaleSystem.startScaling(targetEl.object3D, this.rightHand.object3D);
          } else if (interactionType === MEDIA_INTERACTION_TYPES.REMOVE) {
            performAnimatedRemove(targetEl);
          } else {
            component.handleMediaInteraction(interactionType);
          }
        });
      }
    }
  }
}

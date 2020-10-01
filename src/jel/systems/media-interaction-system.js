import { paths } from "../../hubs/systems/userinput/paths";
import { getMediaViewComponent, MEDIA_INTERACTION_TYPES } from "../../hubs/utils/media-utils";

// System which manages keyboard-based media interactions
export class MediaInteractionSystem {
  constructor(scene) {
    this.scene = scene;
  }

  tick() {
    const { scene } = this;
    this.userinput = this.userinput || scene.systems.userinput;
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
    }

    if (interactionType !== null) {
      const component = getMediaViewComponent(hoverEl);

      if (component) {
        component.handleMediaInteraction(interactionType);
      }
    }
  }
}

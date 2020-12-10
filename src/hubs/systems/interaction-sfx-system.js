import { paths } from "./userinput/paths";
import { SOUND_HOVER_OR_GRAB, SOUND_RELEASE } from "./sound-effects-system";
import { isUI } from "./interactions";

export class InteractionSfxSystem {
  constructor() {}

  tick(interaction, userinput, sfx) {
    const state = interaction.state;
    const previousState = interaction.previousState;

    if (state.leftHand.held !== previousState.leftHand.held) {
      sfx.playSoundOneShot(state.leftHand.held ? SOUND_HOVER_OR_GRAB : SOUND_RELEASE);
    }

    if (state.rightHand.held !== previousState.rightHand.held) {
      sfx.playSoundOneShot(state.rightHand.held ? SOUND_HOVER_OR_GRAB : SOUND_RELEASE);
    }

    if (state.rightRemote.held !== previousState.rightRemote.held) {
      sfx.playSoundOneShot(state.rightRemote.held ? SOUND_HOVER_OR_GRAB : SOUND_RELEASE);
    }

    if (userinput.get(paths.actions.logInteractionState)) {
      console.log(
        "Interaction System State\nleftHand held",
        state.leftHand.held,
        "\nleftHand hovered",
        state.leftHand.hovered,
        "\nrightHand held",
        state.rightHand.held,
        "\nrightHand hovered",
        state.rightHand.hovered,
        "\nrightRemote held",
        state.rightRemote.held,
        "\nrightRemote hovered",
        state.rightRemote.hovered,
        "\nleftRemote held",
        state.leftRemote.held,
        "\nleftRemote hovered",
        state.leftRemote.hovered
      );
    }
  }
}

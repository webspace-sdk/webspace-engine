import { paths } from "./userinput/paths";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import { isTagged } from "../components/tags";
import { hackyMobileSafariTest } from "../utils/detect-touchscreen";

function shouldEnableRemote(scene, hand, remote, teleporting, woke) {
  const vrRemotePenIntersection =
    scene.is("vr-mode") && isTagged(remote.held, "isPen") && remote.held.children[0].components.pen.intersection;
  return scene.is("entered") && !hand.hovered && !hand.held && !teleporting && !vrRemotePenIntersection && woke;
}

export class CursorTogglingSystem {
  constructor() {
    this.wakeLeft = false;
    this.wakeRight = false;

    waitForShadowDOMContentLoaded().then(() => {
      this.domContentLoadedButComponentsMayNotHave = true;
    });
  }

  tick(interaction, userinput, scene) {
    const { cameraSystem } = SYSTEMS;

    if (!this.domContentLoadedButComponentsMayNotHave) return;
    if (!this.gotComponentReferences) {
      this.gotComponentReferences = true;
      this.rightCursorController = DOM_ROOT.getElementById("right-cursor-controller").components["cursor-controller"];
      this.leftCursorController = DOM_ROOT.getElementById("left-cursor-controller").components["cursor-controller"];
      this.rightHandTeleporter = DOM_ROOT.getElementById("player-right-controller").components["teleporter"];
      this.leftHandTeleporter = DOM_ROOT.getElementById("player-left-controller").components["teleporter"];
    }

    const rightRemote = interaction.state.rightRemote;
    const leftRemote = interaction.state.leftRemote;
    const leftHand = interaction.state.leftHand;
    const rightHand = interaction.state.rightHand;

    if (userinput.get(paths.actions.cursor.right.wake)) {
      this.wakeRight = true;
      if (!leftRemote.held) {
        this.wakeLeft = false;
      }
    }

    if (userinput.get(paths.actions.cursor.left.wake)) {
      this.wakeLeft = true;
      if (!rightRemote.held) {
        this.wakeRight = false;
      }
    }

    const shouldEnableLeftRemote =
      cameraSystem.currentViewShowsCursor() &&
      shouldEnableRemote(scene, leftHand, leftRemote, this.leftHandTeleporter.isTeleporting, this.wakeLeft);
    const isMobile = AFRAME.utils.device.isMobile();
    const shouldEnableRightRemote =
      isMobile ||
      hackyMobileSafariTest() ||
      (cameraSystem.currentViewShowsCursor() &&
        shouldEnableRemote(scene, rightHand, rightRemote, this.rightHandTeleporter.isTeleporting, this.wakeRight));

    if (!shouldEnableLeftRemote) {
      leftRemote.hovered = null;
    }
    if (!shouldEnableRightRemote) {
      rightRemote.hovered = null;
    }
    this.leftCursorController.enabled = shouldEnableLeftRemote;
    this.rightCursorController.enabled = shouldEnableRightRemote;
  }
}

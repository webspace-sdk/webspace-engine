import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

const FIRE_DURATION_MS = 350;
const MAX_FIRE_DURATION = 5000;
const REPEATED_LAUNCH_DELAY = 500;

const tmpVec3 = new THREE.Vector3();

// Deals with Emoji Launcher
export class LauncherSystem {
  constructor(sceneEl, projectileSystem, userinput, characterController) {
    this.sceneEl = sceneEl;
    this.projectileSystem = projectileSystem;
    this.characterController = characterController;
    this.userinput = userinput;
    this.startedLaunchTime = null;
    this.lastLaunchTime = null;
    this.doneOnceLaunch = false;
    this.doneRepeatedLaunches = false;
    this.firedMegamoji = false;
    this.heldLeftPreviousFrame = false;
    this.heldSpacePreviousFrame = false;
    this.avatarPovEl = null;

    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.querySelector("#avatar-pov-node");
    });
  }

  tick() {
    const { userinput } = this;

    const spacePath = paths.device.keyboard.key(" ");
    const middlePath = paths.device.mouse.buttonMiddle;
    const leftPath = paths.device.mouse.buttonLeft;
    const controlPath = paths.device.keyboard.key("control");
    const shiftPath = paths.device.keyboard.key("shift");

    const holdingLeft = userinput.get(leftPath);
    const holdingSpace = userinput.get(spacePath);

    // Repeated fire if user is holding space and not control (due to widen)
    const launchRepeatedly = holdingSpace && !userinput.get(controlPath);

    // Launch a single emoji if:
    // - The middle button is clicked at any time
    // - Left button is clicked if:
    //   - The cursor is locked (meaning we are in wide mode)
    //   - The previous frame was not holding left and the user is holding shift to mouse look.

    const isFreeToLeftClick =
      getCursorLockState() == CURSOR_LOCK_STATES.LOCKED_PERSISTENT ||
      (!this.heldLeftPreviousFrame && userinput.get(shiftPath));

    const launchOnce = userinput.get(middlePath) || (isFreeToLeftClick && userinput.get(leftPath));

    this.heldLeftPreviousFrame = holdingLeft;
    if (launchOnce) {
      if (!this.doneOnceLaunch) {
        this.doneOnceLaunch = true;
        this.fireEmoji(false);
      }

      return;
    } else {
      this.doneOnceLaunch = false;
    }

    if (launchRepeatedly) {
      const now = performance.now();

      if (!this.startedLaunchTime) {
        this.startedLaunchTime = now;
      }

      if (now - this.startedLaunchTime > MAX_FIRE_DURATION) {
        if (this.doneRepeatedLaunches) {
          this.doneRepeatedLaunches = true;
          this.startedLaunchTime = null;
          this.lastLaunchTime = null;
        }

        if (now - this.startedLaunchTime > MAX_FIRE_DURATION + 500 && !this.firedMegamoji) {
          // Fire megamoji at the end after air clears
          this.fireEmoji(true);
          this.firedMegamoji = true;
        }
      } else if (now - this.startedLaunchTime > REPEATED_LAUNCH_DELAY) {
        if (!this.doneRepeatedLaunches && (!this.lastLaunchTime || now - this.lastLaunchTime > FIRE_DURATION_MS)) {
          this.fireEmoji(false);
          this.lastLaunchTime = now;
        }
      }
    } else if (this.startedLaunchTime) {
      this.doneRepeatedLaunches = false;
      this.firedMegamoji = false;
      this.startedLaunchTime = null;
      this.lastLaunchTime = null;
    }
  }

  fireEmoji(isMegaEmoji) {
    const { avatarPovEl } = this;
    if (!avatarPovEl) return;

    const avatarPovNode = avatarPovEl.object3D;
    avatarPovNode.updateMatrices();
    tmpVec3.copy(this.characterController.relativeMotion);
    tmpVec3.normalize();
    tmpVec3.transformDirection(avatarPovNode.matrixWorld);
    const magnitude = this.characterController.relativeMotion.length();

    const payload = this.projectileSystem.fireEmojiLauncherProjectile(
      window.APP.store.state.equips.launcher,
      isMegaEmoji,
      tmpVec3.x * magnitude,
      tmpVec3.z * magnitude
    );

    window.APP.hubChannel.sendMessage(payload, "emoji_launch");
  }
}

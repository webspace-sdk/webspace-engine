import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";
import { sets } from "../../hubs/systems/userinput/sets";
import { EventTarget } from "event-target-shim";

const FIRE_DURATION_MS = 350;
const MAX_FIRE_DURATION = 5000;
const REPEATED_LAUNCH_DELAY = 500;

const tmpVec3 = new THREE.Vector3();
const WHEEL_THRESHOLD = 0.15;

// Deals with Emoji Launcher
export class LauncherSystem extends EventTarget {
  constructor(sceneEl, projectileSystem, userinput, characterController, soundEffectsSystem) {
    super();
    this.sceneEl = sceneEl;
    this.enabled = true;
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
    this.deltaWheel = 0.0;
    this.sawLeftButtonUpWithShift = false;

    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPovEl = DOM_ROOT.querySelector("#avatar-pov-node");
    });

    const store = window.APP.store;

    this.lastEquippedEmoji = store.state.equips.launcher;

    window.APP.store.addEventListener("statechanged-equips", () => {
      if (this.lastEquippedEmoji !== store.state.equips.launcher) {
        this.lastEquippedEmoji = store.state.equips.launcher;
        soundEffectsSystem.playSoundOneShot(SOUND_EMOJI_EQUIP);
      }
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    this.dispatchEvent(new CustomEvent("enabledchanged"));
  }

  tick() {
    if (!this.enabled) return;
    if (!SYSTEMS.cameraSystem.isInAvatarView()) return;

    const { projectileSystem, userinput } = this;

    const spacePath = paths.device.keyboard.key(" ");
    const middlePath = paths.device.mouse.buttonMiddle;
    const leftPath = paths.device.mouse.buttonLeft;
    const controlPath = paths.device.keyboard.key("control");
    const shiftPath = paths.device.keyboard.key("shift");

    const holdingLeft = userinput.get(leftPath);
    const holdingSpace = userinput.get(spacePath);
    const holdingShift = userinput.get(shiftPath);
    const mashed = userinput.get(paths.actions.mash);
    const wheel = userinput.get(paths.actions.equipScroll);

    if (holdingShift && !holdingLeft) {
      this.sawLeftButtonUpWithShift = true;
    } else if (!holdingShift) {
      this.sawLeftButtonUpWithShift = false;
    }

    if (wheel && wheel !== 0.0) {
      this.deltaWheel += wheel;
    }

    if (Math.abs(this.deltaWheel) > WHEEL_THRESHOLD) {
      const store = window.APP.store;
      const equipDirection = this.deltaWheel < 0.0 ? -1 : 1;
      this.deltaWheel = 0.0;
      let currentSlot = -1;

      for (let i = 0; i < 10; i++) {
        if (store.state.equips.launcher === store.state.equips[`launcherSlot${i + 1}`]) {
          currentSlot = i;
          break;
        }
      }

      if (currentSlot !== -1) {
        let newSlot = (currentSlot + equipDirection) % 10;
        newSlot = newSlot < 0 ? 9 : newSlot;
        store.update({ equips: { launcher: store.state.equips[`launcherSlot${newSlot + 1}`] } });
      }
    }

    const isHoveringUI = userinput.activeSets.includes(sets.rightCursorHoveringOnUI);
    this.interaction = this.interaction || this.sceneEl.systems.interaction;
    const heldEl = this.interaction.state.rightRemote.held || this.interaction.state.leftRemote.held;
    const isHoldingObject = !!heldEl; // Space is used while holding to snap

    // No burst while holding object due to snap use of space. Can't use action bindings for this since when set changes it will trigger a rising.
    if (mashed && !isHoldingObject) {
      const payload = projectileSystem.fireEmojiBurst(window.APP.store.state.equips.launcher);
      window.APP.hubChannel.sendMessage(payload, "emoji_burst");
    }

    // Launch a single emoji if:
    // - The middle button is clicked at any time
    // - Left button is clicked if:
    //   - The cursor is locked (meaning we are in wide mode)
    //   - The previous frame was not holding left and the user is holding shift to mouse look.

    const isFreeToLeftClick =
      (getCursorLockState() == CURSOR_LOCK_STATES.LOCKED_PERSISTENT && !isHoveringUI) ||
      (!this.heldLeftPreviousFrame && holdingShift && !isHoveringUI);

    const isFreeToLeftHold =
      getCursorLockState() == (CURSOR_LOCK_STATES.LOCKED_PERSISTENT || (holdingShift && this.sawLeftButtonUpWithShift));

    const launchOnce = userinput.get(middlePath) || (isFreeToLeftClick && userinput.get(leftPath));

    // Repeated fire if user is holding space and not control (due to widen)
    const launchRepeatedly =
      (holdingSpace && !isHoldingObject && !userinput.get(controlPath)) ||
      userinput.get(middlePath) ||
      (isFreeToLeftHold && userinput.get(leftPath));

    this.heldLeftPreviousFrame = holdingLeft;
    if (launchOnce) {
      if (!this.doneOnceLaunch) {
        this.doneOnceLaunch = true;
        this.fireEmoji(false);
      }
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

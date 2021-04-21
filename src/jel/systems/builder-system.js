import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
//import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";

const WHEEL_THRESHOLD = 0.15;
const { Vector3 } = THREE;

// Deals with block building
export class BuilderSystem {
  constructor(sceneEl, userinput, soundEffectsSystem, cursorSystem) {
    this.sceneEl = sceneEl;
    this.userinput = userinput;
    this.soundEffectsSystem = soundEffectsSystem;
    this.cursorSystem = cursorSystem;

    this.enabled = true;
    this.deltaWheel = 0.0;
    this.sawLeftButtonUpWithShift = false;

    //const store = window.APP.store;

    /*this.lastEquippedEmoji = store.state.equips.launcher;

    window.APP.store.addEventListener("statechanged-equips", () => {
      if (this.lastEquippedEmoji !== store.state.equips.launcher) {
        this.lastEquippedEmoji = store.state.equips.launcher;
        soundEffectsSystem.playSoundOneShot(SOUND_EMOJI_EQUIP);
      }
    });*/
  }

  tick = (() => {
    const hitCell = new Vector3();
    const adjacentCell = new Vector3();
    return () => {
      if (!this.enabled) return;

      const { userinput } = this;

      const spacePath = paths.device.keyboard.key(" ");
      const middlePath = paths.device.mouse.buttonMiddle;
      const leftPath = paths.device.mouse.buttonLeft;
      const controlPath = paths.device.keyboard.key("control");
      const shiftPath = paths.device.keyboard.key("shift");

      const holdingLeft = userinput.get(leftPath);
      const holdingSpace = userinput.get(spacePath);
      const holdingShift = userinput.get(shiftPath);
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
        /*const store = window.APP.store;
      const equipDirection = this.deltaWheel < 0.0 ? -1 : 1;
      this.deltaWheel = 0.0;
      let currentSlot = -1;

      for (let i = 0; i < 10; i++) {
        if (store.state.equips.colors === store.state.equips[`colorSlot${i + 1}`]) {
          currentSlot = i;
          break;
        }
      }

      if (currentSlot !== -1) {
        let newSlot = (currentSlot + equipDirection) % 10;
        newSlot = newSlot < 0 ? 9 : newSlot;
        store.update({ equips: { launcher: store.state.equips[`launcherSlot${newSlot + 1}`] } });
      }*/
      }

      const isFreeToLeftHold =
        getCursorLockState() == CURSOR_LOCK_STATES.LOCKED_PERSISTENT || (holdingShift && this.sawLeftButtonUpWithShift);

      // Repeated build if user is holding space and not control (due to widen)
      const buildingActive =
        (holdingSpace && !userinput.get(controlPath)) ||
        userinput.get(middlePath) ||
        (isFreeToLeftHold && userinput.get(leftPath));

      if (buildingActive) {
        const cursor = this.cursorSystem.rightRemote && this.cursorSystem.rightRemote.components["cursor-controller"];
        const intersection = cursor && cursor.intersection;

        if (intersection) {
          const hitVoxId = SYSTEMS.voxSystem.getVoxHitFromIntersection(intersection, hitCell, adjacentCell);

          if (hitVoxId) {
            this.buildAtCell(hitVoxId, adjacentCell);
          }
        }
      }
    };
  })();

  async buildAtCell(hitVoxId, { x, y, z }) {
    const sync = await SYSTEMS.voxSystem.getSync(hitVoxId);
    sync.setVoxel(x, y, z, 128, 0, 0, 0);
  }
}

import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { addMedia } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";

//import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";

const WHEEL_THRESHOLD = 0.15;
const { Vector3 } = THREE;
import { createVox } from "../../hubs/utils/phoenix-utils";

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
    this.lastBuildCell = new Vector3(Infinity, Infinity, Infinity);

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

      const { userinput, lastBuildCell } = this;

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
            lastBuildCell.copy(hitCell);
            this.buildAtCell(hitVoxId, adjacentCell);
          } else {
            if (lastBuildCell.x === Infinity) {
              // Not mid-build, create a new vox.
              console.log(intersection);
              lastBuildCell.set(0, 0, 0);
              this.createVoxAt(intersection.point);
            }
          }
        }
      } else {
        // Clear last build cell when building is off.
        lastBuildCell.set(Infinity, Infinity, Infinity);
      }
    };
  })();

  async createVoxAt(point) {
    const {
      vox: [{ vox_id: voxId, url }]
    } = await createVox();

    // Skip resolving these URLs since they're from dyna.
    const { entity } = addMedia(url, null, "#interactable-media", ObjectContentOrigins.URL);

    entity.addEventListener(
      "model-loaded",
      async () => {
        const sync = await SYSTEMS.voxSystem.getSync(voxId);
        await sync.setVoxel(0, 0, 0, 128); // TODO use color
      },
      { once: true }
    );

    const { object3D } = entity;
    object3D.position.copy(point);
    object3D.position.x += VOXEL_SIZE / 2;
    object3D.position.y += VOXEL_SIZE;
    object3D.position.z += VOXEL_SIZE / 2;
    object3D.rotation.x = object3D.rotation.y = object3D.rotation.z = 0.0;
    object3D.scale.x = object3D.scale.y = object3D.scale.z = 1.0;
    object3D.matrixNeedsUpdate = true;
  }

  async buildAtCell(hitVoxId, { x, y, z }) {
    const sync = await SYSTEMS.voxSystem.getSync(hitVoxId);
    sync.setVoxel(x, y, z, 128, 0, 0, 0); // TODO use color
  }
}

import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { addMedia } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { MAX_VOX_SIZE, VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { VoxChunk, voxColorForRGBT, REMOVE_VOXEL_COLOR } from "ot-vox";

//import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";

const WHEEL_THRESHOLD = 0.15;
const { Vector3 } = THREE;
import { createVox } from "../../hubs/utils/phoenix-utils";

// Brush types:
//
// Voxel:
// add the adjacent cell to the existing patch
//
// Box:
// Loop over all of start to end patch, and for any cells not in the current snapshot,
// fill them. (Leave existing ones alone)
//
// Face:
// Create an intersection plane based upon normal of side, with the origin at the cell face
// Of the two planes to create, take the one with the normal closes to the eye ray
//
// +h or -h at start patch
//   - when adding h is strictly positive, when removing it's strictly negative
//   - never zero, always at least +/- one
//   - at click time, capture the face mask to move

const BRUSH_TYPES = {
  VOXEL: 0,
  BOX: 1,
  FACE: 2
};

const BRUSH_MODES = {
  ADD: 0,
  REMOVE: 1,
  PAINT: 2
};

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
    this.brushVoxId = null;
    this.brushStartCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushEndCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushType = BRUSH_TYPES.VOXEL;
    this.brushMode = BRUSH_MODES.ADD;
    this.brushVoxColor = voxColorForRGBT(0, 0, 128);
    this.pendingPatchChunk = null;
    this.spawningVoxThisBuild = false;

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

      const { userinput, brushVoxId, brushStartCell, brushEndCell, brushMode, spawningVoxThisBuild } = this;

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
          const cellToBrush = brushMode === BRUSH_MODES.ADD ? adjacentCell : hitCell;

          if (hitVoxId) {
            if (spawningVoxThisBuild) return; // Do not perform brush stuff while spawning a vox.

            let updatePatch = false;

            if (!isFinite(brushEndCell.x) || !brushEndCell.equals(cellToBrush)) {
              updatePatch = true;
              brushEndCell.copy(cellToBrush);
            }

            if (!isFinite(brushStartCell.x)) {
              updatePatch = true;
              brushStartCell.copy(cellToBrush);
              this.brushVoxId = hitVoxId;

              // Freeze the current mesh for targetting the vox.
              SYSTEMS.voxSystem.freezeMeshForTargetting(hitVoxId, intersection.instanceId);
            }

            if (updatePatch) {
              if (!this.pendingPatchChunk) {
                // Create a new patch, patch will grow as needed.
                this.pendingPatchChunk = new VoxChunk([2, 2, 2]);
              }

              this.applyCurrentBrushToPatchChunk(hitVoxId);
            }
          } else {
            if (!isFinite(brushStartCell.x)) {
              if (brushMode === BRUSH_MODES.ADD && !spawningVoxThisBuild) {
                // Not mid-build, create a new vox.
                this.spawningVoxThisBuild = true;
                this.createVoxAt(intersection.point);
              }
            }
          }
        }
      } else {
        if (this.pendingPatchChunk) {
          this.pendingPatchChunk = null;
          SYSTEMS.voxSystem.applyOverlayAndUnfreezeMesh(brushVoxId);
          // Uncomment to stop applying changes to help with reproducing bugs.
          //SYSTEMS.voxSystem.unfreezeMeshForTargetting(brushVoxId);
        }

        // Clear last build cell when building is off.
        brushStartCell.set(Infinity, Infinity, Infinity);
        brushEndCell.set(Infinity, Infinity, Infinity);
        this.brushVoxId = null;
        this.spawningVoxThisBuild = false;
      }
    };
  })();

  async createVoxAt(point) {
    const spaceId = window.APP.spaceChannel.spaceId;

    const {
      vox: [{ vox_id: voxId, url }]
    } = await createVox(spaceId);

    // Skip resolving these URLs since they're from dyna.
    const { entity } = addMedia(
      url,
      null,
      "#interactable-media",
      ObjectContentOrigins.URL,
      null,
      false,
      false,
      true,
      {},
      true,
      null,
      null,
      null,
      false,
      "model/vnd.jel-vox"
    );

    entity.addEventListener(
      "model-loaded",
      async () => {
        const sync = await SYSTEMS.voxSystem.getSync(voxId);
        await sync.setVoxel(0, 0, 0, this.brushVoxColor);
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

  applyCurrentBrushToPatchChunk(voxId) {
    const { pendingPatchChunk, brushType, brushMode, brushStartCell, brushEndCell, brushVoxColor } = this;

    let px, py, pz, sx, sy, sz;

    switch (brushType) {
      case BRUSH_TYPES.VOXEL:
        // Disallow removing last voxel
        if (brushMode === BRUSH_MODES.REMOVE) {
          const voxNumVoxels = SYSTEMS.voxSystem.getTotalNonEmptyVoxelsOfTargettedFrame(voxId);
          const patchNumVoxels = pendingPatchChunk.getTotalNonEmptyVoxels();
          console.log(voxNumVoxels, patchNumVoxels);
          if (patchNumVoxels >= voxNumVoxels - 1) return;
        }

        // Add the end cell to the patch, assuming the patch ends up having its offset set to the start cell.

        // Cell to update
        px = brushEndCell.x - brushStartCell.x;
        py = brushEndCell.y - brushStartCell.y;
        pz = brushEndCell.z - brushStartCell.z;

        // Resize patch if necessary
        sx = Math.min(Math.max(2, pendingPatchChunk.size[0], Math.abs(px) * 2 + 2), MAX_VOX_SIZE);
        sy = Math.min(Math.max(2, pendingPatchChunk.size[1], Math.abs(py) * 2 + 2), MAX_VOX_SIZE);
        sz = Math.min(Math.max(2, pendingPatchChunk.size[2], Math.abs(pz) * 2 + 2), MAX_VOX_SIZE);

        pendingPatchChunk.resizeTo([sx, sy, sz]);
        pendingPatchChunk.setColorAt(px, py, pz, brushMode === BRUSH_MODES.REMOVE ? REMOVE_VOXEL_COLOR : brushVoxColor);

        break;
    }

    SYSTEMS.voxSystem.setOverlayVoxChunk(
      voxId,
      pendingPatchChunk,
      brushStartCell.x,
      brushStartCell.y,
      brushStartCell.z
    );
  }
}

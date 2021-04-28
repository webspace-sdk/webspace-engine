import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { addMedia } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { MAX_VOX_SIZE, VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { VoxChunk, xyzRangeForSize, voxColorForRGBT, REMOVE_VOXEL_COLOR, VOX_CHUNK_FILTERS } from "ot-vox";

//import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";

const WHEEL_THRESHOLD = 0.15;
const MAX_UNDO_STEPS = 32;

const { Vector3 } = THREE;
import { createVox } from "../../hubs/utils/phoenix-utils";

// Brush types:
//
// Voxel:
// add the adjacent cell to the existing pending
//
// Box:
// Loop over all of start to end pending, and for any cells not in the current snapshot,
// fill them. (Leave existing ones alone)
//
// Face:
// Create an intersection plane based upon normal of side, with the origin at the cell face
// Of the two planes to create, take the one with the normal closes to the eye ray
//
// +h or -h at start pending
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

const BRUSH_SHAPES = {
  SQUARE: 0,
  ROUND: 1
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
    this.targetVoxId = null;
    this.brushVoxFrame = null;
    this.brushStartCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushEndCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushType = BRUSH_TYPES.VOXEL;
    this.brushMode = BRUSH_MODES.REMOVE;
    this.brushShape = BRUSH_SHAPES.SQUARE;
    this.brushSize = 2;

    this.isBrushing = false;
    this.mirrorX = false;
    this.mirrorY = false;
    this.mirrorZ = false;
    this.brushVoxColor = voxColorForRGBT(128, 0, 0);
    this.pendingChunk = null;
    this.hasInFlightOperation = false;
    this.ignoreRemainingBrush = false;
    this.performingUndoOperation = false;
    this.undoStacks = new Map();

    // Show brush when hovering. Only useful for edit mode.
    this.showHoverBrushPreview = false;

    //const store = window.APP.store;

    /*this.lastEquippedEmoji = store.state.equips.launcher;

    window.APP.store.addEventListener("statechanged-equips", () => {
      if (this.lastEquippedEmoji !== store.state.equips.launcher) {
        this.lastEquippedEmoji = store.state.equips.launcher;
        soundEffectsSystem.playSoundOneShot(SOUND_EMOJI_EQUIP);
      }
    });*/
  }

  setColor(r, g, b) {
    this.brushVoxColor = voxColorForRGBT(r, g, b);
  }

  tick() {
    if (!this.enabled) return;

    const { userinput } = this;

    const cursor = this.cursorSystem.rightRemote && this.cursorSystem.rightRemote.components["cursor-controller"];

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
    const brushDown =
      (holdingSpace && !userinput.get(controlPath)) ||
      userinput.get(middlePath) ||
      (isFreeToLeftHold && userinput.get(leftPath));

    const intersection = cursor && cursor.intersection;
    this.performBrushStep(brushDown, intersection);
  }

  performBrushStep = (() => {
    const hitCell = new Vector3();
    const adjacentCell = new Vector3();
    return (brushDown, intersection) => {
      if (!this.enabled) return;

      const { brushStartCell, brushEndCell, brushMode } = this;

      // Repeated build if user is holding space and not control (due to widen)
      let hitVoxId = null;

      if (intersection) {
        hitVoxId = SYSTEMS.voxSystem.getVoxHitFromIntersection(intersection, hitCell, adjacentCell);
      }

      if (hitVoxId) {
        const cellToBrush = brushMode === BRUSH_MODES.ADD ? adjacentCell : hitCell;
        // If we hovered over another vox while brushing, ignore it until we let go.
        if (this.isBrushing && this.targetVoxId !== null && hitVoxId !== this.targetVoxId) return;
        if (this.ignoreRemainingBrush) return;

        let updatePending = false;
        const active = brushDown || this.showHoverBrushPreview;

        // Freeze the mesh when we start hovering.
        if (active && this.targetVoxId === null) {
          this.targetVoxId = hitVoxId;
          this.brushVoxFrame = SYSTEMS.voxSystem.freezeMeshForTargetting(hitVoxId, intersection.instanceId);

          brushStartCell.copy(cellToBrush);
          brushEndCell.copy(cellToBrush);
          updatePending = true;
        }

        if (brushDown && !this.isBrushing) {
          this.isBrushing = true;
        }

        if (active && !brushEndCell.equals(cellToBrush)) {
          updatePending = true;
          brushEndCell.copy(cellToBrush);

          if (!brushDown) {
            // Just a hover, maintain a single cell size pending
            brushStartCell.copy(cellToBrush);
          }
        }

        if (updatePending) {
          if (!this.pendingChunk) {
            // Create a new pending, pending will grow as needed.
            this.pendingChunk = new VoxChunk([2, 2, 2]);
          }

          this.applyCurrentBrushToPendingChunk(hitVoxId);
        }
      } else {
        // No vox was hit this tick. Check if we need to create one.
        //
        // If brush is down, we're not currently brushing, and we have a target,
        // create a vox.
        if (
          brushDown &&
          !this.ignoreRemainingBrush &&
          this.targetVoxId === null &&
          brushMode === BRUSH_MODES.ADD &&
          intersection.point
        ) {
          // Not mid-build, create a new vox.
          this.hasInFlightOperation = true;
          this.ignoreRemainingBrush = true;
          this.createVoxAt(intersection.point).then(() => (this.hasInFlightOperation = false));
        }

        // If we're not brushing, and we had a target vox, we just cursor
        // exited it so hide the pending.
        if (this.targetVoxId !== null && !this.isBrushing) {
          SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);

          this.pendingChunk = null;
          this.targetVoxId = null;
          this.brushEndCell.set(Infinity, Infinity, Infinity);
        }
      }

      // When brush is lifted, apply the pending
      if (!brushDown) {
        if (this.hasInFlightOperation) return;
        this.ignoreRemainingBrush = false;

        if (this.pendingChunk) {
          this.pushToUndoStack(this.targetVoxId, this.brushVoxFrame, this.pendingChunk, [
            brushStartCell.x,
            brushStartCell.y,
            brushStartCell.z
          ]);

          SYSTEMS.voxSystem.applyPendingAndUnfreezeMesh(this.targetVoxId);
          // Uncomment to stop applying changes to help with reproducing bugs.
          //SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);

          this.pendingChunk = null;
        }

        // Clear last build cell when building is off.
        this.isBrushing = false;
        this.targetVoxId = null;
        this.brushVoxFrame = null;

        this.ignoreRemainingBrush = false;
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
    object3D.position.x -= VOXEL_SIZE / 2;
    object3D.position.z -= VOXEL_SIZE / 2;
    object3D.rotation.x = object3D.rotation.y = object3D.rotation.z = 0.0;
    object3D.scale.x = object3D.scale.y = object3D.scale.z = 1.0;
    object3D.matrixNeedsUpdate = true;
  }

  resizePendingPendingChunkToFit(x, y, z) {
    const { pendingChunk } = this;
    const sx = Math.min(Math.max(2, pendingChunk.size[0], Math.abs(x) * 2 + 2), MAX_VOX_SIZE);
    const sy = Math.min(Math.max(2, pendingChunk.size[1], Math.abs(y) * 2 + 2), MAX_VOX_SIZE);
    const sz = Math.min(Math.max(2, pendingChunk.size[2], Math.abs(z) * 2 + 2), MAX_VOX_SIZE);

    // Resize pending if necessary to be able to fit brush end and start cells.
    pendingChunk.resizeTo([sx, sy, sz]);
  }

  applyCurrentBrushToPendingChunk(voxId) {
    const {
      pendingChunk,
      brushType,
      brushMode,
      brushSize,
      brushVoxFrame,
      brushStartCell,
      brushEndCell,
      brushVoxColor,
      mirrorX,
      mirrorY,
      mirrorZ,
      isBrushing
    } = this;

    // Only preview voxel brush
    if (brushType !== BRUSH_TYPES.VOXEL && !isBrushing) {
      return;
    }

    const mirrors = [-1, 1];
    const offsetX = brushStartCell.x;
    const offsetY = brushStartCell.y;
    const offsetZ = brushStartCell.z;

    let px,
      py,
      pz,
      qx,
      qy,
      qz,
      boxMinX,
      boxMinY,
      boxMinZ,
      boxMaxX,
      boxMaxY,
      boxMaxZ,
      minX,
      minY,
      minZ,
      maxX,
      maxY,
      maxZ,
      filter = VOX_CHUNK_FILTERS.NONE;

    if (brushType === BRUSH_TYPES.BOX || brushType == BRUSH_TYPES.FACE) {
      // Box and face slides are materialized in full here, whereas VOXEL is built-up
      pendingChunk.clear();
    }

    const voxNumVoxels = SYSTEMS.voxSystem.getTotalNonEmptyVoxelsOfTargettedFrame(voxId);

    // Perform up to 8 updates to the pending pending chunk based upon mirroring
    for (const mx of mirrors) {
      if (mx === -1 && !mirrorX) continue;

      for (const my of mirrors) {
        if (my === -1 && !mirrorY) continue;

        for (const mz of mirrors) {
          if (mz === -1 && !mirrorZ) continue;

          switch (brushType) {
            case BRUSH_TYPES.VOXEL:
              px = brushEndCell.x * mx - offsetX;
              py = brushEndCell.y * my - offsetY;
              pz = brushEndCell.z * mz - offsetZ;

              // Compute box
              boxMinX = px - Math.floor((brushSize - 1) / 2);
              boxMinY = py - Math.floor((brushSize - 1) / 2);
              boxMinZ = pz - Math.floor((brushSize - 1) / 2);

              boxMaxX = px + Math.ceil((brushSize - 1) / 2);
              boxMaxY = py + Math.ceil((brushSize - 1) / 2);
              boxMaxZ = pz + Math.ceil((brushSize - 1) / 2);

              this.resizePendingPendingChunkToFit(boxMinX, boxMinY, boxMinZ);
              this.resizePendingPendingChunkToFit(boxMaxX, boxMaxY, boxMaxZ);

              [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(pendingChunk.size);

              // Disallow removing last voxel
              //if (brushMode === BRUSH_MODES.REMOVE) {
              //  const voxNumVoxels = SYSTEMS.voxSystem.getTotalNonEmptyVoxelsOfTargettedFrame(voxId);
              //  const pendingNumVoxels = pendingChunk.getTotalNonEmptyVoxels();
              //  if (pendingNumVoxels >= voxNumVoxels - 1) return;
              //}

              // Update pending to have a cell iff its in the box
              loop: for (let x = minX; x <= maxX; x += 1) {
                for (let y = minY; y <= maxY; y += 1) {
                  for (let z = minZ; z <= maxZ; z += 1) {
                    if (x >= boxMinX && x <= boxMaxX && y >= boxMinY && y <= boxMaxY && z >= boxMinZ && z <= boxMaxZ) {
                      // Avoid removing last voxel
                      if (brushMode === BRUSH_MODES.REMOVE && pendingChunk.getTotalNonEmptyVoxels() >= voxNumVoxels - 1)
                        break loop;

                      pendingChunk.setColorAt(
                        x,
                        y,
                        z,
                        brushMode === BRUSH_MODES.REMOVE ? REMOVE_VOXEL_COLOR : brushVoxColor
                      );
                    }
                  }
                }
              }

              filter =
                brushMode === BRUSH_MODES.ADD
                  ? VOX_CHUNK_FILTERS.NONE
                  : brushMode === BRUSH_MODES.PAINT
                    ? VOX_CHUNK_FILTERS.PAINT
                    : VOX_CHUNK_FILTERS.NONE;

              break;
            case BRUSH_TYPES.BOX:
              // Box corner 1 (origin is at start cell)
              px = brushEndCell.x * mx - offsetX;
              py = brushEndCell.y * my - offsetY;
              pz = brushEndCell.z * mz - offsetZ;

              this.resizePendingPendingChunkToFit(px, py, pz);

              // Box corner 2 (origin is at start cell)
              qx = brushStartCell.x * mx - offsetX;
              qy = brushStartCell.y * my - offsetY;
              qz = brushStartCell.z * mz - offsetZ;

              this.resizePendingPendingChunkToFit(qx, qy, qz);

              // Compute box
              boxMinX = Math.min(px, qx);
              boxMinY = Math.min(py, qy);
              boxMinZ = Math.min(pz, qz);

              boxMaxX = Math.max(px, qx);
              boxMaxY = Math.max(py, qy);
              boxMaxZ = Math.max(pz, qz);

              [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(pendingChunk.size);

              // Update pending to have a cell iff its in the box
              loop: for (let x = minX; x <= maxX; x += 1) {
                for (let y = minY; y <= maxY; y += 1) {
                  for (let z = minZ; z <= maxZ; z += 1) {
                    if (x >= boxMinX && x <= boxMaxX && y >= boxMinY && y <= boxMaxY && z >= boxMinZ && z <= boxMaxZ) {
                      // Avoid removing last voxel
                      if (brushMode === BRUSH_MODES.REMOVE && pendingChunk.getTotalNonEmptyVoxels() >= voxNumVoxels - 1)
                        break loop;

                      pendingChunk.setColorAt(
                        x,
                        y,
                        z,
                        brushMode === BRUSH_MODES.REMOVE ? REMOVE_VOXEL_COLOR : brushVoxColor
                      );
                    }
                  }
                }
              }

              filter =
                brushMode === BRUSH_MODES.ADD
                  ? VOX_CHUNK_FILTERS.KEEP
                  : brushMode === BRUSH_MODES.PAINT
                    ? VOX_CHUNK_FILTERS.PAINT
                    : VOX_CHUNK_FILTERS.NONE;
              break;
          }
        }
      }
    }

    // Pending filter:
    //
    // In ADD mode, maintain existing voxel colors in BOX mode.
    // In PAINT mode, don't add new voxels.

    if (filter !== VOX_CHUNK_FILTERS.NONE) {
      SYSTEMS.voxSystem.filterChunkByVoxFrame(pendingChunk, offsetX, offsetY, offsetZ, voxId, brushVoxFrame, filter);
    }

    // Update the pending chunk
    SYSTEMS.voxSystem.setPendingVoxChunk(voxId, pendingChunk, offsetX, offsetY, offsetZ);
  }

  pushToUndoStack(voxId, frame, pending, offset) {
    const { undoStacks } = this;
    const stackKey = `${voxId}_${frame}`;

    let stack = undoStacks.get(stackKey);

    if (!stack) {
      stack = {
        backward: new Array(MAX_UNDO_STEPS).fill(null),
        forward: new Array(MAX_UNDO_STEPS).fill(null),
        position: 0
      };

      undoStacks.set(stackKey, stack);
    }

    if (stack.position === MAX_UNDO_STEPS - 1) {
      // Stack is full, shift everything over.
      // We could use a circular buffer but then would need to maintain two pointers, this is easier.
      stack.position -= 1;

      for (let i = 0; i < MAX_UNDO_STEPS - 1; i++) {
        stack.forward[i] = stack.forward[i + 1];
        stack.backward[i] = stack.backward[i + 1];
      }
    }

    const { backward, forward, position } = stack;
    const undoPending = SYSTEMS.voxSystem.createPendingInverse(voxId, frame, pending, offset);
    if (!undoPending) return;

    // Stack slot at position has pendinges to apply to move forward/backwards.
    const newPosition = position + 1; // We're going to move forwards in the stack.
    backward[newPosition] = [undoPending, offset]; // Add the undo pending
    forward.fill(null, newPosition); // Free residual redos ahead of us
    forward[position] = [pending.clone(), offset]; // The previous stack frame can now move forward to this one
    stack.position = newPosition;
  }

  async applyUndo(voxId, frame) {
    const { undoStacks, hasInFlightOperation } = this;
    if (hasInFlightOperation) return;

    const stackKey = `${voxId}_${frame}`;
    const stack = undoStacks.get(stackKey);
    if (!stack) return;

    const { backward, position } = stack;
    if (!backward[position]) return;

    this.hasInFlightOperation = true;
    const [pending, offset] = backward[position];

    const sync = await SYSTEMS.voxSystem.getSync(voxId);
    stack.position--;
    sync.applyChunk(pending, frame, offset);
    this.hasInFlightOperation = false;
  }

  async applyRedo(voxId, frame) {
    const { undoStacks, hasInFlightOperation } = this;
    if (hasInFlightOperation) return;

    const stackKey = `${voxId}_${frame}`;
    const stack = undoStacks.get(stackKey);
    if (!stack) return;

    const { forward, position } = stack;
    if (!forward[position]) return;

    this.hasInFlightOperation = true;
    const [pending, offset] = forward[position];

    const sync = await SYSTEMS.voxSystem.getSync(voxId);
    stack.position++;
    sync.applyChunk(pending, frame, offset);
    this.hasInFlightOperation = false;
  }

  clearUndoStacks() {
    this.undoStacks.clear();
  }
}

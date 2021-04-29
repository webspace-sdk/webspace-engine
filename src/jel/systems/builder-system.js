import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { addMedia } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import {
  VoxChunk,
  xyzRangeForSize,
  voxColorForRGBT,
  REMOVE_VOXEL_COLOR,
  VOX_CHUNK_FILTERS,
  MAX_SIZE as MAX_VOX_SIZE
} from "ot-vox";

//import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";

const WHEEL_THRESHOLD = 0.15;
const MAX_UNDO_STEPS = 32;

const { Vector3 } = THREE;
import { createVox } from "../../hubs/utils/phoenix-utils";

const HALF_MAX_VOX_SIZE = Math.floor(MAX_VOX_SIZE / 2);

// Temp variables for crawling:
// Set of already crawled cells.
const crawled = new Set();

// Cells enqueued to crawl.
const queue = [];

// Converts x, y, z of a vox to a unique int key
const xyzToInt = (x, y, z) =>
  ((x + HALF_MAX_VOX_SIZE + 1) << 16) | ((y + HALF_MAX_VOX_SIZE + 1) << 8) | (z + HALF_MAX_VOX_SIZE + 1);

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
  BOX: 0,
  SPHERE: 1
};

const BRUSH_CRAWL_TYPES = {
  GEO: 0,
  COLOR: 1
};

const BRUSH_CRAWL_EXTENTS = {
  NSEW: 0,
  ALL: 1
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
    this.targetVoxFrame = null;
    this.brushStartCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushEndCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushType = BRUSH_TYPES.VOXEL;
    this.brushMode = BRUSH_MODES.ADD;
    this.brushShape = BRUSH_SHAPES.BOX;
    this.brushCrawlType = BRUSH_CRAWL_TYPES.GEO;
    this.brushCrawlExtents = BRUSH_CRAWL_EXTENTS.NSEW;
    this.brushCrawlChunk = null;
    this.brushSize = 6;

    this.isBrushing = false;
    this.mirrorX = false;
    this.mirrorY = false;
    this.mirrorZ = false;
    this.brushVoxColor = voxColorForRGBT(128, 0, 0);
    this.pendingChunk = null;
    this.hasInFlightOperation = false;
    this.ignoreRestOfStroke = false;
    this.performingUndoOperation = false;
    this.undoStacks = new Map();

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

      const { brushStartCell, brushEndCell, brushType, brushMode } = this;

      // Repeated build if user is holding space and not control (due to widen)
      let hitVoxId = null;

      if (intersection) {
        hitVoxId = SYSTEMS.voxSystem.getVoxHitFromIntersection(intersection, hitCell, adjacentCell);
      }

      // Skip updating pending if we're ready to apply it.
      const canApplyThisTick = this.isBrushing && !brushDown;

      if (hitVoxId && !canApplyThisTick) {
        const cellToBrush = brushMode === BRUSH_MODES.ADD && brushType !== BRUSH_TYPES.FACE ? adjacentCell : hitCell;
        // If we hovered over another vox while brushing, ignore it until we let go.
        if (this.isBrushing && this.targetVoxId !== null && hitVoxId !== this.targetVoxId) return;
        if (this.ignoreRestOfStroke) return;

        let updatePending = false;

        // Freeze the mesh when we start hovering.
        if (this.targetVoxId !== hitVoxId) {
          if (this.targetVoxId) {
            // Direct hover from one vox to another, clear old pending.
            SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);
            this.pendingChunk = null;
          }

          this.targetVoxId = hitVoxId;
          this.targetVoxFrame = SYSTEMS.voxSystem.freezeMeshForTargetting(hitVoxId, intersection.instanceId);

          brushStartCell.copy(cellToBrush);
          brushEndCell.copy(cellToBrush);
          updatePending = true;
        }

        if (brushDown && !this.isBrushing) {
          this.isBrushing = true;

          if (this.brushType === BRUSH_TYPES.FACE) {
            this.brushCrawlChunk = this.buildCrawlChunkAt(cellToBrush);
            console.log(this.brushCrawlChunk.toJSON("", true));
          }
        }

        if (!brushEndCell.equals(cellToBrush)) {
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
          !this.ignoreRestOfStroke &&
          this.targetVoxId === null &&
          brushMode === BRUSH_MODES.ADD &&
          intersection &&
          intersection.point
        ) {
          // Not mid-build, create a new vox.
          this.hasInFlightOperation = true;
          this.ignoreRestOfStroke = true;
          this.createVoxAt(intersection.point)
            .then(() => (this.hasInFlightOperation = false))
            .catch(() => {
              // Rate limiting or backend error
              this.hasInFlightOperation = false;
              this.ignoreRestOfStroke = false;
            });
        }

        // If we're not brushing, and we had a target vox, we just cursor
        // exited it so hide the pending.
        if (this.targetVoxId !== null && !this.isBrushing) {
          SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);

          this.pendingChunk = null;
          this.targetVoxId = null;
          this.targetVoxFrame = null;
          this.brushEndCell.set(Infinity, Infinity, Infinity);
        }
      }

      if (!brushDown) {
        if (this.hasInFlightOperation) return;
        this.ignoreRestOfStroke = false;

        // When brush is lifted, apply the pending
        if (this.isBrushing) {
          if (this.pendingChunk) {
            this.pushToUndoStack(this.targetVoxId, this.targetVoxFrame, this.pendingChunk, [
              brushStartCell.x,
              brushStartCell.y,
              brushStartCell.z
            ]);

            SYSTEMS.voxSystem.applyPendingAndUnfreezeMesh(this.targetVoxId);
            // Uncomment to stop applying changes to help with reproducing bugs.
            //SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);

            this.pendingChunk = null;
          }

          this.isBrushing = false;
          this.targetVoxId = null;
          this.targetVoxFrame = null;
          this.brushCrawlChunk = null;
          this.brushEndCell.set(Infinity, Infinity, Infinity);
        }

        this.ignoreRestOfStroke = false;
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

  applyCurrentBrushToPendingChunk(voxId) {
    const {
      pendingChunk,
      brushType,
      brushMode,
      brushSize,
      brushShape,
      targetVoxFrame,
      brushStartCell,
      brushEndCell,
      brushVoxColor,
      mirrorX,
      mirrorY,
      mirrorZ,
      isBrushing
    } = this;

    // Only preview voxel brush, box + face brushes don't apply
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
      rSq,
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

              rSq = ((boxMaxX - boxMinX) * (boxMaxX - boxMinX)) / 4;

              pendingChunk.resizeToFit(boxMinX, boxMinY, boxMinZ);
              pendingChunk.resizeToFit(boxMaxX, boxMaxY, boxMaxZ);

              [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(pendingChunk.size);

              // Update pending to have a cell iff its in the box
              loop: for (let x = minX; x <= maxX; x += 1) {
                for (let y = minY; y <= maxY; y += 1) {
                  for (let z = minZ; z <= maxZ; z += 1) {
                    if (x >= boxMinX && x <= boxMaxX && y >= boxMinY && y <= boxMaxY && z >= boxMinZ && z <= boxMaxZ) {
                      // Avoid removing last voxel
                      if (brushMode === BRUSH_MODES.REMOVE && pendingChunk.getTotalNonEmptyVoxels() >= voxNumVoxels - 1)
                        break loop;

                      if (brushShape === BRUSH_SHAPES.SPHERE) {
                        // With offset, brush is centered at zero.
                        // If x, y, z is beyond radius for round brush, don't add it.
                        const distSq = Math.pow(x - px, 2.0) + Math.pow(y - py, 2.0) + Math.pow(z - pz, 2.0);

                        if (distSq > rSq) continue;
                      }

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

              pendingChunk.resizeToFix(px, py, pz);

              // Box corner 2 (origin is at start cell)
              qx = brushStartCell.x * mx - offsetX;
              qy = brushStartCell.y * my - offsetY;
              qz = brushStartCell.z * mz - offsetZ;

              pendingChunk.resizetoFit(qx, qy, qz);

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
      SYSTEMS.voxSystem.filterChunkByVoxFrame(pendingChunk, offsetX, offsetY, offsetZ, voxId, targetVoxFrame, filter);
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

  // omitAxis: 0 - x, 1 - y, 2 - z
  //   axis to not crawl along.
  buildCrawlChunkAt(origin, omitAxis = 0) {
    const { targetVoxId, targetVoxFrame, brushCrawlType, brushCrawlExtents } = this;
    const color = SYSTEMS.voxSystem.getVoxColorAt(targetVoxId, targetVoxFrame, origin.x, origin.y, origin.z);

    const chunk = new VoxChunk([2, 2, 2]);
    const colorMatch = brushCrawlType === BRUSH_CRAWL_TYPES.COLOR;

    // No voxel at crawl origin cell, shouldn't happen.
    if (color === null) return chunk;

    const maxSize = SYSTEMS.voxSystem.getVoxSize(targetVoxId, targetVoxFrame);
    const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(maxSize);

    crawled.clear();
    queue.length = 0;

    queue.push(origin.x, origin.y, origin.z);

    while (queue.length > 0) {
      const z = queue.pop();
      const y = queue.pop();
      const x = queue.pop();

      crawled.add(xyzToInt(x, y, z));

      const c = SYSTEMS.voxSystem.getVoxColorAt(targetVoxId, targetVoxFrame, x, y, z);

      // If cell at x, y, z has a color match or geo match, recurse.
      const match = (colorMatch && c === color) || (!colorMatch && c !== null);
      if (!match) continue;

      chunk.setColorAt(x, y, z, c);

      for (let nx = -1; nx <= 1; nx++) {
        for (let ny = -1; ny <= 1; ny++) {
          for (let nz = -1; nz <= 1; nz++) {
            const ax = Math.abs(nx);
            const ay = Math.abs(ny);
            const az = Math.abs(nz);

            // Calculate manhattan distance for next cell to consider
            const dist = ax + ay + az;
            if (dist === 0) continue; // Skip (0, 0, 0) loop iteration

            // Do not crawl along omitted axis
            if ((ax > 0 && omitAxis === 0) || (ay > 0 && omitAxis === 1) || (az > 0 && omitAxis === 2)) continue;

            // If NSEW mode, skip diagonal walks.
            if (dist >= 2 && brushCrawlExtents === BRUSH_CRAWL_EXTENTS.NSEW) continue;
            const cx = x + nx;
            const cy = y + ny;
            const cz = z + nz;

            const inRange = cx >= minX && cx <= maxX && cy >= minY && cy <= maxY && cz >= minZ && cz <= maxZ;

            if (!inRange) continue;

            // Don't re-visit cells.
            if (crawled.has(xyzToInt(cx, cy, cz))) continue;

            queue.push(cx, cy, cz);
          }
        }
      }
    }

    return chunk;
  }

  clearUndoStacks() {
    this.undoStacks.clear();
  }
}

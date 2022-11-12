import { paths } from "../../hubs/systems/userinput/paths";
import { CURSOR_LOCK_STATES, getCursorLockState } from "../../jel/utils/dom-utils";
import { isLockedMedia } from "../../hubs/utils/media-utils";
import { getWorldColor } from "../objects/terrain";
import { EventTarget } from "event-target-shim";
import { storedColorToRgb } from "../../hubs/storage/store";
import { VOXEL_SIZE } from "../objects/vox-chunk-buffer-geometry";
import {
  BRUSH_TYPES,
  BRUSH_MODES,
  BRUSH_SHAPES,
  BRUSH_CRAWL_TYPES,
  BRUSH_CRAWL_EXTENTS,
  BRUSH_COLOR_FILL_MODE
} from "../constants";
import {
  rgbtForVoxColor,
  Voxels,
  xyzRangeForSize,
  voxColorForRGBT,
  REMOVE_VOXEL_COLOR,
  VOXEL_FILTERS,
  MAX_SIZE as MAX_VOX_SIZE
} from "smoothvoxels";

import { SOUND_EMOJI_EQUIP } from "../../hubs/systems/sound-effects-system";

const WHEEL_THRESHOLD = 0.15;
const MAX_UNDO_STEPS = 32;

const { Vector3, Matrix4, Raycaster, MeshBasicMaterial, Mesh, PlaneBufferGeometry } = THREE;

const HALF_MAX_VOX_SIZE = Math.floor(MAX_VOX_SIZE / 2);

// Converts x, y, z of a vox to a unique int key
const xyzToInt = (x, y, z) =>
  ((x + HALF_MAX_VOX_SIZE + 1) << 16) | ((y + HALF_MAX_VOX_SIZE + 1) << 8) | (z + HALF_MAX_VOX_SIZE + 1);

const UNDO_OPS = {
  NONE: 0,
  UNDO: 1,
  REDO: 2
};

// Deals with block building
export class BuilderSystem extends EventTarget {
  constructor(sceneEl, userinput, soundEffectsSystem, cursorSystem) {
    super();
    this.sceneEl = sceneEl;
    this.userinput = userinput;
    this.soundEffectsSystem = soundEffectsSystem;
    this.cursorSystem = cursorSystem;

    this.enabled = false;
    this.deltaWheel = 0.0;
    this.sawLeftButtonUpWithShift = false;

    // Current vox + instance info
    this.targetVoxId = null;
    this.targetVoxFrame = null;
    this.targetVoxInstanceMatrixWorld = new Matrix4();
    this.targetVoxInstanceScale = 1.0;

    // Brush settings + active face info for FACE brush
    this.brushStartCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushStartWorldPoint = new Vector3(Infinity, Infinity, Infinity);
    this.brushFaceNormal = new Vector3(Infinity, Infinity, Infinity);
    this.brushFaceWorldNormal = new Vector3(Infinity, Infinity, Infinity);
    this.brushEndCell = new Vector3(Infinity, Infinity, Infinity);
    this.brushType = BRUSH_TYPES.VOXEL;
    this.prePickBrushType = null;
    this.brushMode = BRUSH_MODES.ADD;
    this.brushColorFillMode = BRUSH_COLOR_FILL_MODE.SELECTED;
    this.brushShape = BRUSH_SHAPES.BOX;
    this.brushCrawlType = BRUSH_CRAWL_TYPES.GEO;
    this.brushCrawlExtents = BRUSH_CRAWL_EXTENTS.NSEW;
    this.brushFace = null;
    this.brushSize = 1;
    this.brushFaceSweep = 1;
    this.undoOpOnNextTick = UNDO_OPS.NONE;
    this.setPickForAlt = false;

    this.isBrushing = false;
    this.lastHoverTime = 0;
    this.mirrorX = false;
    this.mirrorY = false;
    this.mirrorZ = false;
    this.brushVoxColor = null;
    this.pendingChunk = null;
    this.hasInFlightOperation = false;
    this.ignoreRestOfStroke = false;
    this.performingUndoOperation = false;
    this.undoStacks = new Map();

    // Invisible plane used for dragging out/in faces.
    const sweepPlaneMat = new MeshBasicMaterial();
    sweepPlaneMat.visible = false;
    this.sweepPlane = new Mesh(new PlaneBufferGeometry(100, 100), sweepPlaneMat);

    const { store } = window.APP;

    this.lastEquippedColor = store.state.equips.color;

    store.addEventListener("statechanged-equips", () => {
      this.updateBrushVoxColorFromStore();

      if (this.lastEquippedColor !== store.state.equips.color) {
        this.lastEquippedColor = store.state.equips.color;
        soundEffectsSystem.playSoundOneShot(SOUND_EMOJI_EQUIP);
      }
    });

    this.updateBrushVoxColorFromStore();
  }

  toggle() {
    this.enabled = !this.enabled;
    this.dispatchEvent(new CustomEvent("enabledchanged"));

    if (!this.enabled) {
      this.cancelPending();
    }
  }

  updateBrushVoxColorFromStore() {
    const { r, g, b } = storedColorToRgb(window.APP.store.state.equips.color);
    this.brushVoxColor = voxColorForRGBT(r, g, b);
  }

  setColor(r, g, b) {
    this.brushVoxColor = voxColorForRGBT(r, g, b);
  }

  setBrushSize(brushSize) {
    this.brushSize = brushSize || 1;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushType(brushType) {
    if (brushType === BRUSH_TYPES.PICK) {
      this.prePickBrushType = this.brushType;
    } else {
      this.prePickBrushType = null;
    }

    this.brushType = brushType;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushMode(brushMode) {
    this.brushMode = brushMode;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushShape(brushShape) {
    this.brushShape = brushShape;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  toggleMirrorX() {
    this.mirrorX = !this.mirrorX;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  toggleMirrorY() {
    this.mirrorY = !this.mirrorY;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  toggleMirrorZ() {
    this.mirrorZ = !this.mirrorZ;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushCrawlType(crawlType) {
    this.brushCrawlType = crawlType;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushCrawlExtents(crawlExtents) {
    this.brushCrawlExtents = crawlExtents;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  setBrushColorFillMode(colorFillMode) {
    this.brushColorFillMode = colorFillMode;
    this.dispatchEvent(new CustomEvent("settingschanged"));
  }

  tick() {
    if (!this.enabled) return;

    this.transformSystem = this.transformSystem || this.sceneEl.systems["transform-selected-object"];
    const isGrabTransforming = this.transformSystem.isGrabTransforming();

    const { userinput, sceneEl } = this;

    if (!this.playerCamera) {
      this.playerCamera = DOM_ROOT.getElementById("viewing-camera").getObject3D("camera");
      if (!this.playerCamera) return;
    }

    const cursor = this.cursorSystem.rightRemote && this.cursorSystem.rightRemote.components["cursor-controller"];

    const spacePath = paths.device.keyboard.key(" ");
    const middlePath = paths.device.mouse.buttonMiddle;
    const leftPath = paths.device.mouse.buttonLeft;
    const controlPath = paths.device.keyboard.key("control");
    const shiftPath = paths.device.keyboard.key("shift");
    const altPath = paths.device.keyboard.key("alt");

    const holdingLeft = userinput.get(leftPath);
    const holdingMiddle = userinput.get(middlePath);
    const holdingSpace = userinput.get(spacePath);
    const holdingAlt = userinput.get(altPath);
    const holdingShift = userinput.get(shiftPath);
    const wheel = userinput.get(paths.actions.equipScroll);

    if (holdingAlt) {
      if (!this.setPickForAlt) {
        this.setPickForAlt = true;
        this.cancelPending();

        this.setBrushType(BRUSH_TYPES.PICK);
      }
    } else {
      if (this.setPickForAlt && this.prePickBrushType !== null) {
        this.setBrushType(this.prePickBrushType);
      }
      this.setPickForAlt = false;
    }

    if (holdingShift && !holdingLeft) {
      this.sawLeftButtonUpWithShift = true;
    } else if (!holdingShift) {
      this.sawLeftButtonUpWithShift = false;
    }

    if (wheel && wheel !== 0.0) {
      this.deltaWheel += wheel;
    }

    if (Math.abs(this.deltaWheel) > WHEEL_THRESHOLD) {
      const { store } = window.APP;
      const colorPage = store.state.equips.colorPage;
      const equipDirection = this.deltaWheel < 0.0 ? -1 : 1;
      this.deltaWheel = 0.0;
      let currentSlot = -1;

      for (let i = 0; i < 10; i++) {
        if (store.state.equips.color === store.state.equips[`colorSlot${colorPage * 10 + i + 1}`]) {
          currentSlot = i;
          break;
        }
      }

      if (currentSlot !== -1) {
        let newSlot = (currentSlot + equipDirection) % 10;
        newSlot = newSlot < 0 ? 9 : newSlot;
        store.update({ equips: { color: store.state.equips[`colorSlot${colorPage * 10 + newSlot + 1}`] } });
      }
    }

    const isFreeToLeftHold =
      getCursorLockState() == CURSOR_LOCK_STATES.LOCKED_PERSISTENT || (holdingShift && this.sawLeftButtonUpWithShift);

    let brushDown;

    // If inspecting, assume in edit mode since otherwise cursor wouldn't be working.
    if (SYSTEMS.cameraSystem.isInspecting()) {
      brushDown = holdingLeft;
    } else {
      // Repeated build if user is holding space and not control (due to widen)
      brushDown = (holdingSpace && !userinput.get(controlPath)) || holdingMiddle || (isFreeToLeftHold && holdingLeft);
    }

    if (brushDown && this.transformSystem.isGrabTransforming()) {
      // Don't start brushing if the object was being grabbed transform. Holding space can cause this.
      this.ignoreRestOfStroke = true;
    }

    const interaction = sceneEl.systems.interaction;
    const intersection = cursor && cursor.intersection;
    const isLocked = intersection && isLockedMedia(interaction.getRightRemoteHoverTarget());

    if (!isGrabTransforming) {
      this.performBrushStep(brushDown, intersection, isLocked);
    }

    if (isLocked && this.pendingChunk && !this.isBrushing) {
      this.cancelPending();
    }

    this.undoOpOnNextTick = UNDO_OPS.NONE;
  }

  performBrushStep = (() => {
    const hitCell = new Vector3();
    const hitNormal = new Vector3();
    const adjacentCell = new Vector3();
    const startToSweep = new Vector3();
    const tmpScale = new Vector3();
    const sweepRaycaster = new Raycaster();
    const intersectTargets = [null];
    const intersections = [];

    sweepRaycaster.firstHitOnly = true; // flag specific to three-mesh-bvh
    sweepRaycaster.near = 0.0001;
    sweepRaycaster.far = 100.0;

    return (brushDown, intersection, isHoveringOnLocked) => {
      if (!this.enabled) return;

      const now = performance.now();
      const { voxMetadata } = window.APP;

      if (isHoveringOnLocked) {
        return;
      }

      const {
        brushStartCell,
        brushStartWorldPoint,
        brushFaceNormal,
        brushFaceWorldNormal,
        brushEndCell,
        brushType,
        brushMode,
        sceneEl
      } = this;
      const scene = sceneEl.object3D;

      let hitVoxId = null;
      let hitWorldPoint = null;
      let hitObject;
      let hitInstanceId;

      if (intersection) {
        hitVoxId = SYSTEMS.voxSystem.getVoxHitFromIntersection(intersection, hitCell, hitNormal, adjacentCell);
        hitWorldPoint = intersection.point;
        hitObject = intersection.object;
        hitInstanceId = intersection.instanceId;
      }

      // Skip updating pending this tick if we're ready to apply it.
      const readyToApplyPendingThisTick = this.isBrushing && !brushDown;

      // True when the pending chunk need to be updated/rebuilt.
      let updatePending = false;

      // Do raycast to sweep plane if it's active.
      if (this.isBrushing && this.sweepPlane.parent !== null) {
        const userinput = sceneEl.systems.userinput;
        const cursorPose = userinput.get(paths.actions.cursor.right.pose);
        sweepRaycaster.ray.origin = cursorPose.position;
        sweepRaycaster.ray.direction = cursorPose.direction;
        intersectTargets[0] = this.sweepPlane;
        this.sweepPlane.updateMatrices();
        intersections.length = 0;
        sweepRaycaster.intersectObjects(intersectTargets, true, intersections);

        if (intersections.length > 0) {
          const sweepHitPoint = intersections[0].point;

          // Allow pulling out if ADD, pushing in if REMOVE
          //
          // Check the dot product to determine if the user has pulled out
          // of the object or pushed into it.
          startToSweep.copy(sweepHitPoint);
          startToSweep.sub(brushStartWorldPoint);
          startToSweep.normalize();

          const dot = brushFaceWorldNormal.dot(startToSweep);

          if ((dot >= 0.01 && brushMode === BRUSH_MODES.ADD) || (dot <= -0.01 && brushMode === BRUSH_MODES.REMOVE)) {
            const dist = sweepHitPoint.distanceTo(brushStartWorldPoint);
            const newBrushFaceSweep = Math.floor(
              Math.max(1.0, (dist / VOXEL_SIZE) * (1.0 / this.targetVoxInstanceScale))
            );

            if (newBrushFaceSweep !== this.brushFaceSweep) {
              this.brushFaceSweep = newBrushFaceSweep;
              updatePending = true;
            }
          }
        }
      }

      // Pick tool over non-vox, look up vertex color if possible
      if (
        brushDown &&
        !this.isBrushing &&
        !hitVoxId &&
        !this.ignoreRestOfStroke &&
        this.brushType === BRUSH_TYPES.PICK
      ) {
        this.pickColorAtIntersection(intersection);
        this.ignoreRestOfStroke = true;
      }

      if (hitVoxId) {
        this.lastHoverTime = now;
      }

      if (this.targetVoxId && !voxMetadata.hasOrIsPendingMetadata(this.targetVoxId)) {
        voxMetadata.ensureMetadataForIds([this.targetVoxId]);
      }

      let isDenied = this.targetVoxId && !SYSTEMS.voxSystem.canEdit(this.targetVoxId);
      const isPublished =
        this.targetVoxId &&
        voxMetadata.hasMetadata(this.targetVoxId) &&
        voxMetadata.getMetadata(this.targetVoxId).is_published;

      if (isDenied && this.pendingChunk) {
        SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);
        this.pendingChunk = null;
      }

      if (hitVoxId && !readyToApplyPendingThisTick && (!isDenied || isPublished)) {
        if (this.undoOpOnNextTick !== UNDO_OPS.NONE && this.targetVoxId !== null && this.targetVoxFrame !== null) {
          if (this.undoOpOnNextTick === UNDO_OPS.UNDO) {
            this.applyUndo(this.targetVoxId, this.targetVoxFrame);
          } else {
            this.applyRedo(this.targetVoxId, this.targetVoxFrame);
          }
        } else {
          const cellToBrush = brushMode === BRUSH_MODES.ADD && brushType !== BRUSH_TYPES.FACE ? adjacentCell : hitCell;
          // If we hovered over another vox while brushing, ignore it until we end the stroke.
          const skipDueToAnotherHover = this.isBrushing && this.targetVoxId !== null && hitVoxId !== this.targetVoxId;

          if (!skipDueToAnotherHover && !this.ignoreRestOfStroke) {
            // Hacky, presumes non-frozen meshes are instanced meshes.
            const isHittingFrozenMesh = typeof intersection.instanceId !== "number";
            // Freeze the mesh when we start hovering over a vox.
            if (this.targetVoxId !== hitVoxId) {
              if (this.targetVoxId) {
                // Direct hover from one vox to another, clear old pending.
                SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);
                SYSTEMS.voxSystem.setShowVoxGeometry(hitVoxId, false);
                this.pendingChunk = null;
                this.targetVoxId = null;
                this.targetVoxFrame = null;
              }

              // If the cursor is on a real, unfrozen vox, freeze it.
              // (Sometimes cursor can be hovering on frozen mesh for a single frame)
              if (!isHittingFrozenMesh) {
                this.targetVoxId = hitVoxId;
                this.targetVoxFrame = SYSTEMS.voxSystem.freezeMeshForTargetting(hitVoxId, intersection.instanceId);
                SYSTEMS.voxSystem.setShowVoxGeometry(hitVoxId, true);

                voxMetadata.ensureMetadataForIds([this.targetVoxId]);

                if (typeof hitInstanceId === "number") {
                  hitObject.getMatrixAt(hitInstanceId, this.targetVoxInstanceMatrixWorld);
                } else {
                  hitObject.updateMatrices();
                  this.targetVoxInstanceMatrixWorld.copy(hitObject.matrixWorld);
                }

                const elements = this.targetVoxInstanceMatrixWorld.elements;
                this.targetVoxInstanceScale = tmpScale.set(elements[0], elements[1], elements[2]).length();

                isDenied = !SYSTEMS.voxSystem.canEdit(this.targetVoxId);

                brushStartCell.copy(cellToBrush);
                brushEndCell.copy(cellToBrush);
                updatePending = true;
              }
            }

            if (brushDown && !this.isBrushing && voxMetadata.hasMetadata(this.targetVoxId)) {
              const isNonPublished = !voxMetadata.getMetadata(this.targetVoxId).is_published;

              if (isNonPublished) {
                // Begin brushing!
                this.isBrushing = true;
                brushStartWorldPoint.copy(intersection.point);

                brushFaceNormal.copy(hitNormal);
                brushFaceWorldNormal.copy(hitNormal);
                brushFaceWorldNormal.transformDirection(this.targetVoxInstanceMatrixWorld);

                updatePending = true;

                if (this.brushType === BRUSH_TYPES.FACE) {
                  this.startFaceBrushStroke(hitCell, hitNormal, hitWorldPoint, hitObject, hitInstanceId);
                } else if (this.brushType === BRUSH_TYPES.FILL) {
                  // For fill crawl the whole thing.
                  [, this.pendingChunk] = this.crawlIntoChunkAt(hitCell, 0, this.brushVoxColor);

                  // Update the pending chunk + apply it immediately
                  SYSTEMS.voxSystem.setPendingVoxChunk(this.targetVoxId, this.pendingChunk, 0, 0, 0);
                  this.pushToUndoStack(this.targetVoxId, this.targetVoxFrame, this.pendingChunk, [0, 0, 0]);
                  SYSTEMS.voxSystem.applyPendingAndUnfreezeMesh(this.targetVoxId);
                  this.pendingChunk = null;

                  // Fill is one-and-done, and ignores mode
                  updatePending = false;
                  this.ignoreRestOfStroke = true;
                } else if (this.brushType === BRUSH_TYPES.PICK) {
                  // Pick tool over non-vox
                  const color = SYSTEMS.voxSystem.getVoxColorAt(
                    this.targetVoxId,
                    this.targetVoxFrame,
                    hitCell.x,
                    hitCell.y,
                    hitCell.z
                  );

                  const rgbt = rgbtForVoxColor(color);

                  this.handlePick(rgbt);

                  updatePending = false;
                  this.ignoreRestOfStroke = true;
                }
              } else {
                // Started brushing on a published vox.
                this.ignoreRestOfStroke = true;
                SYSTEMS.voxSystem.bakeOrInstantiatePublishedVoxEntities(this.targetVoxId).then(() => {
                  this.ignoreRestOfStroke = false;
                });
              }
            }

            if (!brushEndCell.equals(cellToBrush)) {
              updatePending = true;
              brushEndCell.copy(cellToBrush);

              if (!brushDown) {
                // Just a hover, maintain a single cell size pending
                brushStartCell.copy(cellToBrush);
                brushFaceNormal.copy(hitNormal);
              }
            }
          }
        }
      } else if (!hitVoxId) {
        // If we're not brushing, and we had a target vox, we just cursor
        // exited from hover so clear the pending.
        if (this.targetVoxId !== null && !this.isBrushing) {
          this.cancelPending();
          SYSTEMS.voxSystem.setShowVoxGeometry(this.targetVoxId, false);
          this.brushEndCell.set(Infinity, Infinity, Infinity);
        }
      }

      if (this.targetVoxId && updatePending && (!isDenied || isPublished)) {
        if (!this.pendingChunk) {
          // Create a new pending, pending will grow as needed.
          this.pendingChunk = new Voxels([1, 1, 1]);
        }

        this.applyCurrentBrushToPendingChunk(this.targetVoxId);
      }

      if (!brushDown && !isDenied) {
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
            //
            // Uncomment below to stop applying changes to help with reproducing bugs with brushes.
            // SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);

            this.pendingChunk = null;
          } else {
            SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);
          }

          if (this.sweepPlane) {
            scene.remove(this.sweepPlane);
          }

          this.isBrushing = false;
          this.targetVoxId = null;
          this.targetVoxFrame = null;
          this.brushFace = null;
          this.brushEndCell.set(Infinity, Infinity, Infinity);
        }

        this.ignoreRestOfStroke = false;
      }
    };
  })();

  handlePick(rgbt) {
    this.dispatchEvent(new CustomEvent("picked_color", { detail: rgbt }));
  }

  applyCurrentBrushToPendingChunk(voxId) {
    const {
      pendingChunk,
      brushType,
      brushMode,
      brushSize,
      brushShape,
      brushColorFillMode,
      targetVoxFrame,
      brushStartCell,
      brushFaceColor,
      brushFaceNormal,
      brushFaceSweep,
      brushEndCell,
      brushFace,
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
      faceMinX,
      faceMinY,
      faceMinZ,
      faceMaxX,
      faceMaxY,
      faceMaxZ,
      rSq,
      dx,
      dy,
      dz,
      boxU,
      boxV,
      filter = VOXEL_FILTERS.NONE;

    if (
      !this.isBrushing ||
      brushType === BRUSH_TYPES.BOX ||
      brushType === BRUSH_TYPES.FACE ||
      brushType === BRUSH_TYPES.CENTER
    ) {
      // Box and face slides are materialized in full here, whereas VOXEL is built-up
      pendingChunk.clear();
    }

    const voxNumVoxels = SYSTEMS.voxSystem.getTotalNonEmptyVoxelsOfTargettedFrame(voxId);

    // Axis of the normal for start of the brush
    const axis = brushFaceNormal.x !== 0 ? 1 : brushFaceNormal.y !== 0 ? 2 : 3;

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

              // Add a bit to the radius based upon visual tuning
              rSq = ((boxMaxX - boxMinX) * (boxMaxX - boxMinX)) / 4 + (brushSize > 4 ? 1.0 : 0);

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
                  ? VOXEL_FILTERS.NONE
                  : brushMode === BRUSH_MODES.PAINT
                    ? VOXEL_FILTERS.PAINT
                    : VOXEL_FILTERS.NONE;

              break;
            case BRUSH_TYPES.FACE:
              [faceMinX, faceMaxX, faceMinY, faceMaxY, faceMinZ, faceMaxZ] = xyzRangeForSize(brushFace.size);

              // Outer loop is how many face copies to stack into brush
              for (let x = faceMinX; x <= faceMaxX; x++) {
                for (let y = faceMinY; y <= faceMaxY; y++) {
                  for (let z = faceMinZ; z <= faceMaxZ; z++) {
                    for (
                      let h = brushMode === BRUSH_MODES.ADD ? 1 : 0;
                      h <
                      (brushMode === BRUSH_MODES.PAINT
                        ? 1
                        : brushMode === BRUSH_MODES.ADD
                          ? brushFaceSweep + 1
                          : brushFaceSweep);
                      h++
                    ) {
                      if (!brushFace.hasVoxelAt(x, y, z)) continue;

                      px =
                        axis === 1
                          ? h * mx * (brushMode === BRUSH_MODES.REMOVE ? -1 : 1) * brushFaceNormal.x +
                            (mx < 0 ? -2 * offsetX : 0)
                          : x * mx - offsetX;
                      py =
                        axis === 2
                          ? h * my * (brushMode === BRUSH_MODES.REMOVE ? -1 : 1) * brushFaceNormal.y +
                            (my < 0 ? -2 * offsetY : 0)
                          : y * my - offsetY;
                      pz =
                        axis === 3
                          ? h * mz * (brushMode === BRUSH_MODES.REMOVE ? -1 : 1) * brushFaceNormal.z +
                            (mz < 0 ? -2 * offsetZ : 0)
                          : z * mz - offsetZ;

                      // Do not allow removing last voxel
                      if (brushMode === BRUSH_MODES.REMOVE && pendingChunk.getTotalNonEmptyVoxels() >= voxNumVoxels - 1)
                        continue;

                      pendingChunk.resizeToFit(px, py, pz);

                      pendingChunk.setColorAt(
                        px,
                        py,
                        pz,
                        brushMode === BRUSH_MODES.REMOVE
                          ? REMOVE_VOXEL_COLOR
                          : brushColorFillMode === BRUSH_COLOR_FILL_MODE.SELECTED
                            ? brushVoxColor
                            : brushFaceColor
                      );
                    }
                  }
                }
              }

              filter =
                brushMode === BRUSH_MODES.ADD
                  ? VOXEL_FILTERS.KEEP
                  : brushMode === BRUSH_MODES.PAINT
                    ? VOXEL_FILTERS.PAINT
                    : VOXEL_FILTERS.NONE;

              break;
            case BRUSH_TYPES.CENTER:
              // Edge point
              px = brushEndCell.x * mx - offsetX;
              py = brushEndCell.y * my - offsetY;
              pz = brushEndCell.z * mz - offsetZ;

              // Center point
              qx = brushStartCell.x * mx - offsetX;
              qy = brushStartCell.y * my - offsetY;
              qz = brushStartCell.z * mz - offsetZ;

              rSq = Math.max(Math.pow(px - qx, 2), Math.pow(py - qy, 2), Math.pow(pz - qz, 2)) + 1.5;

              dx = Math.abs(px - qx);
              dy = Math.abs(py - qy);
              dz = Math.abs(pz - qz);

              // Determine the shortest side, and use the two longest sides to build box.
              if (Math.min(dx, dy, dz) === dz) {
                boxU = Math.max(dx, dy);
                boxV = dz;

                boxMinX = qx - boxU;
                boxMinY = qy - boxU;
                boxMinZ = qz - boxV;

                boxMaxX = qx + boxU;
                boxMaxY = qy + boxU;
                boxMaxZ = qz + boxV;
              } else if (Math.min(dx, dy, dz) === dy) {
                boxU = Math.max(dx, dz);
                boxV = dy;

                boxMinX = qx - boxU;
                boxMinY = qy - boxV;
                boxMinZ = qz - boxU;

                boxMaxX = qx + boxU;
                boxMaxY = qy + boxV;
                boxMaxZ = qz + boxU;
              } else {
                boxU = Math.max(dy, dz);
                boxV = dx;

                boxMinX = qx - boxV;
                boxMinY = qy - boxU;
                boxMinZ = qz - boxU;

                boxMaxX = qx + boxV;
                boxMaxY = qy + boxU;
                boxMaxZ = qz + boxU;
              }

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

                      // With offset, brush is centered at zero.
                      // If x, y, z is beyond radius for round brush, don't add it.
                      const distSq = Math.pow(x - qx, 2.0) + Math.pow(y - qy, 2.0) + Math.pow(z - qz, 2.0);

                      if (distSq > rSq) continue;

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
                  ? VOXEL_FILTERS.NONE
                  : brushMode === BRUSH_MODES.PAINT
                    ? VOXEL_FILTERS.PAINT
                    : VOXEL_FILTERS.NONE;

              break;
            case BRUSH_TYPES.BOX:
              // Box corner 1 (origin is at start cell)
              px = brushEndCell.x * mx - offsetX;
              py = brushEndCell.y * my - offsetY;
              pz = brushEndCell.z * mz - offsetZ;

              pendingChunk.resizeToFit(px, py, pz);

              // Box corner 2 (origin is at start cell)
              qx = brushStartCell.x * mx - offsetX;
              qy = brushStartCell.y * my - offsetY;
              qz = brushStartCell.z * mz - offsetZ;

              pendingChunk.resizeToFit(qx, qy, qz);

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
                  ? VOXEL_FILTERS.KEEP
                  : brushMode === BRUSH_MODES.PAINT
                    ? VOXEL_FILTERS.PAINT
                    : VOXEL_FILTERS.NONE;
              break;
          }
        }
      }
    }

    // Pending filter:
    //
    // In ADD mode, maintain existing voxel colors in BOX mode.
    // In PAINT mode, don't add new voxels.

    if (filter !== VOXEL_FILTERS.NONE) {
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

  doUndo() {
    this.undoOpOnNextTick = UNDO_OPS.UNDO;
  }

  doRedo() {
    this.undoOpOnNextTick = UNDO_OPS.REDO;
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

    stack.position--;
    SYSTEMS.voxSystem.applyChunk(voxId, pending, frame, offset);
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

    stack.position++;
    SYSTEMS.voxSystem.applyChunk(voxId, pending, frame, offset);
    this.hasInFlightOperation = false;
  }

  startFaceBrushStroke = (() => {
    const cellToEye = new Vector3();
    const tmpNormal = new Vector3();
    const planeNormal = new Vector3();
    const worldMatrix = new Matrix4();

    return function(hitCell, hitNormal, hitWorldPoint, hitObject, hitInstanceId) {
      const { sceneEl, playerCamera, sweepPlane } = this;
      const scene = sceneEl.object3D;

      // Omit axis is 1 = x, 2 = y, 3 = z and the sign indicates which
      // direction to walk to check for culling of face
      const omitAxis =
        Math.abs(hitNormal.x) !== 0 ? hitNormal.x * 1 : Math.abs(hitNormal.y) !== 0 ? hitNormal.y * 2 : hitNormal.z * 3;

      // Crawl the face to find the mask to use for this stroke
      [this.brushFaceColor, this.brushFace] = this.crawlIntoChunkAt(hitCell, omitAxis);
      this.brushFaceSweep = 1;

      // The plane to use for dragging is the one which is most
      // aligned with the ray from the cell to the eye. (excluding planes flush
      // with the clicked face on the voxel.)

      if (typeof hitInstanceId === "number") {
        hitObject.getMatrixAt(hitInstanceId, worldMatrix);
      } else {
        hitObject.updateMatrices();
        worldMatrix.copy(hitObject.matrixWorld);
      }

      playerCamera.getWorldPosition(cellToEye);
      cellToEye.sub(hitWorldPoint);
      cellToEye.normalize();

      hitObject.updateMatrices();

      let maxDot = -Infinity;

      // Check all 6 planes, skipping ones aligned with face clicked.
      for (let nAxis = -3; nAxis <= 3; nAxis++) {
        if (nAxis === 0) continue;
        const axis = Math.abs(nAxis);
        const sign = nAxis < 0 ? -1 : 1;
        if (axis === 1 && Math.abs(hitNormal.x) !== 0) continue;
        if (axis === 2 && Math.abs(hitNormal.y) !== 0) continue;
        if (axis === 3 && Math.abs(hitNormal.z) !== 0) continue;

        tmpNormal.set((axis == 1 ? 1 : 0) * sign, (axis == 2 ? 1 : 0) * sign, (axis == 3 ? 1 : 0) * sign);
        tmpNormal.transformDirection(worldMatrix);

        const dot = tmpNormal.dot(cellToEye);

        if (maxDot > dot) continue;
        maxDot = dot;
        planeNormal.copy(tmpNormal);
      }

      sweepPlane.position.copy(hitWorldPoint);
      sweepPlane.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), planeNormal);
      sweepPlane.matrixNeedsUpdate = true;
      scene.add(sweepPlane);
    };
  })();

  // Given an origin cell, crawls to find the full face starting at the
  // origin that meets the current brush criteria.
  //
  // omitAxis: 1 - x, 2 - y, 3 - z
  //   axis to not crawl along, positive or negative direction
  crawlIntoChunkAt = (() => {
    // Set of already crawled cells.
    const crawled = new Set();

    // Cells enqueued to crawl.
    const queue = [];

    return (origin, omitAxis = 0, fillColor = null) => {
      const { targetVoxId, targetVoxFrame, brushCrawlType, brushCrawlExtents } = this;
      const color = SYSTEMS.voxSystem.getVoxColorAt(targetVoxId, targetVoxFrame, origin.x, origin.y, origin.z);

      const chunk = new Voxels([1, 1, 1]);
      const colorMatch = brushCrawlType === BRUSH_CRAWL_TYPES.COLOR;

      // No voxel at crawl origin cell, shouldn't happen.
      if (color === null) return [null, chunk];

      const maxSize = SYSTEMS.voxSystem.getVoxSize(targetVoxId, targetVoxFrame);
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(maxSize);

      crawled.clear();
      queue.length = 0;

      queue.push(origin.x, origin.y, origin.z);
      crawled.add(xyzToInt(origin.x, origin.y, origin.z));

      const omitX = Math.abs(omitAxis) === 1;
      const omitY = Math.abs(omitAxis) === 2;
      const omitZ = Math.abs(omitAxis) === 3;
      const omitSign = omitAxis < 0 ? -1 : 1;

      while (queue.length > 0) {
        const z = queue.pop();
        const y = queue.pop();
        const x = queue.pop();

        const c = SYSTEMS.voxSystem.getVoxColorAt(targetVoxId, targetVoxFrame, x, y, z);

        // If cell at x, y, z has a color match or geo match, recurse.
        const match = (colorMatch && c === color) || (!colorMatch && c !== null);
        if (!match) continue;

        // Mask out omit axis coord in chunk, since we don't need that dimension
        const wx = omitX ? 0 : x;
        const wy = omitY ? 0 : y;
        const wz = omitZ ? 0 : z;

        chunk.resizeToFit(wx, wy, wz);
        chunk.setColorAt(wx, wy, wz, fillColor !== null ? fillColor : c);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              const ax = Math.abs(dx);
              const ay = Math.abs(dy);
              const az = Math.abs(dz);

              // Calculate manhattan distance for next cell to consider
              const dist = ax + ay + az;
              if (dist === 0) continue; // Skip (0, 0, 0) loop iteration

              // Do not crawl along omitted axis
              if ((ax > 0 && omitX) || (ay > 0 && omitY) || (az > 0 && omitZ)) continue;

              // If NSEW mode, skip diagonal walks.
              if (dist >= 2 && brushCrawlExtents === BRUSH_CRAWL_EXTENTS.NSEW) continue;
              const cx = x + dx;
              const cy = y + dy;
              const cz = z + dz;

              const inRange = cx >= minX && cx <= maxX && cy >= minY && cy <= maxY && cz >= minZ && cz <= maxZ;

              if (!inRange) continue;

              if (omitAxis !== 0) {
                // Stop crawling if there's a filled cell along the omitted axis
                // (Meaning the face is cut off here in the ommitted axis direction)
                const lx = cx + (omitX ? 1 : 0) * omitSign;
                const ly = cy + (omitY ? 1 : 0) * omitSign;
                const lz = cz + (omitZ ? 1 : 0) * omitSign;

                const axisCheckInRange =
                  lx >= minX && lx <= maxX && ly >= minY && ly <= maxY && lz >= minZ && lz <= maxZ;

                // The cell we're about to add is blocked along the omission axis, meaning it should not be considered part of the crawled face.
                if (
                  axisCheckInRange &&
                  SYSTEMS.voxSystem.getVoxColorAt(targetVoxId, targetVoxFrame, lx, ly, lz) !== null
                )
                  continue;
              }

              // Don't re-visit cells.
              if (crawled.has(xyzToInt(cx, cy, cz))) continue;

              crawled.add(xyzToInt(cx, cy, cz));
              queue.push(cx, cy, cz);
            }
          }
        }
      }

      return [color, chunk];
    };
  })();

  pickColorAtIntersection(intersection) {
    if (intersection && intersection.face) {
      const vert = intersection.face.a;

      if (intersection.object.geometry) {
        const colorAttrib = intersection.object.geometry.attributes && intersection.object.geometry.attributes.color;

        const paletteAttrib =
          intersection.object.geometry.attributes && intersection.object.geometry.attributes.palette;

        if (paletteAttrib) {
          // Presume for now this terrain
          const index = paletteAttrib.array[vert * paletteAttrib.itemSize];
          const [r, g, b, grad] = getWorldColor(index);
          // Terrain voxel colors have a red channel that provides brightness offsets
          const brightOffset = colorAttrib.array[vert * colorAttrib.itemSize];
          const brightDelta = ((brightOffset - 128.0) / 255.0) * grad;

          const rgb = {
            r: Math.floor(Math.max(0.0, Math.min(1.0, r + brightDelta)) * 255),
            g: Math.floor(Math.max(0.0, Math.min(1.0, g + brightDelta)) * 255),
            b: Math.floor(Math.max(0.0, Math.min(1.0, b + brightDelta)) * 255)
          };

          this.handlePick(rgb);
        } else if (colorAttrib) {
          const r = colorAttrib.array[vert * colorAttrib.itemSize];
          const g = colorAttrib.array[vert * colorAttrib.itemSize + 1];
          const b = colorAttrib.array[vert * colorAttrib.itemSize + 2];
          const rgb = { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
          this.handlePick(rgb);
        }
      }
    }
  }

  clearUndoStacks() {
    this.undoStacks.clear();
  }

  cancelPending() {
    if (!this.targetVoxId) return;
    SYSTEMS.voxSystem.setShowVoxGeometry(this.targetVoxId, false);
    SYSTEMS.voxSystem.clearPendingAndUnfreezeMesh(this.targetVoxId);
    this.pendingChunk = null;
    this.targetVoxId = null;
    this.targetVoxFrame = null;
  }
}

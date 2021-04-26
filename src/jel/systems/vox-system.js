import { JelVoxBufferGeometry } from "../objects/JelVoxBufferGeometry";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { SHAPE, FIT } from "three-ammo/constants";
import { generateMeshBVH, disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER } from "../../hubs/constants";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { Vox, VoxChunk } from "ot-vox";
import VoxSync from "../utils/vox-sync";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshStandardMaterial, VertexColors, Matrix4 } = THREE;
import { EventTarget } from "event-target-shim";

const MAX_FRAMES_PER_VOX = 32;
const MAX_INSTANCES_PER_VOX_ID = 255;
const IDENTITY = new Matrix4();
const tmpMatrix = new Matrix4();
const tmpVec = new THREE.Vector3();

const voxMaterial = new ShaderMaterial({
  name: "vox",
  vertexColors: VertexColors,
  fog: true,
  fragmentShader: ShaderLib.standard.fragmentShader,
  vertexShader: ShaderLib.standard.vertexShader,
  wireframe: false,
  lights: true,
  defines: {
    ...MeshStandardMaterial.defines
  },
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.standard.uniforms)
  }
});

voxMaterial.uniforms.metalness.value = 0;
voxMaterial.uniforms.roughness.value = 1;

voxMaterial.onBeforeCompile = shader => addVertexCurvingToShader(shader);

function voxIdForVoxUrl(url) {
  // Parse vox id from URL
  const pathParts = new URL(url).pathname.split("/");
  return pathParts[pathParts.length - 1];
}

function createMesh() {
  const geometry = new JelVoxBufferGeometry();
  geometry.instanceAttributes = []; // For DynamicInstancedMesh

  const material = voxMaterial;
  const mesh = new DynamicInstancedMesh(geometry, material, MAX_INSTANCES_PER_VOX_ID);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.renderOrder = RENDER_ORDER.VOX;

  return mesh;
}

// Manages user-editable voxel objects
export class VoxSystem extends EventTarget {
  constructor(sceneEl, cursorTargettingSystem, physicsSystem) {
    super();
    this.sceneEl = sceneEl;
    this.syncs = new Map();
    this.voxMap = new Map();
    this.sourceToVoxId = new Map();
    this.meshToVoxId = new Map();
    this.sourceToLastCullPassFrame = new Map();
    this.cursorSystem = cursorTargettingSystem;
    this.physicsSystem = physicsSystem;
    this.onSyncedVoxUpdated = this.onSyncedVoxUpdated.bind(this);
    this.onSpacePresenceSynced = this.onSpacePresenceSynced.bind(this);
    this.frame = 0;
    this.sceneEl.addEventListener("space-presence-synced", this.onSpacePresenceSynced);
  }

  tick() {
    const { voxMap, syncs } = this;

    this.frame++;

    for (const [voxId, entry] of voxMap.entries()) {
      const {
        meshes,
        maxMeshIndex,
        maxRegisteredIndex,
        mesherQuadSize,
        delayedRemeshTimeout,
        hasDirtyMatrices,
        hasDirtyWorldToObjectMatrices,
        sources
      } = entry;

      // Registration in-progress
      if (maxRegisteredIndex < 0) continue;

      let hasAnyInstancesInCamera = false;
      let instanceMatrixNeedsUpdate = false;
      let desiredQuadSize = null;

      for (let instanceId = 0; instanceId <= maxRegisteredIndex; instanceId++) {
        const source = sources[instanceId];
        if (source === null) continue;

        if (this.sourceToLastCullPassFrame.has(source)) {
          const lastFrameCullPassed = this.sourceToLastCullPassFrame.get(source);

          if (lastFrameCullPassed >= this.frame - 5) {
            hasAnyInstancesInCamera = true;
          }
        }

        const shouldUpdateMatrix = hasDirtyMatrices || source.consumeIfDirtyWorldMatrix(WORLD_MATRIX_CONSUMERS.VOX);

        if (shouldUpdateMatrix) {
          source.updateMatrices();

          for (let frame = 0; frame <= maxMeshIndex; frame++) {
            const mesh = meshes[frame];
            if (mesh === null) continue;

            mesh.setMatrixAt(instanceId, source.matrixWorld);
            hasDirtyWorldToObjectMatrices[frame * MAX_INSTANCES_PER_VOX_ID + instanceId] = true;
          }

          let maxScale = 0.0;

          // Determine the max scale to determine the quad size needed.
          // Assume uniform scale.
          for (let i = 0; i <= maxRegisteredIndex; i++) {
            const source = sources[i];
            if (source === null) continue;

            source.getWorldScale(tmpVec);
            maxScale = Math.max(tmpVec.x, maxScale);
          }

          // Need to determine these based upon artifacts from vertex curving
          if (maxScale > 3.0) {
            desiredQuadSize = 1;
          } else if (maxScale > 2.5) {
            desiredQuadSize = 2;
          } else if (maxScale > 1.5) {
            desiredQuadSize = 4;
          } else if (maxScale > 1.33) {
            desiredQuadSize = 6;
          } else if (maxScale > 1.0) {
            desiredQuadSize = 8;
          } else if (maxScale > 0.75) {
            desiredQuadSize = 12;
          } else {
            desiredQuadSize = 16;
          }

          instanceMatrixNeedsUpdate = true;
        }
      }

      // New quad size due to scale change, remesh all frames.
      if (desiredQuadSize !== null && desiredQuadSize !== mesherQuadSize) {
        entry.mesherQuadSize = desiredQuadSize;

        for (let i = 0; i <= maxMeshIndex; i++) {
          const mesh = meshes[i];
          if (mesh === null) continue;

          entry.dirtyFrameMeshes[i] = true;
        }

        // Delay this regeneration by a bit, because:
        //
        // - User may be interactively scaling so don't want to keep regenerating while scaling
        // - Object may be getting removed and animating, so don't want to remesh
        clearTimeout(delayedRemeshTimeout);
        entry.delayedRemeshTimeout = setTimeout(() => this.regenerateDirtyMeshesForVoxId(voxId), 1000);
      }

      for (let i = 0; i <= maxMeshIndex; i++) {
        const mesh = meshes[i];
        if (mesh === null) continue;

        // TODO time based frame rate
        const isCurrentAnimationFrame = this.frame % (maxMeshIndex + 1) === i;
        mesh.visible = isCurrentAnimationFrame && hasAnyInstancesInCamera;
        mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
      }

      if (entry.hasDirtyMatrices) {
        entry.hasDirtyMatrices = false;
      }
    }

    let expiredSync = false;

    // Check for expiring syncs
    for (const sync of syncs.values()) {
      expiredSync = expiredSync || sync.tryExpire();
    }

    if (expiredSync) {
      this.updateOpenVoxIdsInPresence();
    }
  }

  async ensureSync(voxId) {
    this.getSync(voxId); // Side effect :P
  }

  async getSync(voxId) {
    const { sceneEl, syncs } = this;
    if (syncs.has(voxId)) return syncs.get(voxId);

    console.log("Start syncing vox", voxId);
    const sync = new VoxSync(voxId);
    syncs.set(voxId, sync);
    await sync.init(sceneEl);

    sync.addEventListener("vox_updated", this.onSyncedVoxUpdated);

    return sync;
  }

  endSyncing(voxId) {
    const { syncs } = this;
    const sync = syncs.get(voxId);
    if (!sync) return;
    console.log("Stop syncing vox", voxId);

    sync.dispose();
    syncs.delete(voxId);
  }

  onSyncedVoxUpdated({ detail: { voxId, vox, op } }) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { dirtyFrameMeshes } = entry;

    for (const { f: frame } of op) {
      dirtyFrameMeshes[frame] = true;
    }

    entry.vox = vox;

    this.regenerateDirtyMeshesForVoxId(voxId);
  }

  async onSpacePresenceSynced() {
    const { syncs } = this;

    // On a presence update, look at the vox ids being edited and ensure
    // we have an open sync for all of them, and dispose the ones we don't need.
    const spacePresences = (window.APP.spaceChannel.presence && window.APP.spaceChannel.presence.state) || {};

    const openVoxIds = new Set();

    for (const presence of Object.values(spacePresences)) {
      const meta = presence.metas[presence.metas.length - 1];

      for (const voxId of meta.open_vox_ids || []) {
        openVoxIds.add(voxId);
      }
    }

    // Open missing syncs
    for (const voxId of openVoxIds) {
      if (syncs.has(voxId)) continue;
      await this.ensureSync(voxId);
    }

    for (const [voxId, sync] of syncs.entries()) {
      if (!syncs.has(voxId)) continue; // Due to await
      if (openVoxIds.has(voxId)) continue;
      if (!sync.isExpired()) continue; // If the sync is actively being used, skip
      await this.endSyncing(voxId);
    }
  }

  async register(voxUrl, source) {
    const { physicsSystem, voxMap, sourceToVoxId } = this;

    const voxId = voxIdForVoxUrl(voxUrl);

    if (!voxMap.has(voxId)) {
      await this.registerVox(voxUrl);
    }

    // Wait until meshes are generated if many sources registered concurrently.
    await voxMap.get(voxId).voxRegistered;
    const voxEntry = voxMap.get(voxId);
    const { meshes, sizeBoxGeometry, maxMeshIndex, sources, sourceToIndex, shapesUuid } = voxEntry;

    // This uses a custom patched three.js handler which is fired whenever the object
    // passes a frustum check. This is handy for cases like this when a non-rendered
    // source is proxying an instance. The sourceToLastCullPassFrame map is used to
    // cull dynamic instanced meshes whose sources are entirely frustum culled.
    source.onPassedFrustumCheck = () => this.sourceToLastCullPassFrame.set(source, this.frame);

    let instanceIndex = null;

    for (let i = 0; i <= maxMeshIndex; i++) {
      const mesh = meshes[i];
      if (mesh === null) continue;
      instanceIndex = mesh.addInstance(IDENTITY);
    }

    // When no meshes are generated yet, start with instance zero.
    if (instanceIndex === null) {
      instanceIndex = 0;
    }

    if (sizeBoxGeometry) {
      source.geometry = sizeBoxGeometry;
    }

    sources[instanceIndex] = source;
    sourceToIndex.set(source, instanceIndex);
    sourceToVoxId.set(source, voxId);
    voxEntry.maxRegisteredIndex = Math.max(instanceIndex, voxEntry.maxRegisteredIndex);

    if (shapesUuid !== null) {
      this.getBodyUuidForSource(source).then(bodyUuid => {
        if (bodyUuid === null) return;
        if (!voxMap.has(voxId)) return;
        const entry = voxMap.get(voxId);

        // Shape may have been updated already, skip it if so.
        if (shapesUuid !== entry.shapesUuid) return;
        physicsSystem.setShapes([bodyUuid], shapesUuid);
      });
    }

    return voxId;
  }

  unregister(source) {
    const { voxMap, physicsSystem, sourceToLastCullPassFrame, sourceToVoxId } = this;
    if (!sourceToVoxId.has(source)) return;

    const voxId = sourceToVoxId.get(source);
    sourceToVoxId.delete(source);

    const voxEntry = voxMap.get(voxId);
    if (!voxEntry) return;

    const { maxRegisteredIndex, sourceToIndex, sources, meshes, shapesUuid } = voxEntry;

    if (!sourceToIndex.has(source)) return;
    const instanceIndex = sourceToIndex.get(source);
    sources[instanceIndex] = null;
    sourceToIndex.delete(source);
    source.onPassedFrustumCheck = () => {};
    sourceToLastCullPassFrame.delete(source);

    if (shapesUuid !== null) {
      this.getBodyUuidForSource(source).then(bodyUuid => {
        if (bodyUuid === null) return;

        // Shape may have been updated already, skip it if so.
        physicsSystem.removeShapes(bodyUuid, shapesUuid);
      });
    }

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];

      if (mesh) {
        mesh.freeInstance(instanceIndex);
      }
    }

    if (instanceIndex === maxRegisteredIndex) {
      voxEntry.maxRegisteredIndex--;
    }

    if (sourceToIndex.size === 0) {
      this.unregisterVox(voxId);
    }
  }

  async registerVox(voxUrl) {
    const { voxMap } = this;

    const voxId = voxIdForVoxUrl(voxUrl);

    let finish;
    const voxRegistered = new Promise(res => (finish = res));

    // Create a new entry for managing this vox
    const entry = {
      // Maximum registered index for a source (also the maximum instance id in the instanced mesh)
      maxRegisteredIndex: -1,

      // Map of the source to the instance id for the source (sources here are the mesh belonging
      // to the media-vox entity used to track this vox's instanced mesh)
      sourceToIndex: new Map(),

      // List of DynamicInstanceMeshes, one per vox frame
      meshes: Array(MAX_FRAMES_PER_VOX).fill(null),

      // UUID of the physics shape for this vox (derived from the first vox frame)
      shapesUuid: null,

      // Geometry that is used for frustum culling, and is assigned as the geometry of every
      // source for this vox.
      sizeBoxGeometry: null,

      // Current quad size for the mesher for this vox, based upon the scale. Start out big.
      mesherQuadSize: 16,

      // For every instance and every vox frame, compute the inverse world to object matrix
      // for converting raycasts to cell coordinates.
      worldToObjectMatrices: Array(MAX_FRAMES_PER_VOX * MAX_INSTANCES_PER_VOX_ID).fill(null),

      // For evrey instance and every vox frame, keep a dirty bit to determine when we need to
      // compute the inverse for converting raycasts to cell coordinates.
      hasDirtyWorldToObjectMatrices: Array(MAX_FRAMES_PER_VOX * MAX_INSTANCES_PER_VOX_ID).fill(false),
      // Timeout for remeshing due to quad size changes to prevent repaid remeshing
      delayedRemeshTimeout: null,

      // Maximum mesh index (at most the number of frames - 1)
      maxMeshIndex: -1,

      // Sources for this vox, which are the Object3Ds that are used to track where an instance of
      // this vox is in the scene. This is presumed to be a Mesh, since its geometry is set for
      // culling checks.
      sources: Array(MAX_INSTANCES_PER_VOX_ID).fill(null),

      // Flags to determine when remeshing is needed for a vox frame.
      dirtyFrameMeshes: Array(MAX_FRAMES_PER_VOX).fill(true),

      // Flag used to force a write of the source world matrices to the instanced mesh.
      hasDirtyMatrices: false,

      // Current animation frame
      currentFrame: 0,

      // Promise that is resolved when the vox is registered, which must be waiting on
      // before registering sources
      voxRegistered
    };

    voxMap.set(voxId, entry);

    const store = window.APP.store;

    // Fetch frame data when first registering.
    const res = await fetch(voxUrl, {
      headers: { authorization: `bearer ${store.state.credentials.token}` }
    });

    const {
      vox: [{ frames }]
    } = await res.json();

    const vox = new Vox(frames.map(f => VoxChunk.deserialize(f)));
    entry.vox = vox;

    this.regenerateDirtyMeshesForVoxId(voxId);

    finish();
  }

  unregisterVox(voxId) {
    const { voxMap } = this;
    const voxEntry = voxMap.get(voxId);
    const { sizeBoxGeometry, maxMeshIndex } = voxEntry;

    for (let i = 0; i <= maxMeshIndex; i++) {
      this.removeMeshForIndex(voxId, i);
    }

    if (sizeBoxGeometry) {
      voxEntry.sizeBoxGeometry = null;
      sizeBoxGeometry.dispose();
    }

    voxMap.delete(voxId);
    this.endSyncing(voxId);
  }

  regenerateDirtyMeshesForVoxId(voxId) {
    const { sceneEl, physicsSystem, meshToVoxId, voxMap } = this;
    const scene = sceneEl.object3D;

    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { vox, sources, dirtyFrameMeshes, meshes, mesherQuadSize, maxRegisteredIndex } = entry;
    if (!vox) return;

    let regenerateSizeBox = false;

    for (let i = 0; i < vox.frames.length; i++) {
      let mesh = meshes[i];
      let remesh = dirtyFrameMeshes[i];

      if (!mesh) {
        mesh = createMesh();
        meshes[i] = mesh;
        meshToVoxId.set(mesh, voxId);

        scene.add(meshes[i]);

        // If this is a new mesh for a new frame need to add all the instances needed
        // and force a matrix flush to them.
        //
        // Do to this, add N instances up to registered index, then free
        // the ones that are not actually registered.
        for (let j = 0; j <= maxRegisteredIndex; j++) {
          mesh.addInstance(IDENTITY);
        }

        for (let j = 0; j <= maxRegisteredIndex; j++) {
          if (sources[j] === null) {
            mesh.freeInstance(j);
          }
        }

        this.dispatchEvent(new CustomEvent("mesh_added"));

        entry.hasDirtyMatrices = true;
        remesh = true;
      }

      if (remesh) {
        const chunk = vox.frames[i];
        const [xMin, yMin, zMin, xMax, yMax, zMax] = mesh.geometry.update(chunk, mesherQuadSize);
        const [xSize, ySize, zSize] = chunk.size;

        // Find the midpoint of the mesh on each axis, and then
        // see which side has more voxels to determine which way collision origin needs to be shifted.
        const midX = (xMax + xMin) / 2.0;
        const midY = (yMax + yMin) / 2.0;
        const midZ = (zMax + zMin) / 2.0;
        const xSide = midX > xSize / 2.0 ? 1 : -1;
        const ySide = midY > ySize / 2.0 ? 1 : -1;
        const zSide = midZ > zSize / 2.0 ? 1 : -1;
        const xExtent = xMax - xMin;
        const yExtent = yMax - yMin;
        const zExtent = zMax - zMin;
        const xShift = xSize % 2 === 1 ? -VOXEL_SIZE / 2 : 0;
        const yShift = ySize % 2 === 1 ? -VOXEL_SIZE / 2 : 0;
        const zShift = zSize % 2 === 1 ? -VOXEL_SIZE / 2 : 0;

        generateMeshBVH(mesh, true);
        regenerateSizeBox = true;

        dirtyFrameMeshes[i] = false;

        if (i === 0) {
          const type = mesherQuadSize <= 2 ? SHAPE.HACD : SHAPE.HULL;

          // Physics shape is based upon the first mesh.
          const shapesUuid = physicsSystem.createShapes(mesh, {
            type,
            fit: FIT.ALL,
            includeInvisible: true,
            // NOTE: if the physics shapes for large voxes are not accurate
            // then this can be reduced at the cost of perf.
            concavity: 0.4,
            offset: new THREE.Vector3(
              xSide * ((xSize - xExtent) / 2) * VOXEL_SIZE + xShift,
              ySide * ((ySize - yExtent) / 2) * VOXEL_SIZE + yShift,
              zSide * ((zSize - zExtent) / 2) * VOXEL_SIZE + zShift
            )
          });

          const previousShapesUuid = entry.shapesUuid;
          entry.shapesUuid = shapesUuid;

          const bodyReadyPromises = [];
          const bodyUuids = [];

          // Collect body UUIDs, and then set shape + destroy existing.
          for (let j = 0; j <= maxRegisteredIndex; j++) {
            const source = sources[j];
            if (source === null) continue;

            bodyReadyPromises.push(
              new Promise(res => {
                this.getBodyUuidForSource(source).then(bodyUuid => {
                  if (bodyUuid !== null) {
                    bodyUuids.push(bodyUuid);
                  }
                  res();
                });
              })
            );
          }

          Promise.all(bodyReadyPromises).then(() => {
            // Destroy existing shapes after new shapes are set.
            // Check that the entry wasn't updated while gathering body uuids.
            if (entry.shapesUuid === shapesUuid) {
              if (bodyUuids.length > 0) {
                physicsSystem.setShapes(bodyUuids, shapesUuid);
              }

              if (previousShapesUuid !== null) {
                physicsSystem.destroyShapes(previousShapesUuid);
              }
            }
          });
        }
      }
    }

    // Frame(s) were removed, free the meshes
    for (let i = vox.frames.length; i <= entry.maxMeshIndex; i++) {
      this.removeMeshForIndex(voxId, i);
    }

    if (regenerateSizeBox) {
      // Size box is a mesh that contains the full animated voxel, used for culling.
      const size = [VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE];

      for (let i = 0; i < vox.frames.length; i++) {
        size[0] = Math.max(size[0], vox.frames[i].size[0] * VOXEL_SIZE);
        size[1] = Math.max(size[1], vox.frames[i].size[1] * VOXEL_SIZE);
        size[2] = Math.max(size[2], vox.frames[i].size[2] * VOXEL_SIZE);
      }

      const geo = new THREE.BoxBufferGeometry(size[0], size[1], size[2]);

      // Set size box geometry on sources.
      for (let j = 0; j <= maxRegisteredIndex; j++) {
        const source = sources[j];
        if (source === null) continue;
        source.geometry = geo;
      }

      if (entry.sizeBoxGeometry) {
        entry.sizeBoxGeometry.dispose();
      }

      entry.sizeBoxGeometry = geo;
    }

    for (let i = 0; i < meshes.length; i++) {
      if (meshes[i]) {
        entry.maxMeshIndex = i;
      }
    }
  }

  updateOpenVoxIdsInPresence() {
    const { syncs } = this;
    const openVoxIds = [];

    // Registers the vox ids into presence of VoxSyncs that have recent edits.
    for (const [voxId, sync] of syncs.entries()) {
      if (!sync.hasRecentWrites()) continue;
      openVoxIds.push(voxId);
    }

    window.APP.spaceChannel.updateOpenVoxIds(openVoxIds);
  }

  getVoxHitFromIntersection(intersection, hitCell, adjacentCell) {
    const { meshToVoxId, voxMap } = this;

    const hitObject = intersection && intersection.object;
    const voxId = meshToVoxId.get(hitObject);
    if (!voxId) return;

    const { meshes } = voxMap.get(voxId);
    const frame = meshes.indexOf(hitObject);
    const inv = this.getWorldToObjectMatrix(voxId, frame, intersection.instanceId);
    tmpVec.copy(intersection.point);
    tmpVec.applyMatrix4(inv);
    tmpVec.multiplyScalar(1 / VOXEL_SIZE);

    const nx = intersection.face.normal.x;
    const ny = intersection.face.normal.y;
    const nz = intersection.face.normal.z;

    // Hit cell is found by nudging along normal and rounding.
    // Also need to offset the geometry shift which aligns cells with bounding box.
    const hx = Math.round(tmpVec.x + 0.5 - nx * 0.5);
    const hy = Math.round(tmpVec.y + 0.5 - ny * 0.5);
    const hz = Math.round(tmpVec.z + 0.5 - nz * 0.5);

    hitCell.x = hx;
    hitCell.y = hy;
    hitCell.z = hz;

    // Adjacent cell is found by moving along normal (which is normalized).
    adjacentCell.x = hx + nx;
    adjacentCell.y = hy + ny;
    adjacentCell.z = hz + nz;

    // Returns vox id
    return meshToVoxId.get(hitObject);
  }

  getMeshes() {
    return this.meshToVoxId.keys();
  }

  getBoundingBoxForSource(source) {
    const { sourceToVoxId, voxMap } = this;
    if (!sourceToVoxId.has(source)) return null;

    const voxId = sourceToVoxId.get(source);
    const { sources, meshes } = voxMap.get(voxId);
    if (meshes.length === 0) return null;

    const instanceId = sources.indexOf(source);

    const mesh = meshes[0];
    const bbox = new THREE.Box3();
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(instanceId, matrix);

    bbox.expandByObject(mesh);
    const vec = new THREE.Vector3();
    const a = new THREE.Vector3();
    const q = new THREE.Quaternion();
    matrix.decompose(a, q, vec);
    bbox.applyMatrix4(matrix);
    return bbox;
  }

  getSourceForMeshAndInstance(targetMesh, instanceId) {
    const { voxMap } = this;

    for (const { meshes, maxMeshIndex, sources } of voxMap.values()) {
      for (let i = 0; i <= maxMeshIndex; i++) {
        const mesh = meshes[i];
        if (mesh !== targetMesh) continue;

        const source = sources[instanceId];
        if (source) return source;
      }
    }

    return null;
  }

  getWorldToObjectMatrix(voxId, frame, instanceId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { meshes, worldToObjectMatrices, hasDirtyWorldToObjectMatrices } = entry;
    const idx = frame * MAX_INSTANCES_PER_VOX_ID + instanceId;

    let inverse = worldToObjectMatrices[idx];

    if (worldToObjectMatrices[idx] === null) {
      inverse = new THREE.Matrix4();
      worldToObjectMatrices[idx] = inverse;
    }

    if (hasDirtyWorldToObjectMatrices[idx] && meshes[frame] !== null) {
      meshes[frame].getMatrixAt(instanceId, tmpMatrix);
      inverse.getInverse(tmpMatrix);
      hasDirtyWorldToObjectMatrices[idx] = false;
    }

    return inverse;
  }

  removeMeshForIndex(voxId, i) {
    const { voxMap, meshToVoxId, sceneEl, physicsSystem } = this;
    const scene = sceneEl.object3D;
    const entry = voxMap.get(voxId);
    const { meshes, shapesUuid, dirtyFrameMeshes } = entry;

    const mesh = meshes[i];
    if (!mesh) return;

    // Retain material since it's shared among all vox.
    mesh.material = null;
    disposeNode(mesh);
    scene.remove(mesh);
    meshToVoxId.delete(mesh);
    meshes[i] = null;
    dirtyFrameMeshes[i] = true;

    // Shape is the first mesh's shape
    if (i === 0 && shapesUuid) {
      physicsSystem.destroyShapes(shapesUuid);
      entry.shapesUuid = null;
    }

    entry.maxMeshIndex = -1;

    for (let i = 0; i < meshes.length; i++) {
      if (meshes[i]) {
        entry.maxMeshIndex = i;
      }
    }

    this.dispatchEvent(new CustomEvent("mesh_removed"));
  }

  async getBodyUuidForSource(source) {
    const { el } = source;
    const bodyHelper = el.components["body-helper"];

    if (!bodyHelper || !bodyHelper.ready) {
      await new Promise(res => el.addEventListener("body_ready", res, { once: true }));
    }

    return el.parentNode ? el.components["body-helper"].uuid : null;
  }
}

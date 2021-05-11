import { JelVoxBufferGeometry } from "../objects/JelVoxBufferGeometry";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { SHAPE, FIT } from "three-ammo/constants";
import { setMatrixWorld, generateMeshBVH, disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER } from "../../hubs/constants";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { type as vox0, Vox, VoxChunk } from "ot-vox";
import VoxSync from "../utils/vox-sync";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshStandardMaterial, VertexColors, Matrix4, Mesh } = THREE;
import { EventTarget } from "event-target-shim";

const MAX_FRAMES_PER_VOX = 32;
const MAX_INSTANCES_PER_VOX_ID = 255;
const IDENTITY = new Matrix4();
const tmpMatrix = new Matrix4();
const tmpVec = new THREE.Vector3();

const targettingMaterial = new MeshStandardMaterial({ color: 0xffffff });
targettingMaterial.visible = false;

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
voxMaterial.uniforms.diffuse.value = new THREE.Color(0xffffff); // See explanation below.

voxMaterial.onBeforeCompile = shader => {
  addVertexCurvingToShader(shader);

  // This shader is fairly weird. Since the user is placing these voxels with explicit
  // colors, we want the on-screen rendering color to match the palette fairly closely.
  //
  // Typical lighting will not really work: it ends up looking darker and less saturated.
  //
  // However, we have to compensate for shadows. So the material is a white diffuse which
  // ends up generating the shadows into outgoingLight. We then scale + pow the shadows
  // so they are high contrast (with regions in-light being white), and then mix the vertex
  // color. The vertex color decoding earlier in the shader is discarded to avoid it getting
  // applied in the lighting calculations.
  //
  // Note that if the shadow part is tuned too aggressively to show shadows then the shadow
  // acne can get quite bad on smaller voxels.
  shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "");

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <fog_fragment>",
    [
      "vec3 shadows = clamp(vec3(pow(outgoingLight.r * 2.5, 3.0), pow(outgoingLight.g * 2.5, 3.0), pow(outgoingLight.b * 2.5, 3.0)), 0.0, 1.0);",
      "gl_FragColor = vec4(mix(shadows, vColor.rgb, 0.8), diffuseColor.a);",
      "#include <fog_fragment>"
    ].join("\n")
  );
};

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

function createPhysicsMesh() {
  const geometry = new JelVoxBufferGeometry();
  const material = voxMaterial;
  const mesh = new Mesh(geometry, material);
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

    // Maps meshes to vox ids, this will include an entry for an active targeting mesh.
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
        targettingMesh,
        targettingMeshInstanceId,
        delayedRemeshTimeout,
        hasDirtyMatrices,
        hasDirtyWorldToObjectMatrices,
        regenerateDirtyMeshesOnNextFrame,
        sources,
        vox
      } = entry;

      if (regenerateDirtyMeshesOnNextFrame && vox) {
        this.regenerateDirtyMeshesForVoxId(voxId);
        entry.regenerateDirtyMeshesOnNextFrame = false;

        if (entry.voxRegisteredResolve) {
          entry.voxRegisteredResolve();
          entry.voxRegisteredResolve = null;
        }
      }

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

            if (targettingMesh !== null && targettingMeshInstanceId === instanceId) {
              setMatrixWorld(targettingMesh, source.matrixWorld);
            }
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
        entry.delayedRemeshTimeout = setTimeout(() => (entry.regenerateDirtyMeshesOnNextFrame = true), 1000);
      }

      const currentAnimationFrame = this.getCurrentAnimationFrame(voxId);

      for (let i = 0; i <= maxMeshIndex; i++) {
        const mesh = meshes[i];
        if (mesh === null) continue;

        // TODO time based frame rate
        const isCurrentAnimationFrame = currentAnimationFrame === i;
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
    entry.regenerateDirtyMeshesOnNextFrame = true;
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

    let voxRegisteredResolve;
    const voxRegistered = new Promise(res => (voxRegisteredResolve = res));

    // Create a new entry for managing this vox
    const entry = {
      // Maximum registered index for a source (also the maximum instance id in the instanced mesh)
      maxRegisteredIndex: -1,

      // Map of the source to the instance id for the source (sources here are the mesh belonging
      // to the media-vox entity used to track this vox's instanced mesh)
      sourceToIndex: new Map(),

      // List of DynamicInstanceMeshes, one per vox frame
      meshes: Array(MAX_FRAMES_PER_VOX).fill(null),

      // Lightweight meshes used for physics hull generation
      physicsMeshes: Array(MAX_FRAMES_PER_VOX).fill(null),

      // If non-null, have cursor targetting target this mesh.
      //
      // This is used in building mode to target the previous mesh while
      // painting with a voxel brush.
      targettingMesh: null,
      targettingMeshFrame: -1,
      targettingMeshInstanceId: -1,

      // If non-null, this chunk will be ephemerally applied to the current snapshot during remeshing.
      //
      // This is used in building model to display the in-process voxel brush.
      pendingVoxChunk: null,
      pendingVoxChunkOffset: [0, 0, 0],

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
      regenerateDirtyMeshesOnNextFrame: true,

      // Flag used to force a write of the source world matrices to the instanced mesh.
      hasDirtyMatrices: false,

      // Current animation frame
      currentFrame: 0,

      // Promise that is resolved when the vox is registered + meshed, which must be waiting on
      // before registering sources
      voxRegistered,

      // Resolver for promise of registration + meshing
      voxRegisteredResolve
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

    entry.regenerateDirtyMeshesOnNextFrame = true;
  }

  unregisterVox(voxId) {
    const { sceneEl, voxMap, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const voxEntry = voxMap.get(voxId);
    const { targettingMesh, sizeBoxGeometry, maxMeshIndex } = voxEntry;

    for (let i = 0; i <= maxMeshIndex; i++) {
      this.removeMeshForIndex(voxId, i);
    }

    if (sizeBoxGeometry) {
      voxEntry.sizeBoxGeometry = null;
      sizeBoxGeometry.dispose();
    }

    if (targettingMesh) {
      voxEntry.targettingMesh = null; // Do this first since removal will re-compute cursor targets
      scene.remove(targettingMesh);
      targettingMesh.material = null;
      disposeNode(targettingMesh);
      meshToVoxId.delete(targettingMesh);
    }

    voxMap.delete(voxId);
    this.endSyncing(voxId);
  }

  regenerateDirtyMeshesForVoxId(voxId) {
    const { sceneEl, physicsSystem, meshToVoxId, voxMap } = this;
    const scene = sceneEl.object3D;

    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { cameraSystem } = SYSTEMS;

    const {
      vox,
      sources,
      dirtyFrameMeshes,
      meshes,
      physicsMeshes,
      mesherQuadSize,
      maxRegisteredIndex,
      pendingVoxChunk,
      pendingVoxChunkOffset
    } = entry;
    if (!vox) return;

    let regenerateSizeBox = false;

    for (let i = 0; i < vox.frames.length; i++) {
      let mesh = meshes[i];
      let physicsMesh = physicsMeshes[i];
      let remesh = dirtyFrameMeshes[i];

      if (!mesh) {
        mesh = createMesh();
        meshes[i] = mesh;

        physicsMesh = createPhysicsMesh();
        physicsMeshes[i] = physicsMesh;

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
        let chunk = vox.frames[i];

        // Apply any ephemeral pending (eg from voxel brushes.)
        if (pendingVoxChunk) {
          chunk = chunk.clone();

          vox0.applyToChunk(
            pendingVoxChunk,
            chunk,
            pendingVoxChunkOffset[0],
            pendingVoxChunkOffset[1],
            pendingVoxChunkOffset[2]
          );
        }

        let showXZPlane = false;

        if (cameraSystem.isInspecting() && cameraSystem.allowCursor && cameraSystem.showXZPlane) {
          for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            if (source === null) continue;

            if (source.parent === cameraSystem.inspected) {
              showXZPlane = true;
            }
          }
        }

        const [xMin, yMin, zMin, xMax, yMax, zMax] = mesh.geometry.update(chunk, mesherQuadSize, false, showXZPlane);

        const xExtent = xMax - xMin;
        const yExtent = yMax - yMin;
        const zExtent = zMax - zMin;

        // Offset the hull by the min and half the size
        const dx = xMin + xExtent / 2;
        const dy = yMin + yExtent / 2;
        const dz = zMin + zExtent / 2;

        generateMeshBVH(mesh, true);
        regenerateSizeBox = true;

        dirtyFrameMeshes[i] = false;

        // Don't update physics when running pending for brush
        if (i === 0 && !pendingVoxChunk) {
          const type = mesherQuadSize <= 2 ? SHAPE.HACD : SHAPE.HULL;

          // Generate a simpler mesh to improve generation time
          physicsMesh.geometry.update(chunk, Infinity, true);

          // Physics shape is based upon the first mesh.
          const shapesUuid = physicsSystem.createShapes(physicsMesh, {
            type,
            fit: FIT.ALL,
            includeInvisible: true,
            offset: new THREE.Vector3(dx * VOXEL_SIZE, dy * VOXEL_SIZE, dz * VOXEL_SIZE)
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
            }

            if (previousShapesUuid !== null) {
              physicsSystem.destroyShapes(previousShapesUuid);
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

  getMeshesForSource(source) {
    for (const entry of this.voxMap.values()) {
      if (entry.sources.includes(source)) {
        return entry.meshes.filter(m => m !== null);
      }
    }

    return [];
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

  getVoxHitFromIntersection(intersection, hitCell, hitNormal, adjacentCell) {
    const { meshToVoxId, voxMap } = this;

    const hitObject = intersection && intersection.object;
    const voxId = meshToVoxId.get(hitObject);
    if (!voxId || !hitObject) return null;

    const { targettingMesh, targettingMeshFrame, targettingMeshInstanceId, meshes } = voxMap.get(voxId);
    const frame = hitObject === targettingMesh ? targettingMeshFrame : meshes.indexOf(hitObject);
    const instanceId = hitObject === targettingMesh ? targettingMeshInstanceId : intersection.instanceId;
    const inv = this.getWorldToObjectMatrix(voxId, frame, instanceId);
    tmpVec.copy(intersection.point);
    tmpVec.applyMatrix4(inv);
    tmpVec.multiplyScalar(1 / VOXEL_SIZE);

    const nx = intersection.face.normal.x;
    const ny = intersection.face.normal.y;
    const nz = intersection.face.normal.z;

    hitNormal.x = nx;
    hitNormal.y = ny;
    hitNormal.z = nz;

    // Hit cell is found by nudging along normal and rounding.
    // Also need to offset the geometry shift which aligns cells with bounding box.
    const hx = Math.round(tmpVec.x - 0.5 - nx * 0.5);
    const hy = Math.round(tmpVec.y - 0.5 - ny * 0.5);
    const hz = Math.round(tmpVec.z - 0.5 - nz * 0.5);

    hitCell.x = hx;
    hitCell.y = hy;
    hitCell.z = hz;

    // Adjacent cell is found by moving along normal (which is normalized).
    adjacentCell.x = hx + nx;
    adjacentCell.y = hy + ny;
    adjacentCell.z = hz + nz;

    // Returns vox id
    return voxId;
  }

  createPendingInverse(voxId, frame, patch, offset) {
    const chunk = this.getChunkFrameOfVox(voxId, frame);
    if (!chunk) return null;

    return vox0.createInverse(patch, chunk, offset);
  }

  // Returns the frame that was frozen
  freezeMeshForTargetting(voxId, instanceId) {
    const { sceneEl, voxMap, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { meshes, sources } = entry;
    const source = sources[instanceId];
    if (!source) return;

    const currentAnimationFrame = this.getCurrentAnimationFrame(voxId);
    const mesh = meshes[currentAnimationFrame];
    if (!mesh) return;

    if (entry.targettingMesh) {
      const existingMesh = entry.targettingMesh;
      entry.targettingMesh = null; // Do this first since removal will re-compute cursor targets
      scene.remove(existingMesh);
      existingMesh.material = null;
      disposeNode(existingMesh);
    }

    const geo = mesh.geometry.clone();
    geo.boundsTree = mesh.geometry.boundsTree;

    const targettingMesh = new Mesh(mesh.geometry.clone(), targettingMaterial);

    source.updateMatrices();
    setMatrixWorld(targettingMesh, source.matrixWorld);
    entry.targettingMesh = targettingMesh;
    entry.targettingMeshFrame = currentAnimationFrame;
    entry.targettingMeshInstanceId = instanceId;
    scene.add(targettingMesh);
    meshToVoxId.set(targettingMesh, voxId);

    this.dispatchEvent(new CustomEvent("mesh_added"));
    return currentAnimationFrame;
  }

  unfreezeMeshForTargetting(voxId) {
    const { sceneEl, voxMap, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const entry = voxMap.get(voxId);
    if (!entry) return;
    const { targettingMesh } = entry;
    if (!targettingMesh) return;

    entry.targettingMesh = null; // Do this first since removal will re-compute cursor targets
    scene.remove(targettingMesh);
    targettingMesh.geometry.boundsTree = null;
    targettingMesh.material = null;
    disposeNode(targettingMesh);
    meshToVoxId.delete(targettingMesh);

    this.dispatchEvent(new CustomEvent("mesh_removed"));
  }

  getTargettableMeshes() {
    const { voxMap } = this;

    const targetableMeshes = [];

    for (const { meshes, targettingMesh } of voxMap.values()) {
      const mesh = targettingMesh || meshes[0];

      if (mesh) {
        targetableMeshes.push(mesh);
      }
    }

    return targetableMeshes;
  }

  getTargettableMeshForSource(source) {
    const { voxMap } = this;

    for (const { sources, meshes, targettingMesh } of voxMap.values()) {
      if (sources.includes(source)) {
        return targettingMesh || meshes[0];
      }
    }

    return null;
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
    bbox.applyMatrix4(matrix);
    return bbox;
  }

  getSourceForMeshAndInstance(targetMesh, instanceId) {
    const { voxMap, meshToVoxId } = this;

    const voxId = meshToVoxId.get(targetMesh);
    if (!voxId) return null;

    const entry = voxMap.get(voxId);

    if (entry.targettingMesh === targetMesh) {
      const source = entry.sources[entry.targettingMeshInstanceId];
      if (source) return source;
    } else {
      const source = entry.sources[instanceId];
      if (source) return source;
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
    const { meshes, physicsMeshes, shapesUuid, dirtyFrameMeshes } = entry;

    const mesh = meshes[i];
    if (!mesh) return;

    const physicsMesh = physicsMeshes[i];

    // Retain material since it's shared among all vox.
    meshes[i] = null; // Do this first since removal will re-compute cursor targets
    scene.remove(mesh);
    mesh.material = null;
    disposeNode(mesh);
    meshToVoxId.delete(mesh);

    physicsMeshes[i] = null;
    disposeNode(physicsMesh);

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
    if (!el) return;

    const bodyHelper = el.components["body-helper"];

    if (!bodyHelper || !bodyHelper.ready) {
      await new Promise(res => el.addEventListener("body_ready", res, { once: true }));
    }

    return el.parentNode ? el.components["body-helper"].uuid : null;
  }

  setPendingVoxChunk(voxId, chunk, offsetX, offsetY, offsetZ) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;
    const { dirtyFrameMeshes } = entry;
    dirtyFrameMeshes.fill(true);
    entry.regenerateDirtyMeshesOnNextFrame = true;
    entry.pendingVoxChunk = chunk;
    entry.pendingVoxChunkOffset[0] = offsetX;
    entry.pendingVoxChunkOffset[1] = offsetY;
    entry.pendingVoxChunkOffset[2] = offsetZ;
  }

  filterChunkByVoxFrame(chunk, offsetX, offsetY, offsetZ, voxId, frame, filter) {
    const targetChunk = this.getChunkFrameOfVox(voxId, frame);
    if (!targetChunk) return null;

    chunk.filterByChunk(targetChunk, offsetX, offsetY, offsetZ, filter);
  }

  clearPendingAndUnfreezeMesh(voxId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;
    const { targettingMesh, dirtyFrameMeshes, targettingMeshFrame } = entry;

    // Mark dirty flags to regenerate meshes without pending applied
    if (targettingMesh) {
      this.unfreezeMeshForTargetting(voxId);
      dirtyFrameMeshes[targettingMeshFrame] = true;
    } else {
      dirtyFrameMeshes.fill(true);
    }

    entry.regenerateDirtyMeshesOnNextFrame = true;
    entry.pendingVoxChunk = null;
  }

  applyPendingAndUnfreezeMesh(voxId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;
    const { pendingVoxChunk, targettingMeshFrame, pendingVoxChunkOffset } = entry;

    this.unfreezeMeshForTargetting(voxId);

    if (!pendingVoxChunk) return;
    const offset = [...pendingVoxChunkOffset];

    // Don't mark dirty flag on meshes since doc will update.
    this.getSync(voxId).then(sync => {
      sync.applyChunk(pendingVoxChunk, targettingMeshFrame, offset);

      // Clear pending chunk after apply is done
      if (entry.pendingVoxChunk === pendingVoxChunk) {
        entry.pendingVoxChunk = null;
      }
    });
  }

  getVoxSize(voxId, frame) {
    const chunk = this.getChunkFrameOfVox(voxId, frame);
    if (!chunk) return null;
    return chunk.size;
  }

  getVoxColorAt(voxId, frame, x, y, z) {
    const chunk = this.getChunkFrameOfVox(voxId, frame);
    if (!chunk) return null;
    if (!chunk.hasVoxelAt(x, y, z)) return null;
    return chunk.getColorAt(x, y, z);
  }

  getTotalNonEmptyVoxelsOfTargettedFrame(voxId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return null;
    const { vox, targettingMeshFrame, targettingMesh } = entry;
    if (!targettingMesh) return null;

    return vox.frames[targettingMeshFrame].getTotalNonEmptyVoxels();
  }

  getChunkFrameOfVox(voxId, frame) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return null;
    const { vox } = entry;
    if (!vox) return null;

    const chunk = vox.frames[frame];
    if (!chunk) return null;
    return chunk;
  }

  getCurrentAnimationFrame(/* voxId */) {
    // TODO
    return 0;
    //const isCurrentAnimationFrame = this.frame % (maxMeshIndex + 1) === i;
  }
}

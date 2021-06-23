import { JelVoxBufferGeometry } from "../objects/JelVoxBufferGeometry";
import jwtDecode from "jwt-decode";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { createVox } from "../../hubs/utils/phoenix-utils";
import { TRANSFORM_MODE } from "../../hubs/systems/transform-selected-object";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { MeshBVH } from "three-mesh-bvh";
import { SHAPE, FIT } from "three-ammo/constants";
import { setMatrixWorld, generateMeshBVH, disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER, COLLISION_LAYERS } from "../../hubs/constants";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { addMedia, isLockedMedia, upload } from "../../hubs/utils/media-utils";
import { type as vox0, Vox, VoxChunk, rgbtForVoxColor } from "ot-vox";
import { ensureOwnership } from "../utils/ownership-utils";
import { dataURItoBlob } from "../utils/dom-utils";
import VoxSync from "../utils/vox-sync";
import FastVixel from "fast-vixel";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshStandardMaterial, VertexColors, Matrix4, Mesh } = THREE;
import { EventTarget } from "event-target-shim";

export const MAX_FRAMES_PER_VOX = 32;
const MAX_INSTANCES_PER_VOX_ID = 255;
const IDENTITY = new Matrix4();
const tmpMatrix = new Matrix4();
const tmpVec = new THREE.Vector3();
const RESHAPE_DELAY_MS = 5000;

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
      "vec3 shadows = clamp(vec3(pow(outgoingLight.r * 4.5, 5.0), pow(outgoingLight.g * 4.5, 5.0), pow(outgoingLight.b * 4.5, 5.0)), 0.0, 1.0);",
      "gl_FragColor = vec4(mix(shadows, vColor.rgb, 0.8), diffuseColor.a);",
      "#include <fog_fragment>"
    ].join("\n")
  );
};

export function voxIdForVoxUrl(url) {
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
  constructor(sceneEl, cursorTargettingSystem, physicsSystem, cameraSystem) {
    super();
    this.sceneEl = sceneEl;
    this.syncs = new Map();
    this.voxMap = new Map();
    this.sourceToVoxId = new Map();
    this.assetPanelDraggingVoxId = null;

    // Maps meshes to vox ids, this will include an entry for an active targeting mesh.
    this.meshToVoxId = new Map();

    this.sourceToLastCullPassFrame = new Map();
    this.cursorSystem = cursorTargettingSystem;
    this.physicsSystem = physicsSystem;
    this.onSyncedVoxUpdated = this.onSyncedVoxUpdated.bind(this);
    this.onSpacePresenceSynced = this.onSpacePresenceSynced.bind(this);
    this.frame = 0;
    this.sceneEl.addEventListener("space-presence-synced", this.onSpacePresenceSynced);

    this.sceneEl.addEventListener("media_locked_changed", ({ target }) => {
      const mediaVox = target && target.components["media-vox"];
      if (!mediaVox) return;

      const { voxId, mesh } = mediaVox;
      this.updateSourceWalkability(voxId, mesh);
    });

    // Need to remesh inspected vox when camera changes
    for (const evt of ["settings_changed", "mode_changed", "mode_changing"]) {
      cameraSystem.addEventListener(evt, () => {
        const voxId = this.getInspectedEditingVoxId();
        if (voxId === null) return;

        const entry = this.voxMap.get(voxId);
        entry.dirtyFrameMeshes.fill(true);
        entry.regenerateDirtyMeshesOnNextFrame = true;
      });
    }
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

        source.updateMatrices();

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

        if (!entry.pendingVoxChunk) {
          // The desired quad size may alter the algorithm used to generate shapes, so reshape.
          this.markShapesDirtyAfterDelay(voxId);
        }
      }

      // Generate shapes after desired quad size is computed, since shape algorithm is determined by that.
      if (entry.hasDirtyShapes) {
        this.regenerateShapesForVoxId(voxId);
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

  hasSync(voxId) {
    const { syncs } = this;
    return syncs.has(voxId);
  }

  async ensurePermissionsCached(voxId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { cachedPermissions } = entry;
    const exp = cachedPermissions && new Date(cachedPermissions.exp * 1000 - 60 * 1000);

    const now = new Date();
    const shouldFetch = !cachedPermissions || now > exp;
    if (!shouldFetch) return;

    const { permsToken } = await window.APP.accountChannel.fetchVoxPermsToken(voxId);
    entry.cachedPermissions = jwtDecode(permsToken);
  }

  // Synchronous, returns null and fetches permissions if missing.
  getPermissions(voxId) {
    const { voxMap, syncs } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return null;

    let perms;

    // Use sync permissions if sync is available. Otherwise
    // use a cache in this system.
    if (this.hasSync(voxId)) {
      const sync = syncs.get(voxId);
      perms = sync.permissions;
    }

    if (!perms) {
      perms = entry.cachedPermissions;

      // If no permissions found here, ensure they're fetched for next round trip.
      if (!perms) {
        this.ensurePermissionsCached(voxId);
      }
    }

    return perms;
  }

  canEdit(voxId) {
    const perms = this.getPermissions(voxId);

    if (perms) {
      return perms.edit_vox;
    } else {
      return false;
    }
  }

  async canEditAsync(voxId) {
    const perms = this.getPermissions(voxId);

    if (perms) {
      return perms.edit_vox;
    } else {
      await this.ensurePermissionsCached(voxId);
      return this.canEdit(voxId);
    }
  }

  async getSync(voxId) {
    const { sceneEl, syncs } = this;
    if (syncs.has(voxId)) {
      const sync = syncs.get(voxId);
      await sync.whenReady();
      return sync;
    }

    const sync = new VoxSync(voxId);
    syncs.set(voxId, sync);
    console.log("Start syncing vox", voxId);
    await sync.init(sceneEl);

    sync.addEventListener("vox_updated", this.onSyncedVoxUpdated);

    return sync;
  }

  endSyncing(voxId) {
    const { syncs } = this;
    const sync = syncs.get(voxId);
    if (!sync) return;

    sync.dispose();
    syncs.delete(voxId);
    console.log("Stop syncing vox", voxId);
  }

  onSyncedVoxUpdated({ detail: { voxId, vox, op } }) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { dirtyFrameMeshes } = entry;

    for (const { f: frame } of op) {
      dirtyFrameMeshes[frame] = true;

      if (frame === 0) {
        this.markShapesDirtyAfterDelay(voxId);
      }
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

    this.unregister(source);

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

        this.updatePhysicsComponentsForSource(voxId, source);

        // Shape may have been updated already, skip it if so.
        if (shapesUuid !== entry.shapesUuid) return;
        physicsSystem.setShapes([bodyUuid], shapesUuid);
      });
    }

    this.updateSourceWalkability(voxId, source);

    return voxId;
  }

  unregister(source) {
    const { voxMap, physicsSystem, sourceToLastCullPassFrame, sourceToVoxId } = this;
    if (!sourceToVoxId.has(source)) return;

    const voxId = sourceToVoxId.get(source);
    sourceToVoxId.delete(source);

    const voxEntry = voxMap.get(voxId);
    if (!voxEntry) return;

    const { maxRegisteredIndex, sourceToIndex, sources, meshes, shapesUuid, walkableSources } = voxEntry;

    if (!sourceToIndex.has(source)) return;
    const instanceIndex = sourceToIndex.get(source);
    sources[instanceIndex] = null;
    sourceToIndex.delete(source);
    source.onPassedFrustumCheck = () => {};
    sourceToLastCullPassFrame.delete(source);
    walkableSources[instanceIndex] = false;
    voxEntry.hasWalkableSources = !!voxEntry.walkableSources.find(x => x);

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
      meshBoundingBoxes: Array(MAX_FRAMES_PER_VOX).fill(null),
      sourceBoundingBoxes: Array(MAX_INSTANCES_PER_VOX_ID).fill(null),

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
      hasDirtyShapes: false,
      delayedReshapeTimeout: null,
      shapeOffset: [0, 0, 0],
      cachedPermissions: null,

      // True if the vox's current mesh is a big HACD shape, and so should
      // not collide with environment, etc.
      shapeIsEnvironmental: false,

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
      dirtyFrameBoundingBoxes: Array(MAX_FRAMES_PER_VOX).fill(true),
      regenerateDirtyMeshesOnNextFrame: true,

      // Flag used to force a write of the source world matrices to the instanced mesh.
      hasDirtyMatrices: false,

      // Current animation frame
      currentFrame: 0,

      // Promise that is resolved when the vox is registered + meshed, which must be waiting on
      // before registering sources
      voxRegistered,

      // Resolver for promise of registration + meshing
      voxRegisteredResolve,

      // True if vox source can be walked on on any source.
      hasWalkableSources: false,

      // If true, the corresponding source is walkable.
      walkableSources: Array(MAX_INSTANCES_PER_VOX_ID).fill(false),

      // Geometry to use for raycast for walking.
      walkGeometry: null,

      // Flag to determine when to send first_apply event to dyna which marks vox as edited
      hasAppliedAnyChunk: false
    };

    voxMap.set(voxId, entry);

    // If the sync is already available and open, use it.
    // Otherwise fetch frame data when first registering.
    if (this.hasSync(voxId)) {
      const sync = await this.getSync(voxId);
      entry.vox = sync.getVox();
    } else {
      const frames = await this.fetchVoxFrameChunks(voxUrl);
      const vox = new Vox(frames);
      entry.vox = vox;
    }

    entry.regenerateDirtyMeshesOnNextFrame = true;
  }

  unregisterVox(voxId) {
    const { sceneEl, voxMap, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const voxEntry = voxMap.get(voxId);
    const { targettingMesh, sizeBoxGeometry, maxMeshIndex, walkGeometry } = voxEntry;

    for (let i = 0; i <= maxMeshIndex; i++) {
      this.removeMeshForIndex(voxId, i);
    }

    if (walkGeometry) {
      voxEntry.walkGeometry = null;
      walkGeometry.dispose();
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

  getInspectedEditingVoxId() {
    const { cameraSystem } = SYSTEMS;
    if (!cameraSystem.isInspecting()) return null;
    if (!cameraSystem.allowCursor) return null;

    const { voxMap } = this;

    for (const [voxId, { sources }] of voxMap) {
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        if (source === null) continue;

        if (source.parent === cameraSystem.inspected) {
          return voxId;
        }
      }
    }

    return null;
  }

  regenerateDirtyMeshesForVoxId(voxId) {
    const { sceneEl, meshToVoxId, voxMap } = this;
    const scene = sceneEl.object3D;

    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { cameraSystem } = SYSTEMS;

    const inspectedVoxId = this.getInspectedEditingVoxId();

    const {
      vox,
      sources,
      dirtyFrameMeshes,
      dirtyFrameBoundingBoxes,
      meshes,
      meshBoundingBoxes,
      physicsMeshes,
      mesherQuadSize,
      maxRegisteredIndex,
      pendingVoxChunk,
      pendingVoxChunkOffset,
      hasWalkableSources
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

        // Only compute bounding box for frame zero
        if (meshBoundingBoxes[i] === null && i === 0) {
          meshBoundingBoxes[i] = new THREE.Box3();
        }

        dirtyFrameBoundingBoxes[i] = true;

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
        entry.hasDirtyShapes = true;

        remesh = true;
      }

      if (remesh) {
        let chunk = vox.frames[i];

        // If no pending + walkable update the walk geometry to match the first frame.
        if (!pendingVoxChunk && i === 0 && hasWalkableSources) {
          let walkGeometry = entry.walkGeometry;

          if (walkGeometry === null) {
            walkGeometry = entry.walkGeometry = new JelVoxBufferGeometry();
            walkGeometry.instanceAttributes = []; // For DynamicInstancedMesh
          }

          walkGeometry.update(chunk, 32, true, false);
          walkGeometry.boundsTree = new MeshBVH(walkGeometry, { strategy: 0, maxDepth: 30 });
        }

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

        const showXZPlane = inspectedVoxId === voxId && cameraSystem.showFloor;

        const [xMin, yMin, zMin, xMax, yMax, zMax] = mesh.geometry.update(chunk, mesherQuadSize, false, showXZPlane);

        const xExtent = xMax - xMin;
        const yExtent = yMax - yMin;
        const zExtent = zMax - zMin;

        // Offset the hull by the min and half the size
        const dx = xMin + xExtent / 2;
        const dy = yMin + yExtent / 2;
        const dz = zMin + zExtent / 2;

        entry.shapeOffset[0] = dx;
        entry.shapeOffset[1] = dy;
        entry.shapeOffset[2] = dz;

        if (!pendingVoxChunk) {
          generateMeshBVH(mesh, true);
          dirtyFrameBoundingBoxes[i] = true;
          regenerateSizeBox = true;
        }

        dirtyFrameMeshes[i] = false;
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

  regenerateShapesForVoxId(voxId) {
    const { physicsSystem, voxMap } = this;

    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { vox, sources, mesherQuadSize, physicsMeshes, maxRegisteredIndex, shapeOffset } = entry;
    if (!vox) return;
    if (vox.frames.length === 0) return;
    const chunk = vox.frames[0];

    const physicsMesh = physicsMeshes[0];
    if (physicsMesh === null) return;

    const shapeIsEnvironmental = mesherQuadSize <= 4;
    entry.shapeIsEnvironmental = shapeIsEnvironmental;

    const [dx, dy, dz] = shapeOffset;
    entry.hasDirtyShapes = false;

    const type = shapeIsEnvironmental ? SHAPE.HACD : SHAPE.HULL;

    // Generate a simpler mesh to improve generation time
    //
    // Generate a LOD (which has less accuracy but will ensure HACD
    // generation isn't terribly slow.)
    const totalVoxels = chunk.getTotalNonEmptyVoxels();
    const lod = totalVoxels > 12500 ? 3 : totalVoxels > 3500 ? 2 : 1;

    physicsMesh.geometry.update(chunk, 32, true, false, lod);

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

    // Collect body UUIDs, update collision masks, and then set shape + destroy existing.
    for (let j = 0; j <= maxRegisteredIndex; j++) {
      const source = sources[j];
      if (source === null) continue;

      bodyReadyPromises.push(
        new Promise(res => {
          this.getBodyUuidForSource(source).then(bodyUuid => {
            if (bodyUuid !== null) {
              bodyUuids.push(bodyUuid);
            }

            this.updatePhysicsComponentsForSource(voxId, source);

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
      } else {
        // New shapes came along since this started, destroy these.
        physicsSystem.destroyShapes(shapesUuid);
      }

      if (previousShapesUuid !== null) {
        physicsSystem.destroyShapes(previousShapesUuid);
      }
    });
  }

  getMeshesForSource(source) {
    for (const entry of this.voxMap.values()) {
      if (entry.sources.includes(source)) {
        return entry.meshes.filter(m => m !== null);
      }
    }

    return [];
  }

  // Returns true if the specified source is the passed mesh's instance
  isMeshInstanceForSource(mesh, instanceId, source) {
    if (instanceId === undefined || instanceId === null || !mesh) return false;
    const { sourceToVoxId, voxMap } = this;
    const voxId = sourceToVoxId.get(source);
    if (!voxId) return false;
    const { sources, meshes, targettingMesh, targettingMeshInstanceId } = voxMap.get(voxId);

    return (
      (sources.indexOf(source) === instanceId || targettingMeshInstanceId === instanceId) &&
      (meshes.indexOf(mesh) >= 0 || targettingMesh === mesh)
    );
  }

  getVoxIdForSource(source) {
    return this.sourceToVoxId.get(source);
  }

  getSourceForVoxId(voxId, instanceId) {
    return this.voxMap.get(voxId).sources[instanceId];
  }

  updatePhysicsComponentsForSource(voxId, source) {
    const { voxMap } = this;
    if (!voxMap.has(voxId)) return;
    const { shapeIsEnvironmental } = voxMap.get(voxId);

    // The HACD environment shapes should *not* collide with each other or the  environment, to reduce physics lag.
    const collisionFilterGroup = shapeIsEnvironmental ? COLLISION_LAYERS.ENVIRONMENT : COLLISION_LAYERS.INTERACTABLES;

    const bodyHelper = source.el.components["body-helper"];

    const collisionFilterMask = shapeIsEnvironmental
      ? COLLISION_LAYERS.ENVIRONMENTAL_VOX
      : bodyHelper
        ? bodyHelper.data.collisionFilterMask
        : COLLISION_LAYERS.UNOWNED_INTERACTABLE;

    const gravitySpeedLimit = shapeIsEnvironmental ? 0 : 1.85;

    const floatyObject = source.el.components["floaty-object"];

    if (
      bodyHelper &&
      (bodyHelper.data.collisionFilterMask !== collisionFilterMask ||
        bodyHelper.data.collisionFilterGroup !== collisionFilterGroup)
    ) {
      source.el.setAttribute("body-helper", { collisionFilterMask, collisionFilterGroup });
    }

    if (floatyObject && floatyObject.data.gravitySpeedLimit !== gravitySpeedLimit) {
      source.el.setAttribute("floaty-object", { gravitySpeedLimit });
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

  getBoundingBoxForSource = (function() {
    const matrix = new THREE.Matrix4();
    return function(source, worldSpace = false) {
      const { sourceToVoxId, voxMap } = this;
      if (!sourceToVoxId.has(source)) return null;

      const voxId = sourceToVoxId.get(source);
      const { sources, meshes, meshBoundingBoxes, sourceBoundingBoxes, dirtyFrameBoundingBoxes } = voxMap.get(voxId);
      if (meshes.length === 0) return null;

      const mesh = meshes[0];
      let bbox = meshBoundingBoxes[0];

      if (dirtyFrameBoundingBoxes[0]) {
        bbox.makeEmpty();
        bbox.expandByObject(mesh);
        dirtyFrameBoundingBoxes[0] = false;
      }

      if (worldSpace) {
        const instanceId = sources.indexOf(source);
        bbox = sourceBoundingBoxes[instanceId];

        if (!bbox) {
          bbox = sourceBoundingBoxes[instanceId] = new THREE.Box3();
        }

        mesh.getMatrixAt(instanceId, matrix);

        bbox.copy(meshBoundingBoxes[0]);
        bbox.applyMatrix4(matrix);
      }

      return bbox;
    };
  })();

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
    entry.hasDirtyShapes = true;
    entry.shapeOffset[0] = 0;
    entry.shapeOffset[1] = 0;
    entry.shapeOffset[2] = 0;

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
    const { accountChannel } = window.APP;

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

      if (!entry.hasAppliedAnyChunk) {
        accountChannel.markVoxEdited(voxId);
        entry.hasAppliedAnyChunk = true;
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

  async fetchVoxFrameChunks(voxUrl) {
    const store = window.APP.store;

    const res = await fetch(voxUrl, {
      headers: { authorization: `bearer ${store.state.credentials.token}` }
    });

    const {
      vox: [{ frames }]
    } = await res.json();

    return frames.map(f => VoxChunk.deserialize(f));
  }

  async getOrFetchVoxFrameChunks(voxId) {
    const { voxMap } = this;
    const { voxMetadata } = window.APP;
    const entry = voxMap.get(voxId);
    if (entry && entry.vox) return entry.vox.frames;
    const { url } = await voxMetadata.getOrFetchMetadata(voxId);
    return await this.fetchVoxFrameChunks(url);
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

  updateSourceWalkability(voxId, source) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return null;

    const { sources } = entry;
    const instanceId = sources.indexOf(source);
    if (instanceId === -1) return;

    entry.walkableSources[instanceId] = !!(source.el && isLockedMedia(source.el));

    entry.hasWalkableSources = !!entry.walkableSources.find(x => x);

    if (entry.hasWalkableSources) {
      // Remesh to generate or update walk geometry
      entry.dirtyFrameMeshes[0] = true;
      entry.regenerateDirtyMeshesOnNextFrame = true;
    }
  }

  markShapesDirtyAfterDelay(voxId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    const { delayedReshapeTimeout } = entry;

    if (delayedReshapeTimeout) {
      clearTimeout(delayedReshapeTimeout);
    }

    entry.delayedReshapeTimeout = setTimeout(() => {
      entry.hasDirtyShapes = true;
      entry.delayedReshapeTimeout = null;
    }, RESHAPE_DELAY_MS);
  }

  getCurrentAnimationFrame(/* voxId */) {
    // TODO
    return 0;
    //const isCurrentAnimationFrame = this.frame % (maxMeshIndex + 1) === i;
  }

  shouldBurstProjectileOnImpact(voxId) {
    const { voxMap } = this;
    const entry = voxMap.get(voxId);
    if (!entry) return;

    // Environment VOX should have projectiles bounce off.
    return !entry.shapeIsEnvironmental;
  }

  // Efficiently raycast to the closest walkable source, skipping non-walkable
  // sources and avoiding extra raycasts. Only can cast up or down, so we can use
  // bounding box to quickly cull as well.
  raycastVerticallyToClosestWalkableSource = (function() {
    const tmpMesh = new Mesh();
    const instanceLocalMatrix = new Matrix4();
    const instanceWorldMatrix = new Matrix4();
    const instanceIntersects = [];
    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = true; // flag specific to three-mesh-bvh
    raycaster.near = 0.01;
    raycaster.far = 40;
    raycaster.ray.direction.set(0, 1, 0);

    return function(origin, up = true, backSide = false) {
      const { voxMap } = this;

      const { side } = voxMaterial;
      let intersection = null;

      if (backSide) {
        voxMaterial.side = THREE.BackSide;
      }

      raycaster.ray.origin.copy(origin);
      raycaster.ray.direction.y = up ? 1 : -1;

      for (const entry of voxMap.values()) {
        if (!entry.hasWalkableSources) continue;
        const voxMesh = entry.meshes[0];
        if (voxMesh === null) continue;

        const { sources, walkableSources, walkGeometry } = entry;
        if (walkGeometry === null) continue;

        for (let instanceId = 0, l = sources.length; instanceId < l; instanceId++) {
          const source = sources[instanceId];
          if (source === null) continue;
          if (!walkableSources[instanceId]) continue;

          // Bounding box check for origin X,Z since we are casting up/down
          const bbox = this.getBoundingBoxForSource(source, true);

          if (origin.x < bbox.min.x || origin.x > bbox.max.x || origin.z < bbox.min.z || origin.z > bbox.max.z)
            continue;

          // Raycast once for each walkable source.
          tmpMesh.geometry = walkGeometry;
          tmpMesh.material = voxMaterial;
          voxMesh.updateMatrices();
          voxMesh.getMatrixAt(instanceId, instanceLocalMatrix);
          instanceWorldMatrix.multiplyMatrices(voxMesh.matrixWorld, instanceLocalMatrix);
          tmpMesh.matrixWorld = instanceWorldMatrix;
          tmpMesh.raycast(raycaster, instanceIntersects);

          if (instanceIntersects.length === 0) continue;

          const newIntersection = instanceIntersects[0];

          if (intersection === null || intersection.distance > newIntersection.distance) {
            intersection = newIntersection;
            intersection.instanceId = instanceId;
            intersection.object = voxMesh;
          }

          instanceIntersects.length = 0;
        }
      }

      voxMaterial.side = side;

      return intersection;
    };
  })();

  publishAllInCurrentWorld = (function() {
    const tmpVec = new THREE.Vector3();

    return async function(collection, category) {
      const { voxMap } = this;
      const { accountChannel, hubChannel } = window.APP;
      const hubId = hubChannel.hubId;

      for (const [voxId, { sources }] of voxMap.entries()) {
        let scale = 1.0;

        for (let i = 0; i < sources.length; i++) {
          const source = sources[i];
          if (source === null) continue;
          source.el.object3D.getWorldScale(tmpVec);
          scale = tmpVec.x;
          break;
        }

        console.log(`Publishing ${voxId} with scale ${scale}.`);
        const { thumbData, previewData } = await this.renderVoxToImage(voxId);

        console.log(`Generated image for ${voxId}.`);
        const thumbBlob = dataURItoBlob(thumbData);
        const previewBlob = dataURItoBlob(previewData);
        const { file_id: thumbFileId } = await upload(thumbBlob, "image/png", hubId);
        const { file_id: previewFileId } = await upload(previewBlob, "image/png", hubId);

        console.log(`Uploaded images for ${voxId}.`);
        const publishedVoxId = await accountChannel.publishVox(
          voxId,
          collection,
          category,
          scale,
          thumbFileId,
          previewFileId
        );
        console.log(`Updated published vox for ${voxId}: ${publishedVoxId}.`);

        this.copyVoxContent(voxId, publishedVoxId);

        console.log(`Synced voxels to ${publishedVoxId}.`);
      }

      console.log("Done publishing.");
    };
  })();

  // If toVoxId is null, create a new vox.
  //
  // Returns null if not creating a new vox, or the vox id and url if a new vox
  // is created.
  async copyVoxContent(fromVoxId, toVoxId = null) {
    const spaceId = window.APP.spaceChannel.spaceId;
    const hubId = window.APP.hubChannel.hubId;

    let sync;
    let disposeSync = false;
    let returnValue = null;

    if (toVoxId === null) {
      const {
        vox: [{ vox_id: voxId, url }]
      } = await createVox(spaceId, hubId, fromVoxId);

      toVoxId = voxId;
      returnValue = { voxId, url };

      sync = await this.getSync(voxId);
    } else {
      // Re-use existing sync if possible.
      if (this.hasSync(toVoxId)) {
        sync = await this.getSync(toVoxId);
      } else {
        sync = new VoxSync(toVoxId);
        await sync.init(this.sceneEl);
        disposeSync = true;
      }
    }

    const frames = await this.getOrFetchVoxFrameChunks(fromVoxId);

    for (let i = 0; i < MAX_FRAMES_PER_VOX; i++) {
      const chunk = frames[i];
      if (!chunk) continue;
      await sync.applyChunk(chunk, i, [0, 0, 0]);
    }

    if (disposeSync) {
      sync.dispose();
    }

    return returnValue;
  }

  async beginPlacingDraggedVox() {
    const { assetPanelDraggingVoxId } = this;
    const { voxMetadata } = window.APP;
    if (!assetPanelDraggingVoxId) return;

    const metadata = await voxMetadata.getOrFetchMetadata(assetPanelDraggingVoxId);

    const { url, published_scale } = metadata;

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

    entity.object3D.scale.setScalar(published_scale);
    entity.object3D.matrixNeedsUpdate = true;

    // Needed to ensure media presence is triggered
    entity.setAttribute("offset-relative-to", {
      target: "#avatar-pov-node",
      offset: { x: 0, y: 0, z: 0 }
    });

    const rightHand = document.getElementById("player-right-controller");
    const transformSystem = this.sceneEl.systems["transform-selected-object"];

    entity.addEventListener(
      "model-loaded",
      () => {
        transformSystem.startTransform(entity.object3D, rightHand.object3D, {
          mode: TRANSFORM_MODE.STACK
        });
      },
      { once: true }
    );
  }

  async bakeOrInstantiatePublishedVoxEntities(voxId) {
    const { voxMetadata } = window.APP;
    const { url, is_published } = await voxMetadata.getOrFetchMetadata(voxId);

    // Called on a non-published vox
    if (!is_published) return;

    // Get the new baked/instantiated URL and update all the entities
    const newVoxUrl = await this.resolveBakedOrInstantiatedVox(url);
    const promises = [];

    for (const entity of document.querySelectorAll("[media-vox]")) {
      const entityVoxId = entity.components["media-vox"].voxId;
      if (entityVoxId !== voxId) continue;
      if (!ensureOwnership(entity)) continue;
      promises.push(new Promise(res => entity.addEventListener("model-loaded", res, { once: true })));
      entity.setAttribute("media-loader", { src: newVoxUrl });
    }

    await Promise.all(promises);
  }

  // Given a src URL to a vox, determines if we should bake and/or modify the src before instantation.
  //
  // If the specified vox is a published vox, we do not want to instantiate that directly. Dyna is queried
  // to determine if there is already an existing, unmodified, baked vox based on this published vox. If not,

  async resolveBakedOrInstantiatedVox(voxSrc) {
    const { voxMetadata, hubChannel, accountChannel } = window.APP;
    const hubId = hubChannel.hubId;

    const voxId = voxIdForVoxUrl(voxSrc);
    const metadata = await voxMetadata.getOrFetchMetadata(voxId);

    if (!metadata.is_published) return voxSrc;

    // Determine if there is a cleanly baked version of this vox already.
    const existingVoxId = await accountChannel.getExistingBakedVox(voxId, hubId);

    const { url } = await (existingVoxId ? voxMetadata.getOrFetchMetadata(existingVoxId) : this.copyVoxContent(voxId));
    return url;
  }

  async renderVoxToImage(voxId) {
    const frames = await this.getOrFetchVoxFrameChunks(voxId);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    canvas.setAttribute("style", "visibility: hidden; width: 256px; height: 256px;");
    const preview = document.createElement("canvas");
    const thumb = document.createElement("canvas");

    preview.width = 256 * 5;
    preview.height = 256 * 5;
    thumb.width = 256;
    thumb.height = 256;

    const previewContext = preview.getContext("2d");
    const thumbContext = thumb.getContext("2d");

    document.body.appendChild(canvas);

    const chunk = frames[0];
    const fvixel = new FastVixel({ canvas: canvas, size: chunk.size });
    fvixel.setGround({ color: [17 / 255.0, 23.0 / 255.0, 71.0 / 255.0] });

    const shiftForSize = size => Math.floor(size % 2 === 0 ? size / 2 - 1 : size / 2);
    const xShift = shiftForSize(chunk.size[0]);
    const yShift = shiftForSize(chunk.size[1]);
    const zShift = shiftForSize(chunk.size[2]);
    const colorMap = new Map();

    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;

    // Fill vixel voxels
    for (let x = 0, lx = chunk.size[0]; x < lx; x++) {
      for (let y = 0, ly = chunk.size[1]; y < ly; y++) {
        for (let z = 0, lz = chunk.size[2]; z < lz; z++) {
          const idx = chunk.getPaletteIndexAt(x - xShift, y - yShift, z - zShift);
          if (idx === 0) continue;

          maxX = Math.max(x, maxX);
          maxY = Math.max(y, maxY);
          maxZ = Math.max(z, maxZ);

          minX = Math.min(x, minX);
          minY = Math.min(y, minY);
          minZ = Math.min(z, minZ);

          let color = colorMap.get(idx);

          if (!color) {
            const rgbt = rgbtForVoxColor(chunk.colorForPaletteIndex(idx));
            color = {
              red: rgbt.r / 255.0,
              green: rgbt.g / 255.0,
              blue: rgbt.b / 255.0
            };

            colorMap.set(idx, color);
          }

          fvixel.set(x, y, z, color);
        }
      }
    }

    const cx = (maxX + minX) / 2.0;
    const cy = (maxY + minY) / 2.0;
    const cz = (maxZ + minZ) / 2.0;

    let rho =
      Math.sqrt((maxX - minX) * (maxX - minX) + (maxY - minY) * (maxY - minY) + (maxZ - minZ) * (maxZ - minZ)) * 1.5;

    rho = Math.max(rho, 8);

    const phi = Math.PI / 2.8;
    const y = rho * Math.cos(phi) + cy;
    const imageDrawPromises = [];

    // 24 frames - rotate camera around origin across an arc of PI / 2
    for (let i = 0; i < 24; i++) {
      const theta = (Math.PI / 48) * (i - 12);

      const x = rho * Math.sin(phi) * Math.cos(theta) + cx;
      const z = rho * Math.sin(phi) * Math.sin(theta) + cz;

      fvixel.setCamera({
        eye: [x, y, z], // Camera position
        center: [cx, cy - (maxY - minY) * 0.05, cz], // Camera target
        up: [0, 1, 0], // Up
        fov: Math.PI / 4 // Field of view
      });

      await new Promise(res => {
        const wait = () => {
          fvixel.sample(256);

          if (fvixel.sampleCount >= 256) {
            fvixel.display();
            const data = canvas.toDataURL();

            imageDrawPromises.push(
              new Promise(res => {
                const img = new Image();

                img.onload = () => {
                  const x = Math.floor(i % 5);
                  const y = Math.floor(i / 5);
                  previewContext.drawImage(img, x * 256, y * 256, 256, 256);

                  if (i === 0) {
                    // Thumb is first frame
                    thumbContext.drawImage(img, 0, 0, 256, 256);
                  }

                  res();
                };

                img.src = data;
              })
            );

            res();
          } else {
            requestAnimationFrame(wait);
          }
        };

        requestAnimationFrame(wait);
      });
    }

    await Promise.all(imageDrawPromises);

    const previewData = preview.toDataURL();
    const thumbData = thumb.toDataURL();

    document.body.removeChild(canvas);

    return { previewData, thumbData };
  }
}

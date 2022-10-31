import { VoxChunkBufferGeometry } from "../objects/vox-chunk-buffer-geometry";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { TRANSFORM_MODE } from "../../hubs/systems/transform-selected-object";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { MeshBVH } from "three-mesh-bvh";
import { SHAPE, FIT } from "three-ammo/constants";
import { setMatrixWorld, generateMeshBVH, disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER, COLLISION_LAYERS } from "../../hubs/constants";
import { VOXEL_SIZE } from "../objects/vox-chunk-buffer-geometry";
import { addMedia, isLockedMedia, addMediaInFrontOfPlayerIfPermitted } from "../../hubs/utils/media-utils";
import { Vox } from "../vox/vox";
import { VoxChunk, rgbtForVoxColor, REMOVE_VOXEL_COLOR } from "../vox/vox-chunk";
import { ensureOwnership } from "../utils/ownership-utils";
import { Model, SvoxMeshGenerator } from "smoothvoxels";
import {
  CompressionStream as CompressionStreamImpl,
  DecompressionStream as DecompressionStreamImpl
} from "@stardazed/streams-compression";
import { getHubIdFromHistory, getLocalRelativePathFromUrl } from "../utils/jel-url-utils";
import {
  voxToSVoxBytes,
  voxChunkToSVoxChunkBytes,
  fetchSVoxFromUrl,
  voxFramesFromSVoxRef,
  ensureVoxFrame,
  VOX_CONTENT_TYPE,
  sVoxRefFromBytes,
  getVoxIdFromUrl
} from "../utils/vox-utils";
import { ByteBuffer } from "flatbuffers";
import FastVixel from "fast-vixel";

import { SVoxChunk } from "../vox/svox-chunk";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshStandardMaterial, Matrix4, Mesh } = THREE;
import { EventTarget } from "event-target-shim";

export const MAX_FRAMES_PER_VOX = 32;
const MAX_INSTANCES_PER_VOX_ID = 255;
const IDENTITY = new Matrix4();
const tmpMatrix = new Matrix4();
const tmpVec = new THREE.Vector3();
const RESHAPE_DELAY_MS = 5000;
const WRITEBACK_DELAY_MS = 10000;
const DELTA_RING_BUFFER_LENGTH = 32;

const targettingMaterial = new MeshStandardMaterial({ color: 0xffffff });
targettingMaterial.visible = false;

const voxMaterial = new ShaderMaterial({
  name: "vox",
  vertexColors: true,
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

function createMesh() {
  const geometry = new VoxChunkBufferGeometry();
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
  const geometry = new VoxChunkBufferGeometry();
  const material = voxMaterial;
  const mesh = new Mesh(geometry, material);
  return mesh;
}

// Manages user-editable voxel objects
export class VoxSystem extends EventTarget {
  constructor(sceneEl, cursorTargettingSystem, physicsSystem, cameraSystem) {
    super();

    this.onVoxMetadataUpdated = this.onVoxMetadataUpdated.bind(this);

    this.sceneEl = sceneEl;

    this.voxIdToEntry = new Map();
    this.voxIdToVox = new Map(); // Separate vox map, since vox data can be loaded before entities are registered

    this.sourceToVoxId = new Map();
    this.assetPanelDraggingVoxId = null;
    this.nextWritebackTime = null;

    // Maps meshes to vox ids, this will include an entry for an active targeting mesh.
    this.meshToVoxId = new Map();

    this.sourceToLastCullPassFrame = new Map();
    this.cursorSystem = cursorTargettingSystem;
    this.physicsSystem = physicsSystem;
    this.frame = 0;

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

        const entry = this.voxIdToEntry.get(voxId);
        entry.dirtyFrameMeshes.fill(true);
        entry.regenerateDirtyMeshesOnNextFrame = true;
      });
    }
  }

  tick() {
    const { voxIdToEntry, voxIdToVox } = this;

    this.frame++;

    for (const [voxId, entry] of voxIdToEntry.entries()) {
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
        sources
      } = entry;

      if (regenerateDirtyMeshesOnNextFrame && voxIdToVox.has(voxId)) {
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

    if (this.nextWritebackTime !== null && performance.now() > this.nextWritebackTime) {
      this.performWriteback();
    }

    // TODO
    // Check for expiring syncs
  }

  canEdit(voxId) {
    return window.APP.atomAccessManager.voxCan("edit_vox", voxId);
  }

  async canEditAsync(voxId) {
    const { voxMetadata } = window.APP;
    await voxMetadata.ensureMetadataForIds([voxId]);
    return this.canEdit(voxId);
  }

  onSyncedVoxUpdated(voxId, frame) {
    const { voxIdToEntry } = this;

    const entry = voxIdToEntry.get(voxId);
    if (!entry) return;

    const { dirtyFrameMeshes } = entry;

    dirtyFrameMeshes[frame] = true;

    if (frame === 0) {
      this.markShapesDirtyAfterDelay(voxId);
    }

    this.markDirtyForWriteback(voxId);
    entry.regenerateDirtyMeshesOnNextFrame = true;
  }

  markDirtyForWriteback(voxId) {
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
    if (!entry) return;
    entry.shouldWritebackToOrigin = true;

    if (this.nextWritebackTime === null) {
      this.nextWritebackTime = performance.now() + WRITEBACK_DELAY_MS;
    }
  }

  onVoxMetadataUpdated(voxIds) {
    for (const voxId of voxIds) {
      this.markDirtyForWriteback(voxId);
    }
  }

  async register(voxUrl, source) {
    const { physicsSystem, voxIdToEntry, sourceToVoxId } = this;

    this.unregister(source);

    const voxId = await getVoxIdFromUrl(voxUrl);

    if (!voxIdToEntry.has(voxId)) {
      await this.registerVox(voxUrl);
    }

    // Wait until meshes are generated if many sources registered concurrently.
    await voxIdToEntry.get(voxId).voxRegistered;
    const voxEntry = voxIdToEntry.get(voxId);
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
        if (!voxIdToEntry.has(voxId)) return;
        const entry = voxIdToEntry.get(voxId);

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
    const { voxIdToEntry, physicsSystem, sourceToLastCullPassFrame, sourceToVoxId } = this;
    if (!sourceToVoxId.has(source)) return;

    const voxId = sourceToVoxId.get(source);
    sourceToVoxId.delete(source);

    const voxEntry = voxIdToEntry.get(voxId);
    if (!voxEntry) return;

    const { sourceToIndex, sources, meshes, shapesUuid, walkableSources } = voxEntry;

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

    if (instanceIndex === voxEntry.maxRegisteredIndex) {
      do {
        voxEntry.maxRegisteredIndex--;
      } while (voxEntry.maxRegisteredIndex >= 0 && sources[voxEntry.maxRegisteredIndex] === null);
    }

    if (sourceToIndex.size === 0) {
      this.unregisterVox(voxId);
    }
  }

  async registerVox(voxUrl) {
    const { voxMetadata, editRingManager } = window.APP;
    const { voxIdToEntry, voxIdToVox } = this;

    const voxId = await getVoxIdFromUrl(voxUrl);
    voxMetadata.subscribeToMetadata(voxId, this.onVoxMetadataUpdated);
    editRingManager.registerRingEditableDocument(voxId, this);

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
      models: Array(MAX_FRAMES_PER_VOX).fill(null),
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
      // This is used in building mode to display the in-process voxel brush.
      pendingVoxChunk: null,
      pendingVoxChunkOffset: [0, 0, 0],

      // UUID of the physics shape for this vox (derived from the first vox frame)
      shapesUuid: null,
      hasDirtyShapes: false,
      delayedReshapeTimeout: null,
      shapeOffset: [0, 0, 0],

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

      // True if the entry needs to be flushed back to origin
      shouldWritebackToOrigin: false,

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

      // Ring buffer of received and applied deltas, used for conflict resolution.
      deltaRing: Array(DELTA_RING_BUFFER_LENGTH).fill(null),
      deltaRingIndex: 0
    };

    voxIdToEntry.set(voxId, entry);

    // If the vox is already available, use it, otherwise fetch frame data when first registering.
    if (!voxIdToVox.has(voxId)) {
      const svoxRef = await fetchSVoxFromUrl(voxUrl, () => voxIdToVox.has(voxId));
      const frames = voxFramesFromSVoxRef(svoxRef);
      const vox = new Vox(frames, svoxRef.revision());

      // Vox may have been set over p2p by this point, this is why we also stop retries above
      if (!voxIdToVox.has(voxId)) {
        voxIdToVox.set(voxId, vox);
      }
    }

    entry.regenerateDirtyMeshesOnNextFrame = true;
  }

  unregisterVox(voxId) {
    const { voxMetadata, editRingManager } = window.APP;
    const { sceneEl, voxIdToEntry, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const voxEntry = voxIdToEntry.get(voxId);
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

    voxIdToEntry.delete(voxId);
    editRingManager.unregisterRingEditableDocument(voxId);

    if (voxIdToEntry.size === 0) {
      voxMetadata.unsubscribeFromMetadata(this.onVoxMetadataUpdated);
    }
  }

  getInspectedEditingVoxId() {
    const { cameraSystem } = SYSTEMS;
    if (!cameraSystem.isInspecting()) return null;
    if (!cameraSystem.allowCursor) return null;

    const { voxIdToEntry } = this;

    for (const [voxId, { sources }] of voxIdToEntry) {
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
    const { sceneEl, meshToVoxId, voxIdToEntry, voxIdToVox } = this;
    const scene = sceneEl.object3D;

    const entry = voxIdToEntry.get(voxId);
    if (!entry) return;

    const vox = voxIdToVox.get(voxId);
    if (!vox) return;

    const { cameraSystem } = SYSTEMS;

    const inspectedVoxId = this.getInspectedEditingVoxId();

    const {
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
            walkGeometry = entry.walkGeometry = new VoxChunkBufferGeometry();
            walkGeometry.instanceAttributes = []; // For DynamicInstancedMesh
          }

          walkGeometry.update(chunk, 32, true, false);
          walkGeometry.boundsTree = new MeshBVH(walkGeometry, { strategy: 0, maxDepth: 30 });
        }

        // Apply any ephemeral pending (eg from voxel brushes.)
        if (pendingVoxChunk) {
          chunk = chunk.clone();

          pendingVoxChunk.applyToChunk(
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
    const { physicsSystem, voxIdToEntry, voxIdToVox } = this;

    const entry = voxIdToEntry.get(voxId);
    if (!entry) return;

    const { sources, mesherQuadSize, physicsMeshes, maxRegisteredIndex, shapeOffset } = entry;

    const vox = voxIdToVox.get(voxId);
    if (!vox || vox.frames.length === 0) return;

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
    for (const entry of this.voxIdToEntry.values()) {
      if (entry.sources.includes(source)) {
        return entry.meshes.filter(m => m !== null);
      }
    }

    return [];
  }

  // Returns true if the specified source is the passed mesh's instance
  isMeshInstanceForSource(mesh, instanceId, source) {
    if (instanceId === undefined || instanceId === null || !mesh) return false;
    const { sourceToVoxId, voxIdToEntry } = this;
    const voxId = sourceToVoxId.get(source);
    if (!voxId) return false;
    const { sources, meshes, targettingMesh, targettingMeshInstanceId } = voxIdToEntry.get(voxId);

    return (
      (sources.indexOf(source) === instanceId || targettingMeshInstanceId === instanceId) &&
      (meshes.indexOf(mesh) >= 0 || targettingMesh === mesh)
    );
  }

  getVoxIdForSource(source) {
    return this.sourceToVoxId.get(source);
  }

  getSourceForVoxId(voxId, instanceId) {
    return this.voxIdToEntry.get(voxId).sources[instanceId];
  }

  updatePhysicsComponentsForSource(voxId, source) {
    const { voxIdToEntry } = this;
    if (!voxIdToEntry.has(voxId)) return;
    const { shapeIsEnvironmental } = voxIdToEntry.get(voxId);

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

  getVoxHitFromIntersection(intersection, hitCell, hitNormal, adjacentCell) {
    const { meshToVoxId, voxIdToEntry } = this;

    const hitObject = intersection && intersection.object;
    const voxId = meshToVoxId.get(hitObject);
    if (!voxId || !hitObject) return null;

    const { targettingMesh, targettingMeshFrame, targettingMeshInstanceId, meshes } = voxIdToEntry.get(voxId);
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

    return patch.createInverse(chunk, offset);
  }

  // Returns the frame that was frozen
  freezeMeshForTargetting(voxId, instanceId) {
    const { sceneEl, voxIdToEntry, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const entry = voxIdToEntry.get(voxId);
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
    const { sceneEl, voxIdToEntry, meshToVoxId } = this;
    const scene = sceneEl.object3D;
    const entry = voxIdToEntry.get(voxId);
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
    const { voxIdToEntry } = this;

    const targetableMeshes = [];

    for (const { meshes, targettingMesh } of voxIdToEntry.values()) {
      const mesh = targettingMesh || meshes[0];

      if (mesh) {
        targetableMeshes.push(mesh);
      }
    }

    return targetableMeshes;
  }

  isTargettingMesh(mesh) {
    if (!mesh) return false;

    const { voxIdToEntry } = this;

    for (const { targettingMesh } of voxIdToEntry.values()) {
      if (targettingMesh === mesh) return true;
    }

    return false;
  }

  getTargettableMeshForSource(source) {
    const { voxIdToEntry } = this;

    for (const { sources, meshes, targettingMesh } of voxIdToEntry.values()) {
      if (sources.includes(source)) {
        return targettingMesh || meshes[0];
      }
    }

    return null;
  }

  getBoundingBoxForSource = (function() {
    const matrix = new THREE.Matrix4();
    return function(source, worldSpace = false) {
      const { sourceToVoxId, voxIdToEntry } = this;
      if (!sourceToVoxId.has(source)) return null;

      const voxId = sourceToVoxId.get(source);
      const { sources, meshes, meshBoundingBoxes, sourceBoundingBoxes, dirtyFrameBoundingBoxes } = voxIdToEntry.get(
        voxId
      );
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
    const { voxIdToEntry, meshToVoxId } = this;

    const voxId = meshToVoxId.get(targetMesh);
    if (!voxId) return null;

    const entry = voxIdToEntry.get(voxId);

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
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
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
      inverse.copy(tmpMatrix).invert();
      hasDirtyWorldToObjectMatrices[idx] = false;
    }

    return inverse;
  }

  removeMeshForIndex(voxId, i) {
    const { voxIdToEntry, meshToVoxId, sceneEl, physicsSystem } = this;
    const scene = sceneEl.object3D;
    const entry = voxIdToEntry.get(voxId);
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
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
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
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
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
    const { voxIdToEntry } = this;

    const entry = voxIdToEntry.get(voxId);
    if (!entry) return;
    const { pendingVoxChunk, targettingMeshFrame, pendingVoxChunkOffset } = entry;

    this.unfreezeMeshForTargetting(voxId);

    if (!pendingVoxChunk) return;
    const offset = [...pendingVoxChunkOffset];

    // Don't mark dirty flag on meshes since doc will update.
    this.applyChunk(voxId, pendingVoxChunk, targettingMeshFrame, offset);

    // Clear pending chunk after apply is done
    if (entry.pendingVoxChunk === pendingVoxChunk) {
      entry.pendingVoxChunk = null;
    }
  }

  async setVoxel(voxId, x, y, z, color, frame = 0) {
    const { voxIdToVox } = this;

    if (!voxIdToVox.has(voxId)) {
      voxIdToVox.set(voxId, new Vox([]));
    }

    const vox = voxIdToVox.get(voxId);
    ensureVoxFrame(vox, frame);

    const chunk = VoxChunk.fromJSON({ size: [1, 1, 1], palette: [color], indices: [1] });
    await this.applyChunk(voxId, chunk, frame, [x, y, z]);
  }

  async removeVoxel(voxId, x, y, z, frame = 0) {
    const { voxIdToVox } = this;

    if (!voxIdToVox.has(voxId)) {
      voxIdToVox.set(voxId, new Vox([]));
    }

    const vox = voxIdToVox.get(voxId);
    ensureVoxFrame(vox, frame);

    const chunk = VoxChunk.fromJSON({ size: [1, 1, 1], palette: [REMOVE_VOXEL_COLOR], indices: [1] });
    await this.applyChunk(voxId, chunk, frame, [x, y, z]);
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
    const { voxIdToEntry, voxIdToVox } = this;
    const entry = voxIdToEntry.get(voxId);
    if (!entry) return null;

    const vox = voxIdToVox.get(voxId);
    if (!vox) return null;

    const { targettingMeshFrame, targettingMesh } = entry;
    if (!targettingMesh) return null;

    return vox.frames[targettingMeshFrame].getTotalNonEmptyVoxels();
  }

  async getOrFetchVoxFrameChunks(voxId) {
    const { voxIdToVox } = this;
    const { voxMetadata } = window.APP;
    if (voxIdToVox.has(voxId)) return voxIdToVox.get(voxId).frames;
    const { url } = await voxMetadata.getOrFetchMetadata(voxId);
    return voxFramesFromSVoxRef(await fetchSVoxFromUrl(url));
  }

  getChunkFrameOfVox(voxId, frame) {
    const { voxIdToVox } = this;
    const vox = voxIdToVox.get(voxId);
    if (!vox) return null;

    const chunk = vox.frames[frame];
    if (!chunk) return null;
    return chunk;
  }

  updateSourceWalkability(voxId, source) {
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
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
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
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
    const { voxIdToEntry } = this;
    const entry = voxIdToEntry.get(voxId);
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
      const { voxIdToEntry } = this;

      const { side } = voxMaterial;
      let intersection = null;

      if (backSide) {
        voxMaterial.side = THREE.BackSide;
      }

      raycaster.ray.origin.copy(origin);
      raycaster.ray.direction.y = up ? 1 : -1;

      for (const entry of voxIdToEntry.values()) {
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

  raycastToVoxSource = (function() {
    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = false; // flag specific to three-mesh-bvh
    raycaster.far = 100.0;
    raycaster.near = 0.001;
    const intersections = [];

    return function(origin, direction, source) {
      const { voxIdToEntry } = this;

      raycaster.ray.origin = origin;
      raycaster.ray.direction = direction;

      const targettableMesh = this.getTargettableMeshForSource(source);
      if (!targettableMesh) return null;

      let instanceId = -1;
      for (const { sources } of voxIdToEntry.values()) {
        instanceId = sources.indexOf(source);
        if (instanceId >= 0) break;
      }

      intersections.length = 0;
      raycaster.intersectObjects([targettableMesh], true, intersections);

      for (const intersection of intersections) {
        if (intersection.instanceId === instanceId) {
          return intersection;
        }
      }

      return null;
    };
  })();

  publishAllInCurrentWorld = (function() {
    //const tmpVec = new THREE.Vector3();

    return async function(/*collection, category*/) {
      //const { voxIdToEntry } = this;
      //const { accountChannel } = window.APP;
      //const hubId = await getHubIdFromHistory();
      //for (const [voxId, { sources }] of voxIdToEntry.entries()) {
      //  let stackAxis = 0;
      //  let stackSnapPosition = false;
      //  let stackSnapScale = false;
      //  let scale = 1.0;
      //  let hasLockedMedia = false;
      //  for (let i = 0; i < sources.length; i++) {
      //    const source = sources[i];
      //    if (source === null) continue;
      //    hasLockedMedia = hasLockedMedia || isLockedMedia(source.el);
      //    source.el.object3D.getWorldScale(tmpVec);
      //    const mediaLoader = source.el.components["media-loader"];
      //    if (mediaLoader) {
      //      stackAxis = mediaLoader.data.stackAxis;
      //      stackSnapPosition = mediaLoader.data.stackSnapPosition;
      //      stackSnapScale = mediaLoader.data.stackSnapScale;
      //    }
      //    scale = tmpVec.x;
      //    break;
      //  }
      //  if (!hasLockedMedia) continue;
      //  console.log(`Publishing ${voxId} with scale ${scale}.`);
      //  const { thumbData, previewData } = await this.renderVoxToImage(voxId);
      //  console.log(`Generated image for ${voxId}.`);
      //  const thumbBlob = dataURItoBlob(thumbData);
      //  const previewBlob = dataURItoBlob(previewData);
      //  // TODO SHAREd
      //  //const { file_id: thumbFileId } = await upload(thumbBlob, "image/png", hubId);
      //  //const { file_id: previewFileId } = await upload(previewBlob, "image/png", hubId);
      //  //console.log(`Uploaded images for ${voxId}.`);
      //  //const publishedVoxId = await accountChannel.publishVox(
      //  //  voxId,
      //  //  collection,
      //  //  category,
      //  //  stackAxis,
      //  //  stackSnapPosition,
      //  //  stackSnapScale,
      //  //  scale,
      //  //  thumbFileId,
      //  //  previewFileId
      //  //);
      //  console.log(`Updated published vox for ${voxId}: ${publishedVoxId}.`);
      //  this.copyVoxContent(voxId, publishedVoxId);
      //  console.log(`Synced voxels to ${publishedVoxId}.`);
      //}
      //console.log("Done publishing.");
    };
  })();

  async createVoxInFrontOfPlayer(voxName, voxFilename, fromVoxId = null) {
    const { voxSystem, builderSystem } = SYSTEMS;
    const { voxMetadata } = window.APP;
    const { voxIdToVox } = this;
    const voxPath = `assets/${voxFilename}`;

    const baseUrl = new URL(document.location.href);
    baseUrl.pathname = baseUrl.pathname.replace(/\/[^/]*$/, "/");
    const voxUrl = new URL(voxPath, baseUrl).href;
    const voxId = btoa(voxUrl); // Vox id is base64 encoded url

    let fromVox;

    if (fromVoxId) {
      fromVox = voxIdToVox.get(fromVoxId);
    }

    let scale = 1.0;
    let stack_axis = 0;
    let stack_snap_position = false;
    let stack_snap_scale = false;

    if (fromVox) {
      const fromMetadata = await voxMetadata.getOrFetchMetadata(fromVoxId);

      if (fromMetadata) {
        scale = fromMetadata.scale || 1.0;
        stack_axis = fromMetadata.stack_axis || 0;
        stack_snap_position = fromMetadata.stack_snap_position || false;
        stack_snap_scale = fromMetadata.stack_snap_scale || false;
      }

      for (let i = 0; i < fromVox.frames.length; i++) {
        await this.applyChunk(voxId, fromVox.frames[i], i, [0, 0, 0]);
      }
    } else {
      await voxSystem.setVoxel(voxId, 0, 0, 0, builderSystem.brushVoxColor);
    }

    // Pro-actively push metadata to self and peers
    window.APP.spaceChannel.updateVoxMeta(voxId, {
      vox_id: voxId,
      name: voxName,
      scale,
      stack_axis,
      stack_snap_position,
      stack_snap_scale
    });

    const entity = await voxSystem.spawnVoxInFrontOfPlayer(voxId);
    return { entity, url: voxUrl };
  }

  async spawnVoxInFrontOfPlayer(voxId) {
    const { builderSystem, launcherSystem } = SYSTEMS;
    const { voxMetadata } = window.APP;

    const metadata = await voxMetadata.getOrFetchMetadata(voxId);

    const { url, stack_axis, stack_snap_position, stack_snap_scale, scale } = metadata;

    const entity = addMediaInFrontOfPlayerIfPermitted({
      src: url,
      contentOrigin: ObjectContentOrigins.URL,
      skipResolve: true,
      contentType: VOX_CONTENT_TYPE,
      zOffset: -2.5,
      yOffset: 0,
      stackAxis: stack_axis,
      stackSnapPosition: stack_snap_position,
      stackSnapScale: stack_snap_scale
    }).entity;

    entity.object3D.scale.setScalar(scale);
    entity.object3D.matrixNeedsUpdate = true;

    if (!builderSystem.enabled) {
      builderSystem.toggle();
      launcherSystem.toggle();
    }

    entity.addEventListener("model-loaded", () => this.markDirtyForWriteback(voxId), { once: true });

    return entity;
  }

  async beginPlacingDraggedVox() {
    const { assetPanelDraggingVoxId } = this;
    const { voxMetadata } = window.APP;
    if (!assetPanelDraggingVoxId) return;

    const metadata = await voxMetadata.getOrFetchMetadata(assetPanelDraggingVoxId);

    const { url, stack_axis, stack_snap_position, stack_snap_scale, scale } = metadata;

    const { entity } = addMedia({
      src: url,
      contentOrigin: ObjectContentOrigins.URL,
      contentType: VOX_CONTENT_TYPE,
      stackAxis: stack_axis,
      stackSnapPosition: stack_snap_position,
      stackSnapScale: stack_snap_scale
    });

    entity.object3D.scale.setScalar(scale);
    entity.object3D.matrixNeedsUpdate = true;

    // Needed to ensure media presence is triggered
    entity.setAttribute("offset-relative-to", {
      target: "#avatar-pov-node",
      offset: { x: 0, y: 0, z: 0 }
    });

    const rightHand = DOM_ROOT.getElementById("player-right-controller");
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

    for (const entity of DOM_ROOT.querySelectorAll("[media-vox]")) {
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
    const { voxMetadata, accountChannel } = window.APP;
    const hubId = await getHubIdFromHistory();

    const voxId = await getVoxIdFromUrl(voxSrc);
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

    DOM_ROOT.appendChild(canvas);

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
      const theta = (Math.PI / 36) * (i - 12);

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

    DOM_ROOT.removeChild(canvas);

    return { previewData, thumbData };
  }

  async performWriteback() {
    this.nextWritebackTime = null;

    const { atomAccessManager, voxMetadata } = window.APP;
    const { voxIdToEntry, voxIdToVox } = this;

    for (const [voxId, entry] of voxIdToEntry.entries()) {
      const { shouldWritebackToOrigin } = entry;

      if (shouldWritebackToOrigin) {
        entry.shouldWritebackToOrigin = false;

        if (atomAccessManager.isMasterWriter()) {
          const vox = voxIdToVox.get(voxId);
          if (!vox) continue;

          const svoxBytes = await voxToSVoxBytes(voxId, vox);
          const metadata = await voxMetadata.getOrFetchMetadata(voxId);

          let filename = null;

          if (metadata.url.startsWith("file://") || metadata.url.startsWith("http")) {
            const relativePath = getLocalRelativePathFromUrl(new URL(metadata.url));

            if (!relativePath || !relativePath.startsWith("assets/")) {
              console.warn("Cannot writeback vox to non-assets url", metadata.url);
              continue;
            }

            filename = relativePath.substring("assets/".length);
          } else {
            filename = metadata.url.substring("assets/".length);
          }

          const blob = new Blob([svoxBytes], { type: VOX_CONTENT_TYPE });
          atomAccessManager.uploadAsset(blob, filename);
        }
      }
    }
  }

  hasPendingWritebackFlush() {
    return this.nextWritebackTime !== null;
  }

  async applyChunk(voxId, chunk, frame, offset, beginSyncing = true) {
    const { editRingManager } = window.APP;

    let revision = 1;

    const { voxIdToVox } = this;
    const vox = voxIdToVox.get(voxId);

    if (vox) {
      vox.revision++;
      revision = vox.revision;
    }

    const delta = [frame, voxChunkToSVoxChunkBytes(chunk), offset, revision];

    editRingManager.sendDeltaSync(voxId, delta);
    this.applyDeltaSync(voxId, delta);

    if (beginSyncing) {
      editRingManager.joinSyncRing(voxId);
    }
  }

  async getFullSync(voxId) {
    const { voxMetadata } = window.APP;
    const { voxIdToVox } = this;
    const vox = voxIdToVox.get(voxId);
    if (!vox) return null;

    const svoxBytes = await voxToSVoxBytes(voxId, vox);
    const blob = new Blob([svoxBytes]);
    const compressor = new (CompressionStream || CompressionStreamImpl)("gzip"); // eslint-disable-line
    const stream = blob.stream().pipeThrough(compressor);
    const compressedSVoxBytes = await new Response(stream).arrayBuffer();

    const metadata = await voxMetadata.getOrFetchMetadata(voxId);

    return { bytes: compressedSVoxBytes, metadata };
  }

  applyFullSync(voxId, { bytes, metadata }) {
    const { voxMetadata } = window.APP;
    const { voxIdToVox } = this;

    voxMetadata.localUpdate(voxId, metadata);

    const blob = new Blob([bytes]);
    const decompressor = new (DecompressionStream || DecompressionStreamImpl)("gzip");
    const stream = blob.stream().pipeThrough(decompressor);

    new Response(stream).arrayBuffer().then(async svoxBytes => {
      const svoxRef = sVoxRefFromBytes(svoxBytes);
      const frames = await voxFramesFromSVoxRef(svoxRef);
      voxIdToVox.set(voxId, new Vox(frames, svoxRef.revision()));

      for (let i = 0; i < frames.length; i++) {
        this.onSyncedVoxUpdated(voxId, i);
      }
    });
  }

  applyDeltaSync(voxId, [frame, chunkData, offset, revision]) {
    if (typeof frame !== "number") return null;
    const { voxIdToVox } = this;

    const voxChunkRef = new SVoxChunk();

    // chunkData can be an array buffer coming in from the wire
    if (chunkData instanceof ArrayBuffer) {
      chunkData = new Uint8Array(chunkData);
    }

    SVoxChunk.getRootAsSVoxChunk(new ByteBuffer(chunkData), voxChunkRef);
    const paletteArray = voxChunkRef.paletteArray();
    const indicesArray = voxChunkRef.indicesArray();
    const size = [voxChunkRef.sizeX(), voxChunkRef.sizeY(), voxChunkRef.sizeZ()];

    if (typeof offset[0] !== "number") {
      offset = [0, 0, 0];
    }

    const voxChunk = new VoxChunk(
      size,
      paletteArray.buffer,
      indicesArray.buffer,
      voxChunkRef.bitsPerIndex(),
      paletteArray.byteOffset,
      paletteArray.byteLength,
      indicesArray.byteOffset,
      indicesArray.byteLength
    );

    const resolvedVoxChunk = this.performChunkConflictResolution(voxId, [frame, voxChunk, offset, revision]);

    if (!voxIdToVox.has(voxId)) {
      voxIdToVox.set(voxId, new Vox([]));
    }

    const vox = voxIdToVox.get(voxId);

    if (!vox.frames[frame]) {
      while (vox.frames.length < frame + 1) {
        vox.frames.push(null);
      }

      vox.frames[frame] = resolvedVoxChunk;
    } else {
      resolvedVoxChunk.applyToChunk(vox.frames[frame], offset[0], offset[1], offset[2]);
    }

    vox.revision = Math.max(vox.revision, revision);

    this.onSyncedVoxUpdated(voxId, frame);
  }

  // Conflict resolution algorithm:
  //
  // We keep a small ring buffer of all the recently received deltas. A conflict arises in two cases:
  //
  // - We receive a delta for the same revision as one we already have in the ring buffer.
  //   In this scenario, we merge this chunk with that one performing cell-level conflict resolution.
  //   (See VoxChunk.mergeWith)
  //
  // - We receive a delta for a revision that is lower than the revision of the chunk we already have.
  //   In this scenario, we defer to all the newer deltas entirely, only applying changes in this delta
  //   when no other deltas have information about that cell. (See VoxChunk.maskBy)
  //
  // Upon updating the chunk, we add the *finalized* chunk into the ring buffer since we don't want to have
  // to re-run this algorithm over all chunks in the ring each time.
  //
  // The net is that both sides will converge on the same voxel grid. Each side will prefer changes from later
  // revisions, and if both sides have changes for the same revision, then the merge algorithm decides, which
  // is communative.
  performChunkConflictResolution(voxId, delta) {
    const { voxIdToEntry } = this;
    const [frame, voxChunk, offset, revision] = delta;

    const entry = voxIdToEntry.get(voxId);
    if (!entry) return voxChunk; // Can happen when spawning new voxes, since media isn't in world yet, but should be rare.

    const { deltaRing, deltaRingIndex } = entry;

    // Loop through all the deltas in the ring buffer, starting with the earliest.
    let i = (deltaRingIndex + 1) % deltaRing.length;

    while (i !== deltaRingIndex) {
      if (deltaRing[i] !== null) {
        const [ringFrame, ringVoxChunk, ringOffset, ringRevision] = deltaRing[i];

        if (ringFrame === frame && ringRevision >= revision) {
          // Merge the vox chunks. If the ring's revision is higher, we defer entirely to it.
          const targetAlwaysWins = ringRevision > revision;
          voxChunk.mergeWith(ringVoxChunk, offset, ringOffset, targetAlwaysWins);
        }
      }

      i = (i + 1) % deltaRing.length;
    }

    // Add the finalized chunk to the ring buffer.
    deltaRing[deltaRingIndex] = delta;
    entry.deltaRingIndex = (deltaRingIndex + 1) % deltaRing.length;

    return voxChunk;
  }
}

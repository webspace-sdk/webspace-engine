import { JelVoxBufferGeometry } from "../objects/JelVoxBufferGeometry";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { generateMeshBVH, disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER } from "../../hubs/constants";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { DEFAULT_VOX_FRAME_SIZE } from "../utils/vox-sync";
import { Vox, VoxChunk } from "ot-vox";
import VoxSync from "../utils/vox-sync";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshBasicMaterial, VertexColors, Matrix4 } = THREE;
import { EventTarget } from "event-target-shim";

const MAX_FRAMES_PER_VOX = 32;
const MAX_INSTANCES_PER_VOX_ID = 255;
const IDENTITY = new Matrix4();

const voxelMaterial = new ShaderMaterial({
  name: "vox",
  fog: false,
  fragmentShader: ShaderLib.basic.fragmentShader,
  vertexShader: ShaderLib.basic.vertexShader,
  lights: false,
  vertexColors: VertexColors,
  transparent: true,
  defines: {
    ...new MeshBasicMaterial().defines
  },
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.basic.uniforms)
  }
});

voxelMaterial.onBeforeCompile = shader => {
  addVertexCurvingToShader(shader);
  shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>", "vColor.xyz = color.xyz / 255.0;");
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <fog_fragment>",
    ["gl_FragColor = vec4(vColor.xyz, 1.0);", "#include <fog_fragment>"].join("\n")
  );
};

voxelMaterial.stencilWrite = true;
voxelMaterial.stencilFunc = THREE.AlwaysStencilFunc;
voxelMaterial.stencilRef = 0;
voxelMaterial.stencilZPass = THREE.ReplaceStencilOp;

function voxIdForVoxUrl(url) {
  // Parse vox id from URL
  const pathParts = new URL(url).pathname.split("/");
  return pathParts[pathParts.length - 1];
}

function createMesh() {
  const geometry = new JelVoxBufferGeometry();
  geometry.instanceAttributes = []; // For DynamicInstancedMesh

  const material = voxelMaterial;
  const mesh = new DynamicInstancedMesh(geometry, material, MAX_INSTANCES_PER_VOX_ID);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = RENDER_ORDER.MEDIA;

  return mesh;
}

// Manages user-editable voxel objects
export class VoxSystem extends EventTarget {
  constructor(sceneEl, cursorTargettingSystem) {
    super();
    this.sceneEl = sceneEl;
    this.syncs = new Map();
    this.voxMap = new Map();
    this.sourceToVoxId = new Map();
    this.meshToVoxId = new Map();
    this.sourceToLastCullPassFrame = new Map();
    this.cursorSystem = cursorTargettingSystem;
    this.onSyncedVoxUpdated = this.onSyncedVoxUpdated.bind(this);
    this.frame = 0;
  }

  tick() {
    const { voxMap } = this;

    this.frame++;

    for (const entry of voxMap.values()) {
      const { meshes, maxMeshIndex, maxRegisteredIndex, hasDirtyMatrices, sources } = entry;

      // Registration in-progress
      if (maxRegisteredIndex < 0) continue;

      let hasAnyInstancesInCamera = false;
      let instanceMatrixNeedsUpdate = false;

      for (let i = 0; i <= maxRegisteredIndex; i++) {
        const source = sources[i];
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

          for (let j = 0; j <= maxMeshIndex; j++) {
            const mesh = meshes[j];
            if (mesh === null) continue;

            mesh.setMatrixAt(i, source.matrixWorld);
          }

          instanceMatrixNeedsUpdate = true;
        }
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
  }

  async getSync(voxId) {
    const { syncs } = this;
    if (syncs.has(voxId)) return syncs.get(voxId);

    const sync = new VoxSync(voxId);
    syncs.set(voxId, sync);
    await sync.init();

    sync.addEventListener("vox_updated", this.onSyncedVoxUpdated);

    return sync;
  }

  endSyncing(voxId) {
    const { syncs } = this;
    const sync = syncs.get(voxId);
    if (!sync) return;

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

    this.regenerateDirtyMeshesForVoxId(voxId, vox);
  }

  async register(voxUrl, source) {
    const { voxMap, sourceToVoxId } = this;

    const voxId = voxIdForVoxUrl(voxUrl);

    if (!voxMap.has(voxId)) {
      await this.registerVox(voxUrl);
    }

    // Wait until meshes are generated if many sources registered concurrently.
    await voxMap.get(voxId).voxRegistered;
    const voxEntry = voxMap.get(voxId);
    const { meshes, maxMeshIndex, sources, sourceToIndex } = voxEntry;

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

    sources[instanceIndex] = source;
    sourceToIndex.set(source, instanceIndex);
    sourceToVoxId.set(source, voxId);
    voxEntry.maxRegisteredIndex = Math.max(instanceIndex, voxEntry.maxRegisteredIndex);

    return voxId;
  }

  unregister(source) {
    const { voxMap, sourceToLastCullPassFrame, sourceToVoxId } = this;
    if (!sourceToVoxId.has(source)) return;

    const voxId = sourceToVoxId.get(source);
    sourceToVoxId.delete(source);

    const voxEntry = voxMap.get(voxId);
    if (!voxEntry) return;

    const { maxRegisteredIndex, sourceToIndex, sources, meshes } = voxEntry;

    if (!sourceToIndex.has(source)) return;
    const instanceIndex = sourceToIndex.get(source);
    sources[instanceIndex] = null;
    sourceToIndex.delete(source);
    source.onPassedFrustumCheck = () => {};
    sourceToLastCullPassFrame.delete(source);

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

    const entry = {
      maxRegisteredIndex: -1,
      sourceToIndex: new Map(),
      meshes: Array(MAX_FRAMES_PER_VOX).fill(null),
      maxMeshIndex: -1,
      sources: Array(MAX_INSTANCES_PER_VOX_ID).fill(null),
      dirtyFrameMeshes: Array(MAX_FRAMES_PER_VOX).fill(true),
      hasDirtyMatrices: false,
      currentFrame: 0,
      voxRegistered
    };

    voxMap.set(voxId, entry);

    // Fetch frame data when first registering.
    const res = await fetch(voxUrl, { mode: "cors" });

    const {
      vox: [{ frames }]
    } = await res.json();

    this.regenerateDirtyMeshesForVoxId(voxId, new Vox(frames.map(f => VoxChunk.deserialize(f))));

    finish();
  }

  unregisterVox(voxId) {
    const { voxMap, meshToVoxId, sceneEl } = this;
    const scene = sceneEl.object3D;
    const voxEntry = voxMap.get(voxId);
    const { meshes, maxMeshIndex } = voxEntry;

    for (let i = 0; i < maxMeshIndex; i++) {
      const mesh = meshes[i];

      if (mesh) {
        // Retain material since it's shared among all vox.
        mesh.material = null;
        disposeNode(mesh);
        scene.remove(mesh);
        meshToVoxId.delete(mesh);
        meshes[i] = null;
        this.dispatchEvent(new CustomEvent("mesh_removed"));
      }
    }

    voxMap.delete(voxId);
  }

  regenerateDirtyMeshesForVoxId(voxId, vox) {
    const { sceneEl, meshToVoxId, voxMap } = this;
    const scene = sceneEl.object3D;
    const entry = voxMap.get(voxId);
    const { sources, dirtyFrameMeshes, meshes, maxRegisteredIndex } = entry;

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
        mesh.geometry.update(vox.frames[i]);
        generateMeshBVH(mesh, true);
        dirtyFrameMeshes[i] = false;
      }
    }

    // Frame(s) were removed, free the meshes
    for (let i = vox.frames.length; i <= entry.maxMeshIndex; i++) {
      const mesh = meshes[i];
      if (mesh === null) continue;

      mesh.material = null;
      disposeNode(mesh);
      scene.remove(mesh);
      meshToVoxId.delete(mesh);
      meshes[i] = null;
      this.dispatchEvent(new CustomEvent("mesh_removed"));
    }

    entry.maxMeshIndex = vox.frames.length - 1;
  }

  getVoxHitFromIntersection(intersection, hitCell, adjacentCell) {
    const { meshToVoxId } = this;

    const hitObject = intersection && intersection.object;
    if (!meshToVoxId.has(hitObject)) return;

    // TODO optimize
    const inv = new THREE.Matrix4();
    const matrix = new THREE.Matrix4();
    hitObject.getMatrixAt(intersection.instanceId, matrix);
    inv.getInverse(matrix);
    const p = new THREE.Vector3();
    p.copy(intersection.point);
    p.applyMatrix4(inv);
    p.multiplyScalar(1 / VOXEL_SIZE);

    const nx = intersection.face.normal.x;
    const ny = intersection.face.normal.y;
    const nz = intersection.face.normal.z;

    // Hit cell is found by nudging along normal and rounding.
    //
    // The Y coordinate is offset by the frame size / 2 because the object origin
    // is in the vertical center. (See JelVoxBufferGeometry)
    const hx = Math.round(p.x - nx * 0.5);
    const hy = Math.round(p.y - ny * 0.5 + DEFAULT_VOX_FRAME_SIZE / 2);
    const hz = Math.round(p.z - nz * 0.5);

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
}

import { JelVoxBufferGeometry } from "../objects/JelVoxBufferGeometry";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { generateMeshBVH, disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER } from "../../hubs/constants";
import { Vox } from "ot-vox";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshBasicMaterial, VertexColors, Matrix4 } = THREE;

const DEFAULT_VOX_SIZE = 32;
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
  const pathParts = new URL(url).pathname.split("/");
  return pathParts[pathParts.length - 1];
}

async function buildMeshForVoxChunk(voxChunk) {
  const geometry = new JelVoxBufferGeometry(voxChunk);
  geometry.instanceAttributes = []; // For DynamicInstancedMesh

  const material = voxelMaterial;
  const mesh = new DynamicInstancedMesh(geometry, material, MAX_INSTANCES_PER_VOX_ID);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = RENDER_ORDER.MEDIA;

  await new Promise(res =>
    setTimeout(() => {
      generateMeshBVH(mesh);
      res();
    })
  );

  return mesh;
}

// Manages user-editable voxel objects
export class VoxSystem {
  constructor(sceneEl, cursorTargettingSystem) {
    this.sceneEl = sceneEl;
    this.syncs = new Map();
    this.voxMap = new Map();
    this.sourceToVoxId = new Map();
    this.sourceToLastCullPassFrame = new Map();
    this.cursorSystem = cursorTargettingSystem;
    this.frame = 0;
  }

  tick() {
    const { voxMap } = this;

    this.frame++;

    for (const entry of voxMap.values()) {
      const { meshes, maxRegisteredIndex, hasDirtyMatrices, sources, vox } = entry;

      // Registration in-progress
      if (maxRegisteredIndex < 0) continue;
      if (!vox) continue;

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

          for (let frame = 0; frame < vox.frames.length; frame++) {
            const mesh = meshes[frame];

            if (mesh) {
              mesh.setMatrixAt(i, source.matrixWorld);
            }
          }

          instanceMatrixNeedsUpdate = true;
        }
      }

      for (let frame = 0; frame < vox.frames.length; frame++) {
        const mesh = meshes[frame];

        if (mesh) {
          // TODO time based frame rate
          const isCurrentAnimationFrame = this.frame % vox.frames.length === frame;
          mesh.visible = isCurrentAnimationFrame && hasAnyInstancesInCamera;
          mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
        }
      }

      if (entry.hasDirtyMatrices) {
        entry.hasDirtyMatrices = false;
      }
    }

    //const cursor = this.cursorSystem.rightRemote && this.cursorSystem.rightRemote.components["cursor-controller"];
    //const intersection = cursor && cursor.intersection;
    //const hitObject = intersection && intersection.object;
    /*for (const { sources, maxRegisteredIndex } of voxMap.values()) {
      for (let i = 0; i <= maxRegisteredIndex; i++) {
        const source = sources[i];
        if (source === null) continue;

        if (hitObject && hitObject.parent === source) {
          // TODO optimize
          const inv = new THREE.Matrix4();
          hitObject.updateMatrices(true, true);
          inv.getInverse(hitObject.matrixWorld);
          const p = new THREE.Vector3();
          p.copy(intersection.point);
          p.applyMatrix4(inv);

          console.log(p);
        }
      }
    }*/
    //const hitTarget = intersection && intersection.target;
    //console.log(hitTarget);
  }

  async register(voxUrl, source) {
    const { voxMap, sourceToVoxId } = this;

    // Parse vox id from URL
    const voxId = voxIdForVoxUrl(voxUrl);

    if (!voxMap.has(voxId)) {
      await this.registerVox(voxUrl);
    }

    const voxEntry = voxMap.get(voxId);
    const { meshes, sources, sourceToIndex, voxRegistered } = voxEntry;

    await voxRegistered; // Wait until meshes are generated if many sources registered concurrently.

    // This uses a custom patched three.js handler which is fired whenever the object
    // passes a frustum check. This is handy for cases like this when a non-rendered
    // source is proxying an instance. The sourceToLastCullPassFrame map is used to
    // cull dynamic instanced meshes whose sources are entirely frustum culled.
    source.onPassedFrustumCheck = () => this.sourceToLastCullPassFrame.set(source, this.frame);

    let instanceIndex = null;

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      if (mesh === null) continue;

      if (instanceIndex === null) {
        instanceIndex = mesh.addInstance(IDENTITY);
      } else {
        const idx = mesh.addInstance(IDENTITY);

        // Instance indices should be the same across all frames for a given source.
        if (idx !== instanceIndex) {
          console.error("Vox system error, index mismatch at", i, idx, instanceIndex);
        }
      }
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
      sources: Array(MAX_INSTANCES_PER_VOX_ID).fill(null),
      dirtyFrameMeshes: Array(MAX_FRAMES_PER_VOX).fill(true),
      hasDirtyMatrices: false,
      currentFrame: 0,
      vox: null,
      voxRegistered
    };

    voxMap.set(voxId, entry);

    // Fetch frame data when first registering.
    const res = await fetch(voxUrl, { mode: "cors" });

    const {
      vox: [{ frames }]
    } = await res.json();

    entry.vox = new Vox(frames);

    await this.regenerateDirtyMeshesForVoxId(voxId);

    finish();
  }

  unregisterVox(voxId) {
    const { voxMap, sceneEl } = this;
    const scene = sceneEl.object3D;
    const voxEntry = voxMap.get(voxId);
    const { meshes } = voxEntry;

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];

      if (mesh) {
        // Retain material since it's shared among all vox.
        mesh.material = null;
        disposeNode(mesh);
        scene.remove(mesh);
      }
    }

    voxMap.delete(voxId);
  }

  getVoxSize(voxId) {
    const vox = this.voxMap.get(voxId).vox;

    if (vox.frames.length > 0) {
      return vox.frames[0].getSize();
    } else {
      return DEFAULT_VOX_SIZE;
    }
  }

  async regenerateDirtyMeshesForVoxId(voxId) {
    const { sceneEl, voxMap } = this;
    const scene = sceneEl.object3D;
    const entry = voxMap.get(voxId);
    const { dirtyFrameMeshes, meshes, vox, maxRegisteredIndex } = entry;

    for (let i = 0; i < vox.frames.length; i++) {
      if (dirtyFrameMeshes[i]) {
        if (meshes[i]) {
          // TODO replace geometry
        } else {
          const mesh = await buildMeshForVoxChunk(vox.frames[i]);
          meshes[i] = mesh;
          scene.add(meshes[i]);

          // If this is a new frame and things are already running, need to add all the instances needed
          // and force a matrix flush to them.
          for (let j = 0; j <= maxRegisteredIndex; j++) {
            mesh.addInstance(IDENTITY);
            entry.hasDirtyMatrices = true;
          }
        }

        dirtyFrameMeshes[i] = false;
      }
    }
  }

  getSourceForMeshAndInstance(targetMesh, instanceId) {
    const { voxMap } = this;
    for (const { meshes, sources } of voxMap.values()) {
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        if (mesh === targetMesh) {
          const source = sources[instanceId];
          if (source) return source;
        }
      }
    }

    return null;
  }
}

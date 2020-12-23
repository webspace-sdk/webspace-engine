import { VOXBufferGeometry } from "../objects/VOXBufferGeometry.js";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";

const {
  ImageLoader,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Color,
  CanvasTexture,
  InstancedBufferAttribute,
  Matrix4,
  ShaderMaterial,
  ShaderLib,
  UniformsUtils
} = THREE;

const VOXMOJI_WIDTH = 32;
const VOXMOJI_HEIGHT = 32;
const VOXMOJI_MAP_ROWS_COLS = 8;
const MAX_VOXMOJI_PER_TYPE = 256;
const MAX_TYPES = 1024;
const IDENTITY = new Matrix4();

const voxmojiMaterial = new ShaderMaterial({
  name: "voxmoji",
  fog: true,
  fragmentShader: ShaderLib.basic.fragmentShader,
  vertexShader: ShaderLib.basic.vertexShader,
  transparent: true,
  defines: {
    ...new MeshBasicMaterial().defines
  },
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.basic.uniforms)
  }
});

const voxmojiMaterialOnBeforeCompile = shader => {
  addVertexCurvingToShader(shader);

  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_pars_vertex>",
    ["#include <uv2_pars_vertex>", "attribute float mapIndex;"].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv_vertex>",
    [
      "#include <uv_vertex>",
      `vUv.xy /= ${VOXMOJI_MAP_ROWS_COLS}.0;`,
      `float mapIndexY = floor(mapIndex / ${VOXMOJI_MAP_ROWS_COLS}.0);`,
      `vUv.x += (mapIndex - (mapIndexY * ${VOXMOJI_MAP_ROWS_COLS}.0)) * (1.0 / ${VOXMOJI_MAP_ROWS_COLS}.0);`,
      `vUv.y += mapIndexY * (1.0 / ${VOXMOJI_MAP_ROWS_COLS}.0);`
    ].join("\n")
  );
};

voxmojiMaterial.stencilWrite = true;
voxmojiMaterial.stencilFunc = THREE.AlwaysStencilFunc;
voxmojiMaterial.stencilRef = 0;
voxmojiMaterial.stencilZPass = THREE.ReplaceStencilOp;
voxmojiMaterial.alphaTest = 0.1;
voxmojiMaterial.uniforms.diffuse.value = new Color(0.5, 0.5, 0.5);

// This system manages instanced voxmoji, which are simple meshes that appear as blocky extruded objects.
// registerType() is used to register a new image and then register() can bind a source Object3D to
// a type which will cause an instanced, voxelized mesh showing that image to appear at the world matrix of
// the source until it is unregister()'ed.
//
// One instanced mesh is created per unique alpha mask - images with the same alpha mask have the
// same geometry that runs the perimeter of the object giving it depth. The whole mesh however
// is UV mapped properly to sample the exact texel needed to give it the voxelized look. The front
// and back of the mesh are just quads that sample from an atlased texture map that is managed
// as images with the same alpha mask are registered.
//
// So, all the voxmoji that share an alpha mask are drawn in one draw call. Emoji maps should therefore
// try to give similar emoji (such as smilies) identical alpha masks to maximize batching.
//
// Note that right now unregistering a type does not free its space in the mesh's atlas. However if all types
// for a given alpha mask are unregistered then corresponding mesh and atlas are disposed.
//
// unregisterAll() should be called at opportune points (such as world transitions) when there are no
// voxmoji remaining and subsequent voxmoji are expected to diverge from the ones seen so far.
export class VoxmojiSystem {
  constructor(sceneEl, atmosphereSystem) {
    this.sceneEl = sceneEl;
    this.atmosphereSystem = atmosphereSystem;
    this.types = new Map();
    this.meshes = new Map();
    this.sourceToType = new Map();
  }

  tick() {
    const { atmosphereSystem, meshes } = this;

    for (const { mesh, sources, maxRegisteredIndex } of meshes.values()) {
      let instanceMatrixNeedsUpdate = false;

      for (let i = 0; i <= maxRegisteredIndex; i++) {
        const source = sources[i];
        if (source === null) continue;

        const hasDirtyMatrix = source.consumeIfDirtyWorldMatrix(WORLD_MATRIX_CONSUMERS.VOXMOJI);

        if (hasDirtyMatrix) {
          source.updateMatrices();
          mesh.setMatrixAt(i, source.matrixWorld);

          atmosphereSystem.updateShadows();

          instanceMatrixNeedsUpdate = true;
        }
      }

      mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
    }
  }

  register(typeKey, source) {
    const { types, meshes, sourceToType } = this;

    const { meshKey, mapIndex } = types.get(typeKey);
    const meshEntry = meshes.get(meshKey);
    const { mesh, mapIndexAttribute, maxRegisteredIndex, sources, sourceToIndex } = meshEntry;

    const instanceIndex = mesh.addInstance(0.0, IDENTITY);
    mapIndexAttribute.array[instanceIndex] = mapIndex * 1.0;
    mapIndexAttribute.needsUpdate = true;

    sources[instanceIndex] = source;
    sourceToIndex.set(source, instanceIndex);
    sourceToType.set(source, typeKey);

    meshEntry.maxRegisteredIndex = Math.max(instanceIndex, maxRegisteredIndex);
  }

  unregister(source) {
    const { sourceToType, meshes, types } = this;

    if (!sourceToType.has(source)) return;

    const typeKey = sourceToType.get(source);
    sourceToType.delete(source);

    const { meshKey } = types.get(typeKey);
    const meshEntry = meshes.get(meshKey);
    const { mesh, maxRegisteredIndex, sources, sourceToIndex } = meshEntry;

    if (!sourceToIndex.has(source)) return;
    const instanceIndex = sourceToIndex.get(source);
    sources[instanceIndex] = null;
    sourceToIndex.delete(source);
    mesh.freeInstance(instanceIndex);

    if (instanceIndex === maxRegisteredIndex) {
      meshEntry.maxRegisteredIndex--;
    }
  }

  unregisterAll() {
    [...this.types.keys()].forEach(typeKey => this.unregisterType(typeKey));
  }

  unregisterType(typeKey) {
    const { sourceToType, types } = this;
    if (!types.has(typeKey)) return;

    // Unregister all the sources for this type.
    const sources = [];

    for (const [source, entryType] of sourceToType.entries()) {
      if (typeKey !== entryType) continue;
      sources.push(source);
    }

    sources.forEach(source => this.unregister(source));

    // If no more types are using this mesh/map then dispose it all.
    let shouldFreeMesh = true;

    const { meshKey } = types.get(typeKey);
    types.delete(typeKey);

    for (const { meshKey: entryMeshKey } of types.values()) {
      // Another type is using the mesh
      if (entryMeshKey === meshKey) {
        shouldFreeMesh = false;
        break;
      }
    }

    if (!shouldFreeMesh) return;

    const { mesh } = this.meshes.get(meshKey);
    disposeNode(mesh);
    this.meshes.delete(meshKey);
  }

  async registerType(imageSrc) {
    const loader = new ImageLoader();
    const image = await new Promise(res => loader.load(imageSrc, res));

    if (image.width !== VOXMOJI_WIDTH || image.height !== VOXMOJI_HEIGHT) {
      throw new Error("Bad image size", image.width, image.height);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0, image.width, image.height);
    const imgBuffer = ctx.getImageData(0, 0, image.width, image.height);
    const imgData = imgBuffer.data;
    const get = (x, y, offset) => imgData[y * VOXMOJI_WIDTH * 4 + x * 4 + offset];
    const getAlpha = (x, y) => get(x, y, 3);

    const data = [];
    const meshKeyParts = [];

    // Build up voxel data if needed and compute a hash code of the alpha
    // mask of the image, which determines wihch mesh to use.
    for (let x = 0; x < VOXMOJI_WIDTH; x++) {
      for (let y = 0; y < VOXMOJI_HEIGHT; y++) {
        const a = getAlpha(x, y);

        if (a < 255) {
          meshKeyParts.push(7 * (x + VOXMOJI_WIDTH * y));
          continue;
        }

        meshKeyParts.push(13 * (x + VOXMOJI_WIDTH * y));

        data.push(x);
        data.push(0);
        data.push(VOXMOJI_HEIGHT - y - 1);
        data.push(0);
      }
    }

    // Silly hash function
    const meshKey = meshKeyParts.reduce((x, y) => x + y, 0);

    if (!this.meshes.has(meshKey)) {
      this.generateAndRegisterMesh(meshKey, data);
    }

    const mapIndex = this.registerMapToMesh(meshKey, image);

    // Allocate a type key which is used to register sources with the type.
    // A type is a mesh + map index combo. (Different emoji can use the same
    // mesh if they share the same alpha mask/mesh geometry.)
    let typeKey = 0;

    for (let i = 0; i < MAX_TYPES; i++) {
      if (!this.types.has(i)) {
        typeKey = i;
        break;
      }
    }

    this.types.set(typeKey, { meshKey, mapIndex });

    return typeKey;
  }

  registerMapToMesh(meshKey, image) {
    const meshEntry = this.meshes.get(meshKey);
    const { mesh, maxMapIndex, mapContext, texture } = meshEntry;
    const mapIndex = maxMapIndex + 1;

    // Blit this map in. No gutter needed because it's nearest filtering.
    const col = Math.floor(mapIndex / VOXMOJI_MAP_ROWS_COLS);
    const row = mapIndex - col * VOXMOJI_MAP_ROWS_COLS;
    const x = row * VOXMOJI_WIDTH;
    const y = VOXMOJI_MAP_ROWS_COLS * VOXMOJI_HEIGHT - (col + 1) * VOXMOJI_HEIGHT;
    mapContext.drawImage(image, x, y, image.width, image.height);

    texture.needsUpdate = true;
    mesh.material.uniformsNeedUpdate = true;
    meshEntry.maxMapIndex = mapIndex;

    return mapIndex;
  }

  generateAndRegisterMesh(meshKey, chunkData) {
    const chunk = {
      data: chunkData,
      palette: [0x00000000],
      size: { x: VOXMOJI_WIDTH, y: 1, z: VOXMOJI_HEIGHT }
    };

    const canvas = document.createElement("canvas");
    canvas.width = VOXMOJI_MAP_ROWS_COLS * VOXMOJI_WIDTH;
    canvas.height = VOXMOJI_MAP_ROWS_COLS * VOXMOJI_HEIGHT;

    const context = canvas.getContext("2d");
    const texture = new CanvasTexture(canvas);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;

    const material = voxmojiMaterial.clone();
    material.onBeforeCompile = voxmojiMaterialOnBeforeCompile;
    material.uniforms.map.value = texture;
    material.map = texture; // Strange hack needed to generate vert UVs in shader.

    // Abuse the VOX Buffer geometry generation algorithm to generate a mesh
    // for the extruded rim of the image, and then cap it and uv map the caps.
    const geometry = new VOXBufferGeometry(chunk, [1]);
    const positionArray = geometry.getAttribute("position")._array;
    const normalArray = geometry.getAttribute("normal")._array;
    const indexArray = geometry.index._array;

    const uvs = [];

    // Generate the proper UVs for the extruded edge
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const nx = normalArray[i];
      const ny = normalArray[i + 1];

      const uvDiscreteX = x + VOXMOJI_WIDTH / 2;
      const uvDiscreteY = VOXMOJI_HEIGHT - y - VOXMOJI_HEIGHT / 2 - 1;

      // Nudge it to be on the proper side of the texel edge
      const nudgeX = (1.0 / VOXMOJI_WIDTH) * 0.01 * (nx < 0 ? 1 : -1);
      const nudgeY = (1.0 / VOXMOJI_HEIGHT) * 0.01 * (ny < 0 ? 1 : -1);

      const u = (uvDiscreteX * 1.0) / VOXMOJI_WIDTH + nudgeX;
      const v = 1.0 - ((uvDiscreteY * 1.0) / VOXMOJI_HEIGHT + 1.0 / VOXMOJI_HEIGHT) + nudgeY;

      uvs.push(u);
      uvs.push(v);
    }

    // Nuke the existing attributes and replace them with the uv mapped rim and the properly UV mapped caps
    geometry.deleteAttribute("position");
    geometry.deleteAttribute("color");
    geometry.deleteAttribute("normal");

    const vertices = [...positionArray];
    const normals = [...normalArray];
    const indices = [...indexArray];
    const quadVertIndex = vertices.length / 3;

    // Top left front
    vertices.push(-VOXMOJI_WIDTH / 2);
    vertices.push(-VOXMOJI_HEIGHT / 2);
    vertices.push(0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(0.0);
    uvs.push(0.0);

    // Top right front
    vertices.push(VOXMOJI_WIDTH / 2);
    vertices.push(-VOXMOJI_HEIGHT / 2);
    vertices.push(0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(1.0);
    uvs.push(0.0);

    // Bottom left front
    vertices.push(-VOXMOJI_WIDTH / 2);
    vertices.push(VOXMOJI_HEIGHT / 2);
    vertices.push(0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(0.0);
    uvs.push(1.0);

    // Bottom right front
    vertices.push(VOXMOJI_WIDTH / 2);
    vertices.push(VOXMOJI_HEIGHT / 2);
    vertices.push(0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(1.0);
    uvs.push(1.0);

    // Top left back
    vertices.push(-VOXMOJI_WIDTH / 2);
    vertices.push(-VOXMOJI_HEIGHT / 2);
    vertices.push(-0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(0.0);
    uvs.push(0.0);

    // Top right back
    vertices.push(VOXMOJI_WIDTH / 2);
    vertices.push(-VOXMOJI_HEIGHT / 2);
    vertices.push(-0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(1.0);
    uvs.push(0.0);

    // Bottom left back
    vertices.push(-VOXMOJI_WIDTH / 2);
    vertices.push(VOXMOJI_HEIGHT / 2);
    vertices.push(-0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(0.0);
    uvs.push(1.0);

    // Bottom right back
    vertices.push(VOXMOJI_WIDTH / 2);
    vertices.push(VOXMOJI_HEIGHT / 2);
    vertices.push(-0.49);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(1.0);
    uvs.push(1.0);

    //// Front quad
    indices.push(quadVertIndex);
    indices.push(quadVertIndex + 1);
    indices.push(quadVertIndex + 2);
    indices.push(quadVertIndex + 2);
    indices.push(quadVertIndex + 1);
    indices.push(quadVertIndex + 3);

    //// Back quad
    indices.push(quadVertIndex + 2 + 4);
    indices.push(quadVertIndex + 1 + 4);
    indices.push(quadVertIndex + 4);
    indices.push(quadVertIndex + 3 + 4);
    indices.push(quadVertIndex + 1 + 4);
    indices.push(quadVertIndex + 2 + 4);

    // Scale verts by 0.015 - don't have app deal with scale, this mesh
    // should just be the right size to keep things simpler.
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] *= 0.015;
      vertices[i + 1] *= 0.015;
      vertices[i + 2] *= 0.045; // Thicken in Z
    }

    geometry.setIndex(indices);
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

    const mapIndices = [];

    for (let i = 0; i < MAX_VOXMOJI_PER_TYPE; i++) {
      mapIndices.push(...[0.0]);
    }

    geometry.instanceAttributes = []; // For DynamicInstancedMesh

    const instanceMapIndexAttribute = new InstancedBufferAttribute(new Float32Array(mapIndices), 1);
    geometry.setAttribute("mapIndex", instanceMapIndexAttribute);
    geometry.instanceAttributes.push([Number, instanceMapIndexAttribute]);

    const mesh = new DynamicInstancedMesh(geometry, material, MAX_VOXMOJI_PER_TYPE);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;

    this.meshes.set(meshKey, {
      mesh,
      texture,
      mapIndexAttribute: instanceMapIndexAttribute,
      mapContext: context,
      maxMapIndex: -1,
      maxRegisteredIndex: -1,
      sourceToIndex: new Map(),
      sources: Array(MAX_VOXMOJI_PER_TYPE).fill(null)
    });

    this.sceneEl.object3D.add(mesh);
  }
}

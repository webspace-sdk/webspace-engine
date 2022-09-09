import { VOXBufferGeometry } from "../objects/VOXBufferGeometry.js";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { disposeNode } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "./terrain-system";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";
import { RENDER_ORDER } from "../../hubs/constants";
import { generateMeshBVH } from "../../hubs/utils/three-utils";
import { EventTarget } from "event-target-shim";

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

const VOXMOJI_MAP_ROWS_COLS = 4;
const MAX_VOXMOJI_PER_TYPE = 256;
const MAX_TYPES = 1024;
const IDENTITY = new Matrix4();

const voxmojiMaterial = new ShaderMaterial({
  name: "voxmoji",
  lights: false,
  fog: false,
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
    ["#include <uv2_pars_vertex>", "attribute float mapIndex; attribute float rim; flat varying float vRim;"].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv_vertex>",
    [
      "#include <uv_vertex>",
      `vUv.xy /= ${VOXMOJI_MAP_ROWS_COLS}.0;`,
      `float mapIndexY = floor(mapIndex / ${VOXMOJI_MAP_ROWS_COLS}.0);`,
      `vUv.x += (mapIndex - (mapIndexY * ${VOXMOJI_MAP_ROWS_COLS}.0)) * (1.0 / ${VOXMOJI_MAP_ROWS_COLS}.0);`,
      `vUv.y += mapIndexY * (1.0 / ${VOXMOJI_MAP_ROWS_COLS}.0);`,
      `vRim = rim;`
    ].join("\n")
  );

  // Re-write the whole fragment shader to just sample texture without
  // any lighting calculations.
  shader.fragmentShader = [
    "uniform vec3 diffuse;",
    "uniform float opacity;",
    "flat varying float vRim;",
    "",
    "#ifndef FLAT_SHADED",
    "",
    "	varying vec3 vNormal;",
    "",
    "#endif",
    "",
    "#include <common>",
    "#include <uv_pars_fragment>",
    "#include <map_pars_fragment>",
    "#include <clipping_planes_pars_fragment>",
    "",
    "void main() {",
    "",
    "	#include <clipping_planes_fragment>",
    " gl_FragColor = texture2D(map, vUv);",
    " gl_FragColor.a = mix(step(0.6, gl_FragColor.a), 1.0, vRim);",
    " if ( gl_FragColor.a < ALPHATEST ) discard;",
    "}"
  ].join("\n");
};

voxmojiMaterial.stencilWrite = true;
voxmojiMaterial.stencilFunc = THREE.AlwaysStencilFunc;
voxmojiMaterial.stencilRef = 0;
voxmojiMaterial.stencilZPass = THREE.ReplaceStencilOp;
voxmojiMaterial.alphaTest = 0.01;
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
// clear() should be called at opportune points (such as world transitions) when there are no
// voxmoji remaining and subsequent voxmoji are expected to diverge from the ones seen so far.
export class VoxmojiSystem extends EventTarget {
  constructor(sceneEl, atmosphereSystem) {
    super();
    this.sceneEl = sceneEl;
    this.atmosphereSystem = atmosphereSystem;
    this.types = new Map();
    this.meshes = new Map();
    this.sourceToType = new Map();
    this.sourceToLastCullPassFrame = new Map();
    this.imageUrlAndSizeToType = new Map();
    this.frame = 0;
  }

  tick() {
    const { atmosphereSystem, meshes } = this;

    this.frame++;

    for (const { mesh, sources, maxRegisteredIndex } of meshes.values()) {
      let isVisible = false;

      let instanceMatrixNeedsUpdate = false;

      for (let i = 0; i <= maxRegisteredIndex; i++) {
        const source = sources[i];
        if (source === null) continue;

        if (this.sourceToLastCullPassFrame.has(source)) {
          const lastFrameCullPassed = this.sourceToLastCullPassFrame.get(source);

          if (lastFrameCullPassed >= this.frame - 5) {
            isVisible = true;
          }
        }

        const hasDirtyMatrix = source.consumeIfDirtyWorldMatrix(WORLD_MATRIX_CONSUMERS.VOX);

        if (hasDirtyMatrix) {
          source.updateMatrices();
          mesh.setMatrixAt(i, source.matrixWorld);

          atmosphereSystem.updateShadows();

          instanceMatrixNeedsUpdate = true;
        }
      }

      mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
      mesh.visible = isVisible;
    }
  }

  async register(imageUrl, source, size) {
    const { imageUrlAndSizeToType, types, meshes, sourceToType } = this;

    let typeKey;

    if (this.imageUrlAndSizeToType.has(imageUrl + size)) {
      typeKey = imageUrlAndSizeToType.get(imageUrl + size);
    } else {
      try {
        typeKey = await this.registerType(imageUrl, size);
      } catch (e) {
        console.warn("Failed to register voxmoji type", e);
        return; // Registration failed.
      }

      imageUrlAndSizeToType.set(imageUrl + size, typeKey);
    }

    // This uses a custom patched three.js handler which is fired whenever the object
    // passes a frustum check. This is handy for cases like this when a non-rendered
    // source is proxying an instance. The sourceToLastCullPassFrame map is used to
    // cull dynamic instanced meshes whose sources are entirely frustum culled.
    source.onPassedFrustumCheck = () => this.sourceToLastCullPassFrame.set(source, this.frame);

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

  // Unregisters the given source. Note that even if no sources are registered
  // for a type, the type (and its mesh/map) remain resident in memory to ensure
  // no hitching in cases where emoji are being spawned repeatedly of the same
  // type before being removed. (Eg particles)
  //
  // To actually free memory you must call unregisterType, or preferrably
  // clear when all voxmoji are expected to be clear.
  unregister(source) {
    const { sourceToType, sourceToLastCullPassFrame, meshes, types } = this;

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
    sourceToLastCullPassFrame.delete(source);
    source.onPassedFrustumCheck = () => {};
    mesh.freeInstance(instanceIndex);

    if (instanceIndex === maxRegisteredIndex) {
      meshEntry.maxRegisteredIndex--;
    }
  }

  clear() {
    [...this.types.keys()].forEach(typeKey => this.unregisterType(typeKey));
  }

  async registerType(imageUrl, size) {
    const loader = new ImageLoader();
    loader.setCrossOrigin("anonymous");
    const image = await new Promise((res, rej) => loader.load(imageUrl, res, undefined, rej));
    image.setAttribute("width", size);
    image.setAttribute("height", size);

    if (this.imageUrlAndSizeToType.has(imageUrl + size)) {
      // Just in case another caller ran while this was loading.
      return this.imageUrlAndSizeToType.get(imageUrl + size);
    }

    const width = image.width;
    const height = image.height;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0, image.width, image.height);
    const imgBuffer = ctx.getImageData(0, 0, image.width, image.height);
    const imgData = imgBuffer.data;
    const get = (x, y, offset) => imgData[y * width * 4 + x * 4 + offset];
    const getAlpha = (x, y) => get(x, y, 3);

    const data = [];
    const meshKeyParts = [];

    // Build up voxel data if needed and compute a hash code of the alpha
    // mask of the image, which determines wihch mesh to use.
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const a = getAlpha(x, y);

        if (a < 255) {
          meshKeyParts.push(7 * (x + width * y));
          continue;
        }

        meshKeyParts.push(13 * (x + width * y));

        data.push(x);
        data.push(0);
        data.push(height - y - 1);
        data.push(0);
      }
    }

    // Silly hash function
    const meshKey = meshKeyParts.reduce((x, y) => x + y, 0);

    if (!this.meshes.has(meshKey)) {
      await this.generateAndRegisterMesh(meshKey, data, width, height);
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

  unregisterType(typeKey) {
    const { sourceToType, imageUrlAndSizeToType, types } = this;
    if (!types.has(typeKey)) return;

    // Unregister all image urls for this type.
    const imageUrlAndSizes = [];

    for (const [imageUrl, imageUrlType] of imageUrlAndSizeToType.entries()) {
      if (typeKey !== imageUrlType) continue;
      imageUrlAndSizes.push(imageUrl);
    }

    imageUrlAndSizes.forEach(imageUrlAndSize => imageUrlAndSizeToType.delete(imageUrlAndSize));

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
    this.sceneEl.object3D.remove(mesh);
    this.dispatchEvent(new CustomEvent("mesh_removed"));
  }

  registerMapToMesh(meshKey, image) {
    const meshEntry = this.meshes.get(meshKey);
    const { mesh, maxMapIndex, mapContext, texture } = meshEntry;
    const mapIndex = maxMapIndex + 1;
    const { width, height } = image;

    // Blit this map in. No gutter needed because it's nearest filtering.
    const col = Math.floor(mapIndex / VOXMOJI_MAP_ROWS_COLS);
    const row = mapIndex - col * VOXMOJI_MAP_ROWS_COLS;
    const x = row * width;
    const y = VOXMOJI_MAP_ROWS_COLS * height - (col + 1) * height;
    mapContext.drawImage(image, x, y, image.width, image.height);

    texture.needsUpdate = true;
    mesh.material.uniformsNeedUpdate = true;
    meshEntry.maxMapIndex = mapIndex;

    return mapIndex;
  }

  async generateAndRegisterMesh(meshKey, chunkData, width, height) {
    const chunk = {
      data: chunkData,
      palette: [0x00000000],
      size: { x: width, y: 1, z: height }
    };

    const canvas = document.createElement("canvas");
    canvas.width = VOXMOJI_MAP_ROWS_COLS * width;
    canvas.height = VOXMOJI_MAP_ROWS_COLS * height;

    const context = canvas.getContext("2d");
    const texture = new CanvasTexture(canvas);

    const material = voxmojiMaterial.clone();
    material.onBeforeCompile = voxmojiMaterialOnBeforeCompile;
    material.uniforms.map.value = texture;
    material.map = texture; // Strange hack needed to generate vert UVs in shader.

    // Abuse the VOX Buffer geometry generation algorithm to generate a mesh
    // for the extruded rim of the image, and then cap it and uv map the caps.
    const geometry = new VOXBufferGeometry(chunk, [1]);
    const positionArray = geometry.getAttribute("position").array;
    const normalArray = geometry.getAttribute("normal").array;
    const indexArray = geometry.index.array;

    const uvs = [];
    const rims = [];

    // Generate the proper UVs for the extruded edge
    for (let i = 0; i < positionArray.length; i += 3) {
      const x = positionArray[i];
      const y = positionArray[i + 1];
      const nx = normalArray[i];
      const ny = normalArray[i + 1];

      const uvDiscreteX = x + width / 2;
      const uvDiscreteY = height - y - height / 2 - 1;

      // Nudge it to be on the proper side of the texel edge
      const nudgeX = (1.0 / width) * 0.01 * (nx < 0 ? 1 : -1);
      const nudgeY = (1.0 / height) * 0.01 * (ny < 0 ? 1 : -1);

      const u = (uvDiscreteX * 1.0) / width + nudgeX;
      const v = 1.0 - ((uvDiscreteY * 1.0) / height + 1.0 / height) + nudgeY;

      uvs.push(u);
      uvs.push(v);
      rims.push(1.0);
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
    vertices.push(-width / 2);
    vertices.push(-height / 2);
    vertices.push(0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(0.0);
    uvs.push(0.0);
    rims.push(0.0);

    // Top right front
    vertices.push(width / 2);
    vertices.push(-height / 2);
    vertices.push(0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(1.0);
    uvs.push(0.0);
    rims.push(0.0);

    // Bottom left front
    vertices.push(-width / 2);
    vertices.push(height / 2);
    vertices.push(0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(0.0);
    uvs.push(1.0);
    rims.push(0.0);

    // Bottom right front
    vertices.push(width / 2);
    vertices.push(height / 2);
    vertices.push(0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(1.0);
    uvs.push(1.0);
    uvs.push(1.0);
    rims.push(0.0);

    // Top left back
    vertices.push(-width / 2);
    vertices.push(-height / 2);
    vertices.push(-0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(0.0);
    uvs.push(0.0);
    rims.push(0.0);

    // Top right back
    vertices.push(width / 2);
    vertices.push(-height / 2);
    vertices.push(-0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(1.0);
    uvs.push(0.0);
    rims.push(0.0);

    // Bottom left back
    vertices.push(-width / 2);
    vertices.push(height / 2);
    vertices.push(-0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(0.0);
    uvs.push(1.0);
    rims.push(0.0);

    // Bottom right back
    vertices.push(width / 2);
    vertices.push(height / 2);
    vertices.push(-0.5);
    normals.push(0.0);
    normals.push(0.0);
    normals.push(-1.0);
    uvs.push(1.0);
    uvs.push(1.0);
    rims.push(0.0);

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

    const c = width === 32 ? 4 : width === 64 ? 2 : 1;

    // Scale verts - don't have app deal with scale, this mesh
    // should just be the right size to keep things simpler.
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] *= 0.005 * c;
      vertices[i + 1] *= 0.005 * c;
      vertices[i + 2] *= 0.1; // Thicken in Z
    }

    geometry.setIndex(indices);
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("rim", new Float32BufferAttribute(rims, 1));

    const mapIndices = [];

    for (let i = 0; i < MAX_VOXMOJI_PER_TYPE; i++) {
      mapIndices.push(...[0.0]);
    }

    geometry.instanceAttributes = []; // For DynamicInstancedMesh

    const instanceMapIndexAttribute = new InstancedBufferAttribute(new Float32Array(mapIndices), 1);
    geometry.setAttribute("mapIndex", instanceMapIndexAttribute);
    geometry.instanceAttributes.push([Number, instanceMapIndexAttribute]);

    const mesh = new DynamicInstancedMesh(geometry, material, MAX_VOXMOJI_PER_TYPE);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = RENDER_ORDER.MEDIA;

    generateMeshBVH(mesh);

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
    this.dispatchEvent(new CustomEvent("mesh_added"));
  }

  getMeshes() {
    return [...this.meshes.values()].map(({ mesh }) => mesh);
  }

  getMeshForSource(source) {
    for (const { mesh, sources } of this.meshes.values()) {
      if (sources.includes(source)) {
        return mesh;
      }
    }

    return null;
  }

  isMeshInstanceForSource(targetMesh, instanceId, source) {
    if (instanceId === undefined || instanceId === null || !targetMesh) return false;

    for (const { mesh, sources } of this.meshes.values()) {
      if (targetMesh === mesh && sources.indexOf(source) === instanceId) {
        return true;
      }
    }

    return false;
  }

  getSourceForMeshAndInstance(instancedMesh, instanceId) {
    for (const { mesh, sources } of this.meshes.values()) {
      if (mesh === instancedMesh) {
        return sources[instanceId];
      }
    }

    return null;
  }
}

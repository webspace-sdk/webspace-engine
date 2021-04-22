import { Layers } from "../../hubs/components/layers";
import { addVertexCurvingToShader, VOXELS_PER_CHUNK } from "../systems/terrain-system";
import { generateMeshBVH } from "../../hubs/utils/three-utils";

const {
  ShaderMaterial,
  MeshStandardMaterial,
  VertexColors,
  BufferGeometry,
  BufferAttribute,
  Object3D,
  ShaderLib,
  Float32BufferAttribute,
  UniformsUtils,
  Uint16BufferAttribute,
  Uint32BufferAttribute,
  LOD
} = THREE;

export const VOXEL_PALETTE_NONE = 0;
export const VOXEL_PALETTE_GROUND = 1;
export const VOXEL_PALETTE_EDGE = 2;
export const VOXEL_PALETTE_LEAVES = 3;
export const VOXEL_PALETTE_BARK = 4;
export const VOXEL_PALETTE_ROCK = 5;
export const VOXEL_PALETTE_GRASS = 6;

const LOD_DISTANCES = [0, 20, 24];

const colorMap = new Float32Array(7 * 4);
const voxelMaterials = [];

const colorMapTexture = new THREE.DataTexture(colorMap, 7, 1);
colorMapTexture.format = THREE.RGBAFormat;
colorMapTexture.type = THREE.FloatType;
colorMapTexture.minFilter = THREE.NearestFilter;
colorMapTexture.magFilter = THREE.NearestFilter;

export const updateWorldColors = (groundColor, edgeColor, leavesColor, barkColor, rockColor, grassColor) => {
  const set = (index, { r, g, b }) => {
    colorMap[index * 4] = r;
    colorMap[index * 4 + 1] = g;
    colorMap[index * 4 + 2] = b;
    const tmp = new THREE.Color(r, g, b);
    const tmp2 = {};
    tmp.getHSL(tmp2);

    // Last component is a multiplier for the brightness gradient to
    // apply. Brighter colors should have a stronger gradient.
    //
    // Otherwise, dark colors will wash to black at peaks in terrain,
    // and bright colors will have less visible gradient.

    const grad = Math.min(3.0, tmp2.l / 0.25);
    colorMap[index * 4 + 3] = grad;
  };

  set(VOXEL_PALETTE_GROUND, groundColor);
  set(VOXEL_PALETTE_EDGE, edgeColor);
  set(VOXEL_PALETTE_LEAVES, leavesColor);
  set(VOXEL_PALETTE_BARK, barkColor);
  set(VOXEL_PALETTE_ROCK, rockColor);
  set(VOXEL_PALETTE_GRASS, grassColor);

  colorMapTexture.needsUpdate = true;
  voxelMaterials.forEach(m => (m.uniformsNeedUpdate = true));
};

const createVoxelMaterial = () => {
  const voxelMaterial = new ShaderMaterial({
    name: "voxels",
    vertexColors: VertexColors,
    fog: true,
    fragmentShader: ShaderLib.standard.fragmentShader,
    vertexShader: ShaderLib.standard.vertexShader,
    lights: true,
    defines: {
      ...MeshStandardMaterial.defines
    },
    uniforms: {
      ...UniformsUtils.clone(ShaderLib.standard.uniforms),
      colorMap: { value: colorMapTexture }
    }
  });

  voxelMaterial.uniforms.metalness.value = 0;
  voxelMaterial.uniforms.roughness.value = 1;

  voxelMaterial.onBeforeCompile = shader => {
    addVertexCurvingToShader(shader);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <uv2_pars_vertex>",
      [
        "#include <uv2_pars_vertex>",
        "precision highp sampler2D;",
        "uniform sampler2D colorMap;",
        "attribute float palette;"
      ].join("\n")
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <color_vertex>",
      [
        "vec4 shift = texture(colorMap, vec2(float(palette) / 6.0, 0.1));",
        // Voxel colors have a red channel that provides brightness offsets
        "float brightDelta = (color.x - 128.0) / 255.0 * shift.a;",
        "vColor.xyz = clamp(vec3(shift.x, shift.y, shift.z) + brightDelta, 0.0, 1.0);"
      ].join("\n")
    );
  };

  voxelMaterials.push(voxelMaterial);
  return voxelMaterial;
};

const terrainMaterial = createVoxelMaterial();

class Terrain extends Object3D {
  constructor(lodEnabled = true) {
    super();

    this.meshes = [];

    const createMesh = () => {
      const mesh = new THREE.Mesh(new BufferGeometry(), terrainMaterial, 1);
      mesh.position.x = -VOXELS_PER_CHUNK / 2;
      mesh.position.z = -VOXELS_PER_CHUNK / 2;
      mesh.matrixNeedsUpdate = true;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.layers.enable(Layers.reflection);
      this.meshes.push(mesh);
      return mesh;
    };

    this.layers.enable(Layers.reflection);

    this.lod = new LOD();
    this.lod.layers.enable(Layers.reflection);
    // Offset LOD/group because we want the proper center distance to chunk.
    this.lod.position.x = VOXELS_PER_CHUNK / 2;
    this.lod.position.z = VOXELS_PER_CHUNK / 2;
    this.lod.autoUpdate = false;
    this.lod.frustumCulled = false;
    this.lod.matrixNeedsUpdate = true;
    this.add(this.lod);

    // Use an instanced mesh so shader can be shared with instanced voxel objects.
    for (let i = 0; i < 3; i++) {
      const mesh = createMesh();
      this.lod.addLevel(mesh, LOD_DISTANCES[i]);
    }

    this.enableLod(lodEnabled);
    this.frustumCulled = false;
    this.heightfieldData = [];

    for (let z = 0; z < VOXELS_PER_CHUNK; z += 8) {
      this.heightfieldData.push(new Array(VOXELS_PER_CHUNK / 8));
    }
  }

  enableLod(enable) {
    this.lodEnabled = enable;
    this.updateLodNextFrame = true;
    this.lod.levels[1].distance = enable ? LOD_DISTANCES[1] : 100;
    this.lod.levels[2].distance = enable ? LOD_DISTANCES[2] : 100;
  }

  performWork(camera) {
    if (this.updateLodNextFrame || this.lodEnabled) {
      camera.updateMatrices();
      this.lod.updateMatrices();

      this.lod.update(camera);
      this.updateLodNextFrame = false;
    }
  }

  update({ chunk, geometries }) {
    this.chunk = chunk;
    this.matrixNeedsUpdate = true;

    for (let i = 0; i < geometries.opaque.length; i++) {
      const mesh = this.meshes[i];
      if (!mesh) continue;

      const { color, position, uv, normal, palette } = geometries.opaque[i];

      if (!position.length) continue;

      const geometry = new BufferGeometry();
      mesh.geometry = geometry;

      geometry.setAttribute("color", new BufferAttribute(color, 3));
      geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
      geometry.setAttribute("uv", new BufferAttribute(uv, 2));
      geometry.setAttribute("normal", new BufferAttribute(normal, 3));
      geometry.setAttribute("palette", new BufferAttribute(palette, 1));

      const len = (position.length / 3 / 4) * 6;
      const index = new (len >= 1024 * 64 ? Uint32Array : Uint16Array)(len);

      for (let i = 0, v = 0; i < len; i += 6, v += 4) {
        index[i] = v;
        index[i + 1] = v + 1;
        index[i + 2] = v + 2;
        index[i + 3] = v + 2;
        index[i + 4] = v + 3;
        index[i + 5] = v;
      }

      geometry.setIndex(new (len >= 1024 * 64 ? Uint32BufferAttribute : Uint16BufferAttribute)(index, 1));
    }

    // Only generate BVH for highest detail mesh since that is used for raycasting.
    if (this.meshes[0]) {
      generateMeshBVH(this.meshes[0], true);
    }

    this.height = chunk.height;
  }

  dispose() {
    this.meshes.forEach(mesh => mesh.geometry.dispose());
    this.heightmap = null;
  }
}

export { createVoxelMaterial, Terrain };

import { Layers } from "../../hubs/components/layers";
import { addVertexCurvingToShader, VOXELS_PER_CHUNK } from "../systems/terrain-system";

const {
  InstancedMesh,
  ShaderMaterial,
  MeshStandardMaterial,
  VertexColors,
  BufferGeometry,
  BufferAttribute,
  Object3D,
  Matrix4,
  ShaderLib,
  Float32BufferAttribute,
  UniformsUtils,
  Uint16BufferAttribute,
  Uint32BufferAttribute,
  LOD
} = THREE;

const MESH_OFFSET = new Matrix4();
const LOD_DISTANCES = [0, 20, 24];

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
    ...UniformsUtils.clone(ShaderLib.standard.uniforms)
  }
});

voxelMaterial.uniforms.metalness.value = 0;
voxelMaterial.uniforms.roughness.value = 1;

voxelMaterial.onBeforeCompile = shader => {
  addVertexCurvingToShader(shader);
  shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>", "vColor.xyz = color.xyz / 255.0;");
};

class Terrain extends Object3D {
  constructor(lodEnabled = true) {
    super();

    this.meshes = [];

    const createMesh = () => {
      const mesh = new InstancedMesh(new BufferGeometry(), voxelMaterial, 1);
      mesh.receiveShadow = true;
      MESH_OFFSET.makeTranslation(-VOXELS_PER_CHUNK / 2, 0, -VOXELS_PER_CHUNK / 2);
      mesh.setMatrixAt(0, MESH_OFFSET);
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
    this.physicsNeedsUpdate = true;

    for (let i = 0; i < geometries.opaque.length; i++) {
      const mesh = this.meshes[i];
      if (!mesh) continue;

      const { color, position, uv, normal } = geometries.opaque[i];

      if (!position.length) continue;

      const geometry = new BufferGeometry();
      mesh.geometry = geometry;

      geometry.setAttribute("color", new BufferAttribute(color, 3));
      geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
      geometry.setAttribute("uv", new BufferAttribute(uv, 2));
      geometry.setAttribute("normal", new BufferAttribute(normal, 3));

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

    this.height = chunk.height;
  }

  dispose() {
    this.meshes.forEach(mesh => mesh.geometry.dispose());
    this.heightmap = null;
  }
}

export { voxelMaterial, Terrain };

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
  Uint32BufferAttribute
} = THREE;

const IDENTITY = new Matrix4();

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
  constructor() {
    super();

    // Use an instanced mesh so shader can be shared with instanced voxel objects.
    const mesh = new InstancedMesh(new BufferGeometry(), voxelMaterial, 1);
    mesh.receiveShadow = true;
    mesh.setMatrixAt(0, IDENTITY);
    mesh.castShadow = true;
    this.layers.enable(Layers.reflection);
    mesh.layers.enable(Layers.reflection);
    this.add(mesh);
    this.mesh = mesh;
    this.frustumCulled = false;
    this.heightfieldData = [];
    this.lod = null;

    for (let z = 0; z < VOXELS_PER_CHUNK; z += 8) {
      this.heightfieldData.push(new Array(VOXELS_PER_CHUNK / 8));
    }
  }

  update({ chunk, geometries }) {
    const { mesh } = this;
    this.chunk = chunk;
    this.matrixNeedsUpdate = true;
    this.attributes = []; // Indexed by LOD

    this.geometry = new BufferGeometry();
    mesh.geometry = this.geometry;

    for (let i = 0; i < geometries.opaque.length; i++) {
      const { color, position, uv, normal } = geometries.opaque[i];

      if (!position.length) {
        mesh.visible = false;
        return;
      }

      const attrs = {
        color: new BufferAttribute(color, 3),
        position: new Float32BufferAttribute(position, 3),
        uv: new BufferAttribute(uv, 2),
        normal: new BufferAttribute(normal, 3)
      };

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

      attrs.index = new (len >= 1024 * 64 ? Uint32BufferAttribute : Uint16BufferAttribute)(index, 1);
      this.attributes.push(attrs);
    }

    mesh.visible = true;

    this.setToLOD(0);
    this.height = chunk.height;
  }

  setToLOD(lod) {
    if (this.lod === lod) return;

    const { attributes, geometry } = this;
    const attrs = attributes[lod];

    this.lod = lod;

    geometry.setAttribute("color", attrs.color);
    geometry.setAttribute("position", attrs.position);
    geometry.setAttribute("uv", attrs.uv);
    geometry.setAttribute("normal", attrs.normal);
    geometry.setIndex(attrs.index);

    attrs.color.needsUpdate = true;
    attrs.position.needsUpdate = true;
    attrs.uv.needsUpdate = true;
    attrs.normal.needsUpdate = true;
    attrs.index.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.heightmap = null;
  }
}

export { voxelMaterial, Terrain };

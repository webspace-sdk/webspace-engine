import { Layers } from "../../hubs/components/layers";
import { addVertexCurvingToShader } from "../systems/terrain-system";

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
  UniformsUtils
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
  }

  update({ chunk, geometries }) {
    const { mesh } = this;
    this.chunk = chunk;
    this.matrixNeedsUpdate = true;

    const { color, position, uv, normal } = geometries.opaque;
    if (!position.length) {
      mesh.visible = false;
    }

    const geometry = new BufferGeometry();
    mesh.geometry = geometry;

    geometry.setAttribute("color", new BufferAttribute(color, 3));
    geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
    geometry.setAttribute("uv", new BufferAttribute(uv, 2));
    geometry.setAttribute("normal", new BufferAttribute(normal, 3));
    {
      const len = (position.length / 3 / 4) * 6;
      const index = len >= 1024 * 64 ? new Uint32Array(len) : new Uint16Array(len);

      for (let i = 0, v = 0; i < len; i += 6, v += 4) {
        index[i] = v;
        index[i + 1] = v + 1;
        index[i + 2] = v + 2;
        index[i + 3] = v + 2;
        index[i + 4] = v + 3;
        index[i + 5] = v;
      }
      geometry.setIndex(new BufferAttribute(index, 1));
    }

    mesh.visible = true;

    this.updateHeightmap({ chunk, geometry });

    this.height = chunk.height;
  }

  updateHeightmap({ chunk, geometry }) {
    this.heightmap = new Uint8Array(64 * 64);
    const heightmap = this.heightmap;
    const aux = { x: 0, y: 0, z: 0 };
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    const { count } = uv;
    const offsetY = chunk.y * 16;
    for (let i = 0; i < count; i += 4) {
      if (uv.getY(i) === 0) {
        aux.x = 0xff;
        aux.y = 0;
        aux.z = 0xff;
        for (let j = 0; j < 4; j += 1) {
          aux.x = Math.min(aux.x, Math.floor(position.getX(i + j) / 8));
          aux.y = Math.max(aux.y, offsetY + Math.ceil(position.getY(i + j) / 8));
          aux.z = Math.min(aux.z, Math.floor(position.getZ(i + j) / 8));
        }
        const index = aux.x * 64 + aux.z;
        heightmap[index] = Math.max(heightmap[index], aux.y);
      }
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.heightmap = null;
  }
}

export { voxelMaterial, Terrain };

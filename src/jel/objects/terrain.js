import { Layers } from "../../hubs/components/layers";

const { Mesh, MeshStandardMaterial, VertexColors, BufferGeometry, BufferAttribute, Object3D } = THREE;
const material = new MeshStandardMaterial({ vertexColors: VertexColors, metalness: 0, roughness: 1 });
const setVertexColor = shader => {
  shader.vertexShader = shader.vertexShader
    .replace(
      "#define STANDARD",
      [
        "#define STANDARD",
        "#define cplx vec2",
        "#define cplx_new(re, im) vec2(re, im)",
        "#define cplx_re(z) z.x",
        "#define cplx_im(z) z.y",
        "#define cplx_exp(z) (exp(z.x) * cplx_new(cos(z.y), sin(z.y)))",
        "#define cplx_scale(z, scalar) (z * scalar)",
        "#define cplx_abs(z) (sqrt(z.x * z.x + z.y * z.y))"
      ].join("\n")
    )
    .replace("#include <color_vertex>", "vColor.xyz = color.xyz / 255.0;")
    .replace(
      "#include <project_vertex>",
      [
        "vec4 mvPosition = vec4( transformed, 1.0 );",
        "mat4 viewModel = inverse(modelViewMatrix);",
        "vec3 camPos = viewModel[3].xyz;",
        "vec4 pos = mvPosition;",
        "float rp = 850.0 * 0.125 * 16.0;",
        "vec2 planedir = normalize(vec2(pos.x - camPos.x, pos.z - camPos.z));",
        "cplx plane = cplx_new(pos.y - camPos.y, sqrt((pos.x - camPos.x) * (pos.x - camPos.x) + (pos.z - camPos.z) * (pos.z - camPos.z)));",
        "cplx circle = rp * cplx_exp(cplx_scale(plane, 1.0 / rp)) - cplx_new(rp, 0);",
        "pos.x = cplx_im(circle) * planedir.x + camPos.x;",
        "pos.z = cplx_im(circle) * planedir.y + camPos.z;",
        "pos.y = cplx_re(circle) + camPos.y;",
        "gl_Position = projectionMatrix * modelViewMatrix * pos;"
      ].join("\n")
    );
};

material.onBeforeCompile = setVertexColor;

class Terrain extends Object3D {
  constructor() {
    super();
    const mesh = new Mesh(new BufferGeometry(), material);
    mesh.receiveShadow = true;
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

    mesh.geometry.dispose();

    const geometry = new BufferGeometry();
    mesh.geometry = geometry;

    geometry.setAttribute("color", new BufferAttribute(color, 3));
    geometry.setAttribute("position", new BufferAttribute(position, 3));
    geometry.setAttribute("uv", new BufferAttribute(uv, 2));
    geometry.setAttribute("normal", new BufferAttribute(normal, 3));
    {
      const len = (position.length / 3 / 4) * 6;
      const index = new Uint16Array(len);
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

export default Terrain;

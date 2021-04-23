const { BufferGeometry, BufferAttribute, Uint16BufferAttribute, Uint32BufferAttribute } = THREE;
export const VOXEL_SIZE = 1 / 8;

const MAX_VOX_SIZE = 64;

const mask = new Int32Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const vals = new Int32Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const norms = new Int32Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const quads = [];

// Adapted from implementation by mikolalysenko:
// https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
function GreedyMesh(f, dims, max_quad_size = Infinity) {
  quads.length = 0;

  // Sweep over 3-axes
  for (let d = 0; d < 3; ++d) {
    // eslint-disable-line no-plusplus
    let i;
    let j;
    let k;
    let l;
    let w;
    let h;
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const x = [0, 0, 0];
    const q = [0, 0, 0];
    const du = [0, 0, 0];
    const dv = [0, 0, 0];

    mask.fill(0);
    vals.fill(0);
    norms.fill(0);

    q[d] = 1;
    for (x[d] = -1; x[d] < dims[d]; ) {
      // Compute mask
      let n = 0;
      for (x[v] = 0; x[v] < dims[v]; ++x[v]) {
        for (x[u] = 0; x[u] < dims[u]; ++x[u]) {
          const vFrom = x[d] >= 0 ? f(x[0], x[1], x[2]) : 0;
          const vTo = x[d] < dims[d] - 1 ? f(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
          mask[n] = vFrom - vTo; // If non-zero, mask has value
          norms[n] = vFrom; // Non-zero means up
          // Need to split on side so negate key to break face up.
          vals[n++] = vFrom || -vTo; // eslint-disable-line no-plusplus
        }
      }
      // Increment x[d]
      ++x[d]; // eslint-disable-line no-plusplus
      // Generate mesh for mask using lexicographic ordering
      n = 0;
      for (j = 0; j < dims[v]; ++j) {
        for (i = 0; i < dims[u]; ) {
          if (mask[n] !== 0) {
            const cv = vals[n];

            // Compute width
            for (w = 1; mask[n + w] !== 0 && cv === vals[n + w] && i + w < dims[u] && w < max_quad_size; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            loop: for (h = 1; j + h < dims[v] && h < max_quad_size; ++h) {
              for (k = 0; k < w; ++k) {
                if (mask[n + k + h * dims[u]] === 0 || vals[n + k + h * dims[u]] !== cv) {
                  break loop;
                }
              }
            }

            // Add quad
            x[u] = i;
            x[v] = j;
            du[0] = 0;
            du[1] = 0;
            du[2] = 0;
            dv[0] = 0;
            dv[1] = 0;
            dv[2] = 0;
            du[u] = w;
            dv[v] = h;
            quads.push(d);
            quads.push(norms[n]);
            quads.push(x[0]);
            quads.push(x[1]);
            quads.push(x[2]);
            quads.push(x[0] + du[0]);
            quads.push(x[1] + du[1]);
            quads.push(x[2] + du[2]);
            quads.push(x[0] + du[0] + dv[0]);
            quads.push(x[1] + du[1] + dv[1]);
            quads.push(x[2] + du[2] + dv[2]);
            quads.push(x[0] + dv[0]);
            quads.push(x[1] + dv[1]);
            quads.push(x[2] + dv[2]);
            // Zero-out mask
            for (l = 0; l < h; ++l) {
              // eslint-disable-line no-plusplus
              for (k = 0; k < w; ++k) {
                // eslint-disable-line no-plusplus
                mask[n + k + l * dims[u]] = 0;
              }
            }
            // Increment counters and continue
            i += w;
            n += w;
          } else {
            ++i;
            ++n; // eslint-disable-line no-plusplus
          }
        }
      }
    }
  }

  return quads;
}

class JelVoxBufferGeometry extends BufferGeometry {
  constructor(chunk) {
    super();
    this.type = "JelVoxBufferGeometry";

    if (chunk) {
      this.update(chunk);
    }
  }

  update(chunk, max_quad_size = 1) {
    const palette = [];
    const size = chunk.size;

    for (let i = 0; i < chunk.palette.length; i++) {
      const rgbt = chunk.palette[i];

      const r = (0x000000ff & rgbt) / 255.0;
      const g = ((0x0000ff00 & rgbt) >>> 8) / 255.0;
      const b = ((0x00ff0000 & rgbt) >>> 16) / 255.0;

      // Voxel type currently unused
      // const t = Math.floor((0xff000000 & rgbt) >>> 24);

      palette.push([r, g, b]);
    }

    const xShift = Math.floor(size[0] % 2 === 0 ? size[0] / 2 - 1 : size[0] / 2);
    const yShift = Math.floor(size[1] % 2 === 0 ? size[1] / 2 - 1 : size[1] / 2);
    const zShift = Math.floor(size[2] % 2 === 0 ? size[2] / 2 - 1 : size[2] / 2);
    const xShiftVox = xShift * VOXEL_SIZE;
    const yShiftVox = yShift * VOXEL_SIZE;
    const zShiftVox = zShift * VOXEL_SIZE;

    // Generate quads via greedy mesher.
    const quads = GreedyMesh(
      (x, y, z) => chunk.getPaletteIndexAt(x - xShift, y - yShift, z - zShift),
      size,
      max_quad_size
    );

    const vertices = new Float32Array(12 * quads.length);
    const normals = new Float32Array(12 * quads.length);
    const colors = new Float32Array(12 * quads.length);
    const uvs = new Float32Array(8 * quads.length);

    const pushFace = (
      iQuad,
      p1x,
      p1y,
      p1z,
      p2x,
      p2y,
      p2z,
      p3x,
      p3y,
      p3z,
      p4x,
      p4y,
      p4z,
      u1,
      v1,
      u2,
      v2,
      nx,
      ny,
      nz,
      r,
      g,
      b
    ) => {
      uvs[iQuad * 8 + 0] = u1;
      uvs[iQuad * 8 + 1] = v1;
      uvs[iQuad * 8 + 2] = u2;
      uvs[iQuad * 8 + 3] = v1;
      uvs[iQuad * 8 + 4] = u2;
      uvs[iQuad * 8 + 5] = v2;
      uvs[iQuad * 8 + 6] = u1;
      uvs[iQuad * 8 + 7] = v2;

      vertices[iQuad * 12 + 0] = p1x - xShiftVox;
      vertices[iQuad * 12 + 1] = p1y - yShiftVox;
      vertices[iQuad * 12 + 2] = p1z - zShiftVox;
      vertices[iQuad * 12 + 3] = p2x - xShiftVox;
      vertices[iQuad * 12 + 4] = p2y - yShiftVox;
      vertices[iQuad * 12 + 5] = p2z - zShiftVox;
      vertices[iQuad * 12 + 6] = p3x - xShiftVox;
      vertices[iQuad * 12 + 7] = p3y - yShiftVox;
      vertices[iQuad * 12 + 8] = p3z - zShiftVox;
      vertices[iQuad * 12 + 9] = p4x - xShiftVox;
      vertices[iQuad * 12 + 10] = p4y - yShiftVox;
      vertices[iQuad * 12 + 11] = p4z - zShiftVox;

      normals[iQuad * 12 + 0] = nx;
      normals[iQuad * 12 + 1] = ny;
      normals[iQuad * 12 + 2] = nz;
      normals[iQuad * 12 + 3] = nx;
      normals[iQuad * 12 + 4] = ny;
      normals[iQuad * 12 + 5] = nz;
      normals[iQuad * 12 + 6] = nx;
      normals[iQuad * 12 + 7] = ny;
      normals[iQuad * 12 + 8] = nz;
      normals[iQuad * 12 + 9] = nx;
      normals[iQuad * 12 + 10] = ny;
      normals[iQuad * 12 + 11] = nz;

      colors[iQuad * 12 + 0] = r;
      colors[iQuad * 12 + 1] = g;
      colors[iQuad * 12 + 2] = b;
      colors[iQuad * 12 + 3] = r;
      colors[iQuad * 12 + 4] = g;
      colors[iQuad * 12 + 5] = b;
      colors[iQuad * 12 + 6] = r;
      colors[iQuad * 12 + 7] = g;
      colors[iQuad * 12 + 8] = b;
      colors[iQuad * 12 + 9] = r;
      colors[iQuad * 12 + 10] = g;
      colors[iQuad * 12 + 11] = b;
    };

    for (let i = 0; i < quads.length; i += 14) {
      const d = quads[i];
      const up = quads[i + 1];
      const x1 = quads[i + 2];
      const y1 = quads[i + 3];
      const z1 = quads[i + 4];
      const x2 = quads[i + 5];
      const y2 = quads[i + 6];
      const z2 = quads[i + 7];
      const x3 = quads[i + 8];
      const y3 = quads[i + 9];
      const z3 = quads[i + 10];
      const x4 = quads[i + 11];
      const y4 = quads[i + 12];
      const z4 = quads[i + 13];
      const iQuad = i / 14;

      // Look up vertex color.
      const x = x1 - (d === 0 && up !== 0 ? 1 : 0);
      const y = y1 - (d === 1 && up !== 0 ? 1 : 0);
      const z = z1 - (d === 2 && up !== 0 ? 1 : 0);

      const c = chunk.getPaletteIndexAt(x - xShift, y - yShift, z - zShift) - 1;
      const [r, g, b] = palette[c];
      const v = VOXEL_SIZE;

      // Generate visible faces.
      switch (d) {
        case 0:
          if (up !== 0) {
            pushFace(
              iQuad,
              x4 * VOXEL_SIZE - v,
              y4 * VOXEL_SIZE - v,
              z4 * VOXEL_SIZE - v,
              x1 * VOXEL_SIZE - v,
              y1 * VOXEL_SIZE - v,
              z1 * VOXEL_SIZE - v,
              x2 * VOXEL_SIZE - v,
              y2 * VOXEL_SIZE - v,
              z2 * VOXEL_SIZE - v,
              x3 * VOXEL_SIZE - v,
              y3 * VOXEL_SIZE - v,
              z3 * VOXEL_SIZE - v,
              0,
              0,
              Math.abs(z1 * VOXEL_SIZE - z3 * VOXEL_SIZE),
              Math.abs(y1 * VOXEL_SIZE - y3 * VOXEL_SIZE),
              1,
              0,
              0,
              r,
              g,
              b
            );
          } else {
            pushFace(
              iQuad,
              x1 * VOXEL_SIZE - v,
              y1 * VOXEL_SIZE - v,
              z1 * VOXEL_SIZE - v,
              x4 * VOXEL_SIZE - v,
              y4 * VOXEL_SIZE - v,
              z4 * VOXEL_SIZE - v,
              x3 * VOXEL_SIZE - v,
              y3 * VOXEL_SIZE - v,
              z3 * VOXEL_SIZE - v,
              x2 * VOXEL_SIZE - v,
              y2 * VOXEL_SIZE - v,
              z2 * VOXEL_SIZE - v,
              0,
              0,
              Math.abs(z1 * VOXEL_SIZE - z3 * VOXEL_SIZE),
              Math.abs(y1 * VOXEL_SIZE - y3 * VOXEL_SIZE),
              -1,
              0,
              0,
              r,
              g,
              b
            );
          }
          break;
        case 1:
          if (up !== 0) {
            pushFace(
              iQuad,
              x3 * VOXEL_SIZE - v,
              y3 * VOXEL_SIZE - v,
              z3 * VOXEL_SIZE - v,
              x4 * VOXEL_SIZE - v,
              y4 * VOXEL_SIZE - v,
              z4 * VOXEL_SIZE - v,
              x1 * VOXEL_SIZE - v,
              y1 * VOXEL_SIZE - v,
              z1 * VOXEL_SIZE - v,
              x2 * VOXEL_SIZE - v,
              y2 * VOXEL_SIZE - v,
              z2 * VOXEL_SIZE - v,
              0,
              0,
              Math.abs(z1 * VOXEL_SIZE - z3 * VOXEL_SIZE),
              Math.abs(x1 * VOXEL_SIZE - x3 * VOXEL_SIZE),
              0,
              1,
              0,
              r,
              g,
              b
            );
          } else {
            pushFace(
              iQuad,
              x2 * VOXEL_SIZE - v,
              y2 * VOXEL_SIZE - v,
              z2 * VOXEL_SIZE - v,
              x1 * VOXEL_SIZE - v,
              y1 * VOXEL_SIZE - v,
              z1 * VOXEL_SIZE - v,
              x4 * VOXEL_SIZE - v,
              y4 * VOXEL_SIZE - v,
              z4 * VOXEL_SIZE - v,
              x3 * VOXEL_SIZE - v,
              y3 * VOXEL_SIZE - v,
              z3 * VOXEL_SIZE - v,
              0,
              0,
              Math.abs(z1 * VOXEL_SIZE - z3 * VOXEL_SIZE),
              Math.abs(x1 * VOXEL_SIZE - x3 * VOXEL_SIZE),
              0,
              -1,
              0,
              r,
              g,
              b
            );
          }
          break;
        case 2:
          if (up !== 0) {
            pushFace(
              iQuad,
              x1 * VOXEL_SIZE - v,
              y1 * VOXEL_SIZE - v,
              z1 * VOXEL_SIZE - v,
              x2 * VOXEL_SIZE - v,
              y2 * VOXEL_SIZE - v,
              z2 * VOXEL_SIZE - v,
              x3 * VOXEL_SIZE - v,
              y3 * VOXEL_SIZE - v,
              z3 * VOXEL_SIZE - v,
              x4 * VOXEL_SIZE - v,
              y4 * VOXEL_SIZE - v,
              z4 * VOXEL_SIZE - v,
              0,
              0,
              Math.abs(x1 * VOXEL_SIZE - x3 * VOXEL_SIZE),
              Math.abs(y1 * VOXEL_SIZE - y3 * VOXEL_SIZE),
              0,
              0,
              1,
              r,
              g,
              b
            );
          } else {
            pushFace(
              iQuad,
              x2 * VOXEL_SIZE - v,
              y2 * VOXEL_SIZE - v,
              z2 * VOXEL_SIZE - v,
              x1 * VOXEL_SIZE - v,
              y1 * VOXEL_SIZE - v,
              z1 * VOXEL_SIZE - v,
              x4 * VOXEL_SIZE - v,
              y4 * VOXEL_SIZE - v,
              z4 * VOXEL_SIZE - v,
              x3 * VOXEL_SIZE - v,
              y3 * VOXEL_SIZE - v,
              z3 * VOXEL_SIZE - v,
              0,
              0,
              Math.abs(x1 * VOXEL_SIZE - x3 * VOXEL_SIZE),
              Math.abs(y1 * VOXEL_SIZE - y3 * VOXEL_SIZE),
              0,
              0,
              -1,
              r,
              g,
              b
            );
          }

          break;
      }
    }

    // Generate vertex indices for quads.
    const numIndices = ((12 * quads.length) / 3 / 4) * 6;
    const indices = numIndices > 65535 ? new Uint32Array(numIndices) : new Uint16Array(numIndices);

    for (let i = 0, v = 0; i < numIndices; i += 6, v += 4) {
      indices[i + 0] = v;
      indices[i + 1] = v + 1;
      indices[i + 2] = v + 2;
      indices[i + 3] = v + 2;
      indices[i + 4] = v + 3;
      indices[i + 5] = v;
    }

    this.setIndex(numIndices > 65535 ? new Uint32BufferAttribute(indices, 1) : new Uint16BufferAttribute(indices, 2));
    this.setAttribute("position", new BufferAttribute(vertices, 3));
    this.setAttribute("normal", new BufferAttribute(normals, 3));
    this.setAttribute("color", new BufferAttribute(colors, 3));
    this.setAttribute("uv", new BufferAttribute(uvs, 2));
    this.setDrawRange(0, indices.length);

    this.computeBoundingSphere();
    this.computeBoundingBox();
  }
}

export { JelVoxBufferGeometry };

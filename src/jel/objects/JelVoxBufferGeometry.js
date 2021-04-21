const { BufferGeometry, Float32BufferAttribute } = THREE;
export const VOXEL_SIZE = 1 / 8;
const MAX_QUAD_SIZE = 8;

// Adapted from implementation by mikolalysenko:
// https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
function GreedyMesh(f, dims, max_quad_size = Infinity) {
  // Sweep over 3-axes
  const quads = [];
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
    const mask = new Int32Array(dims[u] * dims[v]);
    const vals = new Int32Array(dims[u] * dims[v]);
    const norms = new Int32Array(dims[u] * dims[v]);
    q[d] = 1;
    for (x[d] = -1; x[d] < dims[d]; ) {
      // Compute mask
      let n = 0;
      for (x[v] = 0; x[v] < dims[v]; ++x[v]) {
        // eslint-disable-line no-plusplus
        for (x[u] = 0; x[u] < dims[u]; ++x[u]) {
          // eslint-disable-line no-plusplus
          const vFrom = x[d] >= 0 ? f(x[0], x[1], x[2]) : 0;
          const vTo = x[d] < dims[d] - 1 ? f(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
          mask[n] = !!vFrom !== !!vTo;
          norms[n] = !!vFrom;
          // Need to split on side so negate key to break face up.
          vals[n++] = vFrom || -vTo; // eslint-disable-line no-plusplus
        }
      }
      // Increment x[d]
      ++x[d]; // eslint-disable-line no-plusplus
      // Generate mesh for mask using lexicographic ordering
      n = 0;
      for (j = 0; j < dims[v]; ++j) {
        // eslint-disable-line no-plusplus
        for (i = 0; i < dims[u]; ) {
          if (mask[n]) {
            const cv = vals[n];

            // Compute width
            for (w = 1; mask[n + w] && cv === vals[n + w] && i + w < dims[u] && w < max_quad_size; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            let done = false;

            for (h = 1; j + h < dims[v] && h < max_quad_size; ++h) {
              // eslint-disable-line no-plusplus
              for (k = 0; k < w; ++k) {
                // eslint-disable-line no-plusplus
                if (!mask[n + k + h * dims[u]] || vals[n + k + h * dims[u]] !== cv) {
                  done = true;
                  break;
                }
              }
              if (done) {
                break;
              }
            }

            // Add quad
            x[u] = i;
            x[v] = j;
            const du = [0, 0, 0];
            du[u] = w;
            const dv = [0, 0, 0];
            dv[v] = h;
            quads.push([
              d,
              norms[n],
              [x[0], x[1], x[2]],
              [x[0] + du[0], x[1] + du[1], x[2] + du[2]],
              [x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]],
              [x[0] + dv[0], x[1] + dv[1], x[2] + dv[2]]
            ]);
            // Zero-out mask
            for (l = 0; l < h; ++l) {
              // eslint-disable-line no-plusplus
              for (k = 0; k < w; ++k) {
                // eslint-disable-line no-plusplus
                mask[n + k + l * dims[u]] = false;
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

  update(chunk) {
    const palette = [];
    const size = chunk.getSize();

    for (let i = 0; i < chunk.palette.length; i++) {
      const rgbt = chunk.palette[i];

      const r = (0x000000ff & rgbt) / 255.0;
      const g = ((0x0000ff00 & rgbt) >>> 8) / 255.0;
      const b = ((0x00ff0000 & rgbt) >>> 16) / 255.0;

      // Voxel type currently unused
      // const t = Math.floor((0xff000000 & rgbt) >>> 24);

      palette.push([r, g, b]);
    }

    const indices = [];
    const vertices = [];
    const normals = [];
    const colors = [];

    const xzShift = Math.floor(size % 2 === 0 ? size / 2 - 1 : size / 2);

    const pushFace = (p1, p2, p3, p4, u1, v1, u2, v2, nx, ny, nz, r, g, b) => {
      // Shift the x, z because of the coordinate system, and shift the y because
      // we want the object origin to be at mid-Y
      vertices.push(...[p1[0] - xzShift * VOXEL_SIZE, p1[1], p1[2] - xzShift * VOXEL_SIZE]);
      vertices.push(...[p2[0] - xzShift * VOXEL_SIZE, p2[1], p2[2] - xzShift * VOXEL_SIZE]);
      vertices.push(...[p3[0] - xzShift * VOXEL_SIZE, p3[1], p3[2] - xzShift * VOXEL_SIZE]);
      vertices.push(...[p4[0] - xzShift * VOXEL_SIZE, p4[1], p4[2] - xzShift * VOXEL_SIZE]);

      for (let i = 0; i < 4; i++) {
        normals.push(...[nx, ny, nz]);
        colors.push(...[Math.floor(r * 255.0), Math.floor(g * 255.0), Math.floor(b * 255.0)]);
      }
    };

    // Generate quads via greedy mesher.
    const quads = GreedyMesh(
      (x, y, z) => {
        const sx = x - xzShift;
        const sz = z - xzShift;

        if (!chunk.hasVoxelAt(sx, y, sz)) return false;
        return chunk.getPaletteIndexAt(sx, y, sz) + 256;
      },
      [size, size, size],
      MAX_QUAD_SIZE
    );

    for (let i = 0; i < quads.length; i++) {
      const quad = quads[i];
      const d = quad[0];
      const up = quad[1];

      const [x1, y1, z1] = quad[2];
      const [x2, y2, z2] = quad[3];
      const [x3, y3, z3] = quad[4];
      const [x4, y4, z4] = quad[5];

      // Look up vertex color.
      const x = x1 - (d === 0 && up ? 1 : 0);
      const y = y1 - (d === 1 && up ? 1 : 0);
      const z = z1 - (d === 2 && up ? 1 : 0);

      const c = chunk.getPaletteIndexAt(x - xzShift, y, z - xzShift) - 1;
      const [r, g, b] = palette[c];
      const hv = VOXEL_SIZE / 2;

      // Generate visible faces.
      switch (d) {
        case 0:
          if (up) {
            pushFace(
              [x4 * VOXEL_SIZE - hv, y4 * VOXEL_SIZE - hv, z4 * VOXEL_SIZE - hv],
              [x1 * VOXEL_SIZE - hv, y1 * VOXEL_SIZE - hv, z1 * VOXEL_SIZE - hv],
              [x2 * VOXEL_SIZE - hv, y2 * VOXEL_SIZE - hv, z2 * VOXEL_SIZE - hv],
              [x3 * VOXEL_SIZE - hv, y3 * VOXEL_SIZE - hv, z3 * VOXEL_SIZE - hv],
              0,
              0,
              Math.abs(z1 - z3),
              Math.abs(y1 - y3),
              1,
              0,
              0,
              r,
              g,
              b
            );
          } else {
            pushFace(
              [x1 * VOXEL_SIZE - hv, y1 * VOXEL_SIZE - hv, z1 * VOXEL_SIZE - hv],
              [x4 * VOXEL_SIZE - hv, y4 * VOXEL_SIZE - hv, z4 * VOXEL_SIZE - hv],
              [x3 * VOXEL_SIZE - hv, y3 * VOXEL_SIZE - hv, z3 * VOXEL_SIZE - hv],
              [x2 * VOXEL_SIZE - hv, y2 * VOXEL_SIZE - hv, z2 * VOXEL_SIZE - hv],
              0,
              0,
              Math.abs(z1 - z3),
              Math.abs(y1 - y3),
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
          if (up) {
            pushFace(
              [x3 * VOXEL_SIZE - hv, y3 * VOXEL_SIZE - hv, z3 * VOXEL_SIZE - hv],
              [x4 * VOXEL_SIZE - hv, y4 * VOXEL_SIZE - hv, z4 * VOXEL_SIZE - hv],
              [x1 * VOXEL_SIZE - hv, y1 * VOXEL_SIZE - hv, z1 * VOXEL_SIZE - hv],
              [x2 * VOXEL_SIZE - hv, y2 * VOXEL_SIZE - hv, z2 * VOXEL_SIZE - hv],
              0,
              0,
              Math.abs(z1 - z3),
              Math.abs(x1 - x3),
              0,
              1,
              0,
              r,
              g,
              b
            );
          } else {
            pushFace(
              [x2 * VOXEL_SIZE - hv, y2 * VOXEL_SIZE - hv, z2 * VOXEL_SIZE - hv],
              [x1 * VOXEL_SIZE - hv, y1 * VOXEL_SIZE - hv, z1 * VOXEL_SIZE - hv],
              [x4 * VOXEL_SIZE - hv, y4 * VOXEL_SIZE - hv, z4 * VOXEL_SIZE - hv],
              [x3 * VOXEL_SIZE - hv, y3 * VOXEL_SIZE - hv, z3 * VOXEL_SIZE - hv],
              0,
              0,
              Math.abs(z1 - z3),
              Math.abs(x1 - x3),
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
          if (up) {
            pushFace(
              [x1 * VOXEL_SIZE - hv, y1 * VOXEL_SIZE - hv, z1 * VOXEL_SIZE - hv],
              [x2 * VOXEL_SIZE - hv, y2 * VOXEL_SIZE - hv, z2 * VOXEL_SIZE - hv],
              [x3 * VOXEL_SIZE - hv, y3 * VOXEL_SIZE - hv, z3 * VOXEL_SIZE - hv],
              [x4 * VOXEL_SIZE - hv, y4 * VOXEL_SIZE - hv, z4 * VOXEL_SIZE - hv],
              0,
              0,
              Math.abs(x1 - x3),
              Math.abs(y1 - y3),
              0,
              0,
              1,
              r,
              g,
              b
            );
          } else {
            pushFace(
              [x2 * VOXEL_SIZE - hv, y2 * VOXEL_SIZE - hv, z2 * VOXEL_SIZE - hv],
              [x1 * VOXEL_SIZE - hv, y1 * VOXEL_SIZE - hv, z1 * VOXEL_SIZE - hv],
              [x4 * VOXEL_SIZE - hv, y4 * VOXEL_SIZE - hv, z4 * VOXEL_SIZE - hv],
              [x3 * VOXEL_SIZE - hv, y3 * VOXEL_SIZE - hv, z3 * VOXEL_SIZE - hv],
              0,
              0,
              Math.abs(x1 - x3),
              Math.abs(y1 - y3),
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
    const len = (vertices.length / 3 / 4) * 6;
    for (let i = 0, v = 0; i < len; i += 6, v += 4) {
      indices.push(v);
      indices.push(v + 1);
      indices.push(v + 2);
      indices.push(v + 2);
      indices.push(v + 3);
      indices.push(v);
    }

    this.setIndex(indices);
    this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    this.setAttribute("color", new Float32BufferAttribute(colors, 3));
    this.setDrawRange(0, indices.length);

    this.computeBoundingSphere();
    this.computeBoundingBox();
  }
}

export { JelVoxBufferGeometry };

const { BufferGeometry, Float32BufferAttribute } = THREE;
export const VOXEL_SIZE = 1 / 8;

const MAX_VOX_SIZE = 128;

const mask = new Int32Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const vals = new Int32Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const norms = new Int32Array(MAX_VOX_SIZE * MAX_VOX_SIZE);

// Adapted from implementation by mikolalysenko:
// https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
function GreedyMesh(f, onQuad, dims, max_quad_size = Infinity) {
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
        for (i = 0; i < dims[u]; ) {
          if (mask[n] !== 0) {
            const cv = vals[n];

            // Compute width
            for (w = 1; mask[n + w] !== 0 && cv === vals[n + w] && i + w < dims[u] && w < max_quad_size; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            let done = false;

            for (h = 1; j + h < dims[v] && h < max_quad_size; ++h) {
              for (k = 0; k < w; ++k) {
                if (mask[n + k + h * dims[u]] === 0 || vals[n + k + h * dims[u]] !== cv) {
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
            onQuad([
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

    const indices = [];
    const vertices = [];
    const normals = [];
    const colors = [];
    const uvs = [];

    const xShift = Math.floor(size[0] % 2 === 0 ? size[0] / 2 - 1 : size[0] / 2);
    const yShift = Math.floor(size[1] % 2 === 0 ? size[1] / 2 - 1 : size[1] / 2);
    const zShift = Math.floor(size[2] % 2 === 0 ? size[2] / 2 - 1 : size[2] / 2);
    const xShiftVox = xShift * VOXEL_SIZE;
    const yShiftVox = yShift * VOXEL_SIZE;
    const zShiftVox = zShift * VOXEL_SIZE;

    const pushFace = (
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
      uvs.push(u1);
      uvs.push(v1);
      uvs.push(u2);
      uvs.push(v1);
      uvs.push(u2);
      uvs.push(v2);
      uvs.push(u1);
      uvs.push(v2);

      vertices.push(p1x - xShiftVox);
      vertices.push(p1y - yShiftVox);
      vertices.push(p1z - zShiftVox);
      vertices.push(p2x - xShiftVox);
      vertices.push(p2y - yShiftVox);
      vertices.push(p2z - zShiftVox);
      vertices.push(p3x - xShiftVox);
      vertices.push(p3y - yShiftVox);
      vertices.push(p3z - zShiftVox);
      vertices.push(p4x - xShiftVox);
      vertices.push(p4y - yShiftVox);
      vertices.push(p4z - zShiftVox);

      for (let i = 0; i < 4; i++) {
        normals.push(nx);
        normals.push(ny);
        normals.push(nz);
        colors.push(r);
        colors.push(g);
        colors.push(b);
      }
    };

    // Generate quads via greedy mesher.
    GreedyMesh(
      (x, y, z) => chunk.getPaletteIndexAt(x - xShift, y - yShift, z - zShift),
      quad => {
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

        const c = chunk.getPaletteIndexAt(x - xShift, y - yShift, z - zShift) - 1;
        const [r, g, b] = palette[c];
        const v = VOXEL_SIZE;

        // Generate visible faces.
        switch (d) {
          case 0:
            if (up) {
              pushFace(
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
            if (up) {
              pushFace(
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
            if (up) {
              pushFace(
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
      },
      size,
      max_quad_size
    );

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
    this.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    this.setDrawRange(0, indices.length);

    this.computeBoundingSphere();
    this.computeBoundingBox();
  }
}

export { JelVoxBufferGeometry };

const { BufferGeometry, Float32BufferAttribute } = THREE;

// Adapted from implementation by mikolalysenko:
// https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
function GreedyMesh(f, dims, skipDims = []) {
  // Sweep over 3-axes
  const quads = [];
  for (let d = 0; d < 3; ++d) {
    if (skipDims.includes(d)) continue;

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
            for (w = 1; mask[n + w] && cv === vals[n + w] && i + w < dims[u]; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            let done = false;
            for (h = 1; j + h < dims[v]; ++h) {
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

function positionKey(x, y, z) {
  return x | (y << 8) | (z << 16);
}

class VOXBufferGeometry extends BufferGeometry {
  constructor(chunk, skipDims = [], vertPallette = null) {
    super();
    this.type = "VOXBufferGeometry";

    const { data, size } = chunk;
    const palette = [];

    for (let i = 0; i < chunk.palette.length; i++) {
      const rgba = chunk.palette[i];

      const r = (0x000000ff & rgba) / 255.0;
      const g = ((0x0000ff00 & rgba) >>> 8) / 255.0;
      const b = ((0x00ff0000 & rgba) >>> 16) / 255.0;
      const a = ((0xff000000 & rgba) >>> 24) / 255.0;

      palette.push([r, g, b, a]);
    }

    const indices = [];
    const vertices = [];
    const normals = [];
    const colors = [];
    const palettes = [];

    const pushFace = (p1, p2, p3, p4, u1, v1, u2, v2, nx, ny, nz, r, g, b) => {
      const sx = size.x / 2;
      const sy = size.y / 2;
      const sz = size.z / 2;

      vertices.push(...[p1[0] - sx, p1[2] - sz, -p1[1] + sy]);
      vertices.push(...[p2[0] - sx, p2[2] - sz, -p2[1] + sy]);
      vertices.push(...[p3[0] - sx, p3[2] - sz, -p3[1] + sy]);
      vertices.push(...[p4[0] - sx, p4[2] - sz, -p4[1] + sy]);

      for (let i = 0; i < 4; i++) {
        normals.push(...[nx, nz, -ny]);
        colors.push(...[Math.floor(r * 255.0), Math.floor(g * 255.0), Math.floor(b * 255.0)]);
        palettes.push(vertPallette);
      }
    };

    // Build a [x, y, z] -> color index lookup table
    const voxels = new Map();

    for (let i = 0; i < data.length; i += 4) {
      const x = data[i + 0];
      const y = data[i + 1];
      const z = data[i + 2];
      const c = data[i + 3];
      const key = positionKey(x, y, z);

      voxels.set(key, c);
    }

    // Generate quads via greedy mesher.
    const quads = GreedyMesh(
      (x, y, z) => {
        const key = positionKey(x, y, z);
        if (!voxels.has(key)) return false;

        return voxels.get(key) + 256;
      },
      [size.x, size.y, size.z],
      skipDims
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
      const key = positionKey(x1 - (d === 0 && up ? 1 : 0), y1 - (d === 1 && up ? 1 : 0), z1 - (d === 2 && up ? 1 : 0));

      const c = voxels.get(key);
      const [r, g, b] = palette[0xff & (c >>> 0)];

      // Generate visible faces.
      switch (d) {
        case 0:
          if (up) {
            pushFace(
              [x4, y4, z4],
              [x1, y1, z1],
              [x2, y2, z2],
              [x3, y3, z3],
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
              [x1, y1, z1],
              [x4, y4, z4],
              [x3, y3, z3],
              [x2, y2, z2],
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
              [x3, y3, z3],
              [x4, y4, z4],
              [x1, y1, z1],
              [x2, y2, z2],
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
              [x2, y2, z2],
              [x1, y1, z1],
              [x4, y4, z4],
              [x3, y3, z3],
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
              [x1, y1, z1],
              [x2, y2, z2],
              [x3, y3, z3],
              [x4, y4, z4],
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
              [x2, y2, z2],
              [x1, y1, z1],
              [x4, y4, z4],
              [x3, y3, z3],
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

    if (vertPallette !== null) {
      this.setAttribute("palette", new Float32BufferAttribute(palettes, 1));
    }

    this.computeBoundingSphere();
  }
}

export { VOXBufferGeometry };

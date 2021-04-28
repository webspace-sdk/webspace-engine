const { BufferGeometry, BufferAttribute, Uint16BufferAttribute, Uint32BufferAttribute } = THREE;
export const VOXEL_SIZE = 1 / 8;

export const MAX_VOX_SIZE = 64;

const mask = new Int16Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const vals = new Int16Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const norms = new Int16Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const quadData = [];

// Adapted from implementation by mikolalysenko:
// https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
function GreedyMesh(chunk, max_quad_size = Infinity) {
  quadData.length = 0;
  const { size } = chunk;

  const xShift = Math.floor(size[0] % 2 === 0 ? size[0] / 2 - 1 : size[0] / 2);
  const yShift = Math.floor(size[1] % 2 === 0 ? size[1] / 2 - 1 : size[1] / 2);
  const zShift = Math.floor(size[2] % 2 === 0 ? size[2] / 2 - 1 : size[2] / 2);

  // Sweep over 3-axes
  for (let d = 0; d < 3; ++d) {
    // eslint-disable-line no-plusplus
    let i;
    let j;
    let k;
    let l;
    let w;
    let h;

    mask.fill(0);
    vals.fill(0);
    norms.fill(0);

    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const x = [0, 0, 0];
    let q0 = 0;
    let q1 = 0;
    let q2 = 0;
    const du = [0, 0, 0];
    const dv = [0, 0, 0];

    if (d === 0) {
      q0 = 1;
    } else if (d === 1) {
      q1 = 1;
    } else {
      q2 = 1;
    }

    const sd = size[d];
    const sv = size[v];
    const su = size[u];

    for (x[d] = -1; x[d] < sd; ) {
      // Compute mask
      let n = 0;
      const mulFrom = x[d] >= 0 ? 1 : 0;
      const mulTo = x[d] < sd - 1 ? 1 : 0;

      for (x[v] = 0; x[v] < sv; ++x[v]) {
        for (x[u] = 0; x[u] < su; ++x[u]) {
          const cx = x[0] - xShift;
          const cy = x[1] - yShift;
          const cz = x[2] - zShift;
          const vFrom = mulFrom * chunk.getPaletteIndexAt(cx, cy, cz);
          const vTo = mulTo * chunk.getPaletteIndexAt(cx + q0, cy + q1, cz + q2);
          mask[n] = vFrom - vTo; // If non-zero, mask has value
          norms[n] = vFrom; // Non-zero means up
          // Need to split on side so negate key to break face up.
          vals[n++] = vFrom !== 0 ? vFrom : -vTo; // eslint-disable-line no-plusplus
        }
      }
      // Increment x[d]
      ++x[d]; // eslint-disable-line no-plusplus
      // Generate mesh for mask using lexicographic ordering
      n = 0;
      for (j = 0; j < sv; ++j) {
        for (i = 0; i < su; ) {
          if (mask[n] !== 0) {
            const cv = vals[n];

            // Compute width
            for (w = 1; mask[n + w] !== 0 && cv === vals[n + w] && i + w < su && w < max_quad_size; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            loop: for (h = 1; j + h < sv && h < max_quad_size; ++h) {
              for (k = 0; k < w; ++k) {
                const mv = mask[n + k + h * su];
                if (mv === 0 || mv !== cv) break loop;
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
            quadData.push(d);
            quadData.push(norms[n]);
            quadData.push(x[0]);
            quadData.push(x[1]);
            quadData.push(x[2]);
            quadData.push(x[0] + du[0]);
            quadData.push(x[1] + du[1]);
            quadData.push(x[2] + du[2]);
            quadData.push(x[0] + du[0] + dv[0]);
            quadData.push(x[1] + du[1] + dv[1]);
            quadData.push(x[2] + du[2] + dv[2]);
            quadData.push(x[0] + dv[0]);
            quadData.push(x[1] + dv[1]);
            quadData.push(x[2] + dv[2]);
            // Zero-out mask
            for (l = 0; l < h; ++l) {
              // eslint-disable-line no-plusplus
              for (k = 0; k < w; ++k) {
                // eslint-disable-line no-plusplus
                mask[n + k + l * su] = 0;
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

  return quadData;
}

class JelVoxBufferGeometry extends BufferGeometry {
  constructor(chunk) {
    super();
    this.type = "JelVoxBufferGeometry";

    if (chunk) {
      this.update(chunk);
    }
  }

  // Updates the geometry with the specified vox chunk, returning the extents of the mesh.
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

    let xMax = -Infinity;
    let yMax = -Infinity;
    let zMax = -Infinity;
    let xMin = +Infinity;
    let yMin = +Infinity;
    let zMin = +Infinity;

    const xShift = Math.floor(size[0] % 2 === 0 ? size[0] / 2 - 1 : size[0] / 2);
    const yShift = Math.floor(size[1] % 2 === 0 ? size[1] / 2 - 1 : size[1] / 2);
    const zShift = Math.floor(size[2] % 2 === 0 ? size[2] / 2 - 1 : size[2] / 2);
    const xShiftVox = xShift * VOXEL_SIZE;
    const yShiftVox = yShift * VOXEL_SIZE;
    const zShiftVox = zShift * VOXEL_SIZE;

    // Generate quadData via greedy mesher.
    const quadData = GreedyMesh(chunk, max_quad_size);

    const numQuads = quadData.length / 14 + 1;
    const vertices = new Float32Array(12 * numQuads);
    const normals = new Float32Array(12 * numQuads);
    const colors = new Float32Array(12 * numQuads);
    const uvs = new Float32Array(8 * numQuads);

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

    for (let i = 0; i < quadData.length; i += 14) {
      const d = quadData[i];
      const up = quadData[i + 1];
      const x1 = quadData[i + 2];
      const y1 = quadData[i + 3];
      const z1 = quadData[i + 4];
      const x2 = quadData[i + 5];
      const y2 = quadData[i + 6];
      const z2 = quadData[i + 7];
      const x3 = quadData[i + 8];
      const y3 = quadData[i + 9];
      const z3 = quadData[i + 10];
      const x4 = quadData[i + 11];
      const y4 = quadData[i + 12];
      const z4 = quadData[i + 13];
      const iQuad = i / 14;

      xMax = Math.max(x1, x2, x3, x4, xMax);
      yMax = Math.max(y1, y2, y3, y4, yMax);
      zMax = Math.max(z1, z2, z3, z4, zMax);

      xMin = Math.min(x1, x2, x3, x4, xMin);
      yMin = Math.min(y1, y2, y3, y4, yMin);
      zMin = Math.min(z1, z2, z3, z4, zMin);

      // Look up vertex color.
      const x = x1 - (d === 0 && up !== 0 ? 1 : 0);
      const y = y1 - (d === 1 && up !== 0 ? 1 : 0);
      const z = z1 - (d === 2 && up !== 0 ? 1 : 0);

      const c = chunk.getPaletteIndexAt(x - xShift, y - yShift, z - zShift) - 1;
      const [r, g, b] = palette[c];

      // Generate visible faces.
      switch (d) {
        case 0:
          if (up !== 0) {
            pushFace(
              iQuad,
              x4 * VOXEL_SIZE,
              y4 * VOXEL_SIZE,
              z4 * VOXEL_SIZE,
              x1 * VOXEL_SIZE,
              y1 * VOXEL_SIZE,
              z1 * VOXEL_SIZE,
              x2 * VOXEL_SIZE,
              y2 * VOXEL_SIZE,
              z2 * VOXEL_SIZE,
              x3 * VOXEL_SIZE,
              y3 * VOXEL_SIZE,
              z3 * VOXEL_SIZE,
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
              x1 * VOXEL_SIZE,
              y1 * VOXEL_SIZE,
              z1 * VOXEL_SIZE,
              x4 * VOXEL_SIZE,
              y4 * VOXEL_SIZE,
              z4 * VOXEL_SIZE,
              x3 * VOXEL_SIZE,
              y3 * VOXEL_SIZE,
              z3 * VOXEL_SIZE,
              x2 * VOXEL_SIZE,
              y2 * VOXEL_SIZE,
              z2 * VOXEL_SIZE,
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
              x3 * VOXEL_SIZE,
              y3 * VOXEL_SIZE,
              z3 * VOXEL_SIZE,
              x4 * VOXEL_SIZE,
              y4 * VOXEL_SIZE,
              z4 * VOXEL_SIZE,
              x1 * VOXEL_SIZE,
              y1 * VOXEL_SIZE,
              z1 * VOXEL_SIZE,
              x2 * VOXEL_SIZE,
              y2 * VOXEL_SIZE,
              z2 * VOXEL_SIZE,
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
              x2 * VOXEL_SIZE,
              y2 * VOXEL_SIZE,
              z2 * VOXEL_SIZE,
              x1 * VOXEL_SIZE,
              y1 * VOXEL_SIZE,
              z1 * VOXEL_SIZE,
              x4 * VOXEL_SIZE,
              y4 * VOXEL_SIZE,
              z4 * VOXEL_SIZE,
              x3 * VOXEL_SIZE,
              y3 * VOXEL_SIZE,
              z3 * VOXEL_SIZE,
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
              x1 * VOXEL_SIZE,
              y1 * VOXEL_SIZE,
              z1 * VOXEL_SIZE,
              x2 * VOXEL_SIZE,
              y2 * VOXEL_SIZE,
              z2 * VOXEL_SIZE,
              x3 * VOXEL_SIZE,
              y3 * VOXEL_SIZE,
              z3 * VOXEL_SIZE,
              x4 * VOXEL_SIZE,
              y4 * VOXEL_SIZE,
              z4 * VOXEL_SIZE,
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
              x2 * VOXEL_SIZE,
              y2 * VOXEL_SIZE,
              z2 * VOXEL_SIZE,
              x1 * VOXEL_SIZE,
              y1 * VOXEL_SIZE,
              z1 * VOXEL_SIZE,
              x4 * VOXEL_SIZE,
              y4 * VOXEL_SIZE,
              z4 * VOXEL_SIZE,
              x3 * VOXEL_SIZE,
              y3 * VOXEL_SIZE,
              z3 * VOXEL_SIZE,
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
    const numIndices = numQuads * 6;
    const indices = numIndices > 65535 ? new Uint32Array(numIndices) : new Uint16Array(numIndices);

    for (let i = 0, v = 0; i < numIndices; i += 6, v += 4) {
      indices[i + 0] = v;
      indices[i + 1] = v + 1;
      indices[i + 2] = v + 2;
      indices[i + 3] = v + 2;
      indices[i + 4] = v + 3;
      indices[i + 5] = v;
    }

    this.setIndex(numIndices > 65535 ? new Uint32BufferAttribute(indices, 1) : new Uint16BufferAttribute(indices, 1));
    this.setAttribute("position", new BufferAttribute(vertices, 3));
    this.setAttribute("normal", new BufferAttribute(normals, 3));
    this.setAttribute("color", new BufferAttribute(colors, 3));
    this.setAttribute("uv", new BufferAttribute(uvs, 2));
    this.setDrawRange(0, indices.length);

    this.computeBoundingSphere();
    this.computeBoundingBox();

    return numIndices === 0 ? [0, 0, 0, 0, 0, 0] : [xMin, yMin, zMin, xMax, yMax, zMax];
  }
}

export { JelVoxBufferGeometry };

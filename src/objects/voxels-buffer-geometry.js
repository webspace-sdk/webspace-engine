import {MAX_SIZE as MAX_VOX_SIZE, shiftForSize} from "smoothvoxels";

const { BufferGeometry, BufferAttribute, Uint16BufferAttribute, Uint32BufferAttribute } = THREE;

export const VOXEL_SIZE = 1 / 8;

const mask = new Int16Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const vals = new Int16Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const norms = new Int16Array(MAX_VOX_SIZE * MAX_VOX_SIZE);
const quadData = [];
const tmpVec = new THREE.Vector3();

// These memory pools for attributes reduce GC as voxes are rapidly remeshed
// as brush previews are applied to them.
const createPool = klass => {
  const pool = new Map();

  return {
    get: function(length) {
      const freeList = pool.get(length);

      if (freeList && freeList.length > 0) {
        return freeList.pop();
      }

      return new klass(length);
    },
    free: function(item) {
      const length = item.length;
      let freeList = pool.get(length);

      if (!freeList) {
        freeList = [];
        pool.set(length, freeList);
      }

      freeList.push(item);
    },
    clear: function() {
      pool.clear();
    }
  };
};

const float32Pool = createPool(Float32Array);
const uint16Pool = createPool(Uint16Array);
const uint32Pool = createPool(Uint32Array);

export function clearVoxAttributePools() {
  float32Pool.clear();
  uint16Pool.clear();
  uint32Pool.clear();
}

// Adapted from implementation by mikolalysenko:
// https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/
//
// LOD is commented out because we don't need to use it in GreedyMesh
// (its only used in GreedyMeshFlat) but left to keep the update process
// of GreedyMeshFlat easy.
function GreedyMesh(voxels, maxQuadSize = Infinity /*, lod = 1, getLodVoxelCoord*/) {
  quadData.length = 0;
  const { size } = voxels;

  const xShift = shiftForSize(size[0]);
  const yShift = shiftForSize(size[1]);
  const zShift = shiftForSize(size[2]);

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

    const sd = Math.floor(size[d] /* / lod*/);
    const sv = Math.floor(size[v] /* / lod*/);
    const su = Math.floor(size[u] /* / lod*/);
    //const hasLod = lod > 1;

    for (x[d] = -1; x[d] < sd; ) {
      // Compute mask
      let n = 0;
      const mulFrom = x[d] >= 0 ? 1 : 0;
      const mulTo = x[d] < sd - 1 ? 1 : 0;

      for (x[v] = 0; x[v] < sv; ++x[v]) {
        for (x[u] = 0; x[u] < su; ++x[u]) {
          //let cx, cy, cz, cqx, cqy, cqz;

          //if (hasLod) {
          //  const l = getLodVoxelCoord(x[0], x[1], x[2]);
          //  cx = l >> 16;
          //  cy = (l & 0x0000ff00) >> 8;
          //  cz = l & 0x000000ff;

          //  const lq = getLodVoxelCoord(x[0] + q0, x[1] + q1, x[2] + q2);
          //  cqx = lq >> 16;
          //  cqy = (lq & 0x0000ff00) >> 8;
          //  cqz = lq & 0x000000ff;
          //} else {
          const cx = x[0];
          const cy = x[1];
          const cz = x[2];
          const cqx = cx + q0;
          const cqy = cy + q1;
          const cqz = cz + q2;
          //}

          const vFrom = mulFrom * voxels.getPaletteIndexAt(cx - xShift, cy - yShift, cz - zShift);
          const vTo = mulTo * voxels.getPaletteIndexAt(cqx - xShift, cqy - yShift, cqz - zShift);
          mask[n] = (vFrom !== 0) !== (vTo !== 0);
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
            for (w = 1; mask[n + w] !== 0 && cv === vals[n + w] && i + w < su && w < maxQuadSize; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            loop: for (h = 1; j + h < sv && h < maxQuadSize; ++h) {
              for (k = 0; k < w; ++k) {
                const mv = mask[n + k + h * su];
                if (mv === 0 || vals[n + k + h * su] !== cv) break loop;
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

// Copy + paste of function above, except hotspot. For performance reasons we avoid extra branches in the inner loop for this version, which ignores colors.
//
// This is used for generating efficient physics meshes.
function GreedyMeshFlat(voxels, maxQuadSize = Infinity, lod = 1, getLodVoxelCoord) {
  quadData.length = 0;
  const { size } = voxels;

  const xShift = shiftForSize(size[0]);
  const yShift = shiftForSize(size[1]);
  const zShift = shiftForSize(size[2]);

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

    const sd = Math.floor(size[d] / lod);
    const sv = Math.floor(size[v] / lod);
    const su = Math.floor(size[u] / lod);
    const hasLod = lod > 1;

    for (x[d] = -1; x[d] < sd; ) {
      // Compute mask
      let n = 0;
      const mulFrom = x[d] >= 0 ? 1 : 0;
      const mulTo = x[d] < sd - 1 ? 1 : 0;

      for (x[v] = 0; x[v] < sv; ++x[v]) {
        for (x[u] = 0; x[u] < su; ++x[u]) {
          let cx, cy, cz, cqx, cqy, cqz;

          if (hasLod) {
            const l = getLodVoxelCoord(x[0], x[1], x[2]);
            cx = l >> 16;
            cy = (l & 0x0000ff00) >> 8;
            cz = l & 0x000000ff;

            const lq = getLodVoxelCoord(x[0] + q0, x[1] + q1, x[2] + q2);
            cqx = lq >> 16;
            cqy = (lq & 0x0000ff00) >> 8;
            cqz = lq & 0x000000ff;
          } else {
            cx = x[0];
            cy = x[1];
            cz = x[2];
            cqx = cx + q0;
            cqy = cy + q1;
            cqz = cz + q2;
          }

          const vFrom = mulFrom * voxels.getPaletteIndexAt(cx - xShift, cy - yShift, cz - zShift);
          const vTo = mulTo * voxels.getPaletteIndexAt(cqx - xShift, cqy - yShift, cqz - zShift);
          mask[n] = (vFrom !== 0) !== (vTo !== 0);
          norms[n] = vFrom; // Non-zero means up
          // Need to split on side so negate key to break face up.
          // Since this is flat, we just use 1/-1 for the value
          vals[n++] = vFrom !== 0 ? 1 : vTo !== 0 ? -1 : 0; // eslint-disable-line no-plusplus
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
            for (w = 1; mask[n + w] !== 0 && cv === vals[n + w] && i + w < su && w < maxQuadSize; ++w) {
              // eslint-disable-line no-plusplus
            }
            // Compute height (this is slightly awkward
            loop: for (h = 1; j + h < sv && h < maxQuadSize; ++h) {
              for (k = 0; k < w; ++k) {
                const mv = mask[n + k + h * su];
                if (mv === 0 || vals[n + k + h * su] !== cv) break loop;
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

class VoxelsBufferGeometry extends BufferGeometry {
  constructor(voxels) {
    super();
    this.type = "VoxelsBufferGeometry";

    if (voxels) {
      this.update(voxels);
    }
  }

  dispose() {
    this.freeAttributeMemory();
    this.deleteAttribute("position");
    this.deleteAttribute("normal");
    this.deleteAttribute("color");
    this.deleteAttribute("uv");
    this.setIndex([]);

    super.dispose();
  }

  // Updates the geometry with the specified vox voxels, returning the extents of the mesh.
  // If false, generates a mesh without regard to color
  update(voxels, maxQuadSize = 1, flat = false, addXZPlane = true, lod = 1) {
    this.freeAttributeMemory();

    const palette = [];
    const { size } = voxels;

    for (let i = 0; i < voxels.palette.length; i++) {
      const rgbt = voxels.palette[i];

      const r = (0x000000ff & rgbt) / 255.0;
      const g = ((0x0000ff00 & rgbt) >>> 8) / 255.0;
      const b = ((0x00ff0000 & rgbt) >>> 16) / 255.0;

      // Voxel type currently unused
      // const t = Math.floor((0xff000000 & rgbt) >>> 24);

      palette.push([r, g, b]);
    }

    // LOD is 1, 2, 4
    lod = Math.pow(2, lod - 1);

    let xMax = -Infinity;
    let yMax = -Infinity;
    let zMax = -Infinity;
    let xMin = +Infinity;
    let yMin = +Infinity;
    let zMin = +Infinity;

    const xShift = shiftForSize(size[0]);
    const yShift = shiftForSize(size[1]);
    const zShift = shiftForSize(size[2]);
    const xShiftVox = xShift * VOXEL_SIZE;
    const yShiftVox = yShift * VOXEL_SIZE;
    const zShiftVox = zShift * VOXEL_SIZE;
    const hasLod = lod > 1;
    const lodOffset = lod === 1 ? 0 : lod === 2 ? -VOXEL_SIZE / 2 : -VOXEL_SIZE * 2;

    let getLodVoxelCoord = null;

    if (lod > 1) {
      const lodIndices = [];

      const lod2 = lod / 2;

      // Scan only lowest level, since we want
      // the height to be closest to existing height.
      for (let i = -lod2; i <= lod2; i++) {
        for (let j = -1; j <= -1; j++) {
          for (let k = -lod2; k <= lod2; k++) {
            lodIndices.push([i, j, k]);
          }
        }
      }

      lodIndices.sort(([ai, aj, ak], [bi, bj, bk]) => {
        const a = Math.sqrt(ai * ai + aj * aj + ak * ak);
        const b = Math.sqrt(bi * bi + bj * bj + bk * bk);
        return a < b ? -1 : 1;
      });

      getLodVoxelCoord = (x, y, z) => {
        let vx, vy, vz;

        // For LOD, always take non-air voxel in LOD voxels to avoid gaps
        for (const [i, j, k] of lodIndices) {
          vx = Math.max(0, Math.min(x * lod + i, size[0]));
          vy = Math.max(0, Math.min(y * lod + j, size[1]));
          vz = Math.max(0, Math.min(z * lod + k, size[2]));

          if (voxels.hasVoxelAt(vx - xShift, vy - yShift, vz - zShift)) break;
        }

        return (vx << 16) | (vy << 8) | vz;
      };
    }

    // Generate quadData via greedy mesher.
    const quadData = flat
      ? GreedyMeshFlat(voxels, maxQuadSize, lod, getLodVoxelCoord)
      : GreedyMesh(voxels, maxQuadSize, lod, getLodVoxelCoord);

    const numQuads = quadData.length / 14 + (addXZPlane ? 1 : 0);
    const vertices = float32Pool.get(12 * numQuads);
    const normals = float32Pool.get(12 * numQuads);
    const colors = float32Pool.get(12 * numQuads);
    const uvs = float32Pool.get(8 * numQuads);
    let boundingBox = this.boundingBox;
    let boundingSphere = this.boundingSphere;

    if (!boundingBox) {
      boundingBox = this.boundingBox = new THREE.Box3();
    }

    if (!boundingSphere) {
      boundingSphere = this.boundingSphere = new THREE.Sphere();
    }

    boundingBox.makeEmpty();
    const boxMin = boundingBox.min;
    const boxMax = boundingBox.max;

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

      const p1xw = p1x * lod - xShiftVox + lodOffset;
      const p1yw = p1y * lod - yShiftVox + lodOffset;
      const p1zw = p1z * lod - zShiftVox + lodOffset;
      const p2xw = p2x * lod - xShiftVox + lodOffset;
      const p2yw = p2y * lod - yShiftVox + lodOffset;
      const p2zw = p2z * lod - zShiftVox + lodOffset;
      const p3xw = p3x * lod - xShiftVox + lodOffset;
      const p3yw = p3y * lod - yShiftVox + lodOffset;
      const p3zw = p3z * lod - zShiftVox + lodOffset;
      const p4xw = p4x * lod - xShiftVox + lodOffset;
      const p4yw = p4y * lod - yShiftVox + lodOffset;
      const p4zw = p4z * lod - zShiftVox + lodOffset;

      vertices[iQuad * 12 + 0] = p1xw;
      vertices[iQuad * 12 + 1] = p1yw;
      vertices[iQuad * 12 + 2] = p1zw;
      vertices[iQuad * 12 + 3] = p2xw;
      vertices[iQuad * 12 + 4] = p2yw;
      vertices[iQuad * 12 + 5] = p2zw;
      vertices[iQuad * 12 + 6] = p3xw;
      vertices[iQuad * 12 + 7] = p3yw;
      vertices[iQuad * 12 + 8] = p3zw;
      vertices[iQuad * 12 + 9] = p4xw;
      vertices[iQuad * 12 + 10] = p4yw;
      vertices[iQuad * 12 + 11] = p4zw;

      boxMin.x = Math.min(boxMin.x, p1xw, p2xw, p3xw, p4xw);
      boxMin.y = Math.min(boxMin.y, p1yw, p2yw, p3yw, p4yw);
      boxMin.z = Math.min(boxMin.z, p1zw, p2zw, p3zw, p4zw);
      boxMax.x = Math.max(boxMax.x, p1xw, p2xw, p3xw, p4xw);
      boxMax.y = Math.max(boxMax.y, p1yw, p2yw, p3yw, p4yw);
      boxMax.z = Math.max(boxMax.z, p1zw, p2zw, p3zw, p4zw);

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

      xMax = Math.max(x1 - xShift, x2 - xShift, x3 - xShift, x4 - xShift, xMax);
      yMax = Math.max(y1 - yShift, y2 - yShift, y3 - yShift, y4 - yShift, yMax);
      zMax = Math.max(z1 - zShift, z2 - zShift, z3 - zShift, z4 - zShift, zMax);

      xMin = Math.min(x1 - xShift, x2 - xShift, x3 - xShift, x4 - xShift, xMin);
      yMin = Math.min(y1 - yShift, y2 - yShift, y3 - yShift, y4 - yShift, yMin);
      zMin = Math.min(z1 - zShift, z2 - zShift, z3 - zShift, z4 - zShift, zMin);

      // Look up vertex color.
      const x = x1 - (d === 0 && up !== 0 ? 1 : 0);
      const y = y1 - (d === 1 && up !== 0 ? 1 : 0);
      const z = z1 - (d === 2 && up !== 0 ? 1 : 0);

      let vx, vy, vz;
      if (hasLod) {
        const lodCoord = getLodVoxelCoord(x, y, z);
        vx = lodCoord >> 16;
        vy = (lodCoord & 0x0000ff00) >> 8;
        vz = lodCoord & 0x000000ff;
      } else {
        vx = x;
        vy = y;
        vz = z;
      }

      const c = voxels.getPaletteIndexAt(vx - xShift, vy - yShift, vz - zShift) - 1;

      if (c === -1) continue;
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

    const gridMinX = xMin - 5;
    const gridMaxX = xMax + 5;
    const gridMinZ = zMin - 5;
    const gridMaxZ = zMax + 5;

    if (addXZPlane) {
      pushFace(
        quadData.length / 14,
        (gridMinX + xShift) * VOXEL_SIZE,
        (yMin + yShift) * VOXEL_SIZE,
        (gridMaxZ + zShift) * VOXEL_SIZE,
        (gridMaxX + xShift) * VOXEL_SIZE,
        (yMin + yShift) * VOXEL_SIZE,
        (gridMaxZ + zShift) * VOXEL_SIZE,
        (gridMaxX + xShift) * VOXEL_SIZE,
        (yMin + yShift) * VOXEL_SIZE,
        (gridMinZ + zShift) * VOXEL_SIZE,
        (gridMinX + xShift) * VOXEL_SIZE,
        (yMin + yShift) * VOXEL_SIZE,
        (gridMinZ + zShift) * VOXEL_SIZE,
        0,
        0,
        Math.abs((zMax + zShift + 2) * VOXEL_SIZE - (zMin + zShift - 2) * VOXEL_SIZE),
        Math.abs((xMax + xShift + 2) * VOXEL_SIZE - (xMin + xShift - 2) * VOXEL_SIZE),
        0,
        1,
        0,
        0.2,
        0.2,
        0.2
      );
    }

    // Generate vertex indices for quads.
    const numIndices = numQuads * 6;
    const indices = numIndices > 65535 ? uint32Pool.get(numIndices) : uint16Pool.get(numIndices);

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

    const center = boundingSphere.center;
    boundingBox.getCenter(center);

    let maxRadiusSq = 0;

    for (let j = 0, l = vertices.length; j < l; j += 3) {
      tmpVec.set(vertices[j], vertices[j + 1], vertices[j + 2]);
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(tmpVec));
    }

    boundingSphere.radius = Math.sqrt(maxRadiusSq);

    return numIndices === 0 ? [0, 0, 0, 0, 0, 0] : [xMin, yMin, zMin, xMax, yMax, zMax];
  }

  freeAttributeMemory() {
    const position = this.getAttribute("position");
    const normal = this.getAttribute("normal");
    const color = this.getAttribute("color");
    const uv = this.getAttribute("uv");
    const index = this.index;
    const positionArray = position && position.array;
    const normalArray = normal && normal.array;
    const colorArray = color && color.array;
    const uvArray = uv && uv.array;
    const indexArray = index && index.array;

    if (positionArray) {
      float32Pool.free(positionArray);
    }

    if (normalArray) {
      float32Pool.free(normalArray);
    }

    if (colorArray) {
      float32Pool.free(colorArray);
    }

    if (uvArray) {
      float32Pool.free(uvArray);
    }

    if (indexArray) {
      if (index.count > 66535) {
        uint32Pool.free(indexArray);
      } else {
        uint16Pool.free(indexArray);
      }
    }
  }
}

export { VoxelsBufferGeometry };

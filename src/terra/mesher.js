// Max quad size to prevent seams when curving
const MAX_QUAD_SIZE = 12;

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

export default ({
  getType,
  getFeatures,
  getColor,
  getPalette,
  getSplitKey,
  from,
  to,
  types,
  chunkSize,
  chunkSubchunks
}) => {
  const maxX = chunkSize;
  const maxY = Math.floor(chunkSize / chunkSubchunks);
  const maxZ = chunkSize;
  const opaques = [];
  const transparents = [];

  const meshes = {
    opaque: opaques,
    transparent: transparents
  };

  const enclosedMap = new Map();

  // TODO this is a hotspot and probably can be optimized using a recursive algorithm
  const isFullyEnclosed = (x, y, z) => {
    // inline: const enclosedMapKeyFor = (x, y, z) => x + 1 + (y + 1) * 10000 + (z + 1) * 10000000;
    const keyBase = x + 1 + (z + 1) * 10000000;
    const mapKeyUp = keyBase + (y + 2) * 10000;
    const mapKey = keyBase + (y + 1) * 10000;

    if (enclosedMap.has(mapKey)) return enclosedMap.get(mapKey);

    if (enclosedMap.get(mapKeyUp)) {
      const mapKeyDown = keyBase + y * 10000;

      if (enclosedMap.get(mapKeyDown)) {
        enclosedMap.set(mapKey, true);
        return true;
      }
    }

    for (let i = -1; i <= 1; i += 1) {
      for (let j = -1; j <= 1; j += 1) {
        for (let k = -1; k <= 1; k += 1) {
          if (i !== 0 || j !== 0 || k !== 0) {
            const type = getType(x + i, y + j, z + k);

            if (type === types.air || type === types.water) {
              enclosedMap.set(mapKey, false);
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  for (let lodLevel = 0; lodLevel < 1; lodLevel++) {
    const lod = Math.pow(2, lodLevel);
    const opaque = { color: [], position: [], uv: [], normal: [], palette: [] };
    const transparent = { color: [], position: [], uv: [], normal: [], palette: [] };
    const geometry = { opaque, transparent };
    opaques.push(opaque);
    transparents.push(transparent);

    const pushFace = (p1, p2, p3, p4, u1, v1, u2, v2, nx, ny, nz, color, palette, isTransparent) => {
      const uvs = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];
      const normals = [[nx, ny, nz], [nx, ny, nz], [nx, ny, nz], [nx, ny, nz]];
      const vertices = [p1, p2, p3, p4];
      const mesh = isTransparent ? geometry.transparent : geometry.opaque;
      for (let i = 0; i < 4; i += 1) {
        mesh.color.push(Math.round(color.r), Math.round(color.g), Math.round(color.b));
        mesh.palette.push(palette);
      }
      uvs.forEach(uv => mesh.uv.push(...uv));
      normals.forEach(normal => mesh.normal.push(...normal));
      vertices.forEach(vertex => mesh.position.push(...vertex));
    };

    for (let iTransparent = 0; iTransparent <= 1; iTransparent += 1) {
      const transparent = iTransparent === 1;

      const lodIndices = [];

      // Generate list of indices to scan for lod voxel
      if (lod > 1) {
        const lod2 = lod / 2;

        // Scan only lowest level, since we want
        // the terrain height to be closest to existing height.
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
      }

      const getLodVoxelCoord = (x, y, z) => {
        let voxelType, vx, vy, vz;

        if (lod === 1) {
          vx = x;
          vy = y;
          vz = z;
          voxelType = getType(vx, vy, vz);
        } else {
          for (let ii = 0, l = lodIndices.length; ii < l; ii++) {
            const indices = lodIndices[ii];
            const i = indices[0];
            const j = indices[1];
            const k = indices[2];

            vx = Math.min(from.x + x * lod + i, maxX);
            vy = Math.min(from.y + y * lod + j, maxY);
            vz = Math.min(from.z + z * lod + k, maxZ);

            voxelType = getType(vx, vy, vz);
            if (voxelType !== types.air) break;
          }
        }

        return [vx, vy, vz];
      };

      const quads = GreedyMesh(
        (x, y, z) => {
          const [vx, vy, vz] = getLodVoxelCoord(x, y, z);
          const voxelType = getType(vx, vy, vz);
          if (voxelType === types.air) return false;

          // Skip fully enclosed algorithm for lower LODs - hard to implement and also not a big deal to have edge faces
          if (lod === 1 && isFullyEnclosed(x, y, z)) return false;
          if (!!types[voxelType].isTransparent !== transparent) return false;
          return getSplitKey(vx, vy, vz, lod > 1);
        },
        [(to.x - from.x) / lod, (to.y - from.y) / lod, (to.z - from.z) / lod],
        lod > 1 ? Infinity : MAX_QUAD_SIZE
      );

      for (let q = 0; q < quads.length; q += 1) {
        const quad = quads[q];
        const d = quad[0];
        const up = quad[1];
        const [x1, y1, z1] = quad[2];
        const [x2, y2, z2] = quad[3];
        const [x3, y3, z3] = quad[4];
        const [x4, y4, z4] = quad[5];

        // Find non-air voxel coord in LOD chunk, or air.
        const [vx, vy, vz] = getLodVoxelCoord(x1, y1, z1);
        const voxType = getType(vx, vy, vz);

        if (d === 0) {
          // Skip horizontal water planes
          if (transparent && voxType === types.water) continue; // eslint-disable-line no-continue

          let draw = x1 < lod || x1 >= maxX - lod + 1 || voxType === types.air;

          if (!draw) {
            for (let y = Math.min(y1, y2, y3, y4); y <= Math.max(y1, y2, y3, y4); y += 1) {
              for (let z = Math.min(z1, z2, z3, z4); z <= Math.max(z1, z2, z3, z4); z += 1) {
                const [vx, vy, vz] = getLodVoxelCoord(x1 + (up ? 1 : -1), y, z);
                const nextVoxType = getType(vx, vy, vz);
                if (nextVoxType === types.air) {
                  draw = true;
                  break;
                }

                if (draw) break;
              }

              if (draw) break;
            }
          }

          if (draw) {
            const [vx, vy, vz] = getLodVoxelCoord(x1 + (up ? -1 : 0), y1, z1);
            const cv = getColor(vx, vy, vz, lod > 1);
            const palette = getPalette(vx, vy, vz);

            if (up) {
              pushFace(
                [x4 * 2 * lod, y4 * 2 * lod, z4 * 2 * lod],
                [x1 * 2 * lod, y1 * 2 * lod, z1 * 2 * lod],
                [x2 * 2 * lod, y2 * 2 * lod, z2 * 2 * lod],
                [x3 * 2 * lod, y3 * 2 * lod, z3 * 2 * lod],
                0,
                0,
                Math.abs(z1 - z3),
                Math.abs(y1 - y3),
                0,
                -1,
                0,
                cv,
                palette,
                transparent
              );
            } else {
              pushFace(
                [x1 * 2 * lod, y1 * 2 * lod, z1 * 2 * lod],
                [x4 * 2 * lod, y4 * 2 * lod, z4 * 2 * lod],
                [x3 * 2 * lod, y3 * 2 * lod, z3 * 2 * lod],
                [x2 * 2 * lod, y2 * 2 * lod, z2 * 2 * lod],
                0,
                0,
                Math.abs(z1 - z3),
                Math.abs(y1 - y3),
                0,
                1,
                0,
                cv,
                palette,
                transparent
              );
            }
          }
        } else if (d === 1) {
          let draw = y1 < lod || y1 >= maxY - lod + 1 || voxType === types.air;

          if (!draw) {
            for (let x = Math.min(x1, x2, x3, x4); x <= Math.max(x1, x2, x3, x4); x += 1) {
              for (let z = Math.min(z1, z2, z3, z4); z <= Math.max(z1, z2, z3, z4); z += 1) {
                const [vx, vy, vz] = getLodVoxelCoord(x, y1 + (up ? 1 : -1), z);
                const nextVoxType = getType(vx, vy, vz);
                if (nextVoxType === types.air) {
                  draw = true;
                  break;
                }

                if (draw) break;
              }

              if (draw) break;
            }
          }

          if (draw) {
            const [vx, vy, vz] = getLodVoxelCoord(x1, y1 + (up ? -1 : 0), z1);
            const cv = getColor(vx, vy, vz, lod > 1);
            const palette = getPalette(vx, vy, vz);

            if (up) {
              pushFace(
                [x3 * 2 * lod, y3 * 2 * lod, z3 * 2 * lod],
                [x4 * 2 * lod, y4 * 2 * lod, z4 * 2 * lod],
                [x1 * 2 * lod, y1 * 2 * lod, z1 * 2 * lod],
                [x2 * 2 * lod, y2 * 2 * lod, z2 * 2 * lod],
                0,
                0,
                Math.abs(z1 - z3),
                Math.abs(x1 - x3),
                0,
                1,
                0,
                cv,
                palette,
                transparent
              );
            } else {
              pushFace(
                [x2 * 2 * lod, y2 * 2 * lod, z2 * 2 * lod],
                [x1 * 2 * lod, y1 * 2 * lod, z1 * 2 * lod],
                [x4 * 2 * lod, y4 * 2 * lod, z4 * 2 * lod],
                [x3 * 2 * lod, y3 * 2 * lod, z3 * 2 * lod],
                0,
                0,
                Math.abs(z1 - z3),
                Math.abs(x1 - x3),
                0,
                -1,
                0,
                cv,
                palette,
                transparent
              );
            }
          }
        } else {
          // Skip horizontal water planes
          if (transparent && voxType === types.water) continue; // eslint-disable-line no-continue
          let draw = z1 < lod || z1 >= maxZ - lod + 1 || voxType === types.air;

          if (!draw) {
            for (let y = Math.min(y1, y2, y3, y4); y <= Math.max(y1, y2, y3, y4); y += 1) {
              for (let x = Math.min(x1, x2, x3, x4); x <= Math.max(x1, x2, x3, x4); x += 1) {
                const [vx, vy, vz] = getLodVoxelCoord(x, y, z1 + (up ? 1 : -1));
                const nextVoxType = getType(vx, vy, vz);
                if (nextVoxType === types.air) {
                  draw = true;
                  break;
                }

                if (draw) break;
              }

              if (draw) break;
            }
          }

          if (draw) {
            const [vx, vy, vz] = getLodVoxelCoord(x1, y1, z1 + (up ? -1 : 0));
            const cv = getColor(vx, vy, vz, lod > 1);
            const palette = getPalette(vx, vy, vz);

            if (up) {
              pushFace(
                [x1 * 2 * lod, y1 * 2 * lod, z1 * 2 * lod],
                [x2 * 2 * lod, y2 * 2 * lod, z2 * 2 * lod],
                [x3 * 2 * lod, y3 * 2 * lod, z3 * 2 * lod],
                [x4 * 2 * lod, y4 * 2 * lod, z4 * 2 * lod],
                0,
                0,
                Math.abs(x1 - x3),
                Math.abs(y1 - y3),
                0,
                -1,
                0,
                cv,
                palette,
                transparent
              );
            } else {
              pushFace(
                [x2 * 2 * lod, y2 * 2 * lod, z2 * 2 * lod],
                [x1 * 2 * lod, y1 * 2 * lod, z1 * 2 * lod],
                [x4 * 2 * lod, y4 * 2 * lod, z4 * 2 * lod],
                [x3 * 2 * lod, y3 * 2 * lod, z3 * 2 * lod],
                0,
                0,
                Math.abs(x1 - x3),
                Math.abs(y1 - y3),
                0,
                1,
                0,
                cv,
                palette,
                transparent
              );
            }
          }
        }
      }
    }

    // Embed feature meshes
    const features = getFeatures();

    for (let i = 0; i < features.length; i++) {
      const { types } = features[i];

      if (types & 1) {
        // Foilage
        //processFeatureMesh(x, y, z, models.trees[lodLevel], 1.0, 1.4);
        // TODO
        // const maxClusterFerns = 8;
        // Create clustered ferns
        /* for (let i = 0; i < Math.floor(Math.random() * (maxClusterFerns + 1)); i += 1) {
              let dx = (Math.random() - 0.5) * 3;
              let dz = (Math.random() - 0.5) * 3;
              dx += dx < 0 ? -0.25 : 0.25;
              dz += dz < 0 ? -0.25 : 0.25;

              if (atOrBelowGround(obj.position.x + dx, obj.position.y, obj.position.z + dz)) {
                const fern = this.ferns[Math.floor(Math.random() * this.ferns.length)];
                const scale = Math.random() * 0.3 + 0.6;
                const obj2 = new Group();
                obj2.add(fern.clone());
                obj2.position.set(obj.position.x + dx, obj.position.y, obj.position.z + dz);
                obj.rotation.set(obj.rotation.x, Math.random() * 2 * Math.PI, obj.rotation.z);
                obj2.scale.set(scale, scale, scale);
                this.add(obj2);
              }
            } */
      }

      // Trim
      if (types & 2) {
        // Don't bother adding trim on lower LODs
        //processFeatureMesh(x, y, z, models.rocks[lodLevel], 0.3, 0.85, lodLevel === 0);
      }
    }

    // Convert to byte buffers
    for (const geo of [opaque, transparent]) {
      geo.color = new Uint8Array(geo.color);
      geo.uv = new Uint8Array(geo.uv);
      geo.normal = new Uint8Array(geo.normal);
      geo.palette = new Uint8Array(geo.palette);
    }
  }

  return meshes;
};

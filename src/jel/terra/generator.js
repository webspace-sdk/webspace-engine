import { createNoise2D, createNoise4D } from "simplex-noise";
import seedrandom from "seedrandom";
import random from "random";
import Chunk from "./chunk";

import { WORLD_SIZE, WATER_LEVEL, VOXEL_PALETTE_NONE, VOXEL_PALETTE_GROUND, VOXEL_PALETTE_EDGE } from "./constants";

const { features } = Chunk;

random.use(seedrandom("base"));

const getFixedColor = () => {
  return (y, map) => {
    const colorHeight = map.height - 1;

    const ha = Math.floor(colorHeight);

    const r = Math.floor(map.data[ha * 4]);
    const g = Math.floor(map.data[ha * 4 + 1]);
    const b = Math.floor(map.data[ha * 4 + 2]);

    return { r, g, b };
  };
};

const getComputeColor = seed => {
  // TODO these rngs need to be pushed to chunk level seeding
  const colorRng = random.clone(seed).normal(0, 0.02);
  const belowWaterRng = random.clone(seed).normal(0, 0.005);

  return (y, map, disableNoise = false) => {
    const { maxHeight } = Chunk;
    const colorHeight = map.height - 1;

    // let ta = 1.0 - Math.min(1, Math.max(0, (y / maxHeight) + colorRng()));
    let ta =
      1.0 -
      Math.min(1, Math.max(0, y / maxHeight + (disableNoise ? 0 : y < WATER_LEVEL ? belowWaterRng() : colorRng())));
    ta = Math.floor(ta * 25) / 25;

    const ha = Math.floor(ta * colorHeight);

    const r = Math.floor(map.data[ha * 4]);
    const g = Math.floor(map.data[ha * 4 + 1]);
    const b = Math.floor(map.data[ha * 4 + 2]);

    return { r, g, b };
  };
};

const Generators = {
  islands({ seed, palettes, types }) {
    const thCache = new Map();
    const phCache = new Map();
    const sphCache = new Map();
    const bCache = new Map();
    const fieldCache = new Uint8Array(64 * 64 * 64);

    const simplex2DNoise = createNoise2D(random.clone(seed).uniform());
    const simplex4DNoise = createNoise4D(random.clone(seed).uniform());
    const computeColor = getComputeColor(seed);

    const { maxHeight } = Chunk;

    const tiledSimplex = (x, z, x1, x2, z1, z2) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const s = x / WORLD_SIZE;
      const t = z / WORLD_SIZE;
      const nx = x1 + (Math.cos(s * 2 * Math.PI) * dx) / (2 * Math.PI);
      const nz = z1 + (Math.cos(t * 2 * Math.PI) * dz) / (2 * Math.PI);
      const na = x1 + (Math.sin(s * 2 * Math.PI) * dx) / (2 * Math.PI);
      const nb = z1 + (Math.sin(t * 2 * Math.PI) * dz) / (2 * Math.PI);
      const val = Math.abs(simplex4DNoise(nx, nz, na, nb));
      return val;
    };

    const getPlateauHeight = (x, z) => {
      const cacheKey = Math.floor(x) * 10000 + Math.floor(z);
      if (phCache.has(cacheKey)) return phCache.get(cacheKey);

      const plateauStepSize = 0.3;

      const h =
        Math.floor(Math.abs(tiledSimplex(x, z, 0, 0.15 * WORLD_SIZE, 0, 0.15 * WORLD_SIZE)) * (1.0 / plateauStepSize)) *
        maxHeight *
        plateauStepSize;

      phCache.set(cacheKey, h);
      return h;
    };

    const getSmoothedPlateauHeight = (x, z) => {
      const cacheKey = Math.floor(x) * 10000 + Math.floor(z);
      if (sphCache.has(cacheKey)) {
        return sphCache.get(cacheKey);
      }
      const h = Math.abs(tiledSimplex(x, z, 0, 0.15 * WORLD_SIZE, 0, 0.15 * WORLD_SIZE)) * maxHeight * 0.66;
      sphCache.set(cacheKey, h);
      return h;
    };

    const getTerrainHeight = (x, z) => {
      const cacheKey = Math.floor(x) * 10000 + Math.floor(z);
      if (thCache.has(cacheKey)) {
        return thCache.get(cacheKey);
      }
      const h = Math.min(
        Math.abs(tiledSimplex(x, z, 0, WORLD_SIZE * 0.5, 0, WORLD_SIZE * 0.5)) * 2.0 * maxHeight,
        maxHeight
      );
      thCache.set(cacheKey, h);
      return h;
    };

    const getPeakHeight = (x, z) => {
      const h = getTerrainHeight(x + WORLD_SIZE * 0.33, z + WORLD_SIZE * 0.33) / (maxHeight * 2.0) + 0.8;
      const v = Math.min(h ** 8 * maxHeight * 0.25, maxHeight * 0.75);
      return v;
    };

    const getBridgeHeight = (x, z) => {
      const cacheKey = Math.floor(x) * 10000 + Math.floor(z);
      if (bCache.has(cacheKey)) {
        return bCache.get(cacheKey);
      }
      let h = Math.min(
        Math.abs(tiledSimplex(x + WORLD_SIZE * 0.2, z + WORLD_SIZE * 0.2, 0, WORLD_SIZE * 0.5, 0, WORLD_SIZE * 0.5)) *
          maxHeight *
          0.2,
        maxHeight * 0.2
      );
      h = Math.max(h, WATER_LEVEL) + 3;
      bCache.set(cacheKey, h);
      return h;
    };

    const getLandHeight = (terrainHeight, plateauHeight) =>
      Math.min(Math.min(terrainHeight, plateauHeight) + WATER_LEVEL / 3, maxHeight);

    const minEdgeDropoff = 3;

    const getIsEdge = (x, z, landHeight) => {
      let isEdge = false;

      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          if (i !== 0 && j !== 0) {
            const h = getLandHeight(getTerrainHeight(x + i, z + j), getPlateauHeight(x + i, z + j));

            isEdge = h < landHeight - minEdgeDropoff;
          }

          if (isEdge) break;
        }

        if (isEdge) break;
      }

      return isEdge;
    };

    const terrain = (x, y, z) => {
      const hasPeaks = true; // TODO tie to seed
      const terrainHeight = getTerrainHeight(x, z);
      const plateauHeight = getPlateauHeight(x, z);
      const peakHeight = getPeakHeight(x, z);
      const minTerrainHeightForPeaks = maxHeight * 0.25;

      const bridgeRegionNoise = Math.abs(tiledSimplex(z * 2, x * 2, 0, 0.25 * WORLD_SIZE, 0, 0.25 * WORLD_SIZE));

      let isBridgeBlock = false;

      const landHeight = getLandHeight(terrainHeight, plateauHeight);
      const isPlateau = plateauHeight < terrainHeight;

      const isOverWater = landHeight < WATER_LEVEL + 1;
      const isPeak =
        hasPeaks &&
        !isPlateau &&
        peakHeight >= terrainHeight &&
        terrainHeight > minTerrainHeightForPeaks &&
        !isOverWater &&
        y <= peakHeight;

      let isOverhangGap = false;

      if (!isPeak && y < landHeight - 1) {
        // Overhang should not cut out plateau floors
        isOverhangGap = getIsEdge(x, z, landHeight) && (plateauHeight < terrainHeight || y > plateauHeight);
      }

      const isMaybeBridge = bridgeRegionNoise < 0.1;

      if (isMaybeBridge) {
        const bridgeHeight = Math.max(
          getBridgeHeight(x, z),
          isPlateau ? getSmoothedPlateauHeight(x, z) : landHeight * 0.66
        );

        isBridgeBlock = y <= bridgeHeight;

        if (isBridgeBlock) {
          isOverhangGap = false;
        }
      }

      const isLandBlock = y <= landHeight && !isOverhangGap;

      let isDropoff = false;

      // Check for edge color treatment
      if (isLandBlock && !isPeak && y < landHeight - 1) {
        for (let i = -1; i <= 1; i += 1) {
          for (let j = -1; j <= 1; j += 1) {
            if (i !== 0 && j !== 0) {
              let cx = x + i;
              let cz = z + j;

              const terrainHeight = getTerrainHeight(cx, cz);
              const plateauHeight = getTerrainHeight(cx, cz);
              let h = getLandHeight(terrainHeight, plateauHeight);

              // If we're next to an overhang, skip a column to see if its a dropoff.
              if (getIsEdge(cx, cz, h)) {
                cx += i;
                cz += j;

                h = getLandHeight(getTerrainHeight(cx, cz), getPlateauHeight(cx, cz));
              }

              // Make sure plateau ground under overhands are not considered dropoff
              isDropoff = h < landHeight - minEdgeDropoff && !(plateauHeight < terrainHeight && y > plateauHeight);
            }

            if (isDropoff) break;
          }

          if (isDropoff) break;
        }
      }

      const voxel = {
        type: types.air,
        color: { r: 0, g: 0, b: 0 },
        low_lod_color: { r: 0, g: 0, b: 0 }, // Color for lower LODs
        palette: VOXEL_PALETTE_NONE
      };

      if (isLandBlock || isBridgeBlock || isPeak) {
        voxel.type = types.dirt;
        let palette,
          cy = y;
        if (isLandBlock || isBridgeBlock) {
          palette = isDropoff ? palettes.edge : palettes.terrain;
        } else if (isPeak) {
          palette = palettes.terrain;
          cy = Math.min(maxHeight, y * 1.25);
        }
        voxel.color = computeColor(cy, palette);
        voxel.low_lod_color = computeColor(cy, palette, true);
        voxel.palette = palette == palettes.terrain ? VOXEL_PALETTE_GROUND : VOXEL_PALETTE_EDGE;
      }

      const aboveIsField = voxel.type === types.dirt && isPlateau && Math.abs(simplex2DNoise(x, z)) < 0.05;
      if ((y + 256) % 64 < 63) {
        // mod 64 because we presume generator is just doing one chunk, plus 4 to deal with negatives
        // assume the world is 8x8 chunks
        const fieldCacheKey = ((x + 256) % 64) * 64 * 64 + (((y + 256) % 64) + 1) * 64 + ((z + 256) % 64);
        fieldCache[fieldCacheKey] = aboveIsField ? 1 : 0;
      }

      return [voxel, terrainHeight, plateauHeight];
    };

    return {
      feature: (x, y, z, type) => {
        if (y <= WATER_LEVEL) return false;
        if (type !== types.air) return false;

        const fieldCacheKey = ((x + 256) % 64) * 64 * 64 + ((y + 256) % 64) * 64 + ((z + 256) % 64);
        return fieldCache[fieldCacheKey] === 1 ? features.field : false;
      },

      terrain: (x, y, z) => terrain(x, y, z)[0]
    };
  },
  hilly({ seed, palettes, types }) {
    const simplex4DNoise = createNoise4D(random.clone(seed).uniform());
    const simplex2DNoise = createNoise2D(random.clone(seed).uniform());
    const computeColor = getComputeColor(seed);
    const thCache = new Map();

    const maxHeight = Chunk.maxHeight - 35;

    const tiledSimplex = (x, z, x1, x2, z1, z2) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const s = x / WORLD_SIZE;
      const t = z / WORLD_SIZE;
      const nx = x1 + (Math.cos(s * 2 * Math.PI) * dx) / (2 * Math.PI);
      const nz = z1 + (Math.cos(t * 2 * Math.PI) * dz) / (2 * Math.PI);
      const na = x1 + (Math.sin(s * 2 * Math.PI) * dx) / (2 * Math.PI);
      const nb = z1 + (Math.sin(t * 2 * Math.PI) * dz) / (2 * Math.PI);
      const val = Math.abs(simplex4DNoise(nx, nz, na, nb));
      return val;
    };

    const getTerrainHeight = (x, z) => {
      const cacheKey = Math.floor(x) * 10000 + Math.floor(z);
      if (thCache.has(cacheKey)) {
        return thCache.get(cacheKey);
      }
      const h = Math.min(
        Math.abs(tiledSimplex(x, z, 0, WORLD_SIZE * 0.5, 0, WORLD_SIZE * 0.5)) * 2.0 * maxHeight,
        maxHeight
      );
      thCache.set(cacheKey, h);
      return h;
    };

    const terrain = (x, y, z) => {
      const terrainHeight = getTerrainHeight(x, z);
      const landHeight = terrainHeight; //getLandHeight(terrainHeight, plateauHeight);

      const isLandBlock = y <= landHeight;

      const voxel = {
        type: types.air,
        color: { r: 0, g: 0, b: 0 },
        low_lod_color: { r: 0, g: 0, b: 0 }, // Color for lower LODs
        palette: VOXEL_PALETTE_NONE
      };

      if (isLandBlock) {
        voxel.type = types.dirt;

        const palette = palettes.terrain;

        voxel.color = computeColor(y, palette);
        voxel.low_lod_color = computeColor(y, palette, true);
        voxel.palette = VOXEL_PALETTE_GROUND;
      }

      return [voxel];
    };

    // Returns true if it's flat terrain in all directions of dist 3
    const isFlat = (x, y, z, dist = 3) => {
      // Check air around
      for (let i = -dist; i <= dist; i += 1) {
        for (let j = -dist; j <= dist; j += 1) {
          const cx = x + i;
          const cz = z + j;
          const [voxel] = terrain(cx, y, cz);

          if (voxel.type !== types.air) return false;
        }
      }

      // Check dirt below
      for (let i = -dist; i <= dist; i += 1) {
        for (let j = -dist; j <= dist; j += 1) {
          const cx = x + i;
          const cz = z + j;
          const [voxel] = terrain(cx, y - 1, cz);

          if (voxel.type !== types.dirt) return false;
        }
      }

      return true;
    };

    return {
      feature: (x, y, z, type) => {
        if (y <= WATER_LEVEL) return false;
        if (type !== types.air) return false;
        const [{ type: belowVoxelType }] = terrain(x, y - 1, z);

        if (belowVoxelType !== types.dirt) return false;

        // Field element (grass, etc)
        // Rendered on client via instancing
        const w = Math.abs(simplex2DNoise(x, z));
        if (w < 0.05 && isFlat(x, y, z, 3)) {
          return features.field;
        }

        return false;
      },

      terrain: (x, y, z) => terrain(x, y, z)[0]
    };
  },
  flat({ seed, palettes, types }) {
    const computeColor = getFixedColor();
    const worldHeight = WATER_LEVEL + 1;
    const simplex2DNoise = createNoise2D(random.clone(seed).uniform());

    const terrain = (x, y) => {
      const isBlock = y <= worldHeight;
      return {
        type: isBlock ? types.dirt : types.air,
        color: isBlock ? computeColor(y, palettes.terrain) : { r: 0, g: 0, b: 0 },
        low_lod_color: isBlock ? computeColor(y, palettes.terrain) : { r: 0, g: 0, b: 0 },
        palette: isBlock ? VOXEL_PALETTE_GROUND : VOXEL_PALETTE_NONE
      };
    };
    return {
      terrain,
      feature: (x, y, z, type) => {
        if (y <= WATER_LEVEL) return false;
        if (type !== types.air) return false;
        const { type: belowVoxelType } = terrain(x, y - 1, z);

        if (belowVoxelType !== types.dirt) return false;

        // Field element (grass, etc)
        // Rendered on client via instancing
        const w = Math.abs(simplex2DNoise(x, z));
        if (w < 0.05) {
          return features.field;
        }

        return false;
      }
    };
  }
};

export default ({ blockTypes: types, generator, palettes, seed }) => {
  if (Generators[generator]) {
    generator = Generators[generator]({ types, seed, palettes });
  } else {
    console.error(`Couldn't find the generator "${generator}".\n`);
    process.exit(1);
  }
  return {
    ...generator,
    seed,
    types
  };
};

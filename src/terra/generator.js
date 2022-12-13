import seedrandom from "seedrandom";
import random from "random";
import Chunk from "./chunk";
import loadFastNoiseModule from "./FastNoise";
import fastnoiseWasm from "../wasm/fastnoise-wasm.js";
import { WORLD_SIZE, WATER_LEVEL, VOXEL_PALETTE_NONE, VOXEL_PALETTE_GROUND, VOXEL_PALETTE_EDGE } from "./constants";

let FastNoise;

loadFastNoiseModule({
  instantiateWasm: (imports, cb) => WebAssembly.instantiate(fastnoiseWasm, imports).then(({ instance }) => cb(instance))
}).then(module => {
  FastNoise = module.FastNoise;
});

const { features } = Chunk;

random.use(seedrandom("base"));

const getFixedColor = () => {
  return (noise, x, y, z, map) => {
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
  const colorRng = random.clone(seedrandom(seed)).normal(0, 0.02);
  const belowWaterRng = random.clone(seedrandom(seed)).normal(0, 0.005);

  return (noise, x, y, z, map, disableNoise = false) => {
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

const { maxHeight } = Chunk;
const oneOverWorldSize = 1.0 / WORLD_SIZE;
const twoPi = 2 * Math.PI;
const oneOverTwoPi = 1.0 / twoPi;
const peakOffset = Math.floor(WORLD_SIZE * 0.33);
const plateauD = Math.floor(WORLD_SIZE * 0.15);
const terrainD = Math.floor(WORLD_SIZE * 0.25);
const bridgeOffsetXZ = Math.floor(WORLD_SIZE * 0.2);
const bridgeOffsetD = Math.floor(WORLD_SIZE * 0.5);
const plateauStepSize = 0.3;
const oneOverPlateauStepSize = 1.0 / plateauStepSize;
const oneOverTwoMaxHeight = 1.0 / (Chunk.maxHeight * 2.0);
const waterLevel = WATER_LEVEL;
const waterLevelOverThree = WATER_LEVEL / 3;
const paletteNone = VOXEL_PALETTE_NONE;
const paletteGround = VOXEL_PALETTE_GROUND;
const paletteEdge = VOXEL_PALETTE_EDGE;
const blackColor = { r: 0, g: 0, b: 0 };

const COS_TABLE = new Float32Array(1024);
const SIN_TABLE = new Float32Array(1024);

const oneOverWorldSizeTimesTwoPi = oneOverWorldSize * twoPi;
for (let x = -512; x < 512; x++) {
  SIN_TABLE[x + 512] = Math.sin(x * oneOverWorldSizeTimesTwoPi);
  COS_TABLE[x + 512] = Math.cos(x * oneOverWorldSizeTimesTwoPi);
}

const Generators = {
  islands({ seed, palettes, types }) {
    const thCache = new Float32Array(1024 * 1024);
    const fieldSet = new Set();

    const noise = new FastNoise(seed);
    const computeColor = getComputeColor(seed);

    const tiledSimplex = (x, z, x1, x2, z1, z2) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const nx = x1 + COS_TABLE[x + 512] * dx * oneOverTwoPi;
      const nz = z1 + COS_TABLE[z + 512] * dz * oneOverTwoPi;
      const na = x1 + SIN_TABLE[x + 512] * dx * oneOverTwoPi;
      const nb = z1 + SIN_TABLE[z + 512] * dz * oneOverTwoPi;
      const v = noise.simplex4D(nx, nz, na, nb);
      return v < 0 ? -v : v;
    };

    const getPlateauHeight = (x, z) => {
      return (
        Math.floor(tiledSimplex(x, z, 0, plateauD, 0, plateauD) * oneOverPlateauStepSize) * maxHeight * plateauStepSize
      );
    };

    const getSmoothedPlateauHeight = (x, z) => {
      return Math.abs(tiledSimplex(x, z, 0, plateauD, 0, plateauD)) * maxHeight * 0.66;
    };

    const getTerrainHeight = (x, z) => {
      // Terrain can reach past edge of chunkspace
      const cacheKey = ((x + 512) << 10) | (z + 512);
      const v = thCache[cacheKey];

      if (v !== 0) return v;
      const h = Math.min(tiledSimplex(x, z, 0, bridgeOffsetD, 0, bridgeOffsetD) * 2.0 * maxHeight, maxHeight);
      thCache[cacheKey] = h;
      return h;
    };

    const getPeakHeight = (x, z) => {
      const h = getTerrainHeight(x + peakOffset, z + peakOffset) * oneOverTwoMaxHeight + 0.8;
      return Math.min(h * h * h * h * h * h * h * h * maxHeight * 0.25, maxHeight * 0.75);
    };

    const getBridgeHeight = (x, z) => {
      const h = Math.min(
        tiledSimplex(x + bridgeOffsetXZ, z + bridgeOffsetXZ, 0, bridgeOffsetD, 0, bridgeOffsetD) * maxHeight * 0.2,
        maxHeight * 0.2
      );
      return Math.max(h, waterLevel) + 3;
    };

    const getLandHeight = (terrainHeight, plateauHeight) =>
      Math.min(Math.min(terrainHeight, plateauHeight) + waterLevelOverThree, maxHeight);

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

      const bridgeRegionNoise = Math.abs(tiledSimplex(z * 2, x * 2, 0, terrainD, 0, terrainD));

      let isBridgeBlock = false;

      const landHeight = getLandHeight(terrainHeight, plateauHeight);
      const isPlateau = plateauHeight < terrainHeight;

      const isOverWater = landHeight < waterLevel + 1;
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
        color: blackColor,
        low_lod_color: blackColor, // Color for lower LODs
        palette: paletteNone
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
        voxel.color = computeColor(noise, x, cy, z, palette);
        voxel.low_lod_color = computeColor(noise, x, cy, z, palette, true);
        voxel.palette = palette == palettes.terrain ? paletteGround : paletteEdge;
      }

      const aboveIsField = voxel.type === types.dirt && isPlateau && Math.abs(noise.whiteNoise2D(x, z)) < 0.05;

      if (aboveIsField) {
        const fieldSetKey = x * 512 * 512 + (y + 1) * 512 + z;
        fieldSet.add(fieldSetKey);
      }

      return [voxel, terrainHeight, plateauHeight];
    };

    return {
      feature: (x, y, z, type) => {
        if (y <= waterLevel) return false;
        if (type !== types.air) return false;

        const fieldSetKey = x * 512 * 512 + y * 512 + z;
        return fieldSet.has(fieldSetKey) ? features.field : false;
      },

      terrain: (x, y, z) => terrain(x, y, z)[0]
    };
  },
  hilly({ seed, palettes, types }) {
    const noise = new FastNoise(seed);
    const computeColor = getComputeColor(seed);
    const thCache = new Float32Array(1024 * 1024);

    const maxHeight = Chunk.maxHeight - 35;

    const tiledSimplex = (x, z, x1, x2, z1, z2) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const nx = x1 + COS_TABLE[x + 512] * dx * oneOverTwoPi;
      const nz = z1 + COS_TABLE[z + 512] * dz * oneOverTwoPi;
      const na = x1 + SIN_TABLE[x + 512] * dx * oneOverTwoPi;
      const nb = z1 + SIN_TABLE[z + 512] * dz * oneOverTwoPi;
      const v = noise.simplex4D(nx, nz, na, nb);
      return v < 0 ? -v : v;
    };

    const getTerrainHeight = (x, z) => {
      // Terrain can reach past edge of chunkspace
      const cacheKey = ((x + 512) << 10) | (z + 512);
      const v = thCache[cacheKey];

      if (v !== 0) return v;
      const h =
        waterLevel +
        1 +
        Math.min(Math.abs(tiledSimplex(x, z, 0, bridgeOffsetD, 0, bridgeOffsetD)) * 2.0 * maxHeight, maxHeight);
      thCache[cacheKey] = h;
      return h;
    };

    const terrain = (x, y, z) => {
      const terrainHeight = getTerrainHeight(x, z);
      const landHeight = terrainHeight; //getLandHeight(terrainHeight, plateauHeight);

      const isLandBlock = y <= landHeight;

      const voxel = {
        type: types.air,
        color: blackColor,
        low_lod_color: blackColor, // Color for lower LODs
        palette: paletteNone
      };

      if (isLandBlock) {
        voxel.type = types.dirt;

        const palette = palettes.terrain;

        voxel.color = computeColor(noise, x, y, z, palette);
        voxel.low_lod_color = computeColor(noise, x, y, z, palette, true);
        voxel.palette = paletteGround;
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
        if (y <= waterLevel) return false;
        if (type !== types.air) return false;
        const [{ type: belowVoxelType }] = terrain(x, y - 1, z);

        if (belowVoxelType !== types.dirt) return false;

        // Field element (grass, etc)
        // Rendered on client via instancing
        const w = Math.abs(noise.whiteNoise2D(x, z));
        if (w < 0.05 && isFlat(x, y, z, 3)) {
          return features.field;
        }

        return false;
      },

      terrain: (x, y, z) => terrain(x, y, z)[0]
    };
  },
  plains({ seed, palettes, types }) {
    const computeColor = getFixedColor();
    const noise = new FastNoise(seed);
    const worldHeight = waterLevel + 1;
    const terrain = (x, y, z) => {
      const isBlock = y <= worldHeight;
      return {
        type: isBlock ? types.dirt : types.air,
        color: isBlock ? computeColor(noise, x, y, z, palettes.terrain) : { r: 0, g: 0, b: 0 },
        low_lod_color: isBlock ? computeColor(noise, x, y, z, palettes.terrain) : { r: 0, g: 0, b: 0 },
        palette: isBlock ? VOXEL_PALETTE_GROUND : VOXEL_PALETTE_NONE
      };
    };
    return {
      terrain,
      feature: (x, y, z, type) => {
        if (y <= waterLevel) return false;
        if (type !== types.air) return false;
        const { type: belowVoxelType } = terrain(x, y - 1, z);

        if (belowVoxelType !== types.dirt) return false;

        // Field element (grass, etc)
        // Rendered on client via instancing
        const w = Math.abs(noise.whiteNoise2D(x, z));
        if (w < 0.05) {
          return features.field;
        }

        return false;
      }
    };
  },
  flat({ seed, palettes, types }) {
    const computeColor = getFixedColor();
    const noise = new FastNoise(seed);
    const worldHeight = waterLevel + 1;
    const terrain = (x, y, z) => {
      const isBlock = y <= worldHeight;
      return {
        type: isBlock ? types.dirt : types.air,
        color: isBlock ? computeColor(noise, x, y, z, palettes.terrain) : { r: 0, g: 0, b: 0 },
        low_lod_color: isBlock ? computeColor(noise, x, y, z, palettes.terrain) : { r: 0, g: 0, b: 0 },
        palette: isBlock ? VOXEL_PALETTE_GROUND : VOXEL_PALETTE_NONE
      };
    };
    return {
      terrain,
      feature: () => false
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

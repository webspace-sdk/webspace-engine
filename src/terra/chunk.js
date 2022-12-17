import Mesher from "./mesher";
import seedrandom from "seedrandom";
import random from "random";
import { VOXEL_PALETTE_NONE } from "./constants";

class Chunk {
  constructor({ x, z, world }) {
    this.x = x;
    this.z = z;
    this.world = world;
    this.generate();
  }

  get(x, z) {
    const { size } = Chunk;
    const { world } = this;
    let chunk = this;
    const nx = x < 0 || x >= size ? Math.floor(x / size) : 0;
    const nz = z < 0 || z >= size ? Math.floor(z / size) : 0;
    if (nx || nz) {
      chunk = world.getChunk({
        x: this.x + nx,
        z: this.z + nz
      });
      x -= size * nx;
      z -= size * nz;
    }
    return { chunk, cx: x, cz: z };
  }

  static getVoxel(x, y, z) {
    const { fields, maxHeight, size } = Chunk;
    return (x * size * maxHeight + y * size + z) * fields.count;
  }

  generate() {
    const { fields, getVoxel, maxHeight, size } = Chunk;
    const {
      world: { generator }
    } = this;
    const offset = { x: this.x * size, z: this.z * size };
    const voxels = new Uint8Array(size * size * maxHeight * fields.count);
    const features = [];

    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y < maxHeight; y += 1) {
        for (let z = 0; z < size; z += 1) {
          const { type, color, low_lod_color, palette } = generator.terrain(offset.x + x, y, offset.z + z);
          const voxel = getVoxel(x, y, z);
          voxels[voxel] = type;
          voxels[voxel + fields.r] = color.r;
          voxels[voxel + fields.g] = color.g;
          voxels[voxel + fields.b] = color.b;
          voxels[voxel + fields.lr] = low_lod_color.r;
          voxels[voxel + fields.lg] = low_lod_color.g;
          voxels[voxel + fields.lb] = low_lod_color.b;
          voxels[voxel + fields.palette] = palette;

          if (generator.feature) {
            const types = generator.feature(offset.x + x, y, offset.z + z, type);

            if (types) {
              features.push({
                types,
                x,
                y,
                z
              });
            }
          }
        }
      }
    }
    this.voxels = voxels;
    this.features = features;
    this.generateHeightmap();
  }

  generateHeightmap() {
    const { getVoxel, maxHeight, featureHeights, size } = Chunk;
    const {
      voxels,
      features,
      world: {
        generator: { types }
      }
    } = this;
    let height = 0;
    const heightmap = new Uint8Array(size ** 2);

    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        for (let y = maxHeight - 1; y >= 0; y -= 1) {
          if (y === 0 || voxels[getVoxel(x, y, z)] !== types.air) {
            height = Math.max(y, height);
            heightmap[x * size + z] = y;
            break;
          }
        }
      }
    }

    for (const { types, y } of features) {
      for (const [type, featureHeight] of Object.entries(featureHeights)) {
        if (types & parseInt(type)) {
          height = Math.max(height, y + featureHeight);
        }
      }
    }

    this.height = height;
    this.heightmap = heightmap;
  }

  remesh(seed, models) {
    const { subchunks } = Chunk;
    this.meshes = [];

    for (let subchunk = 0; subchunk < subchunks; subchunk += 1) {
      this.meshSubChunk(subchunk, seed, models);
    }

    this.needsPersistence = true;
  }

  meshSubChunk(subchunk, seed, models) {
    const { getVoxel, fields, maxHeight, subchunks, size } = Chunk;
    const {
      world: {
        generator: { types }
      }
    } = this;
    const bottom = { type: types.dirt };
    const top = { type: types.air };
    const black = { r: 0, g: 0, b: 0 };
    const chunkMaxY = this.height + 1;
    this.meshes[subchunk] = Mesher({
      models,
      chunkSize: size,
      chunkSubchunks: subchunks,
      getFeatures: () => this.features,
      getRng: () => {
        random.use(seedrandom(seed));
        return random;
      },
      getSplitKey: (x, y, z, low = false) => {
        if (y < 0) return 0;
        if (y > maxHeight) return 0;
        const { chunk, cx, cz } = this.get(x, z);
        const voxel = getVoxel(cx, y, cz);

        const r = chunk.voxels[voxel + (low ? fields.lr : fields.r)];
        const g = chunk.voxels[voxel + (low ? fields.lg : fields.g)];
        const b = chunk.voxels[voxel + (low ? fields.lb : fields.b)];

        if (chunk.voxels[voxel] === types.air) {
          return 0;
        }

        return chunk.voxels[voxel] | (r << 8) | (g << 16) | (b << 24);
      },
      getType: (x, y, z) => {
        if (y < 0) return bottom.type;
        if (y >= maxHeight) return top.type;

        const { chunk, cx, cz } = this.get(x, z);
        const voxel = getVoxel(cx, y, cz);
        return chunk.voxels[voxel];
      },
      getPalette: (x, y, z) => {
        if (y < 0) return VOXEL_PALETTE_NONE;
        if (y >= maxHeight) return VOXEL_PALETTE_NONE;

        const { chunk, cx, cz } = this.get(x, z);
        const voxel = getVoxel(cx, y, cz);
        return chunk.voxels[voxel + fields.palette];
      },
      getColor: (x, y, z, low = false) => {
        if (y < 0) return black;
        if (y >= maxHeight) return black;
        const { chunk, cx, cz } = this.get(x, z);
        const voxel = getVoxel(cx, y, cz);
        return {
          r: chunk.voxels[voxel + (low ? fields.lr : fields.r)],
          g: chunk.voxels[voxel + (low ? fields.lg : fields.g)],
          b: chunk.voxels[voxel + (low ? fields.lb : fields.b)]
        };
      },
      from: { x: 0, y: subchunk * size, z: 0 },
      to: {
        x: size,
        y: Math.min(maxHeight, Math.min((subchunk + 1) * size, subchunk * size + chunkMaxY)),
        z: size
      },
      types
    });
  }
}

Chunk.size = 64;
Chunk.subchunks = 1;
Chunk.maxHeight = 64;
Chunk.fields = {
  r: 1,
  g: 2,
  b: 3,
  lr: 4, // low LOD r, g, b
  lg: 5,
  lb: 6,
  palette: 7,
  count: 8
};
Chunk.features = {
  foilage: 1,
  trim: 1 << 1,
  field: 1 << 2
};
Chunk.featureHeights = {
  1: 45,
  [1 << 1]: 0,
  [1 << 2]: 0
};
Chunk.chunkNeighbors = [
  { x: -1, z: -1 },
  { x: 0, z: -1 },
  { x: 1, z: -1 },
  { x: -1, z: 0 },
  { x: 1, z: 0 },
  { x: -1, z: 1 },
  { x: 0, z: 1 },
  { x: 1, z: 1 }
];
Chunk.voxelNeighbors = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 }
];

export default Chunk;

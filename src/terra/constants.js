export const VOXEL_SIZE = 1 / 8;
export const VOXELS_PER_CHUNK = 64;
export const CHUNK_WORLD_SIZE = VOXELS_PER_CHUNK * VOXEL_SIZE;
export const WORLD_CHUNK_SIZE = 8;
export const WORLD_MAX_COORD = (WORLD_CHUNK_SIZE * CHUNK_WORLD_SIZE) / 2;
export const WORLD_MIN_COORD = -WORLD_MAX_COORD;
export const WORLD_SIZE = (WORLD_MAX_COORD - WORLD_MIN_COORD) * CHUNK_WORLD_SIZE;
export const WATER_LEVEL = 4;
export const VOXEL_PALETTE_NONE = 0;
export const VOXEL_PALETTE_GROUND = 1;
export const VOXEL_PALETTE_EDGE = 2;
export const VOXEL_PALETTE_LEAVES = 3;
export const VOXEL_PALETTE_BARK = 4;
export const VOXEL_PALETTE_ROCK = 5;
export const VOXEL_PALETTE_GRASS = 6;

export const COLLISION_LAYERS = {
  ALL: -1,
  NONE: 0,
  INTERACTABLES: 1,
  ENVIRONMENT: 2,
  AVATAR: 4,
  HANDS: 8,
  PROJECTILES: 16,
  BURSTS: 32,
  DEFAULT_INTERACTABLE: 1 | 2 | 4 | 8 | 16,
  UNOWNED_INTERACTABLE: 1 | 8 | 16,
  ENVIRONMENTAL_VOX: 1 | 16,
  DEFAULT_SPAWNER: 1 | 8
};

export const RENDER_ORDER = {
  LIGHTS: 0, // Render lights first, otherwise compiled programs may not define USE_SHADOWMAP
  HUD_BACKGROUND: 1,
  HUD_ICONS: 2,
  TERRAIN: 10,
  FIELD: 100,
  PHYSICS_DEBUG: 1000,
  VOX: 5000,
  MEDIA: 10000,
  MEDIA_NO_FXAA: 10010, // Render last because of stencil ops
  TOON: 20000, // Render last because of stencil ops
  INSTANCED_AVATAR: 21000, // Render last because of stencil ops
  INSTANCED_BEAM: 22000, // Render last because of stencil ops
  SKY: 100000,
  HELPERS: 200000,
  CURSOR: 300000,
  PICTURE_IN_PICTURE: 350000,

  // Transparent objects:
  WATER: 1
};

export const WORLD_COLOR_TYPES = ["ground", "edge", "leaves", "bark", "rock", "grass", "sky", "water"];

export const BRUSH_TYPES = {
  VOXEL: 0,
  FACE: 1,
  BOX: 2,
  CENTER: 3,
  FILL: 4,
  PICK: 5
};

export const BRUSH_MODES = {
  ADD: 0,
  REMOVE: 1,
  PAINT: 2
};

export const BRUSH_SHAPES = {
  BOX: 0,
  SPHERE: 1
};

export const BRUSH_CRAWL_TYPES = {
  GEO: 0,
  COLOR: 1
};

export const BRUSH_CRAWL_EXTENTS = {
  NSEW: 0,
  ALL: 1
};

export const BRUSH_COLOR_FILL_MODE = {
  SELECTED: 0,
  EXISTING: 1
};

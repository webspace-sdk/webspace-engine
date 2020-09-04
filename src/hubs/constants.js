module.exports = {
  COLLISION_LAYERS: {
    ALL: -1,
    NONE: 0,
    INTERACTABLES: 1,
    ENVIRONMENT: 2,
    AVATAR: 4,
    HANDS: 8,
    DEFAULT_INTERACTABLE: 1 | 2 | 4 | 8,
    UNOWNED_INTERACTABLE: 1 | 8,
    DEFAULT_SPAWNER: 1 | 8
  },
  RENDER_ORDER: {
    HUD_BACKGROUND: 1,
    HUD_ICONS: 2,
    CURSOR: 3,
    TERRAIN: 10,
    FIELD: 100,
    PHYSICS_DEBUG: 1000,
    MEDIA: 10000,
    TOON: 20000, // Render last because of stencil ops
    INSTANCED_AVATAR: 21000, // Render last because of stencil ops
    SKY: 100000,

    // Transparent objects:
    WATER: 1
  }
};

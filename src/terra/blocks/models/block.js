const offset = { x: 0, y: 0, z: 0 };
const size = { x: 8, y: 8 };

const faces = ["top", "bottom", "south", "north", "west", "east"].reduce((faces, facing) => {
  faces[facing] = [
    {
      facing,
      texture: "block",
      offset,
      size
    }
  ];
  return faces;
}, {});

const isVisible = (type, neighbor) =>
  !type.hasCulling || !neighbor.hasCulling || (neighbor.isTransparent && (!type.isTransparent || type !== neighbor));

const empty = [];
export default {
  isVisible,
  faces: ({ neighbors, types, voxel }) => [
    ...(isVisible(types[voxel.type], types[neighbors.top.type]) ? faces.top : empty),
    ...(isVisible(types[voxel.type], types[neighbors.bottom.type]) ? faces.bottom : empty),
    ...(isVisible(types[voxel.type], types[neighbors.south.type]) ? faces.south : empty),
    ...(isVisible(types[voxel.type], types[neighbors.north.type]) ? faces.north : empty),
    ...(isVisible(types[voxel.type], types[neighbors.west.type]) ? faces.west : empty),
    ...(isVisible(types[voxel.type], types[neighbors.east.type]) ? faces.east : empty)
  ],
  hasAO: true,
  hasCulling: true
};

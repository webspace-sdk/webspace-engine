import block from "./block";

const top = {
  offset: { x: 0, y: 0, z: 2 },
  size: { x: 8, y: 8 }
};
const bottom = {
  offset: { x: 0, y: 0, z: 0 },
  size: { x: 8, y: 8 }
};
const side = {
  offset: { x: 0, y: 0, z: 0 },
  size: { x: 8, y: 6 }
};
const faces = [
  { facing: "top", ...top },
  { facing: "bottom", ...bottom },
  { facing: "south", ...side },
  { facing: "north", ...side },
  { facing: "west", ...side },
  { facing: "east", ...side }
].reduce((faces, face) => {
  faces[face.facing] = [
    {
      ...face,
      texture: "block"
    }
  ];
  return faces;
}, {});

const fill = {
  offset: { x: 0, y: 6, z: 8 },
  size: { x: 8, y: 2 }
};
const fillFaces = [
  { facing: "south", ...fill },
  { facing: "north", ...fill },
  { facing: "west", ...fill },
  { facing: "east", ...fill }
].reduce((faces, face) => {
  faces[face.facing] = [
    {
      ...face,
      texture: "block"
    }
  ];
  return faces;
}, {});

const isVisible = (type, neighbor) => !neighbor.hasCulling || (neighbor.isTransparent && type !== neighbor);

const empty = [];
export default {
  name: "Water",
  isVisible,
  faces: ({ neighbors, types, voxel }) => {
    if (neighbors.top.type === voxel.type) {
      return block.faces({ neighbors, types, voxel });
    }
    return [
      ...faces.top,
      ...(isVisible(types[voxel.type], types[neighbors.bottom.type]) ? faces.bottom : empty),
      /* eslint-disable no-nested-ternary */
      ...(isVisible(types[voxel.type], types[neighbors.south.type])
        ? faces.south
        : neighbors.south.type === voxel.type && neighbors.get(0, 1, 1).type === voxel.type
          ? fillFaces.north
          : empty),
      ...(isVisible(types[voxel.type], types[neighbors.north.type])
        ? faces.north
        : neighbors.north.type === voxel.type && neighbors.get(0, 1, -1).type === voxel.type
          ? fillFaces.south
          : empty),
      ...(isVisible(types[voxel.type], types[neighbors.west.type])
        ? faces.west
        : neighbors.west.type === voxel.type && neighbors.get(-1, 1, 0).type === voxel.type
          ? fillFaces.east
          : empty),
      ...(isVisible(types[voxel.type], types[neighbors.east.type])
        ? faces.east
        : neighbors.east.type === voxel.type && neighbors.get(1, 1, 0).type === voxel.type
          ? fillFaces.west
          : empty)
      /* eslint-enable no-nested-ternary */
    ];
  },
  hasAO: false,
  hasCulling: true,
  isTransparent: true,
  textures: {}
};

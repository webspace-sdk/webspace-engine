export function* generateAllWalkableMeshesWithinXZ(origin, xMargin = 0, zMargin = 0) {
  for (const mesh of SYSTEMS.voxSystem.generateWalkableMeshesWithinXZ(origin, xMargin, zMargin)) {
    yield mesh;
  }
}

const walkableModels = [];

export function addWalkableModel(model) {
  if (walkableModels.indexOf(model) === -1) {
    walkableModels.push(model);
  }
}

export function removeWalkableModel(model) {
  const index = walkableModels.indexOf(model);
  if (index !== -1) {
    walkableModels.splice(index, 1);
  }
}

const bbox = new THREE.Box3();

export function* getAllWalkableMeshesWithinXZ(origin, xMargin = 0, zMargin = 0) {
  for (const mesh of SYSTEMS.voxSystem.getWalkableMeshesWithinXZ(origin, xMargin, zMargin)) {
    yield mesh;
  }

  for (const model of walkableModels) {
    bbox.setFromObject(model);

    if (
      origin.x < bbox.min.x - xMargin ||
      origin.x > bbox.max.x + xMargin ||
      origin.z < bbox.min.z - zMargin ||
      origin.z > bbox.max.z + zMargin
    )
      continue;

    yield model;
  }
}

// Efficiently raycast to search for walls at knee-height of all walkable sources.
// sources and avoiding extra raycasts. Casts along a walk direction.
//
// We sample several ray directions to basically "sweep" the walk direction looking for any
// surfaces that could block the walk direction. This is necessary for things like stone walls
// that have crevices.
//
// For each surface we keep projecting a new walk direction onto that plane, carving down the
// possible walk direction that is compatible with all of them.
export const projectWalkDirectionOnToNearbyWalls = (function() {
  const instanceIntersects = [];
  const raycaster = new THREE.Raycaster();
  const normalizedWalkDirection = new THREE.Vector3();
  const finalWalkDirection = new THREE.Vector3();
  const worldFaceNormal = new THREE.Vector3();
  raycaster.firstHitOnly = true; // flag specific to three-mesh-bvh
  raycaster.near = 0.01;
  raycaster.far = 0.75; // Add a little buffer for avatar body + cel shading

  return function(origin, walkDirection) {
    let sawIntersection = false;
    normalizedWalkDirection.copy(walkDirection).normalize();
    finalWalkDirection.copy(walkDirection).normalize();
    raycaster.ray.origin.copy(origin);

    for (const mesh of getAllWalkableMeshesWithinXZ(origin, 1, 1)) {
      for (let dX = -0.5; dX <= 0.5; dX += 0.5) {
        for (let dZ = -0.5; dZ <= 0.5; dZ += 0.5) {
          raycaster.ray.direction.copy(normalizedWalkDirection);
          raycaster.ray.direction.x += raycaster.ray.direction.x * dX;
          raycaster.ray.direction.z += raycaster.ray.direction.z * dZ;

          raycaster.ray.direction.normalize();

          raycaster.intersectObject(mesh, true, instanceIntersects);

          if (instanceIntersects.length === 0) continue;

          sawIntersection = true;

          for (const intersection of instanceIntersects) {
            worldFaceNormal.copy(intersection.face.normal);
            intersection.object.updateMatrices();
            worldFaceNormal.transformDirection(intersection.object.matrixWorld);

            if (worldFaceNormal.dot(normalizedWalkDirection) < 0) {
              finalWalkDirection.projectOnPlane(worldFaceNormal);
              finalWalkDirection.normalize();
            }
          }

          instanceIntersects.length = 0;
        }
      }
    }

    return sawIntersection ? finalWalkDirection : null;
  };
})();

// Efficiently raycast to the closest walkable source, skipping non-walkable
// sources and avoiding extra raycasts. Only can cast up or down, so we can use
// bounding box to quickly cull as well.
export const raycastVerticallyToClosestWalkableSource = (function() {
  const instanceIntersects = [];
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true; // flag specific to three-mesh-bvh
  raycaster.near = 0.01;
  raycaster.far = 40;
  raycaster.ray.direction.set(0, 1, 0);

  return function(origin, up = true, backSide = false) {
    let intersection = null;

    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.y = up ? 1 : -1;

    let side = null;

    for (const mesh of getAllWalkableMeshesWithinXZ(origin)) {
      if (mesh.material && backSide) {
        side = mesh.material.side;
        mesh.material.side = THREE.BackSide;
      }

      raycaster.intersectObject(mesh, true, instanceIntersects);

      if (side !== null) {
        mesh.material.side = side;
        side = null;
      }

      if (instanceIntersects.length === 0) continue;

      const newIntersection = instanceIntersects[0];

      if (intersection === null || intersection.distance > newIntersection.distance) {
        intersection = newIntersection;
      }

      instanceIntersects.length = 0;
    }

    return intersection;
  };
})();

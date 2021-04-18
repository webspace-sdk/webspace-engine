const MAX_FRAMES_PER_VOX = 32;
const MAX_INSTANCES_PER_VOX_ID = 255;

// Manages user-editable voxel objects
export class VoxSystem {
  constructor(sceneEl, cursorTargettingSystem) {
    this.sceneEl = sceneEl;
    this.syncs = new Map();
    this.voxMap = new Map();
    this.sourceToVoxId = new Map();
    this.cursorSystem = cursorTargettingSystem;
  }

  tick() {
    const { voxMap } = this;
    const cursor = this.cursorSystem.rightRemote && this.cursorSystem.rightRemote.components["cursor-controller"];
    const intersection = cursor && cursor.intersection;
    const hitObject = intersection && intersection.object;

    for (const { sources, maxRegisteredIndex } of voxMap.values()) {
      for (let i = 0; i <= maxRegisteredIndex; i++) {
        const source = sources[i];
        if (source === null) continue;

        if (hitObject && hitObject.parent === source) {
          // TODO optimize
          const inv = new THREE.Matrix4();
          hitObject.updateMatrices(true, true);
          inv.getInverse(hitObject.matrixWorld);
          const p = new THREE.Vector3();
          p.copy(intersection.point);
          p.applyMatrix4(inv);

          console.log(p);
        }
      }
    }

    //const hitTarget = intersection && intersection.target;
    //console.log(hitTarget);
  }

  async register(voxId, source) {
    const { voxMap, sourceToVoxId } = this;

    if (!voxMap.has(voxId)) {
      voxMap.set(voxId, {
        maxRegisteredIndex: -1,
        sourceToIndex: new Map(),
        meshes: Array(MAX_FRAMES_PER_VOX).fill(null),
        sources: Array(MAX_INSTANCES_PER_VOX_ID).fill(null)
      });
    }

    // TODO frustum check
    const voxEntry = voxMap.get(voxId);
    const { maxRegisteredIndex, sources, sourceToIndex } = voxEntry;

    const instanceIndex = maxRegisteredIndex + 1; // TODO generate mesh here
    sources[instanceIndex] = source;
    sourceToIndex.set(source, instanceIndex);
    sourceToVoxId.set(source, voxId);
    voxEntry.maxRegisteredIndex = Math.max(instanceIndex, maxRegisteredIndex);
  }

  unregister(source) {
    const { voxMap, sourceToVoxId } = this;
    if (!sourceToVoxId.has(source)) return;

    const voxId = sourceToVoxId.get(source);
    sourceToVoxId.delete(source);

    const voxEntry = voxMap.get(voxId);
    const { maxRegisteredIndex, sourceToIndex, sources } = voxEntry;

    if (!sourceToIndex.has(source)) return;
    const instanceIndex = sourceToIndex.get(source);
    sources[instanceIndex] = null;
    sourceToIndex.delete(source);

    if (instanceIndex === maxRegisteredIndex) {
      voxEntry.maxRegisteredIndex--;
    }
  }
}

const { InstancedMesh, Matrix4 } = THREE;

function DynamicInstancedMesh(geometry, material, maxCount) {
  InstancedMesh.call(this, geometry, material, maxCount);

  this.count = 0;
  this.nextIndex = 0;
  this.matrixAutoUpdate = false;
  this.frustumCulled = false;
  this.freeIndices = new Set();
}

const zeroMatrix = new Matrix4();
zeroMatrix.makeScale(0, 0, 0);

DynamicInstancedMesh.prototype = Object.assign(Object.create(InstancedMesh.prototype), {
  constructor: DynamicInstancedMesh,

  addMatrix(matrix) {
    const { nextIndex, freeIndices } = this;
    let index;

    if (freeIndices.size > 0) {
      index = freeIndices.values().next().value;
      freeIndices.delete(index);
    } else {
      index = nextIndex;
      this.count++;
    }

    matrix.toArray(this.instanceMatrix.array, index * 16);
    this.instanceMatrix.needsUpdate = true;

    if (index === nextIndex) {
      this.nextIndex += 1;
    }

    return index;
  },

  removeMatrix(index) {
    const { instanceMatrix, freeIndices } = this;
    zeroMatrix.toArray(instanceMatrix.array, index * 16);
    instanceMatrix.needsUpdate = true;
    freeIndices.add(index);
  },

  setColorAt() {
    throw new Error("dynamic color instancing not supported");
  }
});

export { DynamicInstancedMesh };

const { BufferAttribute, InstancedMesh, Matrix4 } = THREE;

const GROWTH_RATE = 1.3;

function DynamicInstancedMesh(geometry, material) {
  InstancedMesh.call(this, geometry, material, 1);

  this.nextIndex = 0;
  this.matrixAutoUpdate = false;
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
    }

    if (this.instanceMatrix.array.length <= index * 16) {
      // Need to grow array
      this.count = Math.max(index + 1, Math.floor((this.instanceMatrix.array.length / 16) * GROWTH_RATE));

      const arr = new Float32Array(this.count * 16);
      arr.set(this.instanceMatrix.array); // Copy existing
      this.instanceMatrix = new BufferAttribute(arr, 16);
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
  } //,

  //setColorAt() {
  //  throw new Error("dynamic color instancing not supported");
  //}
});

export { DynamicInstancedMesh };

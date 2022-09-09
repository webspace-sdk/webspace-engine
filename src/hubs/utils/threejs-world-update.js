// When world matrices are updated, we flip 8 bits to one and then they can
// be consumed by various subsystems.
export const WORLD_MATRIX_CONSUMERS = {
  PHYSICS: 0,
  BEAMS: 1,
  VOX: 2,
  AVATARS: 3
};

// New function to set the matrix properly
THREE.Object3D.prototype.setMatrix = function(matrix) {
  this.matrixWorldNeedsUpdate = true;
  this.matrix.copy(matrix);
  this.matrix.decompose(this.position, this.quaternion, this.scale);
};

// Pass a system (like WORLD_MATRIX_CONSUMERS.PHYSICS) to get true or false
// if the world matrix has changed since last consumption.
THREE.Object3D.prototype.consumeIfDirtyWorldMatrix = function(system) {
  const mask = 0x1 << system;

  if ((this.worldMatrixConsumerFlags & mask) === 0) {
    this.worldMatrixConsumerFlags |= mask;
    return true;
  }

  return false;
};

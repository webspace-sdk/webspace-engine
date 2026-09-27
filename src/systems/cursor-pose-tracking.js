export class CursorPoseTrackingSystem {
  constructor() {
    this.pairs = [];
  }
  register(object3D, path) {
    this.pairs.push({ object3D, path });
  }
  unregister(object3D) {
    this.pairs = this.pairs.filter(p => p.object3D !== object3D);
  }
  tick() {
    for (let i = 0; i < this.pairs.length; i++) {
      const matrix = AFRAME.scenes[0].systems.userinput.get(this.pairs[i].path);
      if (matrix) {
        const o = this.pairs[i].object3D;
        matrix.decompose(o.position, o.quaternion, o.scale);
        // updateMatrix() (rather than just flagging matrixIsModified) gives the object its own matrixWorld: until
        // then it shares its parent's by reference, and writing the pose into it would move the whole avatar rig.
        o.updateMatrix();
      }
    }
  }
}

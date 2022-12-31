import { TRANSFORM_MODE } from "./transform-selected-object";
import { paths } from "./userinput/paths";

AFRAME.registerSystem("scale-object", {
  init() {
    this.isScaling = false;
    this.initialObjectScale = new THREE.Vector3();
    this.initialObjectMatrix = new THREE.Matrix4();
    this.desiredObjectScale = new THREE.Vector3();
    this.deltaScale = new THREE.Vector3();
    this.objectMatrix = new THREE.Matrix4();
    this.currentObjectScale = new THREE.Vector3();
    this.userinput = null;
    this.dy = 0;

    this.startScaling = (object, hand) => {
      if (this.isScaling) return;
      this.dy = 0;

      this.objectToScale = object;
      this.objectToScale.updateMatrices();

      this.isScaling = true;
      this.initialObjectScale.setFromMatrixScale(this.objectToScale.matrix);
      this.initialObjectMatrix.copy(this.objectToScale.matrix);
      window.APP.store.handleActivityFlag("scaled");

      // TODO: Refactor transform-selected-object system so this isn't so awkward
      this.transformSelectedObjectSystem =
        this.transformSelectedObjectSystem || this.el.systems["transform-selected-object"];
      this.transformSelectedObjectSystem.transforming = true;
      this.transformSelectedObjectSystem.mode = TRANSFORM_MODE.SCALE;
      this.transformSelectedObjectSystem.target = this.objectToScale;
      this.transformSelectedObjectSystem.hand = hand;
    };
    this.endScaling = () => {
      if (!this.isScaling) return;

      this.objectToScale.updateMatrices();
      if (this.objectToScale.el) {
        SYSTEMS.undoSystem.pushMatrixUpdateUndo(
          this.objectToScale.el,
          this.initialObjectMatrix,
          this.objectToScale.matrix
        );
      }
      this.isScaling = false;
      this.objectToScale.el.emit("scale-object-ended", { detail: { target: this.objectToScale.el } }, false);
      this.objectToScale = null;
      this.transformSelectedObjectSystem =
        this.transformSelectedObjectSystem || this.el.systems["transform-selected-object"];
      this.transformSelectedObjectSystem.transforming = false;
      this.transformSelectedObjectSystem.target = null;
    };
  },
  tick() {
    if (!this.isScaling) return;

    this.userinput = this.userinput || this.el.systems.userinput;
    const mouseMovement = this.userinput.get(paths.device.mouse.movementXY);

    const SENSITIVITY = 0.005;
    this.dy += -mouseMovement[1] * SENSITIVITY;

    let scaleFactor = 1;

    if (this.dy > 0) {
      scaleFactor = 1 + this.dy;
    } else if (this.dy < 0) {
      scaleFactor = 1 / (1 + Math.abs(this.dy));
    }

    this.desiredObjectScale.copy(this.initialObjectScale).multiplyScalar(scaleFactor);
    this.objectToScale.updateMatrices();
    this.currentObjectScale.setFromMatrixScale(this.objectToScale.matrix);

    this.deltaScale.set(
      this.desiredObjectScale.x / this.currentObjectScale.x,
      this.desiredObjectScale.y / this.currentObjectScale.y,
      this.desiredObjectScale.z / this.currentObjectScale.z
    );
    this.objectMatrix.copy(this.objectToScale.matrix);
    this.objectMatrix.scale(this.deltaScale);
    this.objectToScale.setMatrix(this.objectMatrix);
    this.objectToScale.matrixNeedsUpdate = true;
  }
});

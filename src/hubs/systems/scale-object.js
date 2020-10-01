import { setMatrixWorld } from "../utils/three-utils";
import { TRANSFORM_MODE } from "../components/transform-object-button";

const calculatePlaneMatrix = (function() {
  const planeMatrix = new THREE.Matrix4();
  const planeUp = new THREE.Vector3();
  const planeForward = new THREE.Vector3();
  const planeRight = new THREE.Vector3();
  const planePosition = new THREE.Vector3();
  const camPosition = new THREE.Vector3();

  return function calculatePlaneMatrix(camera, button) {
    camera.updateMatrices();
    camPosition.setFromMatrixPosition(camera.matrixWorld);
    button.updateMatrices();
    planePosition.setFromMatrixPosition(button.matrixWorld);
    planeForward.subVectors(planePosition, camPosition);
    planeForward.y = 0;
    planeForward.normalize();
    planeUp.set(0, 1, 0);
    planeRight.crossVectors(planeForward, planeUp);
    planeMatrix.makeBasis(planeRight, planeUp, planeForward.multiplyScalar(-1));
    planeMatrix.elements[12] = planePosition.x;
    planeMatrix.elements[13] = planePosition.y;
    planeMatrix.elements[14] = planePosition.z;
    return planeMatrix;
  };
})();

const planeForLeftCursor = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(100000, 100000, 2, 2),
  new THREE.MeshBasicMaterial({
    visible: true,
    wireframe: false,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  })
);
const planeForRightCursor = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(100000, 100000, 2, 2),
  new THREE.MeshBasicMaterial({
    visible: true,
    wireframe: false,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  })
);

AFRAME.registerSystem("scale-object", {
  init() {
    this.isScaling = false;
    this.planeRotation = new THREE.Matrix4();
    this.planeUp = new THREE.Vector3();
    this.planeRight = new THREE.Vector3();
    this.intersections = [];
    this.initialIntersectionPoint = new THREE.Vector3();
    this.intersectionPoint = new THREE.Vector3();
    this.initialObjectScale = new THREE.Vector3();
    this.desiredObjectScale = new THREE.Vector3();
    this.deltaScale = new THREE.Vector3();
    this.objectMatrix = new THREE.Matrix4();
    this.dragVector = new THREE.Vector3();
    this.currentObjectScale = new THREE.Vector3();
    const camPosition = new THREE.Vector3();
    const objectPosition = new THREE.Vector3();
    const objectToCam = new THREE.Vector3();
    const camRotation = new THREE.Quaternion();
    this.startScaling = (object, hand) => {
      if (this.isScaling) return;

      this.objectToScale = object;

      if (!this.didGetObjectReferences) {
        this.didGetObjectReferences = true;
        const leftCursorController = document.getElementById("left-cursor-controller");
        this.leftRaycaster = leftCursorController.components["cursor-controller"].raycaster;
        const rightCursorController = document.getElementById("right-cursor-controller");
        this.rightRaycaster = rightCursorController.components["cursor-controller"].raycaster;
        this.viewingCamera = document.getElementById("viewing-camera").object3DMap.camera;
      }
      this.isScalingLeft = hand.el.id === "player-left-controller";
      this.plane = this.isScalingLeft ? planeForLeftCursor : planeForRightCursor;
      this.viewingCamera.getWorldQuaternion(camRotation);
      this.plane.quaternion.copy(camRotation);

      this.objectToScale.updateMatrices();
      this.objectToScale.getWorldPosition(this.plane.position);
      this.plane.matrixNeedsUpdate = true;
      this.plane.updateMatrixWorld(true);

      //setMatrixWorld(this.plane, calculatePlaneMatrix(this.viewingCamera, this.el.object3D));
      this.planeRotation.extractRotation(this.plane.matrixWorld);
      this.planeUp.set(0, 1, 0).applyMatrix4(this.planeRotation);
      this.planeRight.set(1, 0, 0).applyMatrix4(this.planeRotation);
      this.raycaster = this.isScalingLeft ? this.leftRaycaster : this.rightRaycaster;
      const intersection = this.raycastOnPlane();
      if (!intersection) return;
      this.isScaling = true;
      this.initialIntersectionPoint.copy(intersection.point);
      this.initialObjectScale.setFromMatrixScale(this.objectToScale.matrixWorld);
      this.initialDistanceToObject = objectToCam
        .subVectors(
          camPosition.setFromMatrixPosition(this.viewingCamera.matrixWorld),
          objectPosition.setFromMatrixPosition(this.objectToScale.matrixWorld)
        )
        .length();
      window.APP.store.update({ activity: { hasScaled: true } });

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

      if (
        (this.isScalingLeft && this.raycaster === this.leftRaycaster) ||
        (!this.isScalingLeft && this.raycaster === this.rightRaycaster)
      ) {
        this.isScaling = false;
        this.transformSelectedObjectSystem =
          this.transformSelectedObjectSystem || this.el.systems["transform-selected-object"];
        this.transformSelectedObjectSystem.transforming = false;
      }
    };
  },
  raycastOnPlane() {
    this.intersections.length = 0;
    const far = this.raycaster.far;
    this.raycaster.far = 1000;
    this.plane.raycast(this.raycaster, this.intersections);
    this.raycaster.far = far;
    return this.intersections[0];
  },
  tick() {
    if (!this.isScaling) return;
    const intersection = this.raycastOnPlane();
    if (!intersection) return;
    this.intersectionPoint.copy(intersection.point);
    this.dragVector.subVectors(this.intersectionPoint, this.initialIntersectionPoint);
    const SENSITIVITY = 3;
    const dotFactor = (this.dragVector.dot(this.planeUp) / this.initialDistanceToObject) * SENSITIVITY;

    let scaleFactor = 1;
    if (dotFactor > 0) {
      scaleFactor = 1 + dotFactor;
    } else if (dotFactor < 0) {
      scaleFactor = 1 / (1 + Math.abs(dotFactor));
    }
    this.desiredObjectScale.copy(this.initialObjectScale).multiplyScalar(scaleFactor);
    this.objectToScale.updateMatrices();
    this.currentObjectScale.setFromMatrixScale(this.objectToScale.matrixWorld);
    this.deltaScale.set(
      this.desiredObjectScale.x / this.currentObjectScale.x,
      this.desiredObjectScale.y / this.currentObjectScale.y,
      this.desiredObjectScale.z / this.currentObjectScale.z
    );
    this.objectMatrix.copy(this.objectToScale.matrixWorld);
    this.objectMatrix.scale(this.deltaScale);
    setMatrixWorld(this.objectToScale, this.objectMatrix);
  }
});

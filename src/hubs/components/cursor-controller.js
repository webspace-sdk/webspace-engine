import { paths } from "../systems/userinput/paths";
import { sets } from "../systems/userinput/sets";
import { almostEqualVec3, getLastWorldPosition } from "../utils/three-utils";
import { RENDER_ORDER } from "../constants";
import { isLockedMedia } from "../utils/media-utils";
import { waitForDOMContentLoaded } from "../utils/async-utils";

const HIGHLIGHT = new THREE.Color(0, 0xec / 255, 0xff / 255);
const NO_HIGHLIGHT = new THREE.Color(0.15, 0.15, 0.15);
const TRANSFORM_COLOR_1 = new THREE.Color(150 / 255, 80 / 255, 150 / 255);
const TRANSFORM_COLOR_2 = new THREE.Color(23 / 255, 64 / 255, 118 / 255);
import { addVertexCurvingToMaterial } from "../../jel/systems/terrain-system";

AFRAME.registerComponent("cursor-controller", {
  schema: {
    cursor: { type: "selector" },
    camera: { type: "selector" },
    far: { default: 100 },
    near: { default: 0.01 },
    defaultDistance: { default: 4 },
    minDistance: { default: 0.18 }
  },

  init: function() {
    this.enabled = false;

    this.data.cursor.addEventListener(
      "loaded",
      () => {
        const mesh = this.data.cursor.object3DMap.mesh;
        mesh.renderOrder = RENDER_ORDER.CURSOR;
        addVertexCurvingToMaterial(mesh.material);
      },
      { once: true }
    );

    this.intersection = null;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true; // flag specific to three-mesh-bvh
    this.distance = this.data.far;
    this.color = new THREE.Color(0, 0, 0);

    waitForDOMContentLoaded().then(() => {
      this.cssGazeCursor = document.querySelector("#gaze-cursor .cursor");
      this.lastCssGazeCursorOffset = Infinity;
      this.lastCssGazeCursorScale = Infinity;
    });

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));

    this.line = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: "white",
        opacity: 0.2,
        transparent: true,
        visible: false
      })
    );
    this.el.setObject3D("line", this.line);
  },

  update: function() {
    this.raycaster.far = this.data.far;
    this.raycaster.near = this.data.near;
  },

  tick2: (() => {
    const rawIntersections = [];
    const cameraPos = new THREE.Vector3();
    const v = new THREE.Vector3();
    const prevCursorPos = new THREE.Vector3(Infinity, Infinity, Infinity);

    return function(t, left) {
      const scene = AFRAME.scenes[0];
      const userinput = scene.systems.userinput;
      const cursorPose = userinput.get(left ? paths.actions.cursor.left.pose : paths.actions.cursor.right.pose);
      const hideLine = userinput.get(left ? paths.actions.cursor.left.hideLine : paths.actions.cursor.right.hideLine);

      this.data.cursor.object3D.visible = this.enabled && !!cursorPose;
      this.line.material.visible = !!(this.enabled && !hideLine);

      this.intersection = null;

      if (!this.enabled || !cursorPose) {
        return;
      }

      SYSTEMS.characterController.avatarPOV.object3D.updateMatrices();
      const playerScale = v.setFromMatrixColumn(SYSTEMS.characterController.avatarPOV.object3D.matrixWorld, 1).length();
      this.raycaster.far = this.data.far * playerScale;
      this.raycaster.near = this.data.near * playerScale;

      const interaction = AFRAME.scenes[0].systems.interaction;
      const isGrabbing = left ? !!interaction.state.leftRemote.held : !!interaction.state.rightRemote.held;
      const transformObjectSystem = AFRAME.scenes[0].systems["transform-selected-object"];
      const raycastForTransform =
        transformObjectSystem.transforming && transformObjectSystem.shouldCursorRaycastDuringTransform();

      let intersectionTarget;

      if (!isGrabbing || raycastForTransform) {
        rawIntersections.length = 0;
        this.raycaster.ray.origin = cursorPose.position;
        this.raycaster.ray.direction = cursorPose.direction;
        this.raycaster.intersectObjects(SYSTEMS.cursorTargettingSystem.targets, true, rawIntersections);
        this.intersection = rawIntersections[0];
        intersectionTarget = interaction.updateCursorIntersection(this.intersection, left);
        this.intersectionIsValid = !!intersectionTarget;

        const defaultDistance =
          SYSTEMS.cameraSystem.defaultCursorDistanceToInspectedObject() || this.data.defaultDistance * playerScale;

        this.distance = this.intersectionIsValid ? this.intersection.distance : defaultDistance;

        if (raycastForTransform) {
          transformObjectSystem.handleCursorRaycastIntersections(rawIntersections);
        }
      }

      const { cursor, minDistance, far, camera } = this.data;

      const cursorModDelta =
        userinput.get(left ? paths.actions.cursor.left.modDelta : paths.actions.cursor.right.modDelta) || 0;
      if (isGrabbing && !userinput.activeSets.includes(left ? sets.leftCursorHoldingUI : sets.rightCursorHoldingUI)) {
        this.distance = THREE.Math.clamp(this.distance - cursorModDelta, minDistance, far * playerScale);
      }
      cursor.object3D.position.copy(cursorPose.position).addScaledVector(cursorPose.direction, this.distance);

      const pos = cursor.object3D.position;

      if (!almostEqualVec3(pos, prevCursorPos)) {
        prevCursorPos.copy(pos);

        // The cursor will always be oriented towards the player about its Y axis, so objects held by the cursor will rotate towards the player.
        getLastWorldPosition(camera.object3D, cameraPos);
        cameraPos.y = cursor.object3D.position.y;
        cursor.object3D.lookAt(cameraPos);

        cursor.object3D.matrixNeedsUpdate = true;
      }

      let cursorScale3D = 0.4;
      let cursorScaleCSS = 0.4;

      // TODO : Check if the selected object being transformed is for this cursor!
      if (
        transformObjectSystem.transforming &&
        ((left && transformObjectSystem.hand.el.id === "player-left-controller") ||
          (!left && transformObjectSystem.hand.el.id === "player-right-controller"))
      ) {
        this.color.copy(TRANSFORM_COLOR_1).lerpHSL(TRANSFORM_COLOR_2, 0.5 + 0.5 * Math.sin(t / 1000.0));
        cursorScale3D = 0.66;
        cursorScaleCSS = 1.0;
      } else if ((this.intersectionIsValid || isGrabbing) && !isLockedMedia(intersectionTarget)) {
        this.color.copy(HIGHLIGHT);
        cursorScale3D = 0.66;
        cursorScaleCSS = 1.0;
      } else {
        this.color.copy(NO_HIGHLIGHT);
      }

      if (Math.abs(cursor.components["scale-in-screen-space"].data.baseScale.x - cursorScale3D) > 0.01) {
        cursor.setAttribute("scale-in-screen-space", {
          addedScale: { x: cursorScale3D, y: cursorScale3D, z: cursorScale3D }
        });
      }

      const showCursor = document.body.classList.contains("show-3d-cursor");
      const canvasHeight = AFRAME.scenes[0].canvas.offsetHeight;
      // This magic number is determined by trial-and-error, is a function of the world radius
      const cssGazeYOffset = Math.floor(this.distance * (canvasHeight / 425.0));

      // Huge hack, due to vertex curving, the CSS-based gaze cursor needs to be offset a bit
      // vertically based upon how far the intersection is in a way similar to the 3d cursor.
      if (
        this.cssGazeCursor &&
        (this.lastCssGazeCursorOffset !== cssGazeYOffset || this.lastCssGazeCursorScale !== cursorScaleCSS)
      ) {
        this.cssGazeCursor.setAttribute(
          "style",
          `transform: translateY(${cssGazeYOffset}px); transform: scale(${cursorScaleCSS}, ${cursorScaleCSS});`
        );
        this.lastCssGazeCursorOffset = cssGazeYOffset;
        this.lastCssGazeCursorScale = cursorScaleCSS;
      }

      const mesh = this.data.cursor.object3DMap.mesh;
      const material = mesh.material;

      if (!material.color.equals(this.color)) {
        material.color.copy(this.color);
        material.needsUpdate = true;
      }

      mesh.visible = showCursor;

      if (this.line.material.visible) {
        const posePosition = cursorPose.position;
        const cursorPosition = cursor.object3D.position;
        const positionArray = this.line.geometry.attributes.position.array;

        positionArray[0] = posePosition.x;
        positionArray[1] = posePosition.y;
        positionArray[2] = posePosition.z;
        positionArray[3] = cursorPosition.x;
        positionArray[4] = cursorPosition.y;
        positionArray[5] = cursorPosition.z;

        this.line.geometry.attributes.position.needsUpdate = true;
        this.line.geometry.computeBoundingSphere();
      }
    };
  })()
});

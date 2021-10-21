import { waitForDOMContentLoaded } from "../utils/async-utils";
import { childMatch, setMatrixWorld, calculateViewingDistance } from "../utils/three-utils";
import { shouldOrbitOnInspect } from "../utils/media-utils";
import { paths } from "./userinput/paths";
import { getBox } from "../utils/auto-box-collider";
import { qsGet } from "../utils/qs_truthy";
import SkyboxBufferGeometry from "../../jel/objects/skybox-buffer-geometry";
const customFOV = qsGet("fov");
import { EventTarget } from "event-target-shim";
import { ATOM_TYPES } from "../../jel/utils/atom-metadata";

// In inspect mode we extend the far plane and disable the fog, so we can observe big objects.
const FAR_PLANE_FOR_INSPECT = 100;
const MAX_INSPECT_CAMERA_DISTANCE = 40;
const FAR_PLANE_FOR_FOG = 26;
const FAR_PLANE_FOR_NO_FOG = 2000;

export function getInspectable(child) {
  let el = child;
  while (el) {
    if (el.components && el.components.tags && el.components.tags.data.inspectable) return el;
    el = el.parentNode;
  }
  return null;
}

const decompose = (function() {
  const scale = new THREE.Vector3();
  return function decompose(m, p, q) {
    m.decompose(p, q, scale); //ignore scale, like we're dealing with a motor
  };
})();

const orthoCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.001, 10000);
const IDENTITY = new THREE.Matrix4().identity();

// Given an object 3d, gets the bounding box for the vox, if it's a
// vox entity, or the box for the underlying mesh.
const getEntityBox = object => {
  return getBox(object.el, object.el.getObject3D("mesh") || object, true);
};

export const CAMERA_MODE_FIRST_PERSON = 0;
export const CAMERA_MODE_THIRD_PERSON_NEAR = 1;
export const CAMERA_MODE_THIRD_PERSON_FAR = 2;
export const CAMERA_MODE_INSPECT = 3;
export const CAMERA_MODE_SCENE_PREVIEW = 4;

const CAMERA_LAYER_INSPECT = 4;
// This layer is never actually rendered by a camera but lets the batching system know it should be rendered if inspecting
export const CAMERA_LAYER_BATCH_INSPECT = 5;

const ensureLightsAreSeenByCamera = function(o) {
  if (o.isLight) {
    o.layers.enable(CAMERA_LAYER_INSPECT);
  }
};
const enableInspectLayer = function(o) {
  const { batchManagerSystem } = SYSTEMS;
  const batch = batchManagerSystem.batchingEnabled && batchManagerSystem.batchManager.batchForMesh.get(o);
  if (batch) {
    batch.layers.enable(CAMERA_LAYER_INSPECT);
    o.layers.enable(CAMERA_LAYER_BATCH_INSPECT);
  } else {
    o.layers.enable(CAMERA_LAYER_INSPECT);

    // Check for vox/voxmoji
    const sourceMesh = o.el.getObject3D("mesh");

    if (sourceMesh) {
      for (const mesh of SYSTEMS.voxSystem.getMeshesForSource(sourceMesh)) {
        mesh.layers.enable(CAMERA_LAYER_INSPECT);
      }

      const mesh = SYSTEMS.voxmojiSystem.getMeshForSource(sourceMesh);

      if (mesh) {
        mesh.layers.enable(CAMERA_LAYER_INSPECT);
      }
    }
  }
};
const disableInspectLayer = function(o) {
  const { batchManagerSystem } = SYSTEMS;
  const batch = batchManagerSystem.batchingEnabled && batchManagerSystem.batchManager.batchForMesh.get(o);
  if (batch) {
    batch.layers.disable(CAMERA_LAYER_INSPECT);
    o.layers.disable(CAMERA_LAYER_BATCH_INSPECT);
  } else {
    o.layers.disable(CAMERA_LAYER_INSPECT);

    // Check for vox/voxmoji
    const sourceMesh = o.el && o.el.getObject3D("mesh");

    if (sourceMesh) {
      for (const mesh of SYSTEMS.voxSystem.getMeshesForSource(sourceMesh)) {
        mesh.layers.disable(CAMERA_LAYER_INSPECT);
      }

      const mesh = SYSTEMS.voxmojiSystem.getMeshForSource(sourceMesh);

      if (mesh) {
        mesh.layers.disable(CAMERA_LAYER_INSPECT);
      }
    }
  }
};

function getAudio(o) {
  let audio;
  o.traverse(c => {
    if (!audio && c.type === "Audio") {
      audio = c;
    }
  });
  return audio;
}

const FALLOFF = 0.9;

export class CameraSystem extends EventTarget {
  constructor(scene) {
    super();

    this.sceneEl = scene;
    this.showWorldWithCursor = false;
    this.showFloor = true;
    this.verticalDelta = 0;
    this.horizontalDelta = 0;
    this.inspectZoom = 0;
    this.collapsedPanelsOnInspect = false;
    this.expandedPanelsOnInspect = false;
    this.allowCursor = false;
    this.orthographicEnabled = false;
    this.showXZPlane = true;
    this.mode = CAMERA_MODE_FIRST_PERSON;
    this.inspectingWithEphemeralBuildEnabled = false;
    this.snapshot = { audioTransform: new THREE.Matrix4(), matrixWorld: new THREE.Matrix4(), mask: null, mode: null };
    this.audioListenerTargetTransform = new THREE.Matrix4();
    waitForDOMContentLoaded().then(() => {
      this.avatarPOV = document.getElementById("avatar-pov-node");
      this.avatarRig = document.getElementById("avatar-rig");
      this.viewingCamera = document.getElementById("viewing-camera");
      this.viewingRig = document.getElementById("viewing-rig");

      const bg = new THREE.Mesh(
        new SkyboxBufferGeometry(100, 100, 100),
        new THREE.MeshBasicMaterial({ color: 0x020202 })
      );
      bg.layers.set(CAMERA_LAYER_INSPECT);
      this.viewingRig.object3D.add(bg);
      if (customFOV) {
        if (this.viewingCamera.components.camera) {
          this.viewingCamera.setAttribute("camera", { fov: customFOV });
        } else {
          scene.addEventListener("camera-set-active", () => {
            this.viewingCamera.setAttribute("camera", { fov: customFOV });
          });
        }
      }
    });
  }

  isRenderingOrthographic() {
    // Orthographic is only shown when cursor is enabled otherwise
    // user cannot toggle it off.
    return this.inspected && this.orthographicEnabled && this.allowCursor;
  }

  unprojectCameraOn(vector) {
    const { camera } = this.viewingCamera.object3DMap;
    camera.updateMatrices();

    // Temporarily re-create perspective matrix, then re-gen
    camera.updateProjectionMatrix();

    vector.unproject(camera);
    this.updateCameraSettings();
  }

  defaultCursorDistanceToInspectedObject = (function() {
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    return function() {
      if (!this.inspected) return null;
      if (this.isRenderingOrthographic()) {
        // Project cursor far off in ortho mode
        // TODO this should actually be the distance to the XZ plane, probably.
        //
        // Until that is updated, the cursor will disappear on a miss.
        return 1000.0;
      }

      this.inspected.updateMatrices();
      this.inspected.getWorldPosition(v1);

      const { camera } = this.viewingCamera.object3DMap;
      camera.updateMatrices();
      camera.getWorldPosition(v2);

      return v2.sub(v1).length();
    };
  })();

  inspect(o, distanceMod, temporarilyDisableRegularExit, allowCursor = false, ephemerallyEnableBuild = false) {
    this.verticalDelta = 0;
    this.horizontalDelta = 0;
    this.inspectZoom = 0;
    this.allowCursor = allowCursor;

    if (allowCursor) {
      SYSTEMS.uiAnimationSystem.expandSidePanels();
      this.expandedPanelsOnInspect = true;
    }

    this.temporarilyDisableRegularExit = temporarilyDisableRegularExit; // TODO: Do this at the action set layer
    if (this.mode === CAMERA_MODE_INSPECT) return;
    this.dispatchEvent(new CustomEvent("mode_changing"));
    this.inspectingWithEphemeralBuildEnabled = false;

    if (ephemerallyEnableBuild) {
      if (!SYSTEMS.builderSystem.enabled) {
        SYSTEMS.builderSystem.toggle();
        SYSTEMS.launcherSystem.toggle();
        this.inspectingWithEphemeralBuildEnabled = true;
      }
    }

    const scene = AFRAME.scenes[0];
    scene.object3D.traverse(ensureLightsAreSeenByCamera);
    this.snapshot.mode = this.mode;
    this.mode = CAMERA_MODE_INSPECT;
    this.inspected = o;
    this.distanceMod = distanceMod || 1;

    this.viewingCamera.object3DMap.camera.updateMatrices();
    this.snapshot.matrixWorld.copy(this.viewingRig.object3D.matrixWorld);

    // View the object at the upper corner upon inspection if it can be orbited.
    const viewAtCorner = shouldOrbitOnInspect(this.inspected);

    this.moveRigSoCameraLooksAtObject(
      this.viewingRig.object3D,
      this.viewingCamera.object3DMap.camera,
      this.inspected,
      this.distanceMod,
      viewAtCorner
    );

    this.updateCameraSettings();

    if (!this.showWorldWithCursor && this.allowCursor) {
      this.hideEverythingButInspectedObjectAndCursors(o);
    }

    this.snapshot.audio = getAudio(o);
    if (this.snapshot.audio) {
      this.snapshot.audio.updateMatrices();
      this.snapshot.audioTransform.copy(this.snapshot.audio.matrixWorld);
      scene.audioListener.updateMatrices();
      this.audioListenerTargetTransform.makeTranslation(0, 0, 1).premultiply(scene.audioListener.matrixWorld);
      setMatrixWorld(this.snapshot.audio, this.audioListenerTargetTransform);
    }

    const objectMediaCanvas = o.el.components && o.el.components["media-canvas"];
    const isBridgeCanvas =
      objectMediaCanvas && objectMediaCanvas.data.src && objectMediaCanvas.data.src.startsWith("jel://bridge");

    // Switch to viewing camera in external camera feed unless this is a bridge canvas, which would not be
    // useful for people to see on the other side of the bridge.
    if (!isBridgeCanvas) {
      SYSTEMS.externalCameraSystem.enableForcedViewingCamera();
    }

    this.dispatchEvent(new CustomEvent("mode_changed"));
  }

  uninspect() {
    this.temporarilyDisableRegularExit = false;
    if (this.mode !== CAMERA_MODE_INSPECT) return;

    this.sceneEl.emit("uninspect");

    this.dispatchEvent(new CustomEvent("mode_changing"));
    this.revealEverything();

    for (const cursor of SYSTEMS.cursorTargettingSystem.getCursors()) {
      cursor.object3D.traverse(disableInspectLayer);
    }

    this.inspected = null;
    if (this.snapshot.audio) {
      setMatrixWorld(this.snapshot.audio, this.snapshot.audioTransform);
      this.snapshot.audio = null;
    }

    orthoCamera.zoom = 1;
    orthoCamera.updateProjectionMatrix();

    this.mode = this.snapshot.mode;
    this.updateCameraSettings();

    if (this.snapshot.mode === CAMERA_MODE_SCENE_PREVIEW) {
      setMatrixWorld(this.viewingRig.object3D, this.snapshot.matrixWorld);
    }
    this.snapshot.mode = null;
    this.snapshot.mask = null;
    this.tick(AFRAME.scenes[0]);
    SYSTEMS.externalCameraSystem.releaseForcedViewingCamera();

    if (this.inspectingWithEphemeralBuildEnabled) {
      SYSTEMS.builderSystem.toggle();
      SYSTEMS.launcherSystem.toggle();
      this.inspectingWithEphemeralBuildEnabled = false;
    }

    this.dispatchEvent(new CustomEvent("mode_changed"));

    if (this.collapsedPanelsOnInspect) {
      SYSTEMS.uiAnimationSystem.expandSidePanels(false);
    } else if (this.expandedPanelsOnInspect) {
      SYSTEMS.uiAnimationSystem.collapseSidePanels();
    }

    this.collapsedPanelsOnInspect = false;
    this.expandedPanelsOnInspect = false;
  }

  isEditing() {
    return this.isInspecting() && this.allowCursor;
  }

  isInspecting() {
    return !!this.inspected;
  }

  revealEverything() {
    if (this.inspected) {
      this.inspected.traverse(disableInspectLayer);
    }

    for (const cursor of SYSTEMS.cursorTargettingSystem.getCursors()) {
      cursor.object3D.traverse(disableInspectLayer);
    }

    const scene = AFRAME.scenes[0];
    const vrMode = scene.is("vr-mode");
    const camera = vrMode ? scene.renderer.vr.getCamera(scene.camera) : scene.camera;
    camera.layers.mask = this.snapshot.mask;
    if (vrMode) {
      camera.cameras[0].layers.mask = this.snapshot.mask0;
      camera.cameras[1].layers.mask = this.snapshot.mask1;
    }
  }

  hideEverythingButInspectedObjectAndCursors() {
    if (this.inspected) {
      this.inspected.traverse(enableInspectLayer);
    }

    for (const cursor of SYSTEMS.cursorTargettingSystem.getCursors()) {
      cursor.object3D.traverse(enableInspectLayer);
    }

    const scene = AFRAME.scenes[0];
    const vrMode = scene.is("vr-mode");
    const camera = vrMode ? scene.renderer.vr.getCamera(scene.camera) : scene.camera;
    camera.layers.set(CAMERA_LAYER_INSPECT);
    if (vrMode) {
      camera.cameras[0].layers.set(CAMERA_LAYER_INSPECT);
      camera.cameras[1].layers.set(CAMERA_LAYER_INSPECT);
    }
  }

  isInAvatarView() {
    return this.mode !== CAMERA_MODE_INSPECT && this.mode !== CAMERA_MODE_SCENE_PREVIEW;
  }

  currentViewShowsCursor() {
    return this.cameraViewAllowsEditing() || this.cameraViewAllowsManipulation();
  }

  cameraViewAllowsEditing() {
    return this.isInAvatarView() || (this.mode === CAMERA_MODE_INSPECT && this.allowCursor);
  }

  cameraViewAllowsManipulation() {
    return this.isInAvatarView();
  }

  toggleOrthoCamera() {
    this.orthographicEnabled = !this.orthographicEnabled;
    this.updateCameraSettings();

    this.dispatchEvent(new CustomEvent("settings_changed"));
  }

  toggleShowWorldWithCursor() {
    this.showWorldWithCursor = !this.showWorldWithCursor;

    if (this.allowCursor) {
      this.refreshCameraLayersAndMask();
    }

    this.dispatchEvent(new CustomEvent("settings_changed"));
  }

  refreshCameraLayersAndMask() {
    if (!this.inspected) return;

    if (this.showWorldWithCursor) {
      this.revealEverything();
    } else {
      this.hideEverythingButInspectedObjectAndCursors();
    }
  }

  toggleShowFloor() {
    this.showFloor = !this.showFloor;
    this.dispatchEvent(new CustomEvent("settings_changed"));
  }

  updateCameraSettings() {
    const scene = AFRAME.scenes[0];
    const vrMode = scene.is("vr-mode");
    const camera = vrMode ? scene.renderer.vr.getCamera(scene.camera) : scene.camera;

    const canvasWidth = this.sceneEl.canvas.parentElement.offsetWidth;
    const canvasHeight = this.sceneEl.canvas.parentElement.offsetHeight;
    const aspectRatio = (canvasWidth * 1.0) / canvasHeight;

    orthoCamera.left = -orthoCamera.top * aspectRatio;
    orthoCamera.right = orthoCamera.top * aspectRatio;
    orthoCamera.updateProjectionMatrix();

    if (this.mode === CAMERA_MODE_INSPECT) {
      if (this.snapshot.mask === null) {
        this.snapshot.mask = camera.layers.mask;

        if (vrMode) {
          this.snapshot.mask0 = camera.cameras[0].layers.mask;
          this.snapshot.mask1 = camera.cameras[1].layers.mask;
        }
      }

      if (vrMode) {
        camera.cameras[0].far = FAR_PLANE_FOR_INSPECT;
        camera.cameras[1].far = FAR_PLANE_FOR_INSPECT;
      }

      camera.far = FAR_PLANE_FOR_INSPECT;

      if (this.isRenderingOrthographic()) {
        // Hacky, use ortho camera matrix by copying it in, instead of having a separate camera.
        if (vrMode) {
          camera.cameras[0].projectionMatrix.copy(orthoCamera.projectionMatrix);
          camera.cameras[1].projectionMatrix.copy(orthoCamera.projectionMatrix);
          camera.cameras[0].projectionMatrixInverse.copy(orthoCamera.projectionMatrixInverse);
          camera.cameras[1].projectionMatrixInverse.copy(orthoCamera.projectionMatrixInverse);
        } else {
          camera.projectionMatrix.copy(orthoCamera.projectionMatrix);
          camera.projectionMatrixInverse.copy(orthoCamera.projectionMatrixInverse);
        }
      } else {
        if (vrMode) {
          camera.cameras[0].updateProjectionMatrix();
          camera.cameras[1].updateProjectionMatrix();
        }

        camera.updateProjectionMatrix();
      }

      SYSTEMS.atmosphereSystem.disableFog();
    } else {
      const enableFog = SYSTEMS.terrainSystem.worldTypeHasFog();
      const far = enableFog ? FAR_PLANE_FOR_FOG : FAR_PLANE_FOR_NO_FOG;

      if (this.snapshot.mask) {
        camera.layers.mask = this.snapshot.mask;

        if (vrMode) {
          camera.cameras[0].layers.mask = this.snapshot.mask0;
          camera.cameras[1].layers.mask = this.snapshot.mask1;
        }
      }

      if (vrMode) {
        camera.cameras[0].far = far;
        camera.cameras[1].far = far;
      }

      camera.far = far;

      camera.updateProjectionMatrix();

      if (vrMode) {
        camera.cameras[0].updateProjectionMatrix();
        camera.cameras[1].updateProjectionMatrix();
      }

      if (SYSTEMS.terrainSystem.worldTypeHasFog()) {
        SYSTEMS.atmosphereSystem.enableFog();
      } else {
        SYSTEMS.atmosphereSystem.disableFog();
      }
    }
  }

  tick = (function() {
    const translation = new THREE.Matrix4();
    return function tick(scene, dt) {
      const entered = scene.is("entered");
      if (!this.enteredScene && entered) {
        this.enteredScene = true;
      }
      this.avatarPOVRotator = this.avatarPOVRotator || this.avatarPOV.components["camera-rotator"];
      this.viewingCameraRotator = this.viewingCameraRotator || this.viewingRig.components["camera-rotator"];
      this.avatarPOVRotator.on = true;
      this.viewingCameraRotator.on = true;

      this.userinput = this.userinput || scene.systems.userinput;
      this.interaction = this.interaction || scene.systems.interaction;

      if (this.userinput.get(paths.actions.toggleInspecting) && this.mode !== CAMERA_MODE_INSPECT) {
        const hoverEl = this.interaction.state.rightRemote.hovered || this.interaction.state.leftRemote.hovered;

        if (hoverEl) {
          const inspectable = getInspectable(hoverEl);

          if (inspectable) {
            const distanceMod = shouldOrbitOnInspect(inspectable.object3D) ? 1.5 : 1;
            if (!SYSTEMS.uiAnimationSystem.isCollapsingOrCollapsed()) {
              this.sceneEl.addEventListener(
                "side_panel_resize_complete",
                () => {
                  this.inspect(inspectable.object3D, distanceMod);
                },
                { once: true }
              );
              SYSTEMS.uiAnimationSystem.collapseSidePanels(false);
              this.collapsedPanelsOnInspect = true;
            } else {
              this.inspect(inspectable.object3D, distanceMod);
            }
          }
        }
      } else if (
        !this.temporarilyDisableRegularExit &&
        this.mode === CAMERA_MODE_INSPECT &&
        // Editing uses different hotkey, so ignore toggle
        ((this.userinput.get(paths.actions.toggleInspecting) && !this.allowCursor) ||
          this.userinput.get(paths.actions.stopInspecting))
      ) {
        this.uninspect();
      }

      const headShouldBeVisible = this.mode !== CAMERA_MODE_FIRST_PERSON;
      this.playerHead = this.playerHead || document.getElementById("avatar-head");
      if (this.playerHead && headShouldBeVisible !== this.playerHead.object3D.visible) {
        this.playerHead.object3D.visible = headShouldBeVisible;

        // Skip a frame so we don't see our own avatar, etc.
        return;
      }

      if (this.mode === CAMERA_MODE_FIRST_PERSON) {
        this.viewingCameraRotator.on = false;
        if (scene.is("vr-mode")) {
          this.viewingCamera.object3DMap.camera.updateMatrices();
          setMatrixWorld(this.avatarPOV.object3D, this.viewingCamera.object3DMap.camera.matrixWorld);
        } else {
          this.avatarPOV.object3D.updateMatrices();
          setMatrixWorld(this.viewingRig.object3D, this.avatarPOV.object3D.matrixWorld);
        }
      } else if (this.mode === CAMERA_MODE_THIRD_PERSON_NEAR || this.mode === CAMERA_MODE_THIRD_PERSON_FAR) {
        if (this.mode === CAMERA_MODE_THIRD_PERSON_NEAR) {
          translation.makeTranslation(0, 1, 3);
        } else {
          translation.makeTranslation(0, 2, 8);
        }
        this.avatarRig.object3D.updateMatrices();
        this.viewingRig.object3D.matrixWorld.copy(this.avatarRig.object3D.matrixWorld).multiply(translation);
        setMatrixWorld(this.viewingRig.object3D, this.viewingRig.object3D.matrixWorld);
        this.avatarPOV.object3D.quaternion.copy(this.viewingCamera.object3DMap.camera.quaternion);
        this.avatarPOV.object3D.matrixNeedsUpdate = true;
      } else if (this.mode === CAMERA_MODE_INSPECT) {
        this.avatarPOVRotator.on = false;
        this.viewingCameraRotator.on = false;
        this.horizontalDelta = -this.userinput.get(paths.actions.inspectRotateX) || 0;
        this.verticalDelta = -this.userinput.get(paths.actions.inspectRotateY) || 0;

        const inspectZoom = this.userinput.get(paths.actions.inspectZoom) * 0.001;
        if (inspectZoom) {
          this.inspectZoom = inspectZoom + (5 * this.inspectZoom) / 6;
        } else if (Math.abs(this.inspectZoom) > 0.0001) {
          this.inspectZoom = FALLOFF * this.inspectZoom;
        } else {
          this.inspectZoom = 0;
        }

        // Disable panning in normal focus mode
        const panX = this.allowCursor ? -this.userinput.get(paths.actions.inspectPanX) || 0 : 0;
        const panY = this.allowCursor ? this.userinput.get(paths.actions.inspectPanY) || 0 : 0;
        if (this.userinput.get(paths.actions.resetInspectView)) {
          this.moveRigSoCameraLooksAtObject(
            this.viewingRig.object3D,
            this.viewingCamera.object3DMap.camera,
            this.inspected,
            1
          );
        }

        if (
          Math.abs(this.verticalDelta) > 0.001 ||
          Math.abs(this.horizontalDelta) > 0.001 ||
          Math.abs(this.inspectZoom) > 0.001 ||
          Math.abs(panX) > 0.0001 ||
          Math.abs(panY) > 0.0001
        ) {
          if (shouldOrbitOnInspect(this.inspected)) {
            this.orbit(dt, panX, panY);
          }
        }
      }

      if (scene.audioListener && this.avatarPOV) {
        if (this.mode === CAMERA_MODE_INSPECT && scene.audioListener.parent !== this.avatarPOV.object3D) {
          this.avatarPOV.object3D.add(scene.audioListener);
        } else if (
          (this.mode === CAMERA_MODE_FIRST_PERSON ||
            this.mode === CAMERA_MODE_THIRD_PERSON_NEAR ||
            this.mode === CAMERA_MODE_THIRD_PERSON_FAR) &&
          scene.audioListener.parent !== this.viewingCamera.object3DMap.camera
        ) {
          this.viewingCamera.object3DMap.camera.add(scene.audioListener);
        }
      }
    };
  })();

  orbit = (function() {
    const owq = new THREE.Quaternion();
    const owp = new THREE.Vector3();
    const cwq = new THREE.Quaternion();
    const cwp = new THREE.Vector3();
    const rwq = new THREE.Quaternion();
    const UP = new THREE.Vector3();
    const RIGHT = new THREE.Vector3();
    const target = new THREE.Object3D();
    const vv = new THREE.Vector3();
    const dhQ = new THREE.Quaternion();
    const dvQ = new THREE.Quaternion();
    const center = new THREE.Vector3();
    return function orbit(dt, panX, panY) {
      const object = this.inspected;
      const rig = this.viewingRig.object3D;
      const camera = this.viewingCamera.object3DMap.camera;
      const dh = this.horizontalDelta;
      const dv = this.verticalDelta;
      const dz = this.inspectZoom;
      if (!target.parent) {
        // add dummy object to the scene, if this is the first time we call this function
        AFRAME.scenes[0].object3D.add(target);
        target.applyMatrix(IDENTITY); // make sure target gets updated at least once for our matrix optimizations
      }
      object.updateMatrices();
      decompose(object.matrixWorld, owp, owq);
      decompose(camera.matrixWorld, cwp, cwq);
      rig.getWorldQuaternion(rwq);

      dhQ.setFromAxisAngle(UP.set(0, 1, 0).applyQuaternion(owq), 0.1 * dh * dt);
      target.quaternion.copy(cwq).premultiply(dhQ);
      const dPos = new THREE.Vector3().subVectors(cwp, owp);
      const zoom = 1 - dz * dt;
      const newLength = dPos.length() * (this.isRenderingOrthographic() ? 1 : zoom);
      const box = getEntityBox(object);
      box.getCenter(center);
      const vrMode = object.el.sceneEl.is("vr-mode");
      const dist =
        calculateViewingDistance(
          object.el.sceneEl.camera.fov,
          object.el.sceneEl.camera.aspect,
          object,
          box,
          center,
          vrMode
        ) * this.distanceMod;

      // TODO: These limits should be calculated based on the calculated view distance.
      if (
        !this.isRenderingOrthographic() &&
        ((newLength > 0.1 || dz < 0.0) && (newLength < MAX_INSPECT_CAMERA_DISTANCE || dz > 0.0))
      ) {
        dPos.multiplyScalar(zoom);
      }

      dvQ.setFromAxisAngle(RIGHT.set(1, 0, 0).applyQuaternion(target.quaternion), 0.1 * dv * dt);
      target.quaternion.premultiply(dvQ);

      // Note that for orthographic camera, the length is irrelevant when panning
      // since there is no perspective transform.
      target.position
        .addVectors(owp, dPos.applyQuaternion(dhQ).applyQuaternion(dvQ))
        .add(
          RIGHT.set(1, 0, 0)
            .applyQuaternion(cwq)
            .multiplyScalar(panX * newLength)
        )
        .add(
          UP.set(0, 1, 0)
            .applyQuaternion(cwq)
            .multiplyScalar(panY * newLength)
        );

      // When rendering orthographic, push the target position
      // out past dist so there is no clipping and cursor is targetted
      // properly.
      if (this.isRenderingOrthographic()) {
        vv.copy(target.position);
        vv.sub(object.position);
        vv.normalize();
        vv.multiplyScalar(Math.max(1.5, dist));
        target.position.copy(object.position).add(vv);
        target.matrixNeedsUpdate = true;
        target.updateMatrices();
      }

      // Viewing distance ends up approximating the size of the object,
      // so use that to drive zoom extents and zoom speed.
      const maxOrthoZoom = 100.0;
      const minOrthoZoom = (1.0 / dist) * 0.25;

      // Handle zooming of ortho camera
      orthoCamera.zoom = Math.max(minOrthoZoom, Math.min(maxOrthoZoom, orthoCamera.zoom + dz * (0.5 / dist) * dt));
      orthoCamera.updateProjectionMatrix();

      this.updateCameraSettings();

      target.matrixNeedsUpdate = true;
      target.updateMatrices();
      childMatch(rig, camera, target.matrixWorld);
    };
  })();

  moveRigSoCameraLooksAtObject = (function() {
    const owq = new THREE.Quaternion();
    const owp = new THREE.Vector3();
    const cwq = new THREE.Quaternion();
    const cwp = new THREE.Vector3();
    const oForw = new THREE.Vector3();
    const center = new THREE.Vector3();
    const vv = new THREE.Vector3();
    const target = new THREE.Object3D();
    const rm = new THREE.Matrix4();
    return function moveRigSoCameraLooksAtObject(rig, camera, object, distanceMod, viewAtCorner = false) {
      if (!target.parent) {
        // add dummy object to the scene, if this is the first time we call this function
        AFRAME.scenes[0].object3D.add(target);
        target.applyMatrix(IDENTITY); // make sure target gets updated at least once for our matrix optimizations
      }

      object.updateMatrices();
      decompose(object.matrixWorld, owp, owq);
      decompose(camera.matrixWorld, cwp, cwq);
      rig.getWorldQuaternion(cwq);

      const box = getEntityBox(object);
      box.getCenter(center);
      const vrMode = object.el.sceneEl.is("vr-mode");
      const dist =
        calculateViewingDistance(
          object.el.sceneEl.camera.fov,
          object.el.sceneEl.camera.aspect,
          object,
          box,
          center,
          vrMode
        ) * distanceMod;

      orthoCamera.zoom = 1.0 / dist;
      orthoCamera.updateProjectionMatrix();

      target.position.addVectors(
        owp,
        oForw
          .set(viewAtCorner ? 1 : 0, viewAtCorner ? 1 : 0, 1)
          .normalize()
          .multiplyScalar(dist)
          .applyQuaternion(owq)
      );

      // When rendering orthographic, push the target position
      // out past dist so there is no clipping and cursor is targetted
      // properly.
      if (this.isRenderingOrthographic()) {
        vv.copy(target.position);
        vv.sub(object.position);
        vv.normalize();
        console.log(dist);
        vv.multiplyScalar(Math.max(1.5, dist));
        target.position.copy(object.position).add(vv);
        target.matrixNeedsUpdate = true;
        target.updateMatrices();
      }

      oForw.set(0, 1, 0).applyQuaternion(owq); // Up vector

      rm.lookAt(target.position, object.position, oForw);
      target.quaternion.setFromRotationMatrix(rm);
      target.matrixNeedsUpdate = true;
      target.updateMatrices();
      childMatch(rig, camera, target.matrixWorld);
    };
  })();

  getInspectedAtomId() {
    const { inspected } = this;
    if (!inspected) return null;

    const mediaVox = inspected.el && inspected.el.components["media-vox"];

    if (mediaVox) {
      return mediaVox.voxId;
    } else {
      return null;
    }
  }

  getInspectedAtomType() {
    const { inspected } = this;
    if (!inspected) return null;

    const mediaVox = inspected.el && inspected.el.components["media-vox"];

    if (mediaVox) {
      return ATOM_TYPES.VOX;
    } else {
      return null;
    }
  }
}

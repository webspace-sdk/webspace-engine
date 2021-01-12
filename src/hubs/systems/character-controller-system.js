import { paths } from "./userinput/paths";
import { SOUND_SNAP_ROTATE, SOUND_WAYPOINT_START, SOUND_WAYPOINT_END } from "./sound-effects-system";
import { easeOutQuadratic } from "../utils/easing";
import { getPooledMatrix4, freePooledMatrix4 } from "../utils/mat4-pool";
import { waitForDOMContentLoaded } from "../utils/async-utils";
import {
  childMatch,
  rotateInPlaceAroundWorldUp,
  calculateCameraTransformForWaypoint,
  interpolateAffine,
  affixToWorldUp,
  IDENTITY_QUATERNION
} from "../utils/three-utils";
import { getCurrentPlayerHeight } from "../utils/get-current-player-height";
import qsTruthy from "../utils/qs_truthy";
//import { m4String } from "../utils/pretty-print";
const qsAllowWaypointLerp = qsTruthy("waypointLerp");
const isMobile = AFRAME.utils.device.isMobile();
import { WORLD_MAX_COORD, WORLD_MIN_COORD, WORLD_SIZE } from "../../jel/systems/terrain-system";

const calculateDisplacementToDesiredPOV = (function() {
  const translationCoordinateSpace = new THREE.Matrix4();
  const translated = new THREE.Matrix4();
  const localTranslation = new THREE.Matrix4();
  return function calculateDisplacementToDesiredPOV(
    povMat4,
    allowVerticalMovement,
    localDisplacement,
    displacementToDesiredPOV
  ) {
    localTranslation.makeTranslation(localDisplacement.x, localDisplacement.y, localDisplacement.z);
    translationCoordinateSpace.extractRotation(povMat4);
    if (!allowVerticalMovement) {
      affixToWorldUp(translationCoordinateSpace, translationCoordinateSpace);
    }
    translated.copy(translationCoordinateSpace).multiply(localTranslation);
    return displacementToDesiredPOV.setFromMatrixPosition(translated);
  };
})();

/**
 * A character controller that moves the avatar.
 * The controller accounts for playspace offset and orientation and depends on the nav mesh system for translation.
 * @namespace avatar
 */
const SNAP_ROTATION_RADIAN = THREE.Math.DEG2RAD * 45;
const BASE_SPEED = 3.2; //TODO: in what units?
const JUMP_GRAVITY = -16.0;
const INITIAL_JUMP_VELOCITY = 5.0;

export class CharacterControllerSystem {
  constructor(scene, terrainSystem) {
    this.scene = scene;
    this.terrainSystem = terrainSystem;
    this.fly = false;
    this.shouldLandWhenPossible = false;
    this.waypoints = [];
    this.waypointTravelStartTime = 0;
    this.waypointTravelTime = 0;
    this.lastSeenNavVersion = -1;
    this.relativeMotion = new THREE.Vector3(0, 0, 0);
    this.nextRelativeMotion = new THREE.Vector3(0, 0, 0);
    this.dXZ = 0;
    this.movedThisFrame = false;
    this.jumpStartTime = null;
    this.jumpYVelocity = null;

    this.scene.addEventListener("terrain_chunk_loaded", () => {
      if (!this.fly) {
        this.shouldLandWhenPossible = true;
      }
    });

    waitForDOMContentLoaded().then(() => {
      this.avatarPOV = document.getElementById("avatar-pov-node");
      this.avatarRig = document.getElementById("avatar-rig");

      if (this.avatarRig.components["networked-avatar"]) {
        this.networkedAvatar = this.avatarRig.components["networked-avatar"];
      } else {
        this.avatarRig.addEventListener(
          "entered",
          () => {
            this.networkedAvatar = this.avatarRig.components["networked-avatar"];
          },
          { once: true }
        );
      }
    });
  }
  // Use this API for waypoint travel so that your matrix doesn't end up in the pool
  enqueueWaypointTravelTo(inTransform, isInstant, waypointComponentData) {
    this.waypoints.push({ transform: getPooledMatrix4().copy(inTransform), isInstant, waypointComponentData }); //TODO: don't create new object
  }
  enqueueRelativeMotion(motion) {
    motion.z *= -1;
    this.relativeMotion.add(motion);
  }
  enqueueInPlaceRotationAroundWorldUp(dXZ) {
    this.dXZ += dXZ;
  }
  // We assume the rig is at the root, and its local position === its world position.
  teleportTo = (function() {
    const rig = new THREE.Vector3();
    const head = new THREE.Vector3();
    const deltaFromHeadToTargetForHead = new THREE.Vector3();
    const targetForHead = new THREE.Vector3();
    const targetForRig = new THREE.Vector3();
    return function teleportTo(targetWorldPosition, targetWorldRotation) {
      this.isMotionDisabled = false;
      this.avatarRig.object3D.getWorldPosition(rig);
      this.avatarPOV.object3D.getWorldPosition(head);
      targetForHead.copy(targetWorldPosition);
      targetForHead.y += this.avatarPOV.object3D.position.y;
      deltaFromHeadToTargetForHead.copy(targetForHead).sub(head);
      targetForRig.copy(rig).add(deltaFromHeadToTargetForHead);

      this.findPositionOnHeightMap(targetForRig, this.avatarRig.object3D.position, true);

      this.avatarRig.object3D.matrixNeedsUpdate = true;

      if (targetWorldRotation) {
        this.avatarRig.object3D.rotation.setFromQuaternion(IDENTITY_QUATERNION);
        this.avatarPOV.object3D.rotation.setFromQuaternion(targetWorldRotation);
        this.avatarPOV.object3D.matrixNeedsUpdate = true;
      }
    };
  })();

  travelByWaypoint = (function() {
    const inMat4Copy = new THREE.Matrix4();
    const inPosition = new THREE.Vector3();
    const outPosition = new THREE.Vector3();
    const translation = new THREE.Matrix4();
    const initialOrientation = new THREE.Matrix4();
    const finalScale = new THREE.Vector3();
    const finalPosition = new THREE.Vector3();
    const finalPOV = new THREE.Matrix4();
    return function travelByWaypoint(inMat4, snapToHeightMap, willMaintainInitialOrientation) {
      this.avatarPOV.object3D.updateMatrices();
      if (!this.fly && !snapToHeightMap) {
        this.fly = true;
        this.shouldLandWhenPossible = true;
        this.shouldUnoccupyWaypointsOnceMoving = true;
      }
      inMat4Copy.copy(inMat4);
      rotateInPlaceAroundWorldUp(inMat4Copy, Math.PI, finalPOV);
      if (snapToHeightMap) {
        inPosition.setFromMatrixPosition(inMat4Copy);
        this.findPositionOnHeightMap(inPosition, outPosition);
        finalPOV.setPosition(outPosition);
      }
      translation.makeTranslation(0, getCurrentPlayerHeight(), -0.15);
      finalPOV.multiply(translation);
      if (willMaintainInitialOrientation) {
        initialOrientation.extractRotation(this.avatarPOV.object3D.matrixWorld);
        finalScale.setFromMatrixScale(finalPOV);
        finalPosition.setFromMatrixPosition(finalPOV);
        finalPOV
          .copy(initialOrientation)
          .scale(finalScale)
          .setPosition(finalPosition);
      }
      calculateCameraTransformForWaypoint(this.avatarPOV.object3D.matrixWorld, finalPOV, finalPOV);
      childMatch(this.avatarRig.object3D, this.avatarPOV.object3D, finalPOV);
    };
  })();

  tick = (function() {
    const snapRotatedPOV = new THREE.Matrix4();
    const newPOV = new THREE.Matrix4();
    const displacementToDesiredPOV = new THREE.Vector3();

    const desiredPOVPosition = new THREE.Vector3();
    const heightMapSnappedPOVPosition = new THREE.Vector3();
    const AVERAGE_WAYPOINT_TRAVEL_SPEED_METERS_PER_SECOND = 50;
    const startTransform = new THREE.Matrix4();
    const interpolatedWaypoint = new THREE.Matrix4();
    const startTranslation = new THREE.Matrix4();
    const waypointPosition = new THREE.Vector3();
    const v = new THREE.Vector3();

    let uiRoot;
    return function tick(t, dt) {
      const entered = this.scene.is("entered");
      uiRoot = uiRoot || document.getElementById("ui-root");
      const isGhost = !entered && uiRoot && uiRoot.firstChild && uiRoot.firstChild.classList.contains("isGhost");
      if (!isGhost && !entered) return;
      const vrMode = this.scene.is("vr-mode");
      this.sfx = this.sfx || this.scene.systems["hubs-systems"].soundEffectsSystem;
      this.interaction = this.interaction || AFRAME.scenes[0].systems.interaction;
      this.waypointSystem = this.waypointSystem || this.scene.systems["hubs-systems"].waypointSystem;

      if (!this.activeWaypoint && this.waypoints.length) {
        this.activeWaypoint = this.waypoints.splice(0, 1)[0];
        // Normally, do not disable motion on touchscreens because there is no way to teleport out of it.
        // But if motion AND teleporting is disabled, then disable motion because the waypoint author
        // intended for the user to be stuck here.
        this.isMotionDisabled =
          this.activeWaypoint.waypointComponentData.willDisableMotion &&
          (!isMobile || this.activeWaypoint.waypointComponentData.willDisableTeleporting);
        this.isTeleportingDisabled = this.activeWaypoint.waypointComponentData.willDisableTeleporting;
        this.avatarPOV.object3D.updateMatrices();
        this.waypointTravelTime =
          (vrMode && !qsAllowWaypointLerp) || this.activeWaypoint.isInstant
            ? 0
            : 1000 *
              (new THREE.Vector3()
                .setFromMatrixPosition(this.avatarPOV.object3D.matrixWorld)
                .distanceTo(waypointPosition.setFromMatrixPosition(this.activeWaypoint.transform)) /
                AVERAGE_WAYPOINT_TRAVEL_SPEED_METERS_PER_SECOND);
        rotateInPlaceAroundWorldUp(this.avatarPOV.object3D.matrixWorld, Math.PI, startTransform);
        startTransform.multiply(startTranslation.makeTranslation(0, -1 * getCurrentPlayerHeight(), -0.15));
        this.waypointTravelStartTime = t;
        if (!vrMode && this.waypointTravelTime > 100) {
          this.sfx.playSoundOneShot(SOUND_WAYPOINT_START);
        }
      }

      const animationIsOver =
        this.waypointTravelTime === 0 || t >= this.waypointTravelStartTime + this.waypointTravelTime;
      if (this.activeWaypoint && !animationIsOver) {
        const progress = THREE.Math.clamp((t - this.waypointTravelStartTime) / this.waypointTravelTime, 0, 1);
        interpolateAffine(
          startTransform,
          this.activeWaypoint.transform,
          easeOutQuadratic(progress),
          interpolatedWaypoint
        );
        this.travelByWaypoint(
          interpolatedWaypoint,
          false,
          this.activeWaypoint.waypointComponentData.willMaintainInitialOrientation
        );
      }
      if (this.activeWaypoint && (this.waypoints.length || animationIsOver)) {
        this.travelByWaypoint(
          this.activeWaypoint.transform,
          this.activeWaypoint.waypointComponentData.snapToHeightMap,
          this.activeWaypoint.waypointComponentData.willMaintainInitialOrientation
        );
        freePooledMatrix4(this.activeWaypoint.transform);
        this.activeWaypoint = null;
        if (vrMode || this.waypointTravelTime > 0) {
          this.sfx.playSoundOneShot(SOUND_WAYPOINT_END);
        }
      }

      const userinput = AFRAME.scenes[0].systems.userinput;
      const wasFlying = this.fly;
      const shouldSnapDueToLanding = this.shouldLandWhenPossible;

      if (userinput.get(paths.actions.jump) && this.jumpYVelocity === null) {
        this.jumpYVelocity = INITIAL_JUMP_VELOCITY;
      }

      if (userinput.get(paths.actions.toggleFly)) {
        this.shouldLandWhenPossible = false;
      }
      const didStopFlying = wasFlying && !this.fly;
      if (!this.fly && this.shouldLandWhenPossible) {
        this.shouldLandWhenPossible = false;
      }
      const preferences = window.APP.store.state.preferences;
      const snapRotateLeft = userinput.get(paths.actions.snapRotateLeft);
      const snapRotateRight = userinput.get(paths.actions.snapRotateRight);
      if (snapRotateLeft) {
        this.dXZ +=
          preferences.snapRotationDegrees === undefined
            ? SNAP_ROTATION_RADIAN
            : (preferences.snapRotationDegrees * Math.PI) / 180;
      }
      if (snapRotateRight) {
        this.dXZ -=
          preferences.snapRotationDegrees === undefined
            ? SNAP_ROTATION_RADIAN
            : (preferences.snapRotationDegrees * Math.PI) / 180;
      }
      if (snapRotateLeft || snapRotateRight) {
        this.scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_SNAP_ROTATE);
      }
      const characterAcceleration = userinput.get(paths.actions.characterAcceleration);

      const boost = userinput.get(paths.actions.boost) ? 2 : 1;

      if (characterAcceleration) {
        if (characterAcceleration[0] || characterAcceleration[1]) {
          window.APP.store.handleActivityFlag("wasd");
        }

        const zCharacterAcceleration = -1 * characterAcceleration[1];
        this.relativeMotion.set(
          this.relativeMotion.x +
            (preferences.disableMovement || preferences.disableStrafing ? 0 : characterAcceleration[0]),
          this.relativeMotion.y,
          this.relativeMotion.z +
            (preferences.disableMovement
              ? 0
              : preferences.disableBackwardsMovement
                ? Math.min(0, zCharacterAcceleration)
                : zCharacterAcceleration)
        );

        if (this.networkedAvatar) {
          this.networkedAvatar.data.relative_motion =
            Math.max(Math.abs(characterAcceleration[0]), Math.abs(characterAcceleration[1])) * boost;
        }
      } else {
        if (this.networkedAvatar) {
          this.networkedAvatar.data.relative_motion = 0;
        }
      }

      const lerpC = vrMode ? 0 : 0.85; // TODO: To support drifting ("ice skating"), motion needs to keep initial direction
      this.nextRelativeMotion.copy(this.relativeMotion).multiplyScalar(lerpC);
      this.relativeMotion.multiplyScalar(1 - lerpC);

      this.avatarPOV.object3D.updateMatrices();

      rotateInPlaceAroundWorldUp(this.avatarPOV.object3D.matrixWorld, this.dXZ, snapRotatedPOV);

      newPOV.copy(snapRotatedPOV);

      if (!this.isMotionDisabled) {
        const playerScale = v.setFromMatrixColumn(this.avatarPOV.object3D.matrixWorld, 1).length();
        const triedToMove = this.relativeMotion.lengthSq() > 0.000001;

        if (triedToMove) {
          const speedModifier = preferences.movementSpeedModifier || 1;
          calculateDisplacementToDesiredPOV(
            snapRotatedPOV,
            this.fly,
            this.relativeMotion.multiplyScalar(
              (boost * speedModifier * BASE_SPEED * Math.sqrt(playerScale) * dt) / 1000
            ),
            displacementToDesiredPOV
          );

          newPOV
            .makeTranslation(displacementToDesiredPOV.x, displacementToDesiredPOV.y, displacementToDesiredPOV.z)
            .multiply(snapRotatedPOV);
        }

        const shouldResnapToHeightMap =
          (didStopFlying || shouldSnapDueToLanding || triedToMove) && this.jumpYVelocity === null;

        let squareDistHeightMapCorrection = 0;

        if (shouldResnapToHeightMap) {
          this.findPOVPositionAboveHeightMap(
            desiredPOVPosition.setFromMatrixPosition(newPOV),
            heightMapSnappedPOVPosition
          );
          squareDistHeightMapCorrection = desiredPOVPosition.distanceToSquared(heightMapSnappedPOVPosition);

          if (this.fly && this.shouldLandWhenPossible && squareDistHeightMapCorrection < 0.5 && !this.activeWaypoint) {
            this.shouldLandWhenPossible = false;
            this.fly = false;
            newPOV.setPosition(heightMapSnappedPOVPosition);
          } else if (!this.fly) {
            newPOV.setPosition(heightMapSnappedPOVPosition);
          }
        }

        if (!this.activeWaypoint && this.shouldUnoccupyWaypointsOnceMoving && triedToMove) {
          this.shouldUnoccupyWaypointsOnceMoving = false;
          this.waypointSystem.releaseAnyOccupiedWaypoints();
          if (
            this.fly &&
            this.shouldLandWhenPossible &&
            (shouldResnapToHeightMap && squareDistHeightMapCorrection < 3)
          ) {
            newPOV.setPosition(heightMapSnappedPOVPosition);
            this.shouldLandWhenPossible = false;
            this.fly = false;
          }
        }

        this.movedThisFrame = triedToMove;
      }

      const newX = newPOV.elements[12];
      const newZ = newPOV.elements[14];

      if (
        !this.interaction ||
        (!this.interaction.state.rightHand.held &&
          !this.interaction.state.leftHand.held &&
          !this.interaction.state.leftRemote.held &&
          !this.interaction.state.rightRemote.held)
      ) {
        if (newX > WORLD_MAX_COORD) {
          newPOV.elements[12] = -WORLD_SIZE + newX;
        } else if (newX < WORLD_MIN_COORD) {
          newPOV.elements[12] = WORLD_SIZE + newX;
        }

        if (newZ > WORLD_MAX_COORD) {
          newPOV.elements[14] = -WORLD_SIZE + newZ;
        } else if (newZ < WORLD_MIN_COORD) {
          newPOV.elements[14] = WORLD_SIZE + newZ;
        }
      }

      if (this.jumpYVelocity !== null) {
        const dy = (dt / 1000.0) * this.jumpYVelocity;
        this.jumpYVelocity += JUMP_GRAVITY * (dt / 1000.0);
        const newY = newPOV.elements[13] + dy;

        this.findPOVPositionAboveHeightMap(
          desiredPOVPosition.setFromMatrixPosition(newPOV),
          heightMapSnappedPOVPosition,
          true
        );

        if (newY >= heightMapSnappedPOVPosition.y) {
          newPOV.elements[13] = newY;
        } else {
          newPOV.elements[13] = heightMapSnappedPOVPosition.y;
          this.jumpYVelocity = null;
        }
      }

      childMatch(this.avatarRig.object3D, this.avatarPOV.object3D, newPOV);
      this.relativeMotion.copy(this.nextRelativeMotion);

      if (this.dXZ) {
        this.scene.systems["hubs-systems"].atmosphereSystem.updateWater();
      }

      this.dXZ = 0;
    };
  })();

  findPOVPositionAboveHeightMap = (function() {
    const desiredFeetPosition = new THREE.Vector3();
    // TODO: Here we assume the player is standing straight up, but in VR it is often the case
    // that you want to lean over the edge of a balcony/table that does not have nav mesh below.
    // We should find way to allow leaning over the edge of a balcony and maybe disallow putting
    // your head through a wall.
    return function findPOVPositionAboveHeightMap(desiredPOVPosition, outPOVPosition, shouldSnapImmediately) {
      const playerHeight = getCurrentPlayerHeight(true);
      desiredFeetPosition.copy(desiredPOVPosition);
      desiredFeetPosition.y -= playerHeight;
      this.findPositionOnHeightMap(desiredFeetPosition, outPOVPosition, shouldSnapImmediately);
      outPOVPosition.y += playerHeight;
      return outPOVPosition;
    };
  })();

  findPositionOnHeightMap(end, outPos, shouldSnapImmediately = false) {
    const { terrainSystem } = this;

    const newY = terrainSystem.getTerrainHeightAtWorldCoord(end.x, end.z);

    // Always allow x, z movement, smooth y
    outPos.x = end.x;
    outPos.y = shouldSnapImmediately ? newY : 0.15 * newY + 0.85 * end.y;
    outPos.z = end.z;
  }

  enableFly(enabled) {
    if (enabled && window.APP.hubChannel && window.APP.hubChannel.can("fly")) {
      this.fly = true;
    } else {
      this.fly = false;
    }
    return this.fly;
  }
}

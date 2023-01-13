import { paths } from "./userinput/paths";
import { SOUND_SNAP_ROTATE } from "./sound-effects-system";
import { waitForShadowDOMContentLoaded } from "../utils/async-utils";
import { childMatch, rotateInPlaceAroundWorldUp, affixToWorldUp, IDENTITY_QUATERNION } from "../utils/three-utils";
import { getCurrentPlayerHeight } from "../utils/get-current-player-height";
import { isNextPrevMedia } from "../utils/media-utils";
//import { m4String } from "../utils/pretty-print";
import { WORLD_MAX_COORD, WORLD_MIN_COORD, WORLD_SIZE } from "./terrain-system";
import { projectWalkDirectionOnToNearbyWalls, raycastVerticallyToClosestWalkableSource } from "../utils/walk-utils";
import qsTruthy from "../utils/qs_truthy";

const CHARACTER_MAX_Y = 25;

// Largest vertical distance we can just hop up without additional raycasts.
const MAX_VOX_HOP_SIZE = 1.0;

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
const SNAP_ROTATION_RADIAN = THREE.MathUtils.DEG2RAD * 45;
const BASE_SPEED = 3.2; //TODO: in what units?
const JUMP_GRAVITY = -16.0;
const INITIAL_JUMP_VELOCITY = 5.0;

const isBotMode = qsTruthy("bot_move");

export class CharacterControllerSystem {
  constructor(scene, terrainSystem, builderSystem) {
    this.scene = scene;
    this.terrainSystem = terrainSystem;
    this.fly = builderSystem.enabled;
    this.shouldLandWhenPossible = false;
    this.lastSeenNavVersion = -1;
    this.relativeMotion = new THREE.Vector3(0, 0, 0);
    this.relativeMotionValue = 0;
    this.nextRelativeMotion = new THREE.Vector3(0, 0, 0);
    this.dXZ = 0;
    this.movedThisFrame = false;
    this.jumpYVelocity = null;

    this.scene.addEventListener("terrain_chunk_loaded", () => {
      if (!this.fly) {
        this.shouldLandWhenPossible = true;
      }
    });

    builderSystem.addEventListener("enabledchanged", () => {
      this.fly = builderSystem.enabled;

      if (!this.fly) {
        this.shouldLandWhenPossible = true;
      }
    });

    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPOV = DOM_ROOT.getElementById("avatar-pov-node");
      this.avatarRig = DOM_ROOT.getElementById("avatar-rig");

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
  enqueueRelativeMotion(motion) {
    motion.z *= -1;
    this.relativeMotion.add(motion);
  }
  enqueueInPlaceRotationAroundWorldUp(dXZ) {
    this.dXZ += dXZ;
  }
  shouldFly() {
    return SYSTEMS.builderSystem.enabled;
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

      this.findGroundedPosition(targetForRig, this.avatarRig.object3D.position, true);

      this.avatarRig.object3D.matrixNeedsUpdate = true;

      if (targetWorldRotation) {
        this.avatarRig.object3D.rotation.setFromQuaternion(IDENTITY_QUATERNION);
        this.avatarPOV.object3D.rotation.setFromQuaternion(targetWorldRotation);
        this.avatarPOV.object3D.matrixNeedsUpdate = true;
      }
    };
  })();

  teleportToEntity = (function() {
    const worldAvatarPos = new THREE.Vector3();
    const worldElPos = new THREE.Vector3();
    const delta = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4();
    return function teleportTo(el, distance = 0.0) {
      const obj = el.object3D;
      obj.getWorldPosition(worldElPos);
      this.avatarPOV.object3D.getWorldPosition(worldAvatarPos);
      lookAtMatrix.lookAt(worldAvatarPos, worldElPos, obj.up);
      tmpQuat.setFromRotationMatrix(lookAtMatrix);
      delta.subVectors(worldElPos, worldAvatarPos);
      delta.setLength(delta.length() - distance);
      worldAvatarPos.add(delta);

      this.teleportTo(worldAvatarPos, tmpQuat);
    };
  })();

  teleportToUser(sessionId) {
    const avatarEl = SYSTEMS.avatarSystem.getAvatarElForSessionId(sessionId);

    if (avatarEl) {
      this.teleportToEntity(avatarEl, 5.0);
    }
  }

  tick = (function() {
    const snapRotatedPOV = new THREE.Matrix4();
    const newPOV = new THREE.Matrix4();
    const displacementToDesiredPOV = new THREE.Vector3();

    const desiredPOVPosition = new THREE.Vector3();
    const groundSnappedPOVPosition = new THREE.Vector3();
    const wallRaycastOrigin = new THREE.Vector3();
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const q = new THREE.Quaternion();

    return function tick(t, dt) {
      const entered = this.scene.is("entered");
      if (!entered) return;
      const vrMode = this.scene.is("vr-mode");
      this.sfx = this.sfx || this.scene.systems["hubs-systems"].soundEffectsSystem;
      this.interaction = this.interaction || AFRAME.scenes[0].systems.interaction;

      const userinput = AFRAME.scenes[0].systems.userinput;
      const wasFlying = this.fly;
      const shouldSnapDueToLanding = this.shouldLandWhenPossible;
      const heldEl = this.interaction.state.rightRemote.held || this.interaction.state.leftRemote.held;
      // No jumping while holding due to snap. Can't use action bindings for this since when set changes it will trigger a rising.

      const isHoldingObject = !!heldEl;
      const mayJump =
        SYSTEMS.launcherSystem.enabled &&
        !this.isMotionDisabled &&
        SYSTEMS.cameraSystem.isInAvatarView() &&
        !isHoldingObject;

      if (mayJump && userinput.get(paths.actions.mash) && this.jumpYVelocity === null) {
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
      let snapRotateLeft = userinput.get(paths.actions.snapRotateLeft);
      let snapRotateRight = userinput.get(paths.actions.snapRotateRight);

      if (isBotMode) {
        // Bot mode randomly rotates
        if (Math.random() < 0.01) {
          snapRotateLeft = true;
        } else if (Math.random() < 0.01) {
          snapRotateRight = true;
        }
      }

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
      const characterLift = userinput.get(paths.actions.characterLift);

      if (isBotMode) {
        // Bot mode keeps moving around
        characterAcceleration[1] += 0.75;
      }

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

        this.relativeMotionValue =
          Math.max(Math.abs(characterAcceleration[0]), Math.abs(characterAcceleration[1])) * boost;
      } else {
        this.relativeMotionValue = 0;
      }

      this.avatarPOV.object3D.updateMatrices();

      if (this.fly && characterLift) {
        const hoverEl = this.interaction && this.interaction.state.rightRemote.hovered;

        // Hacky, can't mask out hovering on Q/E'able objects via binding, so do so here.
        if (!hoverEl || !isNextPrevMedia(hoverEl)) {
          m.copy(this.avatarPOV.object3D.matrixWorld).invert();
          m.decompose(v2, q, v2);
          v.set(0, characterLift, 0);
          v.applyQuaternion(q);
          this.relativeMotion.add(v);
        }
      }

      if (this.networkedAvatar) {
        this.networkedAvatar.data.relative_motion = this.relativeMotionValue;
        this.networkedAvatar.data.is_jumping = this.jumpYVelocity !== null && this.jumpYVelocity > 2.5;
      }

      const lerpC = vrMode ? 0 : Math.max(0.66, Math.min(0.975, 0.85 * (16.0 / dt))); // TODO: To support drifting ("ice skating"), motion needs to keep initial direction
      this.nextRelativeMotion.copy(this.relativeMotion).multiplyScalar(lerpC);
      this.relativeMotion.multiplyScalar(1 - lerpC);

      if (!this.isMotionDisabled && SYSTEMS.cameraSystem.isInAvatarView()) {
        rotateInPlaceAroundWorldUp(this.avatarPOV.object3D.matrixWorld, this.dXZ, snapRotatedPOV);

        newPOV.copy(snapRotatedPOV);

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

          // Don't do wall collision checks in build mode so we cannot get stuck
          const shouldCheckForWallCollision = !SYSTEMS.builderSystem.enabled;

          if (shouldCheckForWallCollision) {
            wallRaycastOrigin.x = newPOV.elements[12];
            wallRaycastOrigin.y = newPOV.elements[13] - 0.33 * playerScale; // Move origin to "knee" level
            wallRaycastOrigin.z = newPOV.elements[14];

            const displacementLength = displacementToDesiredPOV.length();

            const wallBlockedWalkDirection = projectWalkDirectionOnToNearbyWalls(
              wallRaycastOrigin,
              displacementToDesiredPOV
            );

            // Something is blocking us
            if (wallBlockedWalkDirection) {
              displacementToDesiredPOV.copy(wallBlockedWalkDirection);
              displacementToDesiredPOV.multiplyScalar(displacementLength);
            }
          }

          newPOV
            .makeTranslation(displacementToDesiredPOV.x, displacementToDesiredPOV.y, displacementToDesiredPOV.z)
            .multiply(snapRotatedPOV);
        }

        const shouldResnapToGround =
          (didStopFlying || shouldSnapDueToLanding || triedToMove) && this.jumpYVelocity === null;

        let squareDistGroundCorrection = 0;

        if (shouldResnapToGround) {
          this.findPOVPositionAboveGround(desiredPOVPosition.setFromMatrixPosition(newPOV), groundSnappedPOVPosition);

          squareDistGroundCorrection = desiredPOVPosition.distanceToSquared(groundSnappedPOVPosition);

          if (this.fly && this.shouldLandWhenPossible && squareDistGroundCorrection < 0.5) {
            this.shouldLandWhenPossible = false;
            this.fly = false;
            newPOV.setPosition(groundSnappedPOVPosition);
          } else if (!this.fly) {
            newPOV.setPosition(groundSnappedPOVPosition);
          }
        }

        if (triedToMove) {
          if (this.fly && this.shouldLandWhenPossible && (shouldResnapToGround && squareDistGroundCorrection < 3)) {
            newPOV.setPosition(groundSnappedPOVPosition);
            this.shouldLandWhenPossible = false;
            this.fly = false;
          }
        }

        this.movedThisFrame = triedToMove;
      }

      const newX = newPOV.elements[12];
      const newZ = newPOV.elements[14];

      // Wrap avatar
      if (
        !this.interaction ||
        (!this.interaction.state.rightHand.held &&
          !this.interaction.state.leftHand.held &&
          !this.interaction.state.leftRemote.held &&
          !this.interaction.state.rightRemote.held &&
          this.terrainSystem.worldTypeWraps())
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

      if (this.fly || this.jumpYVelocity !== null) {
        this.findPOVPositionAboveGround(
          desiredPOVPosition.setFromMatrixPosition(newPOV),
          groundSnappedPOVPosition,
          true
        );
      }

      if (this.jumpYVelocity !== null) {
        const dy = (dt / 1000.0) * this.jumpYVelocity;
        this.jumpYVelocity += JUMP_GRAVITY * (dt / 1000.0);
        const newY = newPOV.elements[13] + dy;

        if (newY >= groundSnappedPOVPosition.y) {
          newPOV.elements[13] = newY;
        } else {
          newPOV.elements[13] = groundSnappedPOVPosition.y;
          this.jumpYVelocity = null;
        }
      }

      if (this.fly) {
        const terrainY = this.terrainSystem.getTerrainHeightAtWorldCoord(newPOV.elements[13], newPOV.elements[15]);

        // Clamp y when flying to be above ground and below high in the sky
        newPOV.elements[13] = Math.max(terrainY + 0.1, Math.min(CHARACTER_MAX_Y, newPOV.elements[13]));
      }

      childMatch(this.avatarRig.object3D, this.avatarPOV.object3D, newPOV);
      this.relativeMotion.copy(this.nextRelativeMotion);

      if (this.dXZ) {
        this.scene.systems["hubs-systems"].atmosphereSystem.updateWater();
      }

      this.dXZ = 0;
    };
  })();

  findPOVPositionAboveGround = (function() {
    const desiredFeetPosition = new THREE.Vector3();
    // TODO: Here we assume the player is standing straight up, but in VR it is often the case
    // that you want to lean over the edge of a balcony/table that does not have nav mesh below.
    // We should find way to allow leaning over the edge of a balcony and maybe disallow putting
    // your head through a wall.
    return function findPOVPositionAboveGround(desiredPOVPosition, outPOVPosition, shouldSnapImmediately) {
      const playerHeight = getCurrentPlayerHeight(true);
      desiredFeetPosition.copy(desiredPOVPosition);
      desiredFeetPosition.y -= playerHeight;

      this.findGroundedPosition(desiredFeetPosition, outPOVPosition, shouldSnapImmediately);
      outPOVPosition.y += playerHeight;
      return outPOVPosition;
    };
  })();

  findGroundedPosition = (function() {
    const origin = new THREE.Vector3();

    return function(end, outPos, shouldSnapImmediately = false) {
      const { terrainSystem } = this;
      const terrainY = terrainSystem.getTerrainHeightAtWorldCoord(end.x, end.z);

      let voxFloorY = -Infinity;

      // Check if there is a vox surface to walk along.
      origin.copy(end);
      origin.y += MAX_VOX_HOP_SIZE;

      let intersection = raycastVerticallyToClosestWalkableSource(origin, false);

      if (intersection !== null) {
        voxFloorY = intersection.point.y;
      }

      // Intersect backsides to find floors above us and determine if we need
      // to jump up to one.
      intersection = raycastVerticallyToClosestWalkableSource(origin, true, true);

      if (intersection !== null) {
        // Check to see if we should jump up to a higher level.
        const aboveFloorHeight = intersection.point.y;
        if (aboveFloorHeight > end.y) {
          // Check if there is an intermediate ceiling below the floor we may jump to.
          if (aboveFloorHeight - end.y >= MAX_VOX_HOP_SIZE) {
            intersection = raycastVerticallyToClosestWalkableSource(origin, true);
            if (intersection === null || intersection.point.y > aboveFloorHeight) {
              voxFloorY = Math.max(voxFloorY, aboveFloorHeight);
            }
          }
        }
      }

      const newY = Math.max(terrainY, voxFloorY);

      // Always allow x, z movement, smooth y
      outPos.x = end.x;
      outPos.y = shouldSnapImmediately ? newY : 0.15 * newY + 0.85 * end.y;

      outPos.z = end.z;
    };
  })();

  enableFly(enabled) {
    if (enabled && window.APP.hubChannel && window.APP.hubChannel.can("fly")) {
      this.fly = true;
    } else {
      this.fly = false;
    }
    return this.fly;
  }

  isMoving() {
    return this.relativeMotion && this.relativeMotion.lengthSq() > 0.1;
  }
}

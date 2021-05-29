import { CONSTANTS } from "three-ammo";
import { isNonNetworkedOrEnsureOwnership } from "../../jel/utils/ownership-utils";

const ACTIVATION_STATE = CONSTANTS.ACTIVATION_STATE;

export class ConstraintsSystem {
  constructor() {
    this.prevLeftHand = {
      held: null,
      hovered: null,
      spawning: false,
      preHoldMatrix: null,
      constraining: true
    };
    this.prevRightHand = {
      held: null,
      hovered: null,
      spawning: false,
      preHoldMatrix: null,
      constraining: true
    };
    this.prevRightRemote = {
      held: null,
      hovered: null,
      spawning: false,
      preHoldMatrix: null,
      constraining: true
    };
    this.prevLeftRemote = {
      held: null,
      hovered: null,
      spawning: false,
      preHoldMatrix: null,
      constraining: true
    };

    this.constraintPairs = {};
  }

  tick() {
    const interaction = AFRAME.scenes[0].systems.interaction;
    if (!interaction.ready) return; //DOMContentReady workaround

    this.tickInteractor(
      "offersHandConstraint",
      interaction.options.leftHand.entity.id,
      interaction.state.leftHand,
      this.prevLeftHand
    );
    this.tickInteractor(
      "offersHandConstraint",
      interaction.options.rightHand.entity.id,
      interaction.state.rightHand,
      this.prevRightHand
    );
    this.tickInteractor(
      "offersRemoteConstraint",
      interaction.options.rightRemote.entity.id,
      interaction.state.rightRemote,
      this.prevRightRemote
    );
    this.tickInteractor(
      "offersRemoteConstraint",
      interaction.options.leftRemote.entity.id,
      interaction.state.leftRemote,
      this.prevLeftRemote
    );

    Object.assign(this.prevLeftHand, interaction.state.leftHand);
    Object.assign(this.prevRightHand, interaction.state.rightHand);
    Object.assign(this.prevRightRemote, interaction.state.rightRemote);
    Object.assign(this.prevLeftRemote, interaction.state.leftRemote);
  }

  tickInteractor(constraintTag, entityId, state, prevState) {
    const isHolding = state.held && state.held.components.tags && state.held.components.tags.data[constraintTag];
    const wasHolding =
      prevState.held && prevState.held.components.tags && prevState.held.components.tags.data[constraintTag];

    // Hold maintained, check other flags on state.
    if (prevState.held === state.held) {
      // Spawning state changed
      if (isHolding && !state.spawning && prevState.spawning && state.constraining) {
        this.addConstraint(entityId, state.held);
      }

      // Constraining state added
      if (isHolding && state.constraining && !prevState.constraining) {
        this.addConstraint(entityId, state.held);
      }

      // Constraining state removed
      if (isHolding && !state.constraining && prevState.constraining) {
        this.removeConstraint(entityId, prevState.held);

        // If nothing is holding, and constraining was turned off, this object is likely going to be
        // moved directly while being held so switch back to kinematic.
        prevState.held.setAttribute("body-helper", { type: "kinematic" });
      }

      return;
    }

    if (wasHolding) {
      // No longer holding
      const heldEntityId = prevState.held.id;
      const pairs = this.constraintPairs[heldEntityId];

      if (!state.constraining || (pairs && pairs.indexOf(entityId) !== -1)) {
        this.removeConstraint(entityId, prevState.held);
      }

      if (!pairs || pairs.length === 0) {
        prevState.held.setAttribute("body-helper", { activationState: ACTIVATION_STATE.ACTIVE_TAG });
      }
    } else if (!state.spawning && state.constraining && isHolding) {
      // Now holding
      this.addConstraint(entityId, state.held);
    }
  }

  // for held objects deleted during the component tick
  release(el) {
    if (this.prevLeftHand.held === el) {
      this.prevLeftHand.held = null;
      this.prevLeftHand.spawning = false;
      this.prevLeftHand.constraining = true;
    }
    if (this.prevLeftHand.held === el) {
      this.prevLeftHand.held = null;
      this.prevLeftHand.spawning = false;
      this.prevLeftHand.constraining = true;
    }
    if (this.prevRightRemote.held === el) {
      this.prevRightRemote.held = null;
      this.prevRightRemote.spawning = false;
      this.prevRightRemote.constraining = true;
    }
    if (this.prevLeftRemote.held === el) {
      this.prevLeftRemote.held = null;
      this.prevLeftRemote.spawning = false;
      this.prevLeftRemote.constraining = true;
    }
  }

  addConstraint(entityId, held) {
    if (!isNonNetworkedOrEnsureOwnership(held)) {
      console.log("Failed to obtain ownership while trying to create constraint on networked object.");
      return;
    }

    const { constraintPairs } = this;

    held.setAttribute("body-helper", {
      type: "dynamic",
      activationState: ACTIVATION_STATE.DISABLE_DEACTIVATION
    });

    const heldEntityId = held.id;
    const { uuid: bodyUuid } = held.components["body-helper"];
    const targetEl = document.getElementById(entityId);
    const { uuid: targetUuid } = targetEl.components["body-helper"];

    if (bodyUuid === -1 || targetUuid === -1) return;

    SYSTEMS.physicsSystem.addConstraint(entityId, bodyUuid, targetUuid, {});

    let pairs = constraintPairs[heldEntityId];

    if (!pairs) {
      pairs = this.constraintPairs[heldEntityId] = [];
    }

    pairs.push(entityId);
  }

  removeConstraint(entityId, held) {
    const { constraintPairs } = this;

    const heldEntityId = held.id;
    const pairs = constraintPairs[heldEntityId];

    if (pairs) {
      pairs.splice(pairs.indexOf(entityId), 1);

      if (pairs.length === 0) {
        delete constraintPairs[heldEntityId];
      }
    }

    SYSTEMS.physicsSystem.removeConstraint(entityId);
  }
}

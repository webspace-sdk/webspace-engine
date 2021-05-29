import { ensureOwnership } from "../utils/ownership-utils";
const MAX_UNDO_STEPS = 32;

export const CHANGE_TYPES = {
  NONE: 0,
  MOVE: 1,
  ROTATE: 2,
  SCALE: 3
};

const UNDO_OPS = {
  NONE: 0,
  UNDO: 1,
  REDO: 2
};

export class UndoSystem {
  constructor() {
    this.undoStacks = new Map();
    this.pendingOps = [];
  }

  register(entity) {
    const { undoStacks } = this;

    const stack = {
      backward: new Array(MAX_UNDO_STEPS).fill(null),
      forward: new Array(MAX_UNDO_STEPS).fill(null),
      types: new Array(MAX_UNDO_STEPS).fill(0),
      position: 0
    };

    undoStacks.set(entity, stack);
  }

  unregister(entity) {
    const { undoStacks } = this;
    undoStacks.delete(entity);
  }

  tick() {
    const { pendingOps } = this;

    for (const [op, entity] of pendingOps) {
      if (op === UNDO_OPS.UNDO) {
        this.applyUndo(entity);
      } else if (op === UNDO_OPS.REDO) {
        this.applyRedo(entity);
      }
    }

    pendingOps.length = 0;
  }

  applyUndo(entity) {
    const { undoStacks } = this;
    const stack = undoStacks.get(entity);
    if (!stack) return;

    const { backward, position } = stack;
    if (!backward[position]) return;

    if (!ensureOwnership(entity)) return;

    const [, { values }] = backward[position];
    this.applyValues(entity, values);
    stack.position--;
  }

  applyRedo(entity) {
    const { undoStacks } = this;
    const stack = undoStacks.get(entity);
    if (!stack) return;

    const { forward, position } = stack;
    if (!forward[position]) return;

    if (!ensureOwnership(entity)) return;

    const [, { values }] = forward[position];
    this.applyValues(entity, values);
    stack.position++;
  }

  applyValues(entity, values) {
    for (const { key, value } of values) {
      switch (key) {
        case "matrix":
          entity.object3D.setMatrix(value);
          break;
      }
    }
  }

  doUndo(entity) {
    this.pendingOps.push([UNDO_OPS.UNDO, entity]);
  }

  doRedo(entity) {
    this.pendingOps.push([UNDO_OPS.REDO, entity]);
  }

  pushMatrixUpdateUndo(entity, type, fromMatrix, toMatrix) {
    const [forwardStep, backwardStep] = this._createStepsForMatrixUpdate(fromMatrix, toMatrix);
    this.pushUndo(entity, type, backwardStep, forwardStep);
  }

  pushUndo(entity, type, backwardStep, forwardStep) {
    const { undoStacks } = this;
    const stack = undoStacks.get(entity);
    if (!stack) return;

    if (stack.position === MAX_UNDO_STEPS - 1) {
      // Stack is full, shift everything over.
      // We could use a circular buffer but then would need to maintain two pointers, this is easier.
      stack.position -= 1;

      for (let i = 0; i < MAX_UNDO_STEPS - 1; i++) {
        stack.forward[i] = stack.forward[i + 1];
        stack.backward[i] = stack.backward[i + 1];
      }
    }

    const { backward, forward, position } = stack;

    // Stack slot at position has pendinges to apply to move forward/backwards.
    const newPosition = position + 1; // We're going to move forwards in the stack.
    backward[newPosition] = [type, backwardStep]; // Add the backwards step
    forward.fill(null, newPosition); // Free residual redos ahead of us
    forward[position] = [type, forwardStep]; // The previous stack frame can now move forward to this one
    stack.position = newPosition;
  }

  _createStepsForMatrixUpdate(fromMatrix, toMatrix) {
    const from = new THREE.Matrix4();
    from.copy(fromMatrix);

    const to = new THREE.Matrix4();
    to.copy(toMatrix);

    const forwardStep = { values: [{ key: "matrix", value: to }] };
    const backwardStep = { values: [{ key: "matrix", value: from }] };

    return [forwardStep, backwardStep];
  }
}

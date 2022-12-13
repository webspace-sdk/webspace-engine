import { ensureOwnership } from "../utils/ownership-utils";
import { canMove } from "../utils/permissions-utils";

const MAX_UNDO_STEPS = 64;

const UNDO_OPS = {
  NONE: 0,
  UNDO: 1,
  REDO: 2
};

export class UndoSystem {
  constructor() {
    this.undoStack = {
      backward: new Array(MAX_UNDO_STEPS).fill(null),
      forward: new Array(MAX_UNDO_STEPS).fill(null),
      position: 0
    };

    this.pendingOps = [];
  }

  register(/*entity*/) {
    // No-op
  }

  unregister(entity) {
    const { undoStack } = this;

    for (const entry of undoStack.backward) {
      if (entry && entry.entity === entity) entry.entity = null;
    }

    for (const entry of undoStack.forward) {
      if (entry && entry.entity === entity) entry.entity = null;
    }
  }

  tick() {
    const { pendingOps } = this;

    for (const op of pendingOps) {
      if (op === UNDO_OPS.UNDO) {
        this.applyUndo();
      } else if (op === UNDO_OPS.REDO) {
        this.applyRedo();
      }
    }

    pendingOps.length = 0;
  }

  applyUndo() {
    this.apply(-1);
  }

  applyRedo() {
    this.apply(1);
  }

  apply(direction) {
    const { undoStack } = this;
    const { backward, forward, position } = undoStack;

    const entries = direction === -1 ? backward : forward;
    if (!entries[position]) return;

    const { entity, values } = entries[position];
    undoStack.position = position + direction;

    if (entity !== null) {
      if (ensureOwnership(entity) && canMove(entity)) {
        this.applyValues(entity, values);
      }
    } else {
      // Entity removed, try again
      this.apply(direction);
    }
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

  doUndo() {
    this.pendingOps.push(UNDO_OPS.UNDO);
  }

  doRedo() {
    this.pendingOps.push(UNDO_OPS.REDO);
  }

  pushMatrixUpdateUndo(entity, fromMatrix, toMatrix) {
    const [forwardStep, backwardStep] = this._createStepsForMatrixUpdate(entity, fromMatrix, toMatrix);
    this.pushUndo(backwardStep, forwardStep);
  }

  pushUndo(backwardStep, forwardStep) {
    const { undoStack } = this;
    const { backward, forward, position } = undoStack;

    if (undoStack.position === MAX_UNDO_STEPS - 1) {
      // Stack is full, shift everything over.
      // We could use a circular buffer but then would need to maintain two pointers, this is easier.
      undoStack.position -= 1;

      for (let i = 0; i < MAX_UNDO_STEPS - 1; i++) {
        undoStack.forward[i] = undoStack.forward[i + 1];
        undoStack.backward[i] = undoStack.backward[i + 1];
      }
    }

    // Stack slot at position has pendinges to apply to move forward/backwards.
    const newPosition = undoStack.position + 1; // We're going to move forwards in the stack.
    backward[newPosition] = backwardStep; // Add the backwards step
    forward.fill(null, newPosition); // Free residual redos ahead of us
    forward[position] = forwardStep; // The previous stack frame can now move forward to this one
    undoStack.position = newPosition;
  }

  clearUndoStacks() {
    this.undoStack.forward.length = 0;
    this.undoStack.backward.length = 0;
    this.undoStack.position = 0;
  }

  _createStepsForMatrixUpdate(entity, fromMatrix, toMatrix) {
    const from = new THREE.Matrix4();
    from.copy(fromMatrix);

    const to = new THREE.Matrix4();
    to.copy(toMatrix);

    const forwardStep = { entity, values: [{ key: "matrix", value: to }] };
    const backwardStep = { entity, values: [{ key: "matrix", value: from }] };

    return [forwardStep, backwardStep];
  }
}

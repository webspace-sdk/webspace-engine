const editableTagNames = ["TEXTAREA", "INPUT"];
import { paths } from "../../hubs/systems/userinput/paths";

export const isInEditableField = () =>
  editableTagNames.includes(document.activeElement && document.activeElement.nodeName) ||
  (document.activeElement &&
    (document.activeElement.contentEditable === "true" ||
      // Hacky, include emoji selector
      (document.activeElement.parentElement &&
        document.activeElement.parentElement.parentElement &&
        document.activeElement.parentElement.parentElement.classList.contains("emoji_completions"))));

export const isFocusedWithin = el => {
  let isFocusedWithin = false;
  let focusedEl = document.activeElement;

  while (focusedEl && focusedEl !== document.body) {
    if (focusedEl === el) {
      isFocusedWithin = true;
      break;
    }

    focusedEl = focusedEl.parentElement;
  }

  return isFocusedWithin;
};

export const toggleFocus = el => {
  if (isFocusedWithin(el)) {
    document.activeElement.blur();
  } else {
    el.focus();
  }
};

export const cancelEventIfFocusedWithin = (e, el) => {
  if (isFocusedWithin(el)) {
    e.preventDefault();
    e.stopPropagation();
  }
};

export const rgbToCssRgb = v => Math.floor(v * 255.0);

export const CURSOR_LOCK_STATES = {
  UNLOCKED: 0,
  PERSISTENT: 1,
  EPHEMERAL: 2
};

let lastCursorLockState = CURSOR_LOCK_STATES.UNLOCKED;
let lastKnownCursorCoords = null;

// Lock the cursor.
//
// Ephemeral lock is used for cases where a user is holding a key
// or button for duration of the clock.
const lockCursor = (ephemeral = false) => {
  const scene = AFRAME.scenes[0];

  if (document.pointerLockElement) {
    // Already locked, but allow an escalation from ephemeral -> persistent.
    if (lastCursorLockState === CURSOR_LOCK_STATES.EPHEMERAL && !ephemeral) {
      lastCursorLockState = CURSOR_LOCK_STATES.PERSISTENT;
      scene.emit("cursor-lock-state-changed");
    }

    return;
  }

  lastCursorLockState = ephemeral ? CURSOR_LOCK_STATES.EPHEMERAL : CURSOR_LOCK_STATES.PERSISTENT;

  const canvas = scene.canvas;
  const userinput = scene.systems.userinput;
  lastKnownCursorCoords = userinput.get(paths.device.mouse.coords);

  lastCursorLockState = ephemeral ? CURSOR_LOCK_STATES.EPHEMERAL : CURSOR_LOCK_STATES.PERSISTENT;
  canvas.requestPointerLock();
  scene.emit("cursor-lock-state-changed");
};

// Fire cursor-lock-state-changed when pointer lock exited
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement) {
    lastCursorLockState = null;
    AFRAME.scenes[0].emit("cursor-lock-state-changed");
  }
});

export const beginEphemeralCursorLock = () => lockCursor(true);
export const beginPersistentCursorLock = () => lockCursor(false);
export const endCursorLock = () => {
  if (!document.pointerLockElement) return;
  document.exitPointerLock();
};

export const releaseEphemeralCursorLock = () => {
  if (!document.pointerLockElement) return;

  if (lastCursorLockState === CURSOR_LOCK_STATES.EPHEMERAL) {
    document.exitPointerLock();
  }
};

export const toggleCursorLock = (ephemeral = false) => {
  const scene = AFRAME.scenes[0];
  const canvas = scene.canvas;

  if (canvas.requestPointerLock) {
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    } else {
      lockCursor(ephemeral);
    }
  }
};

// If the canvas is cursor locked, temporarily release it and re-lock it when
// the canvas is focused again.
export const temporaryReleaseCanvasCursorLock = () => {
  const scene = AFRAME.scenes[0];
  const canvas = scene.canvas;
  if (!canvas.requestPointerLock) return;

  if (document.pointerLockElement === canvas) {
    const wasEphemeral = lastCursorLockState === CURSOR_LOCK_STATES.EPHEMERAL;
    document.exitPointerLock();

    canvas.addEventListener(
      "focus",
      () => {
        toggleCursorLock(wasEphemeral);
      },
      { once: true }
    );
  }
};

export const getCursorLockState = () => {
  if (!document.pointerLockElement) {
    return CURSOR_LOCK_STATES.UNLOCKED;
  } else {
    return lastCursorLockState;
  }
};

export const getLastKnownUnlockedCursorCoords = () => lastKnownCursorCoords;

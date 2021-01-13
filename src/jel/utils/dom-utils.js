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
export const vecRgbToCssRgb = ({ x, y, z }) => `rgba(${rgbToCssRgb(x)}, ${rgbToCssRgb(y)}, ${rgbToCssRgb(z)}, 1.0)`;

export const CURSOR_LOCK_STATES = {
  UNLOCKED_PERSISTENT: 0, // Normal state with cursor
  UNLOCKED_EPHEMERAL: 1, // Unlocked temporarily and should be persistently re-locked on exit
  LOCKED_PERSISTENT: 2, // Persistently locked (eg shift-space toggle)
  LOCKED_EPHEMERAL: 3 // Ephemerally locked (eg transform with panels open)
};

let lockedCursorLockState = null;
let lastKnownCursorCoords = null;
let isEphemerallyUnlocked = false;

// Lock the cursor.
//
// Ephemeral lock is used for cases where a user is holding a key
// or button for duration of the clock.
const lockCursor = (ephemeral = false) => {
  const scene = AFRAME.scenes[0];

  if (ephemeral && lockedCursorLockState === CURSOR_LOCK_STATES.LOCKED_PERSISTENT) return;

  if (document.pointerLockElement) {
    // Already locked, but allow an escalation from ephemeral -> persistent.
    if (lockedCursorLockState === CURSOR_LOCK_STATES.LOCKED_EPHEMERAL && !ephemeral) {
      lockedCursorLockState = CURSOR_LOCK_STATES.LOCKED_PERSISTENT;
      scene.emit("cursor-lock-state-changed");
    }

    return;
  }

  lockedCursorLockState = ephemeral ? CURSOR_LOCK_STATES.LOCKED_EPHEMERAL : CURSOR_LOCK_STATES.LOCKED_PERSISTENT;

  const canvas = scene.canvas;
  const userinput = scene.systems.userinput;
  lastKnownCursorCoords = userinput.get(paths.device.mouse.coords);

  // Emit the event after the pointer lock happens
  document.addEventListener(
    "pointerlockchange",
    () => {
      if (document.pointerLockElement) {
        AFRAME.scenes[0].emit("cursor-lock-state-changed");
      }
    },
    { once: true }
  );

  canvas.requestPointerLock();
};

// Fire cursor-lock-state-changed when pointer lock exited
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement) {
    lockedCursorLockState = null;
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

  if (lockedCursorLockState === CURSOR_LOCK_STATES.LOCKED_EPHEMERAL) {
    document.exitPointerLock();
  }
};

// If the canvas is cursor locked, temporarily release it and re-lock it when
// the canvas is focused again.
export const temporarilyReleaseCanvasCursorLock = () => {
  const scene = AFRAME.scenes[0];
  const canvas = scene.canvas;
  if (!canvas.requestPointerLock) return;

  if (document.pointerLockElement === canvas) {
    isEphemerallyUnlocked = true;
    const wasEphemeral = lockedCursorLockState === CURSOR_LOCK_STATES.LOCKED_EPHEMERAL;
    document.exitPointerLock();

    canvas.addEventListener(
      "focus",
      () => {
        isEphemerallyUnlocked = false;
        lockCursor(wasEphemeral);
      },
      { once: true }
    );
  }
};

export const isCursorLocked = () => !!document.pointerLockElement;

export const getCursorLockState = () => {
  if (isCursorLocked()) {
    return lockedCursorLockState;
  } else {
    return isEphemerallyUnlocked ? CURSOR_LOCK_STATES.UNLOCKED_TEMPORARY : CURSOR_LOCK_STATES.UNLOCKED_PERSISTENT;
  }
};

export const getLastKnownUnlockedCursorCoords = () => lastKnownCursorCoords;

export const cursorIsVisible = () =>
  document.body.classList.contains("show-3d-cursor") || document.body.classList.contains("show-css-cursor");

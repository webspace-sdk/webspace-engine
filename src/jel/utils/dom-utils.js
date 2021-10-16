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
export const objRgbToCssRgb = ({ r, g, b }) => `rgba(${rgbToCssRgb(r)}, ${rgbToCssRgb(g)}, ${rgbToCssRgb(b)}, 1.0)`;
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

let retryLockTimeout = null;

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
      const oldCursorLockState = lockedCursorLockState;
      lockedCursorLockState = CURSOR_LOCK_STATES.LOCKED_PERSISTENT;
      scene.emit("cursor-lock-state-changed", { oldCursorLockState });
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
      if (retryLockTimeout) {
        clearTimeout(retryLockTimeout);
        retryLockTimeout = null;
      }

      if (document.pointerLockElement) {
        const oldCursorLockState = lockedCursorLockState;
        AFRAME.scenes[0].emit("cursor-lock-state-changed", { oldCursorLockState });
      }
    },
    { once: true }
  );

  // Retry pointer lock on error, this can happen during screen sharing dialog for example.
  document.addEventListener("pointerlockerror", () => {
    if (retryLockTimeout) {
      clearTimeout(retryLockTimeout);
    }

    retryLockTimeout = setTimeout(() => canvas.requestPointerLock(), 500);
  });

  canvas.requestPointerLock();
};

// Fire cursor-lock-state-changed when pointer lock exited
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement) {
    const oldCursorLockState = lockedCursorLockState;
    lockedCursorLockState = null;
    AFRAME.scenes[0].emit("cursor-lock-state-changed", { oldCursorLockState });
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

export function downloadText(filename, contentType, text) {
  const element = document.createElement("a");
  element.setAttribute("href", `data:${contentType};charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value").set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }
}

// http://www.nixtu.info/2013/06/how-to-upload-canvas-data-to-server.html
export function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const byteString = atob(dataURI.split(",")[1]);

  // separate out the mime component
  const mimeString = dataURI
    .split(",")[0]
    .split(":")[1]
    .split(";")[0];

  // write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);
  const dw = new DataView(ab);
  for (let i = 0; i < byteString.length; i++) {
    dw.setUint8(i, byteString.charCodeAt(i));
  }

  // write the ArrayBuffer to a blob, and you're done
  return new Blob([ab], { type: mimeString });
}

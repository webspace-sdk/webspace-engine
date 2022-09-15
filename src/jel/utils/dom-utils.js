const editableTagNames = ["TEXTAREA", "INPUT"];
import { WORLD_COLOR_TYPES } from "../../hubs/constants";
import { paths } from "../../hubs/systems/userinput/paths";
import { MAX_WORLD_TYPE } from "../systems/terrain-system";
import { getHubIdFromHistory, getSpaceIdFromHistory, getSeedForHubIdFromHistory } from "./jel-url-utils";
import { WORLD_COLOR_PRESETS } from "./world-color-presets";

export const META_TAG_PREFIX = "webspace";

const VEC_ZERO = { x: 0, y: 0, z: 0 };
const QUAT_IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const COLOR_BLACK = { r: 0, g: 0, b: 0 };
const META_TAG_TERRAIN_TYPE_NAMES = ["unknown", "islands", "hills", "plains", "flat"];

export const isInEditableField = () =>
  editableTagNames.includes(DOM_ROOT.activeElement && DOM_ROOT.activeElement.nodeName) ||
  !!(
    DOM_ROOT.activeElement &&
    (DOM_ROOT.activeElement.contentEditable === "true" ||
      // Hacky, include emoji selector
      (DOM_ROOT.activeElement.parentElement &&
        DOM_ROOT.activeElement.parentElement.parentElement &&
        DOM_ROOT.activeElement.parentElement.parentElement.classList.contains("emoji_completions")))
  );

export const isFocusedWithin = el => {
  let isFocusedWithin = false;
  let focusedEl = DOM_ROOT.activeElement;

  while (focusedEl && focusedEl !== null) {
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
    DOM_ROOT.activeElement?.blur();
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

  const newLockedCursorLockState = ephemeral
    ? CURSOR_LOCK_STATES.LOCKED_EPHEMERAL
    : CURSOR_LOCK_STATES.LOCKED_PERSISTENT;

  const canvas = scene.canvas;
  const userinput = scene.systems.userinput;
  lastKnownCursorCoords = userinput.get(paths.device.mouse.coords);

  // Emit the event after the pointer lock happens
  document.addEventListener(
    "pointerlockchange",
    () => {
      lockedCursorLockState = newLockedCursorLockState;

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
  UI.classList.contains("show-3d-cursor") || DOM_ROOT.getElementById("gaze-cursor").classList.contains("show");

export function downloadText(filename, contentType, text) {
  const element = document.createElement("a");
  element.setAttribute("href", `data:${contentType};charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute("download", filename);

  element.style.display = "none";
  DOM_ROOT.appendChild(element);

  element.click();

  DOM_ROOT.removeChild(element);
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

let currentScreen = null;
let screens = null;

export function getIsWindowAtScreenEdges() {
  const atTopWindowEdge = window.screenY <= window.screen.height - window.screen.availHeight;
  const atRightWindowEdge =
    window.screenX - (window.screen.width - window.screen.availWidth) + window.outerWidth >= window.screen.availWidth;
  const atBottomWindowEdge =
    window.screenY - (window.screen.height - window.screen.availHeight) + window.outerHeight >=
    window.screen.availHeight;
  const atLeftWindowEdge = window.screenX <= window.screen.width - window.screen.availWidth;

  return [atTopWindowEdge, atRightWindowEdge, atBottomWindowEdge, atLeftWindowEdge];
}

// Returns top, right, bottom, left boolean values as true if the current window has no additional pixels past the edge
export async function getIsWindowAtMultimonitorEdges() {
  let [atTopWindowEdge, atRightWindowEdge, atBottomWindowEdge, atLeftWindowEdge] = getIsWindowAtScreenEdges();

  if (!("getScreens" in window)) {
    // Assume no monitors above or below if getScreens not supported.
    return [atTopWindowEdge, false, atBottomWindowEdge, false];
  }

  if (screens === null) {
    const iface = await window.getScreens();
    screens = iface.screens;
    currentScreen = iface.currentScreen;

    iface.addEventListener("screenschange", () => {
      screens = iface.screens;
      currentScreen = iface.currentScreen;
    });
  }

  const hasScreenAbove = !!screens.find(({ top: screenTop }) => screenTop < currentScreen.top);
  const hasScreenBelow = !!screens.find(({ top: screenTop }) => screenTop > currentScreen.top + currentScreen.height);
  const hasScreenLeft = !!screens.find(({ left: screenLeft }) => screenLeft < currentScreen.left);
  const hasScreenRight = !!screens.find(
    ({ left: screenLeft }) => screenLeft > currentScreen.left + currentScreen.width
  );

  if (atTopWindowEdge && hasScreenAbove) {
    atTopWindowEdge = false;
  }

  if (atRightWindowEdge && hasScreenRight) {
    atRightWindowEdge = false;
  }

  if (atBottomWindowEdge && hasScreenBelow) {
    atBottomWindowEdge = false;
  }

  if (atLeftWindowEdge && hasScreenLeft) {
    atLeftWindowEdge = false;
  }

  return [atTopWindowEdge, atRightWindowEdge, atBottomWindowEdge, atLeftWindowEdge];
}

const upsertMetaTag = (name, content) => {
  const el = document.head.querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`);

  if (el) {
    el.setAttribute("content", content);
  } else {
    const newEl = document.createElement("meta");
    newEl.setAttribute("name", `${META_TAG_PREFIX}.${name}`);
    newEl.setAttribute("content", content);
    document.head.appendChild(newEl);
  }
};

const initMetaTag = (name, content) => {
  const el = document.head.querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`);

  if (el) return;

  const newEl = document.createElement("meta");
  newEl.setAttribute("name", `${META_TAG_PREFIX}.${name}`);
  newEl.setAttribute("content", content);
  document.head.appendChild(newEl);
};

export const pushHubMetaUpdateIntoDOM = async hub => {
  const currentHubSeed = await getSeedForHubIdFromHistory();

  if (hub.name !== undefined && document.title !== hub.name) {
    if (hub.name) {
      document.title = hub.name;
    } else {
      document.querySelector("title")?.remove();
    }
  }

  initMetaTag(`environment.type`, "terrain");

  for (const type of WORLD_COLOR_TYPES) {
    const color = hub.world && hub.world[`${type}_color`];

    if (
      color &&
      typeof color.r === "number" &&
      typeof color.g === "number" &&
      typeof color.b === "number" &&
      color.r >= 0.0 &&
      color.r <= 1.0 &&
      color.g >= 0.0 &&
      color.g <= 1.0 &&
      color.b >= 0.0 &&
      color.b <= 1.0
    ) {
      upsertMetaTag(`environment.terrain.colors.${type}`, `${color.r} ${color.g} ${color.b}`);
    } else {
      const defaultColors = WORLD_COLOR_PRESETS[currentHubSeed % WORLD_COLOR_PRESETS.length];
      const color = defaultColors[`${type}_color`];
      initMetaTag(`environment.terrain.colors.${type}`, `${color.r} ${color.g} ${color.b}`);
    }
  }

  const worldType = hub.world?.type;

  if (typeof worldType === "number" && worldType >= 0 && worldType <= MAX_WORLD_TYPE) {
    upsertMetaTag("environment.terrain.type", `${META_TAG_TERRAIN_TYPE_NAMES[worldType]}`);
  } else {
    const worldType = currentHubSeed % 2 === 0 ? "flat" : "hills";
    initMetaTag("environment.terrain.type", worldType);
  }

  const worldSeed = hub.world?.seed;

  if (typeof worldSeed === "number" && worldSeed > 0 && worldSeed <= 127) {
    upsertMetaTag("environment.terrain.seed", `${worldSeed}`);
  } else {
    const worldSeed = Math.floor(currentHubSeed / 2);
    initMetaTag("environment.terrain.seed", `${worldSeed}`);
  }

  const spawnPointPosition = hub.world?.spawn_point?.position;
  if (
    spawnPointPosition &&
    typeof spawnPointPosition.x === "number" &&
    typeof spawnPointPosition.y === "number" &&
    typeof spawnPointPosition.z === "number"
  ) {
    upsertMetaTag(
      "environment.spawn_point.position",
      `${spawnPointPosition.x} ${spawnPointPosition.y} ${spawnPointPosition.z}`
    );
  }

  const spawnPointRotation = hub.world?.spawn_point?.rotation;
  if (
    spawnPointRotation &&
    typeof spawnPointRotation.x === "number" &&
    typeof spawnPointRotation.y === "number" &&
    typeof spawnPointRotation.z === "number" &&
    typeof spawnPointRotation.w === "number"
  ) {
    upsertMetaTag(
      "environment.spawn_point.rotation",
      `${spawnPointRotation.x} ${spawnPointRotation.y} ${spawnPointRotation.z} ${spawnPointRotation.w}`
    );
  }

  const spawnPointRadius = hub.world?.spawn_point?.radius;

  if (typeof spawnPointRadius === "number") {
    upsertMetaTag("environment.spawn_point.radius", `${spawnPointRadius}`);
  }
};

export function getStringFromMetaTags(name, defaultValue = "") {
  return (
    document.head.querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)?.getAttribute("content") || defaultValue
  );
}

export function getIntFromMetaTags(name, defaultValue = 0) {
  try {
    return (
      parseInt(document.head.querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)?.getAttribute("content")) ||
      defaultValue
    );
  } catch {
    return defaultValue;
  }
}

export function getFloatFromMetaTags(name, defaultValue = 0) {
  try {
    return (
      parseFloat(document.head.querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)?.getAttribute("content")) ||
      defaultValue
    );
  } catch {
    return defaultValue;
  }
}

export function getVectorFromMetaTags(name, defaultValue = VEC_ZERO) {
  try {
    const content = document.head
      .querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)
      ?.getAttribute("content")
      ?.split(" ");

    if (content && content.length === 3) {
      return {
        x: parseFloat(content[0]),
        y: parseFloat(content[1]),
        z: parseFloat(content[2])
      };
    } else {
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

export function getColorFromMetaTags(name, defaultValue = COLOR_BLACK) {
  try {
    const content = document.head
      .querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)
      ?.getAttribute("content")
      ?.split(" ");

    if (content && content.length === 3) {
      return {
        r: parseFloat(content[0]),
        g: parseFloat(content[1]),
        b: parseFloat(content[2])
      };
    } else {
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

export function getQuaternionFromMetaTags(name, defaultValue = QUAT_IDENTITY) {
  try {
    const content = document.head
      .querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)
      ?.getAttribute("content")
      ?.split(" ");

    if (content && content.length === 4) {
      return {
        x: parseFloat(content[0]),
        y: parseFloat(content[1]),
        z: parseFloat(content[2]),
        w: parseFloat(content[3])
      };
    } else {
      return defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

export async function getHubMetaFromDOM() {
  const currentHubId = await getHubIdFromHistory();
  const currentSpaceId = await getSpaceIdFromHistory();
  const currentHubSeed = await getSeedForHubIdFromHistory();

  const defaultColors = WORLD_COLOR_PRESETS[currentHubSeed % WORLD_COLOR_PRESETS.length];

  return {
    hub_id: currentHubId,
    space_id: currentSpaceId,
    name: document.title || null,
    url: document.location.origin + document.location.pathname,
    worker_url: getStringFromMetaTags("networking.worker_url", "https://webspace-worker.minddrop.workers.dev"),
    cors_anywhere_url: getStringFromMetaTags("networking.cors_anywhere_url", ""),
    spawn_point: {
      position: getVectorFromMetaTags("environment.spawn_point.position"),
      rotation: getQuaternionFromMetaTags("environment.spawn_point.rotation"),
      radius: getFloatFromMetaTags("environment.spawn_point.radius", 10)
    },
    world: {
      seed: getIntFromMetaTags("environment.terrain.seed"),
      type: META_TAG_TERRAIN_TYPE_NAMES.indexOf(
        getStringFromMetaTags("environment.terrain.type", currentHubSeed % 2 === 0 ? "flat" : "hills")
      ),
      bark_color: getColorFromMetaTags("environment.terrain.colors.bark", defaultColors.bark_color),
      edge_color: getColorFromMetaTags("environment.terrain.colors.edge", defaultColors.edge_color),
      grass_color: getColorFromMetaTags("environment.terrain.colors.grass", defaultColors.grass_color),
      ground_color: getColorFromMetaTags("environment.terrain.colors.ground", defaultColors.ground_color),
      leaves_color: getColorFromMetaTags("environment.terrain.colors.leaves", defaultColors.leaves_color),
      rock_color: getColorFromMetaTags("environment.terrain.colors.rock", defaultColors.rock_color),
      sky_color: getColorFromMetaTags("environment.terrain.colors.sky", defaultColors.sky_color),
      water_color: getColorFromMetaTags("environment.terrain.colors.water", defaultColors.water_color)
    }
  };
}

export function createNewHubDocument(title) {
  const doc = new DOMParser().parseFromString(`<html><head><title></title></head><body></body></html>`, "text/html");
  doc.title = title;

  // Add existing script tags to ensure loading
  for (const script of document.head.querySelectorAll("script")) {
    doc.head.appendChild(script.cloneNode(true));
  }

  return doc;
}

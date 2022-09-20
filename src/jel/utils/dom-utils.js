const editableTagNames = ["TEXTAREA", "INPUT"];
import { WORLD_COLOR_TYPES } from "../../hubs/constants";
import { paths } from "../../hubs/systems/userinput/paths";
import { MAX_WORLD_TYPE } from "../systems/terrain-system";
import { getHubIdFromHistory, getSpaceIdFromHistory, getSeedForHubIdFromHistory } from "./jel-url-utils";
import { WORLD_COLOR_PRESETS } from "./world-color-presets";
import { EmojiToShortname } from "./emojis";
import { parseTransformIntoThree } from "./world-importer";
import { posRotScaleToCssTransform } from "../systems/dom-serialize-system";
import Color from "color";

export const META_TAG_PREFIX = "webspace";

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
      upsertMetaTag(
        `environment.terrain.colors.${type}`,
        Color({ r: Math.floor(color.r * 255), g: Math.floor(color.g * 255), b: Math.floor(color.b * 255) }).hex()
      );
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
    const worldType = currentHubSeed % 2 === 0 ? "plains" : "hills";
    initMetaTag("environment.terrain.type", worldType);
  }

  const worldSeed = hub.world?.seed;

  if (typeof worldSeed === "number" && worldSeed > 0 && worldSeed <= 127) {
    upsertMetaTag("environment.terrain.seed", `${worldSeed}`);
  } else {
    const worldSeed = Math.floor(currentHubSeed / 2);
    initMetaTag("environment.terrain.seed", `${worldSeed}`);
  }

  let spawnPointPosition = hub.world?.spawn_point?.position;
  let spawnPointRotation = hub.world?.spawn_point?.rotation;

  if (spawnPointPosition || spawnPointRotation) {
    spawnPointPosition = spawnPointPosition || new THREE.Vector3(0, 0, 0);
    spawnPointRotation = spawnPointRotation || new THREE.Quaternion(0, 0, 0, 1);

    upsertMetaTag(
      "environment.spawn_point.transform",
      posRotScaleToCssTransform(spawnPointPosition, spawnPointRotation)
    );
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

export function getColorFromMetaTags(name, defaultValue = COLOR_BLACK) {
  try {
    const content = document.head.querySelector(`meta[name='${META_TAG_PREFIX}.${name}']`)?.getAttribute("content");

    if (content) {
      try {
        const color = Color(content).rgb();

        return {
          r: color.red() / 255.0,
          g: color.green() / 255.0,
          b: color.blue() / 255.0
        };
      } catch (e) {
        console.warn("Problem parsing color from meta tag", name, content);
      }
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

  const spawnPos = new THREE.Vector3();
  const spawnRot = new THREE.Quaternion();

  parseTransformIntoThree(getStringFromMetaTags("environment.spawn_point.transform", ""), spawnPos, spawnRot);

  return {
    hub_id: currentHubId,
    space_id: currentSpaceId,
    name: document.title || null,
    url: document.location.origin + document.location.pathname,
    worker_url: getStringFromMetaTags("networking.worker_url", "https://webspace-worker.minddrop.workers.dev"),
    cors_anywhere_url: getStringFromMetaTags("networking.cors_anywhere_url", ""),
    spawn_point: {
      position: spawnPos,
      rotation: spawnRot,
      radius: getFloatFromMetaTags("environment.spawn_point.radius", 10)
    },
    world: {
      seed: getIntFromMetaTags("environment.terrain.seed", currentHubSeed),
      type: META_TAG_TERRAIN_TYPE_NAMES.indexOf(getStringFromMetaTags("environment.terrain.type", "plains")),
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

export async function webspaceHtmlToQuillHtml(html) {
  // Wrap emoji
  html = html.replaceAll(/\p{Emoji_Presentation}/gu, function(match) {
    return `<span class="ql-emojiblot" data-name="${EmojiToShortname.get(
      match
    )}">﻿<span contenteditable="false"><span class="ap">${match}</span></span>﻿<</span>`; // eslint-disable-line
  });

  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");

  for (const el of [...doc.body.children]) {
    // Wrap code
    if (el.tagName === "CODE") {
      const codeBlockContainer = document.createElement("div");
      codeBlockContainer.classList.add("ql-code-block-container");
      codeBlockContainer.setAttribute("spellcheck", "false");
      const codeBlock = document.createElement("div");
      codeBlock.classList.add("ql-code-block");
      codeBlock.innerHTML = el.innerHTML;
      codeBlockContainer.appendChild(codeBlock);
      el.replaceWith(codeBlockContainer);
    }

    // Flatten lists
    if (el.tagName === "OL") {
      const flattenedOl = document.createElement("ol");

      for (const attribute of el.attributes) {
        flattenedOl.setAttribute(attribute.name, attribute.value);
      }

      const flattenedLis = [];

      const visitOl = (ol, depth) => {
        for (const child of ol.children) {
          if (child.tagName === "LI") {
            // Add the indent class to the li
            flattenedLis.push(child);

            if (
              child.style.listStyleType === "decimal" ||
              child.style.listStyleType === "upper-alpha" ||
              child.style.listStyleType === "upper-roman"
            ) {
              child.setAttribute("data-list", "ordered");
            } else {
              child.setAttribute("data-list", "bullet");
            }

            child.style.listStyleType = "";

            if (child.getAttribute("style") === "") {
              child.removeAttribute("style");
            }

            if (depth > 0) {
              child.classList.add(`ql-indent-${depth}`);
            }
          } else if (child.tagName === "OL") {
            visitOl(child, depth + 1);
          }
        }
      };

      visitOl(el, 0);

      for (const li of flattenedLis) {
        li.remove();
        flattenedOl.appendChild(li);
      }

      el.replaceWith(flattenedOl);
    }
  }

  // Insert all ql class names
  const visit = async el => {
    switch (el.style.textAlign) {
      case "center":
        el.classList.add("ql-align-center");
        break;
      case "right":
        el.classList.add("ql-align-right");
        break;
      case "justify":
        el.classList.add("ql-align-justify");
        break;
    }

    if (el.dir === "rtl") {
      el.classList.add("ql-direction-rtl");
      el.dir = "auto";
    }

    el.style.textAlign = "";

    if (el.getAttribute("style") === "") {
      el.removeAttribute("style");
    }

    for (const child of el.children) {
      await visit(child);
    }
  };

  await visit(doc.body);

  return doc.body.innerHTML;
}

export function quillHtmlToWebspaceHtml(html) {
  const doc = new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");

  for (const elOl of doc.querySelectorAll("ol")) {
    // Build nested lists
    let list = elOl;
    let currentIndent = 0;

    for (const li of [...list.children]) {
      let thisIndent = 0;
      let foundIndent = false;

      li.remove();

      for (const liClass of li.classList) {
        if (liClass.startsWith("ql-indent-")) {
          try {
            thisIndent = parseInt(liClass.substring(10));
          } catch (e) {} // eslint-disable-line

          if (thisIndent > currentIndent) {
            const newOl = document.createElement("ol");
            list.appendChild(newOl);
            list = newOl;
            currentIndent = thisIndent;
          } else if (thisIndent < currentIndent) {
            list = list.parentElement;
            currentIndent = thisIndent;
          }

          foundIndent = true;
        }
      }

      if (!foundIndent && currentIndent > 0) {
        list = list.parentElement;
        currentIndent = 0;
      }

      const newLi = document.createElement("li");
      newLi.innerHTML = li.innerHTML;
      for (const attribute of li.attributes) {
        if (attribute.name === "data-list") continue;
        newLi.setAttribute(attribute.name, attribute.value);
      }

      for (const liClass of li.classList) {
        newLi.classList.remove(liClass);
      }

      if (newLi.classList.length === 0) {
        newLi.removeAttribute("class");
      }

      if (li.getAttribute("data-list") === "bullet") {
        newLi.style.listStyleType = null;
      } else if (li.getAttribute("data-list") === "ordered") {
        newLi.style.listStyleType =
          currentIndent === 0 ? "decimal" : currentIndent === 1 ? "upper-alpha" : "upper-roman";
      }

      list.appendChild(newLi);
    }
  }

  // Replace any span with ql-code-block-element with a <code> tag with the same contents
  for (const el of doc.querySelectorAll(".ql-code-block")) {
    const code = document.createElement("code");
    code.innerHTML = el.innerHTML;
    el.parentNode.replaceWith(code);
  }

  // Emoji
  for (const emojiEl of doc.body.querySelectorAll("span.ql-emojiblot span span.ap")) {
    const wrapEl = emojiEl.parentNode.parentNode;
    wrapEl.replaceWith(emojiEl.innerText);
  }

  // Remove and apply all ql- classes
  const visit = el => {
    for (const className of el.classList) {
      if (className.startsWith("ql-")) {
        for (const align of ["ql-center", "ql-right", "ql-justify"]) {
          if (className === align) {
            el.style.textAlign = align.substring(3);
          }
        }

        if (className === "ql-direction-rtl") {
          el.dir = "rtl";
        }

        el.classList.remove(className);
      }
    }

    // If a data-original-src attribute exists, replace the src with it and remove it
    if (el.tagName === "IMG") {
      const originalSrc = el.getAttribute("alt");
      if (originalSrc && originalSrc.startsWith("http")) {
        el.setAttribute("src", originalSrc);
        el.removeAttribute("alt");
      }
    }

    for (const child of el.children) {
      visit(child);
    }
  };

  // Known quill classes not handled:
  // ql-video
  // ql-bg-*
  // ql-color-*
  // ql-font-serif
  // ql-font-monospace
  // ql-size-small
  // ql-size-large
  // ql-size-huge

  visit(doc.body);

  return doc.body.innerHTML;
}

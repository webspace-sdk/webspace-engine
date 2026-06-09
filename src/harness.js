// Runtime harness for the webspace engine.
//
// This module exposes `window.__harness`, a small imperative control surface that
// lets an external driver (e.g. a headless browser script) edit webspaces, drive
// the avatar around, spawn media, and inspect/screenshot the running scene.
//
// It is intentionally built only out of engine runtime globals + a few imported
// engine functions, so the same API works whether the engine is loaded from a
// local file or a dev server. Importing this module is harmless in production;
// it only attaches a global and does no work until called.

import {
  addMedia,
  addMediaInFrontOfPlayer,
  addMediaInFrontOfPlayerIfPermitted,
  coerceToUrl
} from "./utils/media-utils";
import WorldImporter from "./utils/world-importer";
import { docToPrettifiedHtml } from "./utils/dom-utils";

const THREE = AFRAME.THREE;

function getScene() {
  return (window.DOM_ROOT && window.DOM_ROOT.querySelector("a-scene")) || AFRAME.scenes[0];
}

function isEntered() {
  const scene = getScene();
  return !!(scene && scene.is && scene.is("entered"));
}

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => r()));
}

// Wait until the scene has fully entered (avatar spawned, controllable).
async function waitUntilReady(timeoutMs = 60000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (isEntered() && SYSTEMS && SYSTEMS.characterController && SYSTEMS.characterController.avatarPOV) {
      // Give one extra frame so transforms settle.
      await nextFrame();
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("harness: scene did not become ready within " + timeoutMs + "ms (entered=" + isEntered() + ")");
}

function avatarPose() {
  const cc = SYSTEMS.characterController;
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const fwd = new THREE.Vector3();
  if (cc && cc.avatarPOV) {
    cc.avatarPOV.object3D.getWorldPosition(pos);
    cc.avatarPOV.object3D.getWorldQuaternion(quat);
    euler.setFromQuaternion(quat, "YXZ");
    fwd.set(0, 0, -1).applyQuaternion(quat);
  }
  return {
    position: { x: pos.x, y: pos.y, z: pos.z },
    rotationY: euler.y,
    forward: { x: fwd.x, y: fwd.y, z: fwd.z }
  };
}

// Enumerate the spawnable/interactable media entities currently in the world.
function listEntities() {
  const root = window.DOM_ROOT || document;
  const out = [];
  root.querySelectorAll("[media-loader]").forEach(el => {
    let src = null;
    try {
      src = el.getAttribute("media-loader") && el.getAttribute("media-loader").src;
    } catch (e) {} // eslint-disable-line
    const p = new THREE.Vector3();
    if (el.object3D) el.object3D.getWorldPosition(p);
    out.push({
      id: el.id || null,
      src,
      networkId: el.components && el.components.networked && el.components.networked.data.networkId,
      position: { x: p.x, y: p.y, z: p.z }
    });
  });
  return out;
}

const harness = {
  // ---- lifecycle / introspection ----
  isReady: isEntered,
  waitUntilReady,
  pose: avatarPose,
  listEntities,
  scene: getScene,

  info() {
    const scene = getScene();
    return {
      entered: isEntered(),
      protocol: document.location.protocol,
      hubId: window.APP && window.APP.hubChannel && window.APP.hubChannel.hubId,
      canSpawn: !!(window.APP && window.APP.atomAccessManager && window.APP.atomAccessManager.hubCan("spawn_and_move_media")),
      entityCount: listEntities().length,
      pose: avatarPose(),
      sceneStates: scene && scene.states ? [...scene.states] : []
    };
  },

  // ---- movement: drive around as the avatar ----
  // Strafe/forward are in avatar-local units. Positive forward walks toward the
  // direction the avatar faces. Motion is applied over `frames` animation frames
  // so the character controller integrates it (collision + ground snapping).
  async move({ forward = 0, strafe = 0, up = 0, frames = 30 } = {}) {
    const cc = SYSTEMS.characterController;
    for (let i = 0; i < frames; i++) {
      cc.enqueueRelativeMotion(new THREE.Vector3(strafe, up, forward));
      await nextFrame();
    }
    await nextFrame();
    return avatarPose();
  },

  // Turn in place around world-up by `radians` (positive = left).
  async turn(radians, frames = 1) {
    const cc = SYSTEMS.characterController;
    cc.enqueueInPlaceRotationAroundWorldUp(radians);
    for (let i = 0; i < frames; i++) await nextFrame();
    return avatarPose();
  },

  // Hard teleport the avatar to a world position, optionally facing yaw (radians).
  async teleport({ x, y, z, rotationY } = {}) {
    const cc = SYSTEMS.characterController;
    const pos = new THREE.Vector3(x, y, z);
    let quat = null;
    if (typeof rotationY === "number") {
      quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0, "YXZ"));
    }
    cc.teleportTo(pos, quat);
    await nextFrame();
    await nextFrame();
    return avatarPose();
  },

  // ---- media: spawn things into the world ----
  // opts: { url | contents, inFront (default true), zOffset, yOffset, x, y, z, scale }
  async spawnMedia(opts = {}) {
    const { url, inFront = true, zOffset = -2.5, yOffset = 0, x, y, z, scale } = opts;
    const src = url ? coerceToUrl(url) : undefined;
    // addMedia distinguishes "media from a URL" from "media-text from contents" by
    // a STRICT `contents === null` check, and {...defaults, ...options} lets an
    // explicit `undefined` clobber the null default — which would silently turn a
    // URL spawn into an empty text entity. So normalize to null when not provided.
    const contents = opts.contents != null ? opts.contents : null;

    let result;
    if (inFront && x === undefined) {
      result = addMediaInFrontOfPlayerIfPermitted({ src, contents, zOffset, yOffset });
      // Fall back to the unguarded spawn if the webspace's permissions blocked it
      // (the harness is a dev tool and should always be able to place media).
      if (!result || !result.entity) {
        result = addMediaInFrontOfPlayer({ src, contents, zOffset, yOffset });
      }
    } else {
      result = addMedia({ src, contents });
    }

    const entity = result && result.entity;
    if (!entity) throw new Error("harness: media spawn failed (no entity created)");

    // Wait for the media to finish loading so screenshots capture it.
    await new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      ["model-loaded", "image-loaded", "text-loaded", "pdf-loaded", "media-loaded"].forEach(ev =>
        entity.addEventListener(ev, finish, { once: true })
      );
      setTimeout(finish, 15000);
    });

    if (x !== undefined) {
      entity.object3D.position.set(x, y || 0, z || 0);
      entity.object3D.matrixNeedsUpdate = true;
    }
    if (typeof scale === "number") {
      entity.object3D.scale.set(scale, scale, scale);
      entity.object3D.matrixNeedsUpdate = true;
    }

    await nextFrame();
    const p = new THREE.Vector3();
    entity.object3D.getWorldPosition(p);
    return { id: entity.id || null, position: { x: p.x, y: p.y, z: p.z } };
  },

  // Convenience: spawn the built-in duck in front of the player.
  async spawnDuck() {
    getScene().emit("create_action_exec", "duck");
    await new Promise(r => setTimeout(r, 1500));
    return { ok: true };
  },

  // ---- editing the webspace ----
  // Replace (or merge) the world with the given webspace HTML body.
  async setWorldHtml(html, { replaceExisting = true, removeMissing = true } = {}) {
    await new WorldImporter().importHtmlToCurrentWorld(html, replaceExisting, removeMissing);
    await nextFrame();
    return { ok: true, entityCount: listEntities().length };
  },

  // Serialize the current world back out to webspace HTML (round-trippable).
  //
  // The engine's DomSerializeSystem continuously mirrors the live world media into
  // the top-level `document` as the same semantic webspace tags (<img>, <model>,
  // <label>, ...) that WorldImporter re-imports, and that the writeback layer saves
  // to disk. So the canonical webspace HTML is just that serialized document. We
  // force a flush first so freshly-spawned/moved media are included.
  getWorldHtml() {
    const dss = SYSTEMS.domSerializeSystem;
    if (dss && dss.flush) {
      for (let i = 0; i <= dss.maxRegisteredIndex; i++) {
        const el = dss.els[i];
        if (el) dss.enqueueFlushOf(el);
      }
      dss.flush();
    }
    return docToPrettifiedHtml(document.documentElement);
  },

  // Edit the world's environment by recoloring the terrain/atmosphere. Colors are
  // the live world-color channels the in-app environment editor drives:
  //   ground, edge, leaves, bark, rock, grass, sky, water
  // Each value may be a hex string ("#ff8800") or an {r,g,b} object in 0..1.
  // Unspecified channels keep their current color.
  async setEnvironment(settings = {}) {
    const ts = SYSTEMS.terrainSystem;
    const as = SYSTEMS.atmosphereSystem;
    const order = ["ground", "edge", "leaves", "bark", "rock", "grass", "sky", "water"];

    const toRGB = c => {
      if (c == null) return null;
      if (typeof c === "object" && "r" in c) return c;
      const m = String(c).replace("#", "");
      const n = parseInt(m.length === 3 ? m.replace(/(.)/g, "$1$1") : m, 16);
      return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
    };

    const cur = (ts && ts.worldColors) || [];
    const next = order.map((name, i) => (settings[name] != null ? toRGB(settings[name]) : cur[i]));

    if (ts) ts.updateWorldColors(...next);
    if (as) {
      if (settings.sky != null) as.updateSkyColor(toRGB(settings.sky));
      if (settings.water != null) as.updateWaterColor(toRGB(settings.water));
    }
    await nextFrame();
    return { ok: true, colors: order.reduce((o, n, i) => ((o[n] = next[i]), o), {}) };
  },

  // Show/hide the 2D UI overlay (panels, control hints, and modal dialogs such as
  // the file-access prompt). Hiding it yields clean screenshots of just the 3D world.
  setUIVisible(visible = true) {
    const ui = window.UI || (window.DOM_ROOT && window.DOM_ROOT.getElementById("webspace-ui"));
    if (ui) ui.style.display = visible ? "" : "none";
    return { ok: true, visible };
  },

  // Run engine-level events (escape hatch).
  emit(name, detail) {
    getScene().emit(name, detail);
    return { ok: true };
  }
};

window.__harness = harness;

export default harness;

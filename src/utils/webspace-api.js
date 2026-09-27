// window.webspace: the small scripting surface a world's own <script> can use alongside the DOM.
//
//   await webspace.ready;                        // the world has been imported and objects exist
//   webspace.player.position                     // { x, y, z } in meters
//   webspace.state.set("door", "open");          // shared, multiplayer state (last-writer-wins)
//   webspace.state.addEventListener("change", e => e.detail.key ...)
//
// Everything else is the DOM: move objects by setting style.transform, listen for "click",
// "pointerenter" and "pointerleave" on body elements, spawn objects by appending elements.
import { posRotScaleToCssTransform } from "../systems/dom-serialize-system";

const STATE_CHANNEL = "webspace_state";

class SharedState extends EventTarget {
  constructor() {
    super();
    this.entries = new Map(); // key -> { value, clock, clientId }
    this.clock = 0;
    this.connected = false;
  }

  get(key) {
    const e = this.entries.get(key);
    return e ? e.value : undefined;
  }

  has(key) {
    return this.entries.has(key);
  }

  keys() {
    return [...this.entries.keys()];
  }

  toJSON() {
    return Object.fromEntries([...this.entries].map(([k, e]) => [k, e.value]));
  }

  set(key, value) {
    key = String(key);
    const entry = { value: JSON.parse(JSON.stringify(value ?? null)), clock: ++this.clock, clientId: this.clientId() };
    this.apply(key, entry, true);

    if (this.connected) {
      NAF.connection.broadcastCustomDataGuaranteed(STATE_CHANNEL, { body: { entries: [[key, entry]] } });
    }
  }

  clientId() {
    return (window.NAF && NAF.clientId) || "local";
  }

  // Last-writer-wins by (lamport clock, client id)
  apply(key, entry, local = false) {
    const existing = this.entries.get(key);
    this.clock = Math.max(this.clock, entry.clock);

    if (
      existing &&
      (existing.clock > entry.clock || (existing.clock === entry.clock && existing.clientId >= entry.clientId)) &&
      !local
    ) {
      return;
    }

    this.entries.set(key, entry);
    this.dispatchEvent(new CustomEvent("change", { detail: { key, value: entry.value, local } }));
  }

  connect() {
    if (this.connected || !window.NAF || !NAF.connection) return;
    this.connected = true;

    NAF.connection.subscribeToDataChannel(STATE_CHANNEL, (_type, { body }, fromClientId) => {
      if (!body) return;

      // A newcomer asking for everything we know
      if (body.request) {
        this.sendSnapshotTo(fromClientId);
        return;
      }

      if (!Array.isArray(body.entries)) return;
      for (const [key, entry] of body.entries) {
        if (typeof key === "string" && entry && typeof entry.clock === "number") this.apply(key, entry);
      }
    });

    // Bring newcomers up to date (they also ask once their world is ready, in case this arrives too early)
    document.body.addEventListener("clientConnected", ({ detail: { clientId } }) => this.sendSnapshotTo(clientId));
  }

  sendSnapshotTo(clientId) {
    if (this.entries.size === 0 || !clientId) return;
    NAF.connection.sendCustomDataGuaranteed(STATE_CHANNEL, { body: { entries: [...this.entries] } }, clientId);
  }

  requestSnapshot() {
    if (!this.connected) return;
    NAF.connection.broadcastCustomDataGuaranteed(STATE_CHANNEL, { body: { request: true } });
  }
}

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

let resolveReady;
const ready = new Promise(res => (resolveReady = res));
const state = new SharedState();

const rigObject = () => {
  const rig = window.DOM_ROOT && DOM_ROOT.getElementById("avatar-rig");
  return rig && rig.object3D;
};

const player = {
  get position() {
    const o = rigObject();
    if (!o) return null;
    o.getWorldPosition(tmpPos);
    return { x: tmpPos.x, y: tmpPos.y, z: tmpPos.z };
  },

  // The player's pose in the same CSS transform form used by world objects
  get transform() {
    const o = rigObject();
    if (!o) return null;
    o.getWorldPosition(tmpPos);
    o.getWorldQuaternion(tmpQuat);
    return posRotScaleToCssTransform(tmpPos, tmpQuat, null);
  }
};

// Created as soon as the engine script runs, so world scripts can reference it immediately.
export const webspaceApi = Object.assign(new EventTarget(), {
  version: 1,
  ready,
  player,
  state,
  get clientId() {
    return window.NAF ? NAF.clientId : null;
  }
});

window.webspace = webspaceApi;

export function bindWebspaceApiToScene(scene) {
  // Listen for shared state right away: peers send their snapshot when we connect, which can be well
  // before our own world (and its big media) has finished importing.
  state.connect();

  const onState = () => {
    if (!scene.is("document-imported")) return;
    scene.removeEventListener("stateadded", onState);
    // Observe the document before world scripts run, so their first changes are seen
    if (window.SYSTEMS && SYSTEMS.liveDomSystem) SYSTEMS.liveDomSystem.start();
    state.connect();
    state.requestSnapshot();
    resolveReady();
    webspaceApi.dispatchEvent(new CustomEvent("ready"));
  };

  scene.addEventListener("stateadded", onState);
  onState();
}

import { EventTarget } from "event-target-shim";
import { type as vox0, Vox } from "ot-vox";
import { VoxChunk, REMOVE_VOXEL_COLOR } from "ot-vox";

const MAX_FRAMES = 32;
export const DEFAULT_VOX_FRAME_SIZE = 2;

// Syncs are created in response to writes or if another user is
// registered in space presence as writing.
//
// Once a user writes a voxel, their sync is marked as active and
// will "expire" after a duration with no writes.
//
// When a sync expires, it stays subscribed but updates presence to
// mark this user as no longer editing.
//
// Once presence no longer indicates anyone is editing the vox, then
// any syncs on clients for that vox will be diposed.
//
// Number of ms before a sync that has been writing voxels expires.
const EXPIRATION_TIME_MS = 30000;

class VoxDoc {
  constructor() {
    this.handlers = new Map();
    this.data = new Vox([]);
  }

  subscribe(fn) {
    fn();
  }

  unsubscribe() {}

  submitOp(op) {
    vox0.apply(this.data, [op]);
    this.handlers.get("op") && this.handlers.get("op")(op);
  }

  on(event, fn) {
    this.handlers.set(event, fn);
  }

  off(event) {
    this.handlers.delete(event);
  }
}

export default class VoxSync extends EventTarget {
  constructor(voxId) {
    super();

    this._voxId = voxId;
    this._whenReady = null;
    this._lastWriteTime = null;

    this._fireVoxUpdated = this._fireVoxUpdated.bind(this);
  }

  async init(scene) {
    if (!NAF.connection.adapter) {
      await new Promise(res => scene.addEventListener("adapter-ready", res, { once: true }));
    }

    this._connection = NAF.connection.adapter.connection;

    let finish;
    this._whenReady = new Promise(res => (finish = res));

    const doc = new VoxDoc();
    this._doc = doc;

    await new Promise(res => {
      doc.subscribe(() => {
        doc.on("op", this._fireVoxUpdated);
        this._fireVoxUpdated(); // Initialize mesh

        res();
      });
    });

    finish();
  }

  async dispose() {
    await this.whenReady();
    this._whenReady = null;

    if (this._doc) {
      const doc = this._doc;
      doc.off("op", this._fireVoxUpdated);
      doc.unsubscribe();

      this._doc = null;
      this._connection = null;
    }
  }

  async applyChunk(chunk, frame, offset) {
    await this.whenReady();
    this._submitOp({ f: frame, d: chunk.serialize(), o: offset });
  }

  async setVoxel(x, y, z, color, frame = 0) {
    this._ensureFrame(frame);

    const delta = VoxChunk.fromJSON({ size: [1, 1, 1], palette: [color], indices: [1] });
    await this.applyChunk(delta, frame, [x, y, z]);
  }

  async removeVoxel(x, y, z, frame = 0) {
    this._ensureFrame(frame);

    const delta = VoxChunk.fromJSON({ size: [1, 1, 1], palette: [REMOVE_VOXEL_COLOR], indices: [1] });
    await this.applyChunk(delta, frame, [x, y, z]);
  }

  getVox() {
    return this._doc.data;
  }

  _fireVoxUpdated(op, source) {
    this.dispatchEvent(
      new CustomEvent("vox_updated", { detail: { voxId: this._voxId, vox: this._doc.data, op, source } })
    );
  }

  async whenReady() {
    if (this._whenReady) {
      await this._whenReady;
    }
  }

  get permissions() {
    // TODO VOX
    return { edit_vox: true };
  }

  // Attempts to expire this sync, returns true if the sync was transitioned to being expired.
  tryExpire() {
    if (this.isExpired()) return false;

    if (performance.now() - this._lastWriteTime >= EXPIRATION_TIME_MS) {
      this._lastWriteTime = null;
      return true;
    }

    return false;
  }

  isExpired() {
    return this._lastWriteTime === null;
  }

  hasRecentWrites() {
    this.tryExpire();

    return !this.isExpired();
  }

  _submitOp(op) {
    const shouldUpdateVoxIdsInPresence = this.isExpired();
    this._lastWriteTime = performance.now();

    if (shouldUpdateVoxIdsInPresence) {
      // TODO VOX
      // SYSTEMS.voxSystem.updateOpenVoxIdsInPresence();
    }

    this._doc.submitOp(op);
  }

  // Ensures the vox document has the given frame, creating it if not.
  _ensureFrame(idxFrame) {
    if (idxFrame > MAX_FRAMES - 1) return;
    const snapshot = this._doc.data;

    if (snapshot.frames[idxFrame]) return;

    const indices = new Array(DEFAULT_VOX_FRAME_SIZE ** 3);
    indices.fill(0);

    const delta = VoxChunk.fromJSON({
      size: [DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE],
      palette: [],
      indices
    });

    this._submitOp({ f: idxFrame, d: delta.serialize() });
  }
}

window.VoxSync = VoxSync;
window.VoxChunk = VoxChunk;
VoxSync.instance = new VoxSync();

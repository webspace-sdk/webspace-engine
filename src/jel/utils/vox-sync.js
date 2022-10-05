import { EventTarget } from "event-target-shim";
import { Vox } from "../vox/vox";
import { VoxChunk, REMOVE_VOXEL_COLOR } from "../vox/vox-chunk";

import { Builder } from "flatbuffers/js/builder";
import { VoxChunk as SVoxChunk } from "../vox/vox-chunk";
import { ByteBuffer } from "flatbuffers";
const flatbuilder = new Builder(1024 * 1024 * 4);

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

export default class VoxSync extends EventTarget {
  constructor(voxId) {
    super();

    this._voxId = voxId;
    this._lastWriteTime = null;
  }

  async init(scene, vox = null) {
    const { editRingManager } = window.APP;

    if (!NAF.connection.adapter) {
      await new Promise(res => scene.addEventListener("adapter-ready", res, { once: true }));
    }

    this._connection = NAF.connection.adapter.connection;

    this._vox = vox || new Vox([]);
    this._fireVoxUpdated();

    editRingManager.registerRingEditableDocument(this._voxId, this);
  }

  async dispose() {
    const { editRingManager } = window.APP;

    editRingManager.unregisterRingEditableDocument(this._voxId, this);
    this._vox = null;
  }

  async applyChunk(chunk, frame, offset) {
    const { editRingManager } = window.APP;

    flatbuilder.clear();

    flatbuilder.finish(
      SVoxChunk.createVoxChunk(
        flatbuilder,
        chunk.size[0],
        chunk.size[1],
        chunk.size[2],
        chunk.bitsPerIndex,
        SVoxChunk.createPaletteVector(
          flatbuilder,
          new Uint8Array(chunk.palette.buffer, chunk.palette.byteOffset, chunk.palette.byteLength)
        ),
        SVoxChunk.createIndicesVector(flatbuilder, chunk.indices.view)
      )
    );

    const delta = [frame, flatbuilder.asUint8Array(), offset];
    console.log("send delta");

    editRingManager.sendDeltaSync(this._voxId, delta);
    this.applyDeltaSync(this._voxId, delta);

    editRingManager.joinSyncRing(this._voxId);
  }

  getFullSync(docId) {
    if (this._voxId !== docId) {
      console.warn("bad doc id", docId, this._voxId);
      return null;
    }
    // TODO VOX
  }

  applyFullSync(docId /*, data*/) {
    if (this._voxId !== docId) {
      console.warn("bad doc id", docId, this._voxId);
      return null;
    }
    // TODO VOX
  }

  applyDeltaSync(docId, [frame, chunkData, offset]) {
    if (this._voxId !== docId) {
      console.warn("bad doc id", docId, this._voxId);
      return null;
    }

    if (typeof frame !== "number") return null;

    console.log("got chunk", chunkData);
    const voxChunkRef = new SVoxChunk();
    SVoxChunk.getRootAsSVoxChunk(new ByteBuffer(chunkData), voxChunkRef);
    const paletteArray = voxChunkRef.paletteArray();
    const indicesArray = voxChunkRef.indicesArray();
    const size = [voxChunkRef.sizeX(), voxChunkRef.sizeY(), voxChunkRef.sizeZ()];
    console.log(size);

    const voxChunk = new VoxChunk(
      size,
      paletteArray.buffer,
      indicesArray.buffer,
      voxChunkRef.bitsPerIndex(),
      paletteArray.byteOffset,
      paletteArray.byteLength,
      indicesArray.byteOffset,
      indicesArray.byteLength
    );

    const vox = this._vox;

    if (!vox.frames[frame]) {
      while (this.data.frames.length < frame + 1) {
        vox.frames.push(null);
      }

      vox.frames[frame] = voxChunk;
    } else {
      voxChunk.applyToChunk(vox.frames[frame], offset[0] || 0, offset[1] || 0, offset[2] || 0);
    }

    this._fireVoxUpdated(frame);
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
    return this._vox;
  }

  _fireVoxUpdated(frame = 0) {
    this.dispatchEvent(new CustomEvent("vox_updated", { detail: { voxId: this._voxId, vox: this._vox, frame } }));
  }

  // Attempts to expire this sync, returns true if the sync was transitioned to being expired.
  tryExpire() {
    const { editRingManager } = window.APP;

    if (this.isExpired()) return false;

    if (performance.now() - this._lastWriteTime >= EXPIRATION_TIME_MS) {
      this._lastWriteTime = null;
      editRingManager.leaveSyncRing(this._voxId);

      return true;
    }

    return false;
  }

  isExpired() {
    return this._lastWriteTime === null;
  }

  // Ensures the vox document has the given frame, creating it if not.
  _ensureFrame(idxFrame) {
    if (idxFrame > MAX_FRAMES - 1) return;
    const snapshot = this._doc.data;

    if (snapshot.frames[idxFrame]) return;
    const { editRingManager } = window.APP;

    const indices = new Array(DEFAULT_VOX_FRAME_SIZE ** 3);
    indices.fill(0);

    const delta = VoxChunk.fromJSON({
      size: [DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE, DEFAULT_VOX_FRAME_SIZE],
      palette: [],
      indices
    });

    editRingManager.sendDeltaSync(this._voxId, delta);
    this.applyDeltaSync(this._voxId, delta);
  }
}

window.VoxSync = VoxSync;
window.VoxChunk = VoxChunk;
VoxSync.instance = new VoxSync();

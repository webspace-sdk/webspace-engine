import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { VoxChunk, voxColorForRGBT, VOXEL_TYPE_DIFFUSE, REMOVE_VOXEL_COLOR } from "ot-vox";

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
    this._whenReady = null;
    this._lastWriteTime = null;

    this._fireVoxUpdated = this._fireVoxUpdated.bind(this);
  }

  async init(scene) {
    if (!SAF.connection.adapter) {
      await new Promise(res => scene.addEventListener("shared-adapter-ready", res, { once: true }));
    }

    this._connection = SAF.connection.adapter.connection;

    let finish;
    this._whenReady = new Promise(res => (finish = res));

    const doc = this._connection.get("vox", this._voxId);
    this._doc = doc;

    await this._refreshPermissions();

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
    if (this._whenReady) await this._whenReady;
    this._whenReady = null;

    if (this._doc) {
      const doc = this._doc;
      doc.off("op", this._fireVoxUpdated);
      doc.unsubscribe();

      this._doc = null;
      this._connection = null;
    }

    if (this._refreshPermsTimeout) clearTimeout(this._refreshPermsTimeout);
  }

  async setVoxel(x, y, z, r, g, b, frame = 0) {
    this._ensureFrame(frame);

    const color = voxColorForRGBT(r, g, b, VOXEL_TYPE_DIFFUSE);
    const delta = VoxChunk.fromJSON({ size: [1, 1, 1], palette: [color], indices: [1] });
    this._submitOp({ f: frame, d: delta.serialize(), o: [x, y, z] });
  }

  async removeVoxel(x, y, z, frame = 0) {
    this._ensureFrame(frame);

    const delta = VoxChunk.fromJSON({ size: [1, 1, 1], palette: [REMOVE_VOXEL_COLOR], indices: [1] });
    this._submitOp({ f: frame, d: delta.serialize(), o: [x, y, z] });
  }

  _fireVoxUpdated(op, source) {
    this.dispatchEvent(
      new CustomEvent("vox_updated", { detail: { voxId: this._voxId, vox: this._doc.data, op, source } })
    );
  }

  async _refreshPermissions() {
    const { accountChannel } = window.APP;
    const { permsToken: token } = await accountChannel.fetchVoxPermsToken(this._voxId);

    // Note: token is not verified.
    this._permissions = jwtDecode(token);

    // Refresh the token 1 minute before it expires. Refresh at most every 60s.
    if (this._refreshPermsTimeout) clearTimeout(this._refreshPermsTimeout);
    const nextRefresh = new Date(this._permissions.exp * 1000 - 60 * 1000) - new Date();
    this._refreshTimeout = setTimeout(async () => await this._refreshPermissions(), Math.max(nextRefresh, 60000));

    if (this._connection) {
      this._connection.send({ a: "refresh_authorization", token });
    }
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
      SYSTEMS.voxSystem.updateOpenVoxIdsInPresence();
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

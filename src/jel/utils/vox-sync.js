import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { VoxChunk, voxColorForRGBT, VOXEL_TYPE_DIFFUSE, REMOVE_VOXEL_COLOR } from "ot-vox";

const MAX_FRAMES = 32;
const INITIAL_FRAME_SIZE = 32;

export default class VoxSync extends EventTarget {
  constructor(voxId) {
    super();

    this._voxId = voxId;
    this._whenReady = null;
    this.handleDocOp = this.handleDocOp.bind(this);
  }

  async init() {
    this._connection = SAF.connection.adapter.connection;

    let finish;
    this._whenReady = new Promise(res => (finish = res));

    const doc = this._connection.get("vox", this._voxId);
    this._doc = doc;

    await new Promise(res => {
      doc.subscribe(() => {
        doc.on("op", this.handleDocOp);
        res();
      });
    });

    finish();
  }

  async dispose() {
    if (this._whenReady) await this._whenReady;

    if (this._doc) {
      const doc = this._doc;
      doc.off("op", this.handleDocOp);
      doc.unsubscribe();

      this._doc = null;
      this._connection = null;
    }

    VoxSync.delete(this._voxId);
    if (this._refreshPermsTimeout) clearTimeout(this._refreshPermsTimeout);
  }

  // Ensures the vox document has the given frame, creating it if not.
  ensureFrame(idxFrame) {
    if (idxFrame > MAX_FRAMES - 1) return;
    const snapshot = this._doc.data;

    if (snapshot.frames[idxFrame]) return;

    const indices = new Array(INITIAL_FRAME_SIZE ** 3);
    indices.fill(0);

    const delta = VoxChunk.fromJSON({
      size: INITIAL_FRAME_SIZE,
      palette: [],
      indices
    });

    this._doc.submitOp({ f: idxFrame, d: delta.serialize() });
  }

  async ensureEditing() {
    if (this._permissions) return;

    // If we're editing this object, we need to keep polling for permissions
    // (vox objects can be read by everyone.)
    await this.refreshPermissions();
  }

  async setVoxel(x, y, z, r, g, b, frame = 0) {
    await this.ensureEditing();
    this.ensureFrame(frame);

    const color = voxColorForRGBT(r, g, b, VOXEL_TYPE_DIFFUSE);
    const delta = VoxChunk.fromJSON({ size: 1, palette: [color], indices: [1] });
    const op = { f: frame, d: delta.serialize(), o: [x, y, z] };

    this._doc.submitOp(op);
  }

  async removeVoxel(x, y, z, frame = 0) {
    await this.ensureEditing();
    this.ensureFrame(0);

    const delta = VoxChunk.fromJSON({ size: 1, palette: [REMOVE_VOXEL_COLOR], indices: [1] });
    const op = { f: frame, d: delta.serialize(), o: [x, y, z] };
    this._doc.submitOp(op);
  }

  getLatestVox() {
    return this._doc.data;
  }

  handleDocOp(op, source) {
    this.dispatchEvent(
      new CustomEvent("vox_updated", { detail: { voxId: this._voxId, vox: this._doc.data, op, source } })
    );
  }

  async refreshPermissions() {
    const { accountChannel } = window.APP;
    const { permsToken: token } = await accountChannel.fetchVoxPermsToken(this._voxId);

    // Note: token is not verified.
    this._permissions = jwtDecode(token);

    // Refresh the token 1 minute before it expires. Refresh at most every 60s.
    if (this._refreshPermsTimeout) clearTimeout(this._refreshPermsTimeout);
    const nextRefresh = new Date(this._permissions.exp * 1000 - 60 * 1000) - new Date();
    this._refreshTimeout = setTimeout(async () => await this.refreshPermissions(), Math.max(nextRefresh, 60000));
    this._connection.send({ a: "refresh_authorization", token });
  }
}

window.VoxSync = VoxSync;
window.VoxChunk = VoxChunk;
VoxSync.instance = new VoxSync();

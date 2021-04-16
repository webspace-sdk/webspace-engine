import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { VoxSnapshot, VoxChunk, voxColorForRGBT, VOXEL_TYPE_DIFFUSE, REMOVE_VOXEL_COLOR } from "ot-vox";

const MAX_FRAMES = 32;
const INITIAL_FRAME_SIZE = 32;

export default class VoxSync extends EventTarget {
  constructor(voxId) {
    super();
    this._voxId = voxId;

    // Map of <F << 24 | X << 16 | Y << 8 | Z> -> offset in data subarray to determine
    // if insert or update when changing voxels.
    this._offsetIndex = new Map();
  }

  async init(connection) {
    this._connection = connection;

    await this.refreshPermissions();

    const doc = connection.get("vox", this._voxId);
    this._doc = doc;

    await new Promise(res => {
      doc.subscribe(() => {
        doc.on("op", this.handleDocOp);
        res();
      });
    });
  }

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

  setVoxel(x, y, z, r, g, b, frame = 0) {
    this.ensureFrame(0);

    const color = voxColorForRGBT(r, g, b, VOXEL_TYPE_DIFFUSE);
    const delta = VoxChunk.fromJSON({ size: 1, palette: [color], indices: [1] });
    const op = { f: frame, d: delta.serialize() };

    this._doc.submitOp(op);
  }

  removeVoxel(x, y, z, frame = 0) {
    this.ensureFrame(0);

    const delta = VoxChunk.fromJSON({ size: 1, palette: [REMOVE_VOXEL_COLOR], indices: [1] });
    this._doc.submitOp({ f: frame, d: delta.serialize() });
  }

  handleDocOp(o, source) {
    console.log("Op", o, source);
  }

  dispose() {
    if (this._refreshPermsTimeout) clearTimeout(this._refreshPermsTimeout);
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

VoxSync.instance = new VoxSync();

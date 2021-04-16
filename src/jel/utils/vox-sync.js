import jwtDecode from "jwt-decode";
import { EventTarget } from "event-target-shim";
import { VoxChunk } from "ot-vox";

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

        // Frames
        if (!doc.data.f) {
          doc.submitOp([{ p: ["f"], oi: [] }]);
          doc.submitOp([{ p: ["f", 0], li: null }]);
          doc.submitOp([{ p: ["f", 0], t: "vox0", o: { d: new VoxChunk(32).serialize() } }]);
        }

        res();
      });
    });
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

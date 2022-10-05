const { VoxChunk } = require("./vox_chunk");

class Vox {
  constructor(frames) {
    this.frames = frames;
  }

  static fromJSON(s) {
    const obj = typeof s === "string" ? JSON.parse(s) : s;
    return new Vox(obj.f.map(d => d && VoxChunk.deserialize(d)));
  }

  toJSON() {
    return { f: this.frames.map(f => f && f.serialize()) };
  }
}

module.exports = { Vox };

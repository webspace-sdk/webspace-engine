import Chunk from "./chunk";
import {protocol} from "../protocol/protocol";
import Generators from "./generator";
import PALETTES from "./palettes";

const Chunks = protocol.Chunks;

class World {
  constructor({ blockTypes, generatorType, seed }) {
    this.models = {};

    this.chunks = new Map();
    this.seed = seed && !Number.isNaN(seed) ? seed % 65536 : Math.floor(Math.random() * 65536);
    this.generatorType = generatorType;
    this.generator = Generators({ blockTypes, generator: generatorType, palettes: PALETTES, seed });
  }

  getChunk({ x, z }) {
    const { chunks } = this;
    const key = `${x}:${z}`;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunk = new Chunk({ world: this, x, z });
      chunks.set(key, chunk);
    }
    return chunk;
  }

  getEncodedChunk(x, z) {
    const chunk = this.getChunk({ x, z });
    if (!chunk.meshes) {
      chunk.remesh(this.seed, this.models);
    }

    const chunks = Chunks.create({ chunks: [chunk] });
    const buffer = Chunks.encode(chunks).finish();
    return buffer;
  }

  onChunkRequest(req, res) {
    let { x, z } = req.params || {};
    x = parseInt(x, 10);
    z = parseInt(z, 10);
    if (Number.isNaN(x) || Number.isNaN(z)) {
      res.status(404).error("Not found");
      return;
    }
    const encoded = this.getEncodedChunk(x, z, false);
    this.unloadChunks();

    res.send(encoded);
  }

  persist() {
    const { chunks } = this;
    chunks.forEach(chunk => {
      if (chunk.needsPersistence) {
        chunk.persist();
      }
    });
  }

  unloadChunks() {
    const { maxLoadedChunks } = World;
    const { chunks } = this;
    while (chunks.size > maxLoadedChunks) {
      const [oldestKey, oldestChunk] = chunks.entries().next().value;
      if (oldestChunk.needsPersistence) {
        oldestChunk.persist();
      }
      chunks.delete(oldestKey);
    }
  }
}

World.maxLoadedChunks = 1024;

export default World;

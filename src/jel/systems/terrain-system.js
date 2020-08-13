import Pako from "pako";
import { protocol } from "../protocol/protocol";

const TERRAIN_RADIUS = 2;

const keyForChunk = ({ x, z }) => `${x}_${z}`;

const decodeChunks = buffer => {
  if (buffer[0] === 0x78 && buffer[1] === 0x9c) {
    buffer = Pako.inflate(buffer);
  }
  const chunks = protocol.Chunks.decode(buffer);
  return chunks.chunks;
};

export class TerrainSystem {
  constructor() {
    this.avatarPovEl = document.getElementById("avatar-pov-node");
    this.avatarRigEl = document.getElementById("avatar-rig");
    this.avatarChunk = new THREE.Vector3(Infinity, 0, Infinity);
    this.loadedChunks = new Map();
    this.loadingChunks = new Map();

    const grid = [];
    const center = new THREE.Vector3();

    for (let x = -TERRAIN_RADIUS; x <= TERRAIN_RADIUS; x += 1) {
      for (let z = -TERRAIN_RADIUS; z <= TERRAIN_RADIUS; z += 1) {
        const chunk = new THREE.Vector3(x, 0, z);
        if (chunk.distanceTo(center) <= TERRAIN_RADIUS) {
          grid.push(chunk);
        }
      }
    }
    grid.sort((a, b) => a.distanceTo(center) - b.distanceTo(center));

    this.renderGrid = grid;
  }

  loadChunk(chunk) {
    const { loadedChunks, loadingChunks } = this;
    const key = keyForChunk(chunk);
    if (loadedChunks.has(key) || loadingChunks.has(key)) return;

    fetch(`https://hubs.local:8003/chunks/${chunk.x}/${chunk.z}/1`).then(res => {
      res.text().then(b64 => {
        // TODO avoid atob
        // const encoded = Base64Binary.decodeArrayBuffer(b64);
        const encoded = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const chunks = decodeChunks(encoded);
        this.chunksLoaded(chunks);
      });
    });

    loadingChunks.set(key, chunk);
  }

  chunksLoaded(chunks) {
    chunks.forEach(({ x, /*height, */ z /*, meshes, features*/ }) => {
      const key = keyForChunk({ x, z });
      if (!this.loadedChunks.has(key) && !this.loadingChunks.has(key)) return;

      this.loadedChunks.set(key, { x, z });
      this.loadingChunks.delete(key);
      console.log(`loaded ${x} ${z}`);
    });
  }

  unloadChunk(chunk) {
    const { loadedChunks } = this;
    const key = keyForChunk(chunk);
    loadedChunks.delete(key);
  }

  tick = (function() {
    const avatarPos = new THREE.Vector3();
    const chunk = new THREE.Vector3();
    const v = new THREE.Vector3();

    return function() {
      const { loadedChunks, loadingChunks, avatarChunk, renderGrid } = this;
      const avatar = this.avatarPovEl.object3D;

      avatar.getWorldPosition(avatarPos);

      // Get chunk space coordinate
      chunk
        .copy(avatarPos)
        .divideScalar(8)
        .floor();

      chunk.y = 0;

      if (!chunk.equals(avatarChunk)) {
        const hasCrossedBorder = avatarChunk.x !== chunk.x || avatarChunk.z !== chunk.z;
        avatarChunk.copy(chunk);

        if (hasCrossedBorder) {
          const maxDistance = TERRAIN_RADIUS * 1.25;
          loadedChunks.forEach(chunk => {
            if (avatarChunk.distanceTo(v.set(chunk.x, avatarPos.y, chunk.z)) > maxDistance) {
              this.unloadChunk(chunk);
            }
          });
          loadingChunks.forEach((chunk, key) => {
            if (avatarChunk.distanceTo(v.set(chunk.x, avatarPos.y, chunk.z)) > maxDistance) {
              loadingChunks.delete(key);
            }
          });
          renderGrid.forEach(({ x, z }) => {
            this.loadChunk({ x: avatarChunk.x + x, z: avatarChunk.z + z });
          });
        }
      }
    };
  })();
}

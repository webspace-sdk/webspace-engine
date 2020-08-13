import Pako from "pako";
import { protocol } from "../protocol/protocol";
import Terrain from "../objects/terrain";

const TERRAIN_RADIUS = 2;
const RENDER_GRID = [];
const SUBCHUNKS = 1;
const center = new THREE.Vector3();

for (let x = -TERRAIN_RADIUS; x <= TERRAIN_RADIUS; x += 1) {
  for (let z = -TERRAIN_RADIUS; z <= TERRAIN_RADIUS; z += 1) {
    const chunk = new THREE.Vector3(x, 0, z);
    if (chunk.distanceTo(center) <= TERRAIN_RADIUS) {
      RENDER_GRID.push(chunk);
    }
  }
}
RENDER_GRID.sort((a, b) => a.distanceTo(center) - b.distanceTo(center));

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
    this.pool = [...Array(RENDER_GRID.length)].map(() => new Terrain());
    this.loadedChunks = new Map();
    this.loadingChunks = new Map();
    this.terrains = new Map();
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
    const { loadedChunks, loadingChunks, terrains, pool } = this;

    chunks.forEach(({ x, height, z, meshes /*features*/ }) => {
      const key = keyForChunk({ x, z });
      if (!loadedChunks.has(key) && !loadingChunks.has(key)) return;

      loadedChunks.set(key, { x, z });
      loadingChunks.delete(key);

      meshes.forEach((geometries, subchunk) => {
        const key = `${x}:${z}:${subchunk}`;
        let terrain = terrains.get(key);

        if (!terrain) {
          terrain = pool.shift();

          if (!terrain) {
            terrain = new Terrain();
          }
        }

        terrain.update({
          chunk: { x, y: subchunk, z, height },
          geometries
        });

        // TODO add to entity
        terrains.set(key, terrain);
      });
    });
  }

  unloadChunk(chunk) {
    const { loadedChunks, pool, terrains } = this;
    const key = keyForChunk(chunk);
    loadedChunks.delete(key);

    for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk += 1) {
      const subkey = `${key}:${subchunk}`;
      const terrain = terrains.get(subkey);

      if (terrain) {
        // TODO remove from entity
        terrains.delete(subkey);
        pool.push(terrain);
      }
    }
  }

  tick = (function() {
    const avatarPos = new THREE.Vector3();
    const chunk = new THREE.Vector3();
    const v = new THREE.Vector3();

    return function() {
      const { terrains, loadedChunks, loadingChunks, avatarChunk } = this;
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
          RENDER_GRID.forEach(({ x, z }) => {
            this.loadChunk({ x: avatarChunk.x + x, z: avatarChunk.z + z });
          });
        }
      }

      // Sort render order for chunks
      terrains.forEach(terrain => {
        const dist = Math.abs(avatarChunk.x - terrain.chunk.x) + Math.abs(avatarChunk.z - terrain.chunk.z);
        terrain.renderOrder = dist + 10; // Render from front to back.
      });
    };
  })();
}

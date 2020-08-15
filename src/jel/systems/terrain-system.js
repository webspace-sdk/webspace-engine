import Pako from "pako";
import { protocol } from "../protocol/protocol";
import Terrain from "../objects/terrain";
import { WORLD_MIN_COORD, WORLD_MAX_COORD } from "./wrapped-entity-system";

const { Vector3 } = THREE;

const LOAD_RADIUS = 4;
const VOXEL_SIZE = 1 / 8;
const VOXELS_PER_CHUNK = 64;
const CHUNK_WORLD_SIZE = VOXELS_PER_CHUNK * VOXEL_SIZE;
const MIN_CHUNK_COORD = Math.floor(WORLD_MIN_COORD / CHUNK_WORLD_SIZE);
const MAX_CHUNK_COORD = Math.floor(WORLD_MAX_COORD / CHUNK_WORLD_SIZE);
const RENDER_GRID = [];
const SUBCHUNKS = 1;
const center = new THREE.Vector3();

const normalizeChunkCoord = c => {
  if (c < MIN_CHUNK_COORD) {
    return MAX_CHUNK_COORD + c - MIN_CHUNK_COORD + 1;
  } else if (c > MAX_CHUNK_COORD) {
    return MIN_CHUNK_COORD + (c - MAX_CHUNK_COORD - 1);
  } else {
    return c;
  }
};

for (let x = -LOAD_RADIUS; x <= LOAD_RADIUS; x += 1) {
  for (let z = -LOAD_RADIUS; z <= LOAD_RADIUS; z += 1) {
    const chunk = new THREE.Vector3(x, 0, z);
    if (chunk.distanceTo(center) <= LOAD_RADIUS) {
      RENDER_GRID.push(chunk);
    }
  }
}
RENDER_GRID.sort((a, b) => a.distanceTo(center) - b.distanceTo(center));

const keyForChunk = ({ x, z }) => `${x}:${z}`;

const decodeChunks = buffer => {
  if (buffer[0] === 0x78 && buffer[1] === 0x9c) {
    buffer = Pako.inflate(buffer);
  }
  const chunks = protocol.Chunks.decode(buffer);
  return chunks.chunks;
};

export class TerrainSystem {
  constructor(scene) {
    this.avatarPovEl = document.getElementById("avatar-pov-node");
    this.avatarRigEl = document.getElementById("avatar-rig");
    this.avatarChunk = new THREE.Vector3(Infinity, 0, Infinity);
    this.pool = [...Array(RENDER_GRID.length)].map(() => new Terrain());
    this.loadedChunks = new Map();
    this.loadingChunks = new Map();
    this.terrains = new Map();
    this.entities = new Map();

    for (let x = MIN_CHUNK_COORD; x <= MAX_CHUNK_COORD; x++) {
      for (let z = MIN_CHUNK_COORD; z <= MAX_CHUNK_COORD; z++) {
        for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk++) {
          const pos = new Vector3(
            x * CHUNK_WORLD_SIZE + CHUNK_WORLD_SIZE / 2,
            0,
            z * CHUNK_WORLD_SIZE + CHUNK_WORLD_SIZE / 2
          );
          const el = document.createElement("a-entity");
          const key = `${keyForChunk({ x, z })}:${subchunk}`;
          //el.setAttribute("text", `value: ${key}; width: 150; align:center; position: 0 10 0;`);
          //el.setAttribute("text-raycast-hack", "");
          el.setAttribute("wrapped-entity", "");
          scene.appendChild(el);
          el.object3D.position.copy(pos);
          el.object3D.scale.setScalar(1 / 16);
          el.object3D.matrixNeedsUpdate = true;
          //const box = new Box3();
          //box.setFromCenterAndSize(
          //  new Vector3(0, 2, 0),
          //  new Vector3(CHUNK_WORLD_SIZE, CHUNK_WORLD_SIZE, CHUNK_WORLD_SIZE)
          //);
          //el.object3D.add(new Box3Helper(box));
          this.entities.set(key, el);
        }
      }
    }
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
    const { entities, loadedChunks, loadingChunks, terrains, pool } = this;

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

        terrains.set(key, terrain);
        terrain.position.set(0, 0, 0);
        terrain.matrixNeedsUpdate = true;

        entities.get(key).setObject3D("mesh", terrain);
      });
    });
  }

  unloadChunk(chunk) {
    const { entities, loadedChunks, pool, terrains } = this;
    const key = keyForChunk(chunk);
    loadedChunks.delete(key);

    for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk += 1) {
      const subkey = `${key}:${subchunk}`;
      const terrain = terrains.get(subkey);
      const entity = entities.get(subkey);

      if (entity) {
        entity.removeObject3D("mesh");
      }

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

    return function() {
      // TODO skip if avatar hasn't spawned yet.
      if (!this.avatarPovEl) return;

      const { terrains, loadedChunks, loadingChunks, avatarChunk } = this;
      const avatar = this.avatarPovEl.object3D;

      avatar.getWorldPosition(avatarPos);

      // Get chunk space coordinate
      chunk
        .copy(avatarPos)
        .divideScalar(CHUNK_WORLD_SIZE)
        .floor();

      chunk.y = 0;

      if (!chunk.equals(avatarChunk)) {
        const hasCrossedBorder = avatarChunk.x !== chunk.x || avatarChunk.z !== chunk.z;
        avatarChunk.copy(chunk);

        if (hasCrossedBorder) {
          const newChunks = [];

          // Wrap chunks so they pre-emptively load over border
          RENDER_GRID.forEach(({ x, z }) => {
            let cx = avatarChunk.x + x;
            let cz = avatarChunk.z + z;
            cx = normalizeChunkCoord(avatarChunk.x + x);
            cz = normalizeChunkCoord(avatarChunk.z + z);

            const newChunk = { x: cx, z: cz };
            newChunks.push(newChunk);
            this.loadChunk(newChunk);
          });

          loadedChunks.forEach(chunk => {
            if (!newChunks.find(({ x, z }) => chunk.x === x && chunk.z === z)) {
              this.unloadChunk(chunk);
            }
          });
          loadingChunks.forEach((chunk, key) => {
            if (!newChunks.find(({ x, z }) => chunk.x === x && chunk.z === z)) {
              loadingChunks.delete(key);
            }
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

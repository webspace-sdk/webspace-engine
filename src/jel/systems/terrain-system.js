import Pako from "pako";
import { protocol } from "../protocol/protocol";
import Terrain from "../objects/terrain";
import { WORLD_MIN_COORD, WORLD_MAX_COORD } from "./wrapped-entity-system";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";

const { Vector3, Vector4, Matrix4 } = THREE;

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

const cullChunks = (() => {
  // Chunk culling based upon AABB
  // https://iquilezles.org/www/articles/frustumcorrect/frustumcorrect.htm
  const frustumMatrix = new Matrix4();
  const tmp = new Vector3();
  const n1 = new Vector4();
  const n2 = new Vector4();
  const n3 = new Vector4();
  const n4 = new Vector4();
  const n5 = new Vector4();
  const n6 = new Vector4();
  const norms = [n1, n2, n3, n4, n5, n6];

  // Get camera frustum points
  const p1 = new Vector3();
  const p2 = new Vector3();
  const p3 = new Vector3();
  const p4 = new Vector3();
  const p5 = new Vector3();
  const p6 = new Vector3();
  const p7 = new Vector3();
  const p8 = new Vector3();
  const points = [p1, p2, p3, p4, p5, p6, p7, p8];
  const bv = new Vector4(0, 0, 0, 1);

  return (camera, terrains) => {
    frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    // HACK extract near and far from matrix due to cube SSAO hack for z-buffer
    const c = camera.projectionMatrix.elements[10];
    const d = camera.projectionMatrix.elements[14];

    const near = d / (c - 1.0);
    const far = d / (c + 1.0);

    // Ger camera plane normals
    const me0 = frustumMatrix.elements[0];
    const me1 = frustumMatrix.elements[1];
    const me2 = frustumMatrix.elements[2];
    const me3 = frustumMatrix.elements[3];
    const me4 = frustumMatrix.elements[4];
    const me5 = frustumMatrix.elements[5];
    const me6 = frustumMatrix.elements[6];
    const me7 = frustumMatrix.elements[7];
    const me8 = frustumMatrix.elements[8];
    const me9 = frustumMatrix.elements[9];
    const me10 = frustumMatrix.elements[10];
    const me11 = frustumMatrix.elements[11];
    const me12 = frustumMatrix.elements[12];
    const me13 = frustumMatrix.elements[13];
    const me14 = frustumMatrix.elements[14];
    const me15 = frustumMatrix.elements[15];

    n1.set(me3 - me0, me7 - me4, me11 - me8, me15 - me12).normalize();
    n2.set(me3 + me0, me7 + me4, me11 + me8, me15 + me12).normalize();
    n3.set(me3 + me1, me7 + me5, me11 + me9, me15 + me13).normalize();
    n4.set(me3 - me1, me7 - me5, me11 - me9, me15 - me13).normalize();
    n5.set(me3 - me2, me7 - me6, me11 - me10, me15 - me14).normalize();
    n6.set(me3 + me2, me7 + me6, me11 + me10, me15 + me14).normalize();

    const hNear = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * near;
    const wNear = hNear * camera.aspect;

    const hFar = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * far;
    const wFar = hFar * camera.aspect;

    p1.set(wNear / 2, hNear / 2, -near);
    p2.set(-wNear / 2, hNear / 2, -near);
    p3.set(wNear / 2, -hNear / 2, -near);
    p4.set(-wNear / 2, -hNear / 2, -near);
    p5.set(wFar / 2, hFar / 2, -far);
    p6.set(-wFar / 2, hFar / 2, -far);
    p7.set(wFar / 2, -hFar / 2, -far);
    p8.set(-wFar / 2, -hFar / 2, -far);
    p1.applyMatrix4(camera.matrixWorld);
    p2.applyMatrix4(camera.matrixWorld);
    p3.applyMatrix4(camera.matrixWorld);
    p4.applyMatrix4(camera.matrixWorld);
    p5.applyMatrix4(camera.matrixWorld);
    p6.applyMatrix4(camera.matrixWorld);
    p7.applyMatrix4(camera.matrixWorld);
    p8.applyMatrix4(camera.matrixWorld);

    for (const t of terrains) {
      // eslint-disable-line no-restricted-syntax
      let show = true;

      // Compute terrain AABB
      t.getWorldPosition(tmp);
      const bminx = tmp.x;
      const bmaxx = tmp.x + 8;
      const bminz = tmp.z;
      const bmaxz = tmp.z + 8;
      const bminy = 0;
      const bmaxy = t.height / 8 + 1 / 8;

      for (const n of norms) {
        // eslint-disable-line no-restricted-syntax
        let c = 0;

        bv.x = bminx;
        bv.y = bminy;
        bv.z = bminz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bminx;
        bv.y = bminy;
        bv.z = bmaxz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bminx;
        bv.y = bmaxy;
        bv.z = bminz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bminx;
        bv.y = bmaxy;
        bv.z = bmaxz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bmaxx;
        bv.y = bminy;
        bv.z = bminz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bmaxx;
        bv.y = bminy;
        bv.z = bmaxz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bmaxx;
        bv.y = bmaxy;
        bv.z = bminz;
        if (bv.dot(n) < 0) c += 1;
        bv.x = bmaxx;
        bv.y = bmaxy;
        bv.z = bmaxz;
        if (bv.dot(n) < 0) c += 1;

        if (c === 8) {
          show = false;
          break;
        }
      }

      if (show) {
        let c = 0;

        for (const p of points) {
          // eslint-disable-line no-restricted-syntax
          if (p.x > bmaxx) c += 1;
        }

        if (c === 8) show = false;
      }

      if (show) {
        let c = 0;

        for (const p of points) {
          // eslint-disable-line no-restricted-syntax
          if (p.x < bminx) c += 1;
        }

        if (c === 8) show = false;
      }

      if (show) {
        let c = 0;

        for (const p of points) {
          // eslint-disable-line no-restricted-syntax
          if (p.y > bmaxy) c += 1;
        }

        if (c === 8) show = false;
      }

      if (show) {
        let c = 0;

        for (const p of points) {
          // eslint-disable-line no-restricted-syntax
          if (p.y < bminy) c += 1;
        }

        if (c === 8) show = false;
      }

      if (show) {
        let c = 0;

        for (const p of points) {
          // eslint-disable-line no-restricted-syntax
          if (p.z > bmaxz) c += 1;
        }

        if (c === 8) show = false;
      }

      if (show) {
        let c = 0;

        for (const p of points) {
          // eslint-disable-line no-restricted-syntax
          if (p.z < bminz) c += 1;
        }

        if (c === 8) show = false;
      }

      t.visible = show;
      t.castShadow = show;
    }
  };
})();

export class TerrainSystem {
  constructor(scene, atmosphereSystem) {
    waitForDOMContentLoaded().then(() => {
      this.avatarPovEl = document.getElementById("avatar-pov-node");
      this.viewingCameraEl = document.getElementById("viewing-camera");
    });

    this.atmosphereSystem = atmosphereSystem;
    this.avatarChunk = new THREE.Vector3(Infinity, 0, Infinity);
    this.pool = [...Array(RENDER_GRID.length)].map(() => new Terrain());
    this.loadedChunks = new Map();
    this.loadingChunks = new Map();
    this.terrains = new Map();
    this.entities = new Map();
    this.scene = scene;

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

        entities.get(key).setObject3D("mesh", terrain);
        terrain.position.set(0, 0, 0);
        terrain.matrixNeedsUpdate = true;

        terrain.update({
          chunk: { x, y: subchunk, z, height },
          geometries
        });

        terrains.set(key, terrain);

        this.atmosphereSystem.updateShadows();
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

      // Wait until we have the camera;
      if (!this.playerCamera) {
        if (!this.viewingCameraEl) return;
        this.playerCamera = this.viewingCameraEl.getObject3D("camera");
        if (!this.playerCamera) return;
      }

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

      if (this.playerCamera) {
        // Cull chunks
        cullChunks(this.playerCamera, this.terrains.values());
      }
    };
  })();
}

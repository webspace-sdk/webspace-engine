import Pako from "pako";
import { protocol } from "../protocol/protocol";
import Terrain from "../objects/terrain";
import { waitForDOMContentLoaded } from "../../hubs/utils/async-utils";
import { VOXLoader } from "../objects/VOXLoader";
import { VOXBufferGeometry } from "../objects/VOXBufferGeometry";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import treesVoxSrc from "!!url-loader!../assets/models/trees1.vox";
import rocksVoxSrc from "!!url-loader!../assets/models/rocks1.vox";
import grassVoxSrc from "!!url-loader!../assets/models/grass1.vox";

const { Pathfinding } = require("three-pathfinding");

const {
  Vector3,
  Vector4,
  Matrix4,
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  MeshStandardMaterial,
  VertexColors,
  Object3D
} = THREE;

const LOAD_RADIUS = 4;
export const VOXEL_SIZE = 1 / 8;
export const VOXELS_PER_CHUNK = 64;
export const CHUNK_WORLD_SIZE = VOXELS_PER_CHUNK * VOXEL_SIZE;
export const WORLD_CHUNK_SIZE = 8;
export const MIN_CHUNK_COORD = -WORLD_CHUNK_SIZE / 2;
export const MAX_CHUNK_COORD = -MIN_CHUNK_COORD - 1;
export const WORLD_MAX_COORD = (WORLD_CHUNK_SIZE * CHUNK_WORLD_SIZE) / 2;
export const WORLD_MIN_COORD = -WORLD_MAX_COORD;
export const WORLD_SIZE = WORLD_MAX_COORD - WORLD_MIN_COORD;
export const WORLD_RADIUS = (WORLD_SIZE / 2) * Math.PI;

const RENDER_GRID = [];
const SUBCHUNKS = 1;
const center = new Vector3();

const normalizeChunkCoord = c => {
  if (c < MIN_CHUNK_COORD) {
    return MAX_CHUNK_COORD + c - MIN_CHUNK_COORD + 1;
  } else if (c > MAX_CHUNK_COORD) {
    return MIN_CHUNK_COORD + (c - MAX_CHUNK_COORD - 1);
  } else {
    return c;
  }
};

const entityWorldCoordToChunkCoord = c => Math.floor(c / CHUNK_WORLD_SIZE);
const chunkCoordToEntityWorldCoord = c => c * CHUNK_WORLD_SIZE;

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
    this.avatarZone = null;
    this.pool = [...Array(RENDER_GRID.length)].map(() => new Terrain());
    this.loadedChunks = new Map();
    this.loadingChunks = new Map();
    this.spawningChunks = new Map();
    this.terrains = new Map();
    this.entities = new Map();
    this.scene = scene;
    this.pathfinder = new Pathfinding();
    this.featureMeshesLoaded = false;
    this.loadFeatureMeshes();

    for (let x = MIN_CHUNK_COORD; x <= MAX_CHUNK_COORD; x++) {
      for (let z = MIN_CHUNK_COORD; z <= MAX_CHUNK_COORD; z++) {
        for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk++) {
          const pos = new Vector3(chunkCoordToEntityWorldCoord(x), 0, chunkCoordToEntityWorldCoord(z));
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
    const { loadedChunks, loadingChunks, spawningChunks } = this;
    const key = keyForChunk(chunk);
    if (loadedChunks.has(key) || loadingChunks.has(key) || spawningChunks.has(key)) return;

    fetch(`https://hubs.local:8003/chunks/${chunk.x}/${chunk.z}/1`).then(res => {
      res.text().then(b64 => {
        if (!loadingChunks.has(key)) return;
        loadingChunks.delete(key);
        spawningChunks.set(key, b64);
      });
    });

    loadingChunks.set(key, chunk);
  }

  spawnChunk = (() => {
    const navTransform = new Matrix4();

    return b64chunks => {
      // TODO avoid atob
      const encoded = Uint8Array.from(atob(b64chunks), c => c.charCodeAt(0));
      const chunks = decodeChunks(encoded);

      const { entities, loadedChunks, spawningChunks, terrains, pool } = this;

      chunks.forEach(({ x, height, z, meshes, features }) => {
        const key = keyForChunk({ x, z });
        if (!loadedChunks.has(key) && !spawningChunks.has(key)) return;

        loadedChunks.set(key, { x, z });
        spawningChunks.delete(key);

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

          const navGeometry = new BufferGeometry();
          const tmpPos = new Uint8Array(geometries.nav.position.length);
          tmpPos.set(geometries.nav.position);
          const tmpIdx = new Uint8Array(geometries.nav.index.length);
          tmpIdx.set(geometries.nav.index);
          const pos = new Float32Array(tmpPos.buffer, tmpPos.byteOffset, tmpPos.length / 4);
          const idx = new Uint16Array(tmpIdx.buffer, tmpIdx.byteOffset, tmpIdx.length / 2);
          navGeometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
          navGeometry.setIndex(new Uint16BufferAttribute(idx, 1));
          const p = new THREE.Vector3();
          terrain.updateMatrices();
          terrain.getWorldPosition(p);
          navTransform.copy(terrain.matrixWorld);

          // Terrain position may be out of bounds/wrapped, so normalize by
          // converting to normalized chunk coordinates and back
          const ctx = entityWorldCoordToChunkCoord(navTransform.elements[12]);
          const ctz = entityWorldCoordToChunkCoord(navTransform.elements[14]);
          const tx = chunkCoordToEntityWorldCoord(normalizeChunkCoord(ctx));
          const tz = chunkCoordToEntityWorldCoord(normalizeChunkCoord(ctz));

          navTransform.elements[12] = tx;
          navTransform.elements[14] = tz;
          navGeometry.applyMatrix4(navTransform);

          // Navmesh vis
          //const navMaterial = new THREE.MeshBasicMaterial({
          //  color: Math.floor(Math.random() * 0xffffff),
          //  transparent: true,
          //  opacity: 0.2
          //});
          //const navMesh = new THREE.Mesh(navGeometry, navMaterial);
          //navMesh.position.y += 0.5;
          //navMesh.matrixNeedsUpdate = true;
          //this.scene.object3D.add(navMesh);

          this.pathfinder.setZoneData(key, Pathfinding.createZone(navGeometry));

          navGeometry.dispose();

          this.spawnFeatureMeshes(x, z, features);
          this.scene.emit("terrain-chunk-loaded");

          this.atmosphereSystem.updateShadows();
        });
      });
    };
  })();

  loadFeatureMeshes() {
    const voxLoader = new VOXLoader();

    this.trees = [];
    this.rocks = [];
    this.grasses = [];

    const promises = [];

    promises.push(
      new Promise(res => {
        voxLoader.load(treesVoxSrc, chunks => {
          for (let j = 0; j < chunks.length; j += 1) {
            const geometry = new VOXBufferGeometry(chunks[j]);
            const material = new MeshStandardMaterial({ vertexColors: VertexColors });
            const mesh = new DynamicInstancedMesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            geometry.translate(0, 38, 0);
            this.trees.push(mesh);
          }

          res();
        });
      })
    );

    promises.push(
      new Promise(res => {
        voxLoader.load(rocksVoxSrc, chunks => {
          for (let j = 0; j < chunks.length; j += 1) {
            const geometry = new VOXBufferGeometry(chunks[j]);
            const material = new MeshStandardMaterial({ vertexColors: VertexColors });
            const mesh = new DynamicInstancedMesh(geometry, material);
            geometry.translate(0, 9, 0);
            this.rocks.push(mesh);
            mesh.castShadow = true;
          }
          res();
        });
      })
    );

    promises.push(
      new Promise(res => {
        voxLoader.load(grassVoxSrc, chunks => {
          for (let j = 0; j < chunks.length; j += 1) {
            const geometry = new VOXBufferGeometry(chunks[j]);
            const material = new MeshStandardMaterial({
              vertexColors: VertexColors,
              transparent: true,
              opacity: 0.3
            });

            const mesh = new DynamicInstancedMesh(geometry, material);
            geometry.translate(0, 6, 0);
            mesh.receiveShadow = true;
            this.grasses.push(mesh);
          }
          res();
        });
      })
    );

    Promise.all(promises).then(() => (this.featureMeshesLoaded = true));
  }

  async spawnFeatureMeshes(x, z, features) {
    const featureInstances = [];
    const freeFeatures = () => {
      for (let i = 0; i < featureInstances.length; i += 1) {
        featureInstances[i][0].removeMatrix(featureInstances[i][1]);
      }
    };
    // TODO free

    const atOrBelowGround = (x, y, z) => {
      return true;
      const size = 64;
      const scale = 0.125;
      const cx = Math.floor(x * scale);
      const cz = Math.floor(z * scale);
      x -= cx / scale;
      z -= cz / scale;
      x *= 8;
      z *= 8;
      x = Math.ceil(x);
      z = Math.ceil(z);

      const key = `${cx}:${cz}`;
      if (!chunks.heightmaps.has(key)) {
        return false;
      }

      const heightMap = chunks.heightmaps.get(key);
      return y <= heightMap[x * size + z] / 8;
    };

    const addInstancedMesh = (() => {
      const dummy = new Object3D();
      return (x, y, z, from, minScale, maxScale) => {
        const entry = from[Math.floor(Math.random() * from.length)];
        const mesh = entry;

        dummy.position.set(x, y, z);
        dummy.rotation.set(0, Math.random() * 2 * Math.PI, 0);
        dummy.scale.setScalar((Math.random() * (maxScale - minScale) + minScale) * (1 / 32));
        dummy.matrixNeedsUpdate = true;
        dummy.updateMatrices();

        const id = mesh.addMatrix(dummy.matrix);
        featureInstances.push([mesh, id]);

        const scene = this.scene.object3D;

        if (!scene.children.includes(mesh)) {
          scene.add(mesh);
        }
      };
    })();

    for (let i = 0; i < features.length; i += 1) {
      const feature = features[i];
      const featureWorldX = x * 8 + feature.x * (1 / 8);
      const featureWorldY = feature.y * (1 / 8);
      const featureWorldZ = z * 8 + feature.z * (1 / 8);

      if (feature.types & 2) {
        // Trim
        addInstancedMesh(featureWorldX, featureWorldY, featureWorldZ, this.rocks, 0.4, 0.9);
      }

      if (feature.types & 4) {
        // Field
        addInstancedMesh(featureWorldX, featureWorldY, featureWorldZ, this.grasses, 0.05, 0.45);
      }

      if (feature.types & 1) {
        // Foilage
        // Create primary tree
        addInstancedMesh(featureWorldX, featureWorldY, featureWorldZ, this.trees, 0.8, 1.3);

        const maxClusterTrees = 3;

        // Create clustered trees
        for (let i = 0; i < Math.floor(Math.random() * (maxClusterTrees + 1)); i += 1) {
          let dx = (Math.random() - 0.5) * 10;
          let dz = (Math.random() - 0.5) * 10;
          dx += dx < 0 ? -2 : 1;
          dz += dz < 0 ? -2 : 1;

          if (atOrBelowGround(featureWorldX + dx, featureWorldY, featureWorldZ + dz)) {
            addInstancedMesh(featureWorldX + dx, featureWorldY, featureWorldZ + dz, this.trees, 0.5, 0.8);
          }
        }

        // const maxClusterFerns = 8;

        // Create clustered ferns
        /* for (let i = 0; i < Math.floor(Math.random() * (maxClusterFerns + 1)); i += 1) {
            let dx = (Math.random() - 0.5) * 3;
            let dz = (Math.random() - 0.5) * 3;
            dx += dx < 0 ? -0.25 : 0.25;
            dz += dz < 0 ? -0.25 : 0.25;

            if (atOrBelowGround(obj.position.x + dx, obj.position.y, obj.position.z + dz)) {
              const fern = this.ferns[Math.floor(Math.random() * this.ferns.length)];
              const scale = Math.random() * 0.3 + 0.6;
              const obj2 = new Group();
              obj2.add(fern.clone());
              obj2.position.set(obj.position.x + dx, obj.position.y, obj.position.z + dz);
              obj.rotation.set(obj.rotation.x, Math.random() * 2 * Math.PI, obj.rotation.z);
              obj2.scale.set(scale, scale, scale);
              this.add(obj2);
            }
          } */
      }
    }
  }

  unloadChunk(chunk) {
    const { entities, loadedChunks, spawningChunks, pool, terrains } = this;
    const key = keyForChunk(chunk);
    loadedChunks.delete(key);
    spawningChunks.delete(key);

    for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk += 1) {
      const subkey = `${key}:${subchunk}`;
      const terrain = terrains.get(subkey);
      const entity = entities.get(subkey);

      if (entity) {
        entity.removeObject3D("mesh");
      }

      if (terrain) {
        terrain.dispose();
        terrains.delete(subkey);
        pool.push(terrain);
      }

      delete this.pathfinder.zones[subkey];
    }
  }

  getClosestNavNode(pos, navZone, navGroup) {
    if (this.pathfinder.zones[navZone] && this.pathfinder.zones[navZone].groups[navGroup]) {
      return (
        this.pathfinder.getClosestNode(pos, navZone, navGroup, true) ||
        this.pathfinder.getClosestNode(pos, navZone, navGroup)
      );
    }

    return null;
  }

  getNavZoneAndGroup(pos) {
    const cx = entityWorldCoordToChunkCoord(pos.x);
    const cz = entityWorldCoordToChunkCoord(pos.z);
    const zone = `${keyForChunk({ x: cx, z: cz })}:0`;
    const group = this.pathfinder.getGroup(zone, pos, true, true);
    return [zone, group];
  }

  clampStep(start, end, fromNode, navZone, navGroup, outPos) {
    return this.pathfinder.clampStep(start, end, fromNode, navZone, navGroup, outPos);
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

      const { terrains, loadedChunks, loadingChunks, spawningChunks, avatarChunk } = this;
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

        if (hasCrossedBorder) {
          avatarChunk.copy(chunk);
          this.avatarZone = `${keyForChunk(chunk)}:0`; // This will need fixing if we re-enable subchunks

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
              spawningChunks.delete(key);
            }
          });
        }
      }

      if (this.spawningChunks.size > 0 && this.featureMeshesLoaded) {
        // Spawn a single chunk that's enqueued.
        for (const [, b64chunk] of this.spawningChunks) {
          this.spawnChunk(b64chunk);
          break;
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

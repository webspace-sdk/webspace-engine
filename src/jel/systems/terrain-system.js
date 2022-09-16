import { CONSTANTS } from "three-ammo";
import { protocol } from "../protocol/protocol";
import { promisifyWorker } from "../../hubs/utils/promisify-worker.js";
import TerraWorker from "../workers/terra.worker.js";
import { createVoxelMaterial, Terrain, updateWorldColors, VOXEL_PALETTE_GRASS } from "../objects/terrain";
import { waitForShadowDOMContentLoaded } from "../../hubs/utils/async-utils";
import { VOXLoader } from "../objects/VOXLoader";
import { VOXBufferGeometry } from "../objects/VOXBufferGeometry";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import grassVoxSrc from "!!url-loader!../../assets/jel/models/grass1.vox";
import { RENDER_ORDER, WORLD_COLOR_TYPES, COLLISION_LAYERS } from "../../hubs/constants";
import { Layers } from "../../hubs/components/layers";
import qsTruthy from "../../hubs/utils/qs_truthy";
import nextTick from "../../hubs/utils/next-tick";

const runTerraWorker = promisifyWorker(new TerraWorker());

export const WORLD_TYPES = {
  ISLANDS: 1,
  HILLS: 2,
  PLAINS: 3,
  FLAT: 4
};

export const MAX_WORLD_TYPE = WORLD_TYPES.FLAT;

const { SHAPE, TYPE, FIT } = CONSTANTS;

const { Vector3, Vector4, Matrix4, Object3D, Group } = THREE;

export const VOXEL_SIZE = 1 / 8;
export const VOXELS_PER_CHUNK = 64;
export const CHUNK_WORLD_SIZE = VOXELS_PER_CHUNK * VOXEL_SIZE;
export const WORLD_CHUNK_SIZE = 8;
export const MIN_CHUNK_COORD = -WORLD_CHUNK_SIZE / 2;
export const MAX_CHUNK_COORD = -MIN_CHUNK_COORD - 1;
export const WORLD_MAX_COORD = (WORLD_CHUNK_SIZE * CHUNK_WORLD_SIZE) / 2;
export const WORLD_MIN_COORD = -WORLD_MAX_COORD;
export const WORLD_SIZE = WORLD_MAX_COORD - WORLD_MIN_COORD;

// Radius is artificial, want to have a specific curve effect not accurancy
// TODO adjust based on world type, note also changed in unlit-batch.vert.
export const WORLD_RADIUS = 128.0;

export const addVertexCurvingToShader = (shader, postCurveShader = "") => {
  shader.vertexShader = shader.vertexShader.replace(
    "#include <project_vertex>",
    [
      "#define cplx vec2",
      "#define cplx_new(re, im) vec2(re, im)",
      "#define cplx_re(z) z.x",
      "#define cplx_im(z) z.y",
      "#define cplx_exp(z) (exp(z.x) * cplx_new(cos(z.y), sin(z.y)))",
      "#define cplx_scale(z, scalar) (z * scalar)",
      "#define cplx_abs(z) (sqrt(z.x * z.x + z.y * z.y))",
      `float rp = ${WORLD_RADIUS.toFixed(2)};`,
      "vec4 mvPosition = vec4( transformed, 1.0 );",
      "#ifdef USE_INSTANCING",
      "mvPosition = instanceMatrix * mvPosition;",
      "#endif",
      "vec4 pos = modelMatrix * mvPosition;",
      "mvPosition = modelViewMatrix * mvPosition;", // Leave mvPosition correct for remainder of shader.
      "#ifdef STANDARD",
      "vec3 camPos = cameraPosition;",
      "#else",
      "mat4 worldViewMatrix = inverse(viewMatrix);",
      "vec3 camPos = worldViewMatrix[3].xyz;",
      "#endif",
      "vec2 planedir = normalize(vec2(pos.x - camPos.x, pos.z - camPos.z));",
      "cplx plane = cplx_new(pos.y - camPos.y, sqrt((pos.x - camPos.x) * (pos.x - camPos.x) + (pos.z - camPos.z) * (pos.z - camPos.z)));",
      "cplx circle = rp * cplx_exp(cplx_scale(plane, 1.0 / rp)) - cplx_new(rp, 0);",
      "pos.x = cplx_im(circle) * planedir.x + camPos.x;",
      "pos.z = cplx_im(circle) * planedir.y + camPos.z;",
      "pos.y = cplx_re(circle) + camPos.y;",
      "gl_Position = projectionMatrix * viewMatrix * pos;",
      postCurveShader
    ].join("\n")
  );
};

export const addVertexCurvingToMaterial = material => {
  if (material.onBeforeCompile) {
    const onBeforeCompile = material.onBeforeCompile;

    material.onBeforeCompile = shader => {
      addVertexCurvingToShader(shader);
      return onBeforeCompile(shader);
    };
  } else {
    material.onBeforeCompile = shader => addVertexCurvingToShader(shader);
  }
};

const LOAD_RADIUS = qsTruthy("director") ? 6 : 3;
const FIELD_FEATURE_RADIUS = 1;
const BODY_RADIUS = 2;
const REFLECT_RADIUS = 2;

const LOAD_GRID = [];
const FIELD_FEATURE_GRID = [];
const BODY_GRID = [];
const REFLECT_GRID = [];

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

for (const [grid, radius] of [
  [LOAD_GRID, LOAD_RADIUS],
  [FIELD_FEATURE_GRID, FIELD_FEATURE_RADIUS],
  [BODY_GRID, BODY_RADIUS],
  [REFLECT_GRID, REFLECT_RADIUS]
]) {
  for (let x = -Math.floor(radius * 2); x <= Math.ceil(radius * 2); x += 1) {
    for (let z = -Math.floor(radius * 2); z <= Math.ceil(radius * 2); z += 1) {
      const chunk = new THREE.Vector3(x, 0, z);
      if (chunk.distanceTo(center) <= radius * Math.sqrt(2) + 0.01) {
        grid.push(chunk);
      }
    }
  }
  grid.sort((a, b) => a.distanceTo(center) - b.distanceTo(center));
}

const featureMeshMaterial = createVoxelMaterial();
featureMeshMaterial.uniforms.opacity.value = 0.2;
featureMeshMaterial.uniformsNeedUpdate = true;
featureMeshMaterial.transparent = true;

const keyForChunk = ({ x, z }) => `${x}:${z}`;

const decodeChunks = buffer => {
  const chunks = protocol.Chunks.decode(buffer);
  return chunks.chunks;
};

export class TerrainSystem {
  constructor(scene, atmosphereSystem, cameraSystem) {
    waitForShadowDOMContentLoaded().then(() => {
      this.avatarPovEl = DOM_ROOT.getElementById("avatar-pov-node");
      this.viewingCameraEl = DOM_ROOT.getElementById("viewing-camera");
    });

    this.atmosphereSystem = atmosphereSystem;
    this.cameraSystem = cameraSystem;
    this.avatarChunk = new THREE.Vector3(Infinity, 0, Infinity);
    this.avatarZone = null;
    this.pool = [...Array(LOAD_GRID.length)].map(() => new Terrain());
    this.activeTerrains = [];
    this.frame = 0;
    this.autoLoadingChunks = false;
    this.lastLoadedChunkFrame = 0;
    this.loadedChunks = new Map();
    this.loadingChunks = new Map();
    this.spawningChunks = new Map();
    this.chunkFeatures = new Map();
    this.worldColors = null;

    // Note: chunk height maps are retained even when chunks are de-spawned,
    // since loadAllHeightMaps() can be used to ensure getTerrainHeightAtWorldCoord
    // always works properly. Eg when importing we need the full heightmap data.
    this.chunkHeightMaps = new Map();

    this.terrains = new Map();
    this.performFullTerrainWorkOnNextTick = false;
    this.fieldFeatureInstances = new Map();
    this.entities = new Map();
    this.scene = scene;
    this.featureMeshesLoaded = false;
    this.loadFeatureMeshes();
    this.worldType = null;
    this.worldSeed = null;

    // We create duplicates of the instanced feature meshes around torodial hyperspace
    // so they appear across edges.
    this.featureGroups = [];

    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const group = new Group();
        group.position.x = x * WORLD_SIZE;
        group.position.y = WORLD_SIZE / 2;
        group.position.z = z * WORLD_SIZE;
        group.frustumCulled = false;
        group.matrixNeedsUpdate = true;
        this.scene.object3D.add(group);
        this.featureGroups.push(group);
      }
    }

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

  updateWorldColors(...colors) {
    this.worldColors = colors;

    updateWorldColors(...colors);
  }

  // Loads + caches all the heightmaps, so heightmap queries via getTerrainHeightAtWorldCoord
  // for regions away from the current player avatar will work properly.
  loadAllHeightMaps() {
    const promises = [];

    for (let x = MIN_CHUNK_COORD; x <= MAX_CHUNK_COORD; x++) {
      for (let z = MIN_CHUNK_COORD; z <= MAX_CHUNK_COORD; z++) {
        // Only load height map.
        promises.push(this.loadChunk({ x, z }, true));
      }
    }

    return Promise.all(promises);
  }

  async loadHeightMapAtWorldCoord(worldX, worldZ) {
    if (this.hasLoadedHeightMapAtWorldCoord(worldX, worldZ)) return;
    const x = normalizeChunkCoord(entityWorldCoordToChunkCoord(worldX));
    const z = normalizeChunkCoord(entityWorldCoordToChunkCoord(worldZ));
    await this.loadChunk({ x, z }, true, 0);
  }

  async loadChunk(chunk, heightMapOnly = false, priority = 0) {
    if (this.worldType === null) return;
    const { loadedChunks, loadingChunks, chunkHeightMaps, spawningChunks, worldType, worldSeed } = this;
    const key = keyForChunk(chunk);

    if (!heightMapOnly) {
      if (loadedChunks.has(key) || loadingChunks.has(key) || spawningChunks.has(key)) return;
      loadingChunks.set(key, chunk);
    }

    // Decode + spawn at most one terrain per frame
    while (this.lastLoadedChunkFrame === this.frame) {
      await nextTick();
    }

    this.lastLoadedChunkFrame = this.frame;

    if (this.worldType !== worldType || this.worldSeed !== worldSeed) {
      loadingChunks.delete(key);
      return;
    }

    const { chunk: encoded, cached } = await runTerraWorker({
      x: chunk.x,
      z: chunk.z,
      type: worldType,
      seed: worldSeed,
      priority
    });

    if (!cached) {
      this.scene.emit("terrain_chunk_cpu_spike_over");
    }

    // Type or seed changed, abort
    if (this.worldType !== worldType || this.worldSeed !== worldSeed) return;

    if (!heightMapOnly) {
      if (!loadingChunks.has(key)) return;
      loadingChunks.delete(key);
    }

    if (heightMapOnly) {
      const chunks = decodeChunks(encoded);

      chunks.forEach(({ x, meshes, heightmap, z }) => {
        meshes.forEach((geometries, subchunk) => {
          const key = `${x}:${z}:${subchunk}`;
          chunkHeightMaps.set(key, heightmap);
        });
      });
    } else {
      spawningChunks.set(key, encoded);
    }
  }

  spawnChunk = encoded => {
    const chunks = decodeChunks(encoded);

    const {
      entities,
      chunkFeatures,
      chunkHeightMaps,
      loadedChunks,
      spawningChunks,
      loadingChunks,
      terrains,
      pool
    } = this;

    chunks.forEach(({ x, height, heightmap, z, meshes, features }) => {
      const key = keyForChunk({ x, z });
      if (!loadedChunks.has(key) && !spawningChunks.has(key)) return;

      loadedChunks.set(key, { x, z });
      spawningChunks.delete(key);

      meshes.forEach((geometries, subchunk) => {
        const key = `${x}:${z}:${subchunk}`;
        chunkFeatures.set(key, features);
        chunkHeightMaps.set(key, heightmap);

        let terrain = terrains.get(key);

        if (!terrain) {
          terrain = pool.shift();

          if (!terrain) {
            terrain = new Terrain();
          }
        }

        const el = entities.get(key);
        el.setObject3D("mesh", terrain);
        terrain.position.set(0, 0, 0);
        terrain.matrixNeedsUpdate = true;
        terrain.updateMatrices();

        terrain.update({
          chunk: { x, y: subchunk, z, height, heightmap },
          geometries
        });

        terrain.enableLod(this.worldTypeLODs());
        terrain.performWork(this.playerCamera);
        terrains.set(key, terrain);
        this.activeTerrains.push(terrain);
      });

      this.ensureFeatureMeshesSpawnedOrFree(x, z);
      this.ensureBodiesSpawnedOrFree(x, z);
      this.ensureLayers(x, z);

      this.scene.emit("terrain_chunk_loaded");

      if (spawningChunks.size === 0 && loadingChunks.size === 0) {
        this.scene.emit("terrain_chunk_cpu_spike_over");
      }

      this.atmosphereSystem.updateShadows();
      this.atmosphereSystem.updateWater();
    });
  };

  async updateWorldForHub({ world }) {
    // Update colors
    const colors = WORLD_COLOR_TYPES.map(type => world[`${type}_color`]);

    this.updateWorldColors(...colors);

    // Check if type or seed has changed.
    const { type, seed } = world;

    if (this.worldType === type && this.worldSeed === seed) return;

    // Perform fog effect
    this.atmosphereSystem.maximizeFog();
    this.cameraSystem.updateCameraSettings();

    this.worldType = type;
    this.worldSeed = seed;

    this.unloadWorld();

    this.performFullTerrainWorkOnNextTick = true;
  }

  loadFeatureMeshes() {
    const voxLoader = new VOXLoader();

    this.grasses = [];

    const promises = [];

    promises.push(
      new Promise(res => {
        voxLoader.load(grassVoxSrc, chunks => {
          for (let j = 0; j < chunks.length; j += 1) {
            const meshes = [];
            this.grasses.push(meshes);

            for (let i = 0; i < 9; i++) {
              const geometry = new VOXBufferGeometry(chunks[j], [], VOXEL_PALETTE_GRASS);
              geometry.translate(0, 6, 0);

              const mesh = new DynamicInstancedMesh(geometry, featureMeshMaterial, 1024 * 8);
              mesh.renderOrder = RENDER_ORDER.FIELD;

              mesh.receiveShadow = true;
              meshes.push(mesh);
            }
          }
          res();
        });
      })
    );

    Promise.all(promises).then(() => (this.featureMeshesLoaded = true));
  }

  ensureFeatureMeshesFreed(x, z, subchunk) {
    const instances = this.fieldFeatureInstances;
    const key = `${keyForChunk({ x, z })}:${subchunk}`;
    if (instances.has(key)) {
      for (const [mesh, id] of instances.get(key)) {
        mesh.freeInstance(id);
      }

      instances.delete(key);
    }
  }

  ensureFeatureMeshesSpawnedOrFree(chunkX = null, chunkZ = null) {
    const { avatarChunk, loadedChunks } = this;
    const fieldChunks = [];

    FIELD_FEATURE_GRID.forEach(({ x, z }) => {
      const cx = normalizeChunkCoord(avatarChunk.x + x);
      const cz = normalizeChunkCoord(avatarChunk.z + z);

      if (chunkX !== null && cx !== chunkX) return;
      if (chunkZ !== null && cz !== chunkZ) return;
      if (window.APP.detailLevel > 1) return;

      for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk++) {
        this.ensureFeatureMeshesSpawned(cx, cz, subchunk, true);
      }

      fieldChunks.push({ x: cx, z: cz });
    });

    loadedChunks.forEach(chunk => {
      if (chunkX !== null && chunk.x !== chunkX) return;
      if (chunkZ !== null && chunk.z !== chunkZ) return;

      for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk += 1) {
        if (!fieldChunks.find(({ x, z }) => chunk.x === x && chunk.z === z) || window.APP.detailLevel > 1) {
          this.ensureFeatureMeshesFreed(chunk.x, chunk.z, subchunk, true);
        }
      }
    });
  }

  ensureLayers(chunkX = null, chunkZ = null) {
    const { avatarChunk, terrains } = this;

    [[LOAD_GRID, false], [REFLECT_GRID, true]].forEach(([grid, enable]) => {
      grid.forEach(({ x, z }) => {
        const cx = normalizeChunkCoord(avatarChunk.x + x);
        const cz = normalizeChunkCoord(avatarChunk.z + z);

        if (chunkX !== null && cx !== chunkX) return;
        if (chunkZ !== null && cz !== chunkZ) return;

        for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk++) {
          const key = `${keyForChunk({ x: cx, z: cz })}:${subchunk}`;

          if (terrains.has(key)) {
            const terrain = terrains.get(key);

            terrain.meshes.forEach(m => {
              if (enable) {
                m.layers.enable(Layers.reflection);
              } else {
                m.layers.disable(Layers.reflection);
              }
            });
          }
        }
      });
    });
  }

  ensureFeatureMeshesSpawned(x, z, subchunk) {
    const key = `${keyForChunk({ x, z })}:${subchunk}`;
    const features = this.chunkFeatures.get(key);
    if (!features) return;

    const instances = this.fieldFeatureInstances;
    if (instances.has(key)) return; // Already spawned

    // Skip features when world doesn't wrap, since shows past horizon
    if (!this.worldTypeWraps()) return;

    const featureMeshKeys = [];

    instances.set(key, featureMeshKeys);

    const addInstancedMesh = (() => {
      const dummy = new Object3D();
      return (x, y, z, from, minScale, maxScale) => {
        const idx = Math.floor(Math.random() * from.length);
        const entry = from[idx];

        dummy.position.set(x, y, z);
        dummy.rotation.set(0, Math.random() * 2 * Math.PI, 0);
        dummy.scale.setScalar((Math.random() * (maxScale - minScale) + minScale) * (1 / 32));
        dummy.matrixNeedsUpdate = true;
        dummy.updateMatrices();

        const featureGroups = this.featureGroups;

        for (let i = 0; i < featureGroups.length; i++) {
          const mesh = entry[i];

          const id = mesh.addInstance(dummy.matrix);
          featureMeshKeys.push([mesh, id]);

          if (featureGroups[i].children.indexOf(mesh) === -1) {
            this.scene.object3D.add(mesh);
            featureGroups[i].add(mesh);
          }
        }
      };
    })();

    for (let i = 0; i < features.length; i += 1) {
      const feature = features[i];
      const featureWorldX = x * 8 + feature.x * (1 / 8);
      const featureWorldY = feature.y * (1 / 8) - WORLD_SIZE / 2;
      const featureWorldZ = z * 8 + feature.z * (1 / 8);

      if (feature.types & 4) {
        // Field
        addInstancedMesh(featureWorldX, featureWorldY, featureWorldZ, this.grasses, 0.05, 0.45);
      }
    }
  }

  ensureBodiesSpawnedOrFree(chunkX = null, chunkZ = null) {
    const { avatarChunk, loadedChunks } = this;
    const bodyChunks = [];

    BODY_GRID.forEach(({ x, z }) => {
      const cx = normalizeChunkCoord(avatarChunk.x + x);
      const cz = normalizeChunkCoord(avatarChunk.z + z);

      if (chunkX !== null && cx !== chunkX) return;
      if (chunkZ !== null && cz !== chunkZ) return;

      for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk++) {
        this.ensureBodiesSpawned(cx, cz, subchunk);
      }

      bodyChunks.push({ x: cx, z: cz });
    });

    loadedChunks.forEach(chunk => {
      if (chunkX !== null && chunk.x !== chunkX) return;
      if (chunkZ !== null && chunk.z !== chunkZ) return;

      for (let subchunk = 0; subchunk < SUBCHUNKS; subchunk += 1) {
        if (!bodyChunks.find(({ x, z }) => chunk.x === x && chunk.z === z)) {
          const key = `${keyForChunk(chunk)}:${subchunk}`;
          const el = this.entities.get(key);
          el.removeAttribute("body-helper");
          el.removeAttribute("shape-helper");
        }
      }
    });
  }

  ensureBodiesSpawned(x, z, subchunk) {
    const key = `${keyForChunk({ x, z })}:${subchunk}`;
    const el = this.entities.get(key);
    if (!el || el.components["body-helper"]) return;
    const heightmap = this.chunkHeightMaps.get(key);
    if (!heightmap) return;
    const terrain = this.terrains.get(key);
    if (!terrain) return;

    let min = Infinity;
    let max = 0;

    const { heightfieldData } = terrain;
    for (let z = 0; z < VOXELS_PER_CHUNK; z += 8) {
      for (let x = 0; x < VOXELS_PER_CHUNK; x += 8) {
        const h = (heightmap[x * VOXELS_PER_CHUNK + z] + 1) * VOXEL_SIZE;
        min = Math.min(h, min);
        max = Math.max(h, max);
        heightfieldData[z / 8][x / 8] = h;
      }
    }

    el.removeAttribute("body-helper");
    el.removeAttribute("shape-helper");

    el.setAttribute("body-helper", {
      type: TYPE.STATIC,
      mass: 1,
      collisionFilterGroup: COLLISION_LAYERS.ENVIRONMENT,
      collisionFilterMask: COLLISION_LAYERS.INTERACTABLES | COLLISION_LAYERS.PROJECTILES
    });

    el.setAttribute("shape-helper", {
      type: SHAPE.HEIGHTFIELD,
      fit: FIT.MANUAL,
      margin: 0.01,
      heightfieldDistance: (VOXEL_SIZE + VOXEL_SIZE / 8) * 8 + VOXEL_SIZE / 8,
      offset: {
        x: CHUNK_WORLD_SIZE / 2 - VOXEL_SIZE * 4,
        y: (min + max) / 2,
        z: CHUNK_WORLD_SIZE / 2 - VOXEL_SIZE * 4
      },
      heightfieldData
    });
  }

  ensureBodiesFreed(x, z, subchunk) {
    const key = `${keyForChunk({ x, z })}:${subchunk}`;
    const el = this.entities.get(key);
    if (!el) return;
    el.removeAttribute("body-helper");
    el.removeAttribute("shape-helper");
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

      this.ensureFeatureMeshesFreed(chunk.x, chunk.z, subchunk);
      this.ensureBodiesFreed(chunk.x, chunk.z, subchunk);

      this.chunkFeatures.delete(subkey);

      if (terrain) {
        terrain.dispose();
        terrains.delete(subkey);
        const idx = this.activeTerrains.indexOf(terrain);
        this.activeTerrains.splice(idx, 1);
        pool.push(terrain);
      }
    }
  }

  unloadWorld() {
    const { avatarChunk, chunkHeightMaps, loadedChunks, loadingChunks, spawningChunks } = this;
    loadedChunks.forEach(chunk => this.unloadChunk(chunk));
    loadedChunks.clear();
    loadingChunks.clear();
    spawningChunks.clear();
    chunkHeightMaps.clear();
    avatarChunk.x = Infinity;
    avatarChunk.z = Infinity;
    this.avatarZone = null;
  }

  hasLoadedHeightMapAtWorldCoord(worldX, worldZ) {
    const x = normalizeChunkCoord(entityWorldCoordToChunkCoord(worldX));
    const z = normalizeChunkCoord(entityWorldCoordToChunkCoord(worldZ));
    const heightKey = `${keyForChunk({ x: x, z: z })}:0`;
    return this.chunkHeightMaps.has(heightKey);
  }

  getTerrainHeightAtWorldCoord(worldX, worldZ) {
    const x = normalizeChunkCoord(entityWorldCoordToChunkCoord(worldX));
    const z = normalizeChunkCoord(entityWorldCoordToChunkCoord(worldZ));
    const heightKey = `${keyForChunk({ x: x, z: z })}:0`;
    const heightMap = this.chunkHeightMaps.get(heightKey);

    if (!heightMap) {
      return 1.0;
    }

    const cx = worldX - Math.floor(worldX / CHUNK_WORLD_SIZE) * CHUNK_WORLD_SIZE;
    const cz = worldZ - Math.floor(worldZ / CHUNK_WORLD_SIZE) * CHUNK_WORLD_SIZE;

    // NOTE this logic is wrong at the boundary condition, (resulting in hx/hz === 8)
    // gave up and capped the range to work around it for now.
    const hx = Math.min(VOXELS_PER_CHUNK - 1, Math.max(0, Math.floor(cx / VOXEL_SIZE)));
    const hz = Math.min(VOXELS_PER_CHUNK - 1, Math.max(0, Math.floor(cz / VOXEL_SIZE)));
    const height = (heightMap[hx * VOXELS_PER_CHUNK + hz] + 1) * VOXEL_SIZE;
    return height;
  }

  tick = (function() {
    const avatarPos = new THREE.Vector3();
    const chunk = new THREE.Vector3();

    return function() {
      // TODO skip if avatar hasn't spawned yet.
      if (!this.avatarPovEl) return;
      this.frame++;

      // Wait until we have the camera;
      if (!this.playerCamera) {
        if (!this.viewingCameraEl) return;
        this.playerCamera = this.viewingCameraEl.getObject3D("camera");
        if (!this.playerCamera) return;
      }

      if (this.activeTerrains.length) {
        // Call perform work on four terrains per frame.
        // Usually about 60 active terrains so this adds ~250ms latency to LOD updates.
        let n = 4;

        if (this.performFullTerrainWorkOnNextTick) {
          n = this.activeTerrains.length;
          this.performFullTerrainWorkOnNextTick = false;
        }

        for (let i = 0; i < n; i++) {
          this.activeTerrains[(this.frame * n + i) % this.activeTerrains.length].performWork(this.playerCamera);
        }
      }

      const { terrains, loadedChunks, loadingChunks, spawningChunks, avatarChunk, autoLoadingChunks } = this;
      const avatar = this.avatarPovEl.object3D;

      avatar.getWorldPosition(avatarPos);

      // Get chunk space coordinate
      chunk
        .copy(avatarPos)
        .divideScalar(CHUNK_WORLD_SIZE)
        .floor();

      chunk.y = 0;

      if (!chunk.equals(avatarChunk) && autoLoadingChunks) {
        const hasCrossedBorder = avatarChunk.x !== chunk.x || avatarChunk.z !== chunk.z;

        if (hasCrossedBorder) {
          avatarChunk.copy(chunk);
          this.avatarZone = `${keyForChunk(chunk)}:0`; // This will need fixing if we re-enable subchunks

          const newChunks = [];

          if (this.worldTypeChunkedLoads()) {
            // Wrap chunks so they pre-emptively load over border
            LOAD_GRID.forEach(({ x, z }) => {
              const cx = normalizeChunkCoord(avatarChunk.x + x);
              const cz = normalizeChunkCoord(avatarChunk.z + z);
              const newChunk = { x: cx, z: cz };
              newChunks.push(newChunk);
              this.loadChunk(newChunk, false, Math.abs(x) + Math.abs(z) + Math.random()); // Prioritize closest chunks
            });
          } else {
            for (let cx = MIN_CHUNK_COORD; cx <= MAX_CHUNK_COORD; cx++) {
              for (let cz = MIN_CHUNK_COORD; cz <= MAX_CHUNK_COORD; cz++) {
                const newChunk = { x: cx, z: cz };
                newChunks.push(newChunk);
                this.loadChunk(newChunk);
              }
            }
          }

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

          this.ensureFeatureMeshesSpawnedOrFree();
          this.ensureBodiesSpawnedOrFree();
          this.ensureLayers();
        }
      }

      if (this.spawningChunks.size > 0 && this.featureMeshesLoaded) {
        // Spawn a single chunk that's enqueued.
        for (const [, encodedChunk] of this.spawningChunks) {
          this.spawnChunk(encodedChunk);
          break;
        }
      }

      // Sort render order for chunks
      terrains.forEach(terrain => {
        const dist = Math.abs(avatarChunk.x - terrain.chunk.x) + Math.abs(avatarChunk.z - terrain.chunk.z);

        terrain.meshes.forEach(m => {
          m.renderOrder = dist + RENDER_ORDER.TERRAIN; // Render from front to back.
        });
      });

      if (this.playerCamera) {
        // Cull chunks
        this.cullChunksAndFeatureGroups(this.playerCamera);
      }
    };
  })();

  startAutoLoadingChunks() {
    this.autoLoadingChunks = true;
  }

  worldTypeHasWater() {
    return this.worldType === WORLD_TYPES.ISLANDS;
  }

  worldTypeHasFog() {
    // Flat worlds disable fog
    return this.worldType !== WORLD_TYPES.FLAT;
  }

  worldTypeDelaysMediaPresence() {
    // Flat worlds load all objects immediately
    return this.worldType !== WORLD_TYPES.FLAT;
  }

  worldTypeWraps() {
    // Flat worlds don't wrap
    return this.worldType !== WORLD_TYPES.FLAT;
  }

  worldTypeLODs() {
    // Flat + plain worlds don't LOD
    return this.worldType !== WORLD_TYPES.FLAT;
  }

  worldTypeChunkedLoads() {
    // Flat + plain worlds don't load in chunks
    return this.worldType !== WORLD_TYPES.FLAT;
  }

  cullChunksAndFeatureGroups = (() => {
    // Chunk + feature culling based upon AABB
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

    return camera => {
      const terrains = this.terrains.values();
      const featureGroups = this.featureGroups;

      frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // HACK extract near and far from matrix due to cube SSAO hack for z-buffer
      const c = camera.projectionMatrix.elements[10];
      const d = camera.projectionMatrix.elements[14];

      const near = d / (c - 1.0);
      let far = d / (c + 1.0);

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

      let hFar = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * far;
      let wFar = hFar * camera.aspect;

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

      const { cameraSystem } = SYSTEMS;

      // Cull terrain
      for (const t of terrains) {
        if (cameraSystem.isRenderingOrthographic()) {
          t.visible = true;
          continue;
        }

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

        // Visualize box
        //if (!t.showedBox) {
        //  t.showedBox = true;

        //  const box = new Box3(new Vector3(bminx, bminy, bminz), new Vector3(bmaxx, bmaxy, bmaxz));
        //  t.parent.parent.add(new Box3Helper(box));
        //}

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
      }

      // Cull features based upon half of feature culling radius
      far = FIELD_FEATURE_RADIUS * (CHUNK_WORLD_SIZE / 2);
      hFar = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * far;
      wFar = hFar * camera.aspect;

      p5.set(wFar / 2, hFar / 2, -far);
      p6.set(-wFar / 2, hFar / 2, -far);
      p7.set(wFar / 2, -hFar / 2, -far);
      p8.set(-wFar / 2, -hFar / 2, -far);
      p5.applyMatrix4(camera.matrixWorld);
      p6.applyMatrix4(camera.matrixWorld);
      p7.applyMatrix4(camera.matrixWorld);
      p8.applyMatrix4(camera.matrixWorld);

      for (const t of featureGroups) {
        if (cameraSystem.isRenderingOrthographic()) {
          t.visible = true;
          continue;
        }

        // eslint-disable-line no-restricted-syntax
        let show = true;

        // Compute featureGroup AABB
        t.getWorldPosition(tmp);
        const bminx = tmp.x - WORLD_SIZE / 2;
        const bmaxx = tmp.x + WORLD_SIZE / 2;
        const bminz = tmp.z - WORLD_SIZE / 2;
        const bmaxz = tmp.z + WORLD_SIZE / 2;
        const bminy = 0;
        const bmaxy = WORLD_SIZE;

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
      }
    };
  })();
}

let world = null;
import blockTypes from "../terra/blocks";
import World from "../terra/world";
import nextTick from "../../hubs/utils/next-tick";

const CHUNK_VERSION = 1;

const WORLD_TYPE_GENERATORS = {
  1: "islands",
  2: "hilly",
  3: "flat",
  4: "flat"
};

let db;
const req = indexedDB.open("terra", 1);
const chunkPriorities = new Map();

req.addEventListener("success", ({ target: { result } }) => {
  db = result;
});

req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
  db.createObjectStore("chunks", { keyPath: "id" });
});

self.onmessage = ({
  data: {
    id,
    payload: { x, z, seed, type, priority }
  }
}) => {
  const generatorType = WORLD_TYPE_GENERATORS[type];
  if (!generatorType) {
    console.warn("bad world type", type);
    return;
  }

  const chunkId = `${type}/${seed}/${x}/${z}/${CHUNK_VERSION}`;
  chunkPriorities.set(chunkId, priority || 0);

  const txn = db
    .transaction("chunks")
    .objectStore("chunks")
    .get(chunkId);

  txn.addEventListener("success", async ({ target }) => {
    if (target.result) {
      chunkPriorities.delete(chunkId);
      self.postMessage({ id, result: { chunk: target.result.chunk, cached: true } });
    } else {
      if (world === null || world.seed !== seed || world.generatorType !== generatorType) {
        world = new World({
          blockTypes,
          generatorType,
          seed
        });
      }

      const currentWorld = world;

      // TODO try fetch from origin

      while (true) { // eslint-disable-line
        let nextChunk;
        let nextPriority = Infinity;

        for (const [chunkKey, priority] of chunkPriorities.entries()) {
          if (priority < nextPriority) {
            nextPriority = priority;
            nextChunk = chunkKey;
          }
        }

        if (nextChunk === chunkId) break;

        await nextTick();
      }

      // TODO try fetch from origin again before doing compute
      const chunk = currentWorld.getEncodedChunk(x, z);
      chunkPriorities.delete(chunkId);

      // TODO post to origin if writeback enabled

      self.postMessage({
        id,
        result: { chunk, cached: false }
      });

      db.transaction("chunks", "readwrite")
        .objectStore("chunks")
        .put({ id: chunkId, chunk });
    }
  });
};

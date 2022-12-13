let world = null;
import blockTypes from "../terra/blocks";
import World from "../terra/world";
import nextTick from "../utils/next-tick";

const CHUNK_VERSION = 1;

const WORLD_TYPE_GENERATORS = {
  1: "islands",
  2: "hilly",
  3: "plains",
  4: "flat"
};

let db;
const req = indexedDB.open("terra", 1);
const jobPriorities = new Map();
const intraSessionSavedChunkIds = new Set();

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

  const mesher = 0;
  const chunkId = `${type}/${mesher}/${seed}/${x}/${z}/${CHUNK_VERSION}`;
  jobPriorities.set(id, (priority || 0) + Math.random());

  const txn = db
    .transaction("chunks")
    .objectStore("chunks")
    .get(chunkId);

  txn.addEventListener("success", async ({ target }) => {
    if (target.result) {
      jobPriorities.delete(id);

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
        let nextJob;
        let nextPriority = Infinity;

        for (const [jobId, priority] of jobPriorities.entries()) {
          if (priority < nextPriority) {
            nextPriority = priority;
            nextJob = jobId;
          }
        }

        if (id === nextJob) break;

        await nextTick();
      }

      if (intraSessionSavedChunkIds.has(chunkId)) {
        // Another run just saved this one.
        const txn = db
          .transaction("chunks")
          .objectStore("chunks")
          .get(chunkId);

        txn.addEventListener("success", async ({ target }) => {
          jobPriorities.delete(id);

          self.postMessage({ id, result: { chunk: target.result.chunk, cached: true } });
        });
      } else {
        // TODO try fetch from origin again before doing compute
        const chunk = currentWorld.getEncodedChunk(x, z);

        // TODO post to origin if writeback enabled

        db.transaction("chunks", "readwrite")
          .objectStore("chunks")
          .put({ id: chunkId, chunk })
          .addEventListener("success", () => {
            self.postMessage({
              id,
              result: { chunk, cached: false }
            });

            intraSessionSavedChunkIds.add(chunkId);
            jobPriorities.delete(id);
          });
      }
    }
  });
};

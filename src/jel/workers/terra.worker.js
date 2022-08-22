let world = null;
import blockTypes from "../terra/blocks";
import World from "../terra/world";

const CHUNK_VERSION = 1;

const WORLD_TYPE_GENERATORS = {
  1: "islands",
  2: "hilly",
  3: "flat",
  4: "flat"
};

let db;
const req = indexedDB.open("terra", 1);

req.addEventListener("success", ({ target: { result } }) => {
  db = result;
});

req.addEventListener("upgradeneeded", ({ target: { result: db } }) => {
  db.createObjectStore("chunks", { keyPath: "id" });
});

self.onmessage = ({
  data: {
    id,
    payload: { x, z, seed, type }
  }
}) => {
  const generatorType = WORLD_TYPE_GENERATORS[type];
  if (!generatorType) {
    console.warn("bad world type", type);
    return;
  }

  const chunkId = `${type}/${seed}/${x}/${z}/${CHUNK_VERSION}`;

  const txn = db
    .transaction("chunks")
    .objectStore("chunks")
    .get(chunkId);

  txn.addEventListener("success", ({ target }) => {
    if (target.result) {
      self.postMessage({ id, result: target.result.chunk });
    } else {
      if (world === null || world.seed !== seed || world.generatorType !== generatorType) {
        world = new World({
          blockTypes,
          generatorType,
          seed
        });
      }

      const chunk = world.getEncodedChunk(x, z);
      self.postMessage({
        id,
        result: chunk
      });

      db.transaction("chunks", "readwrite")
        .objectStore("chunks")
        .put({ id: chunkId, chunk });
    }
  });
};

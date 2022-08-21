let world = null;
import blockTypes from "../terra/blocks";
import World from "../terra/world";

const WORLD_TYPE_GENERATORS = {
  1: "islands",
  2: "hilly",
  3: "flat",
  4: "flat"
};

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

  if (world === null || world.seed !== seed || world.generatorType !== type) {
    world = new World({
      blockTypes,
      generatorType,
      seed
    });
  }

  self.postMessage({
    id,
    result: world.getEncodedChunk(x, z)
  });
};

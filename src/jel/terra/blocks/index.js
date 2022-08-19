import dirt from "./models/dirt";
import glass from "./models/glass";
import water from "./models/water";
import feature from "./models/water";
import blockTexture from "./textures/block";

const blockTypes = {
  air: 0,
  0: { isTransparent: true, isVisible: () => true }
};

const models = {
  dirt,
  glass,
  water,
  feature
};

const LoadBlockTypes = () => {
  const types = ["dirt", "glass", "water", "feature"];

  const textures = [];
  types.forEach((type, i) => {
    const model = models[type];
    Object.keys(model.textures).forEach(id => {
      const texture = model.textures[id];
      let index = textures.findIndex(({ name }) => name === texture);
      if (index === -1) {
        index = textures.length;
        let image;
        if (texture === "block.js") {
          image = blockTexture;
        } else {
          console.error(`Texture: ${texture} format not supported.\n`);
          process.exit(1);
        }
        image.name = texture;
        textures.push(image);
      }
      model.textures[id] = index;
    });
    const index = i + 1;
    blockTypes[index] = model;
    blockTypes[type] = index;
  });
  return blockTypes;
};

export default LoadBlockTypes();

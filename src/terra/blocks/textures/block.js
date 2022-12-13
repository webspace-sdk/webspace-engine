// TODO this seems like dead code
const block = {
  width: 16,
  height: 16,
  colorType: 6,
  data: Array(16 * 16 * 4) // RGBA
};

for (let y = 0; y < block.height; y += 1) {
  for (let x = 0; x < block.width; x += 1) {
    let light = 0.9 + Math.random() * 0.05;
    if (x === 0 || x === block.width - 1 || y === 0 || y === block.width - 1) {
      light *= 0.9;
    } else if (x === 1 || x === block.width - 2 || y === 1 || y === block.width - 2) {
      light *= 1.2;
    }
    light = Math.floor(Math.min(Math.max(light, 0), 1) * 0xff);
    const i = (y * block.width + x) * 4;
    block.data[i] = light;
    block.data[i + 1] = light;
    block.data[i + 2] = light;
    block.data[i + 3] = 0xff;
  }
}

export default block;

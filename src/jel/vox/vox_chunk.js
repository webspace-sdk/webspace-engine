// Voxel values are:
// r | (g << 8) | (b << 16) | (type << 24);

const VERSION = 0;
const EMPTY_VOXEL_PALETTE_INDEX = 0;

// Max size allowed for chunks by default.
const MAX_SIZE = 128;

/* version, size x, y, z, 3x reserved */
const HEADER_SIZE = 8;

const VOXEL_TYPE_DIFFUSE = 0x00;

// Used in ops, this voxel should be removed.
const VOXEL_TYPE_REMOVE = 0xff;
const REMOVE_VOXEL_COLOR = (VOXEL_TYPE_REMOVE << 24) >>> 0;

const VOX_CHUNK_FILTERS = {
  NONE: 0,
  // Filters out cells in the provided chunk that are not also in the target chunk
  PAINT: 1,
  // Filters out cells in the provided chunk that are in the target chunk
  KEEP: 2
};

const RESERVED_PALETTE_INDEXES = 1;
const iPalOpToIPalSnap = new Map();

const shiftForSize = size => Math.floor(size % 2 === 0 ? size / 2 - 1 : size / 2);

const xyzRangeForSize = size => {
  const [x, y, z] = size;
  const xShift = shiftForSize(x);
  const yShift = shiftForSize(y);
  const zShift = shiftForSize(z);
  const maxX = x - xShift - 1;
  const maxY = y - yShift - 1;
  const maxZ = z - zShift - 1;
  const minX = -xShift;
  const minY = -yShift;
  const minZ = -zShift;
  return [minX, maxX, minY, maxY, minZ, maxZ];
};

const Bits = require("./bits");

const PALETTE_ENTRY_SIZE_INTS = 1;
const PALETTE_ENTRY_SIZE_BYTES = PALETTE_ENTRY_SIZE_INTS * 4;

function createViewsForBitsPerIndex(size, bitsPerIndex, buffer = null) {
  // Underlying buffer contains size, bits per index, palette and indexes
  const numPaletteEntries = 2 ** bitsPerIndex - RESERVED_PALETTE_INDEXES;
  const paletteBytes = PALETTE_ENTRY_SIZE_BYTES * numPaletteEntries;

  const indexBits = size[0] * size[1] * size[2] * bitsPerIndex;
  const indexBytes = Math.floor(indexBits / 8) + 1;
  const bytes = HEADER_SIZE + paletteBytes + indexBytes;

  if (buffer == null) {
    if (typeof Buffer !== "undefined") {
      buffer = Buffer.alloc(bytes).buffer;
    } else {
      buffer = new ArrayBuffer(bytes);
    }
  }

  const header = new Uint8Array(buffer, 0, HEADER_SIZE);
  const paletteLength = paletteBytes / PALETTE_ENTRY_SIZE_BYTES;
  const palette = new Uint32Array(buffer, HEADER_SIZE, paletteLength);
  const indices = Bits.create(buffer, bitsPerIndex, HEADER_SIZE + paletteBytes);

  header[0] = VERSION;
  [header[1], header[2], header[3]] = size;
  header[4] = bitsPerIndex;

  return [buffer, palette, indices];
}

class VoxChunk {
  constructor(
    size = null,
    paletteBuffer = null,
    indicesBuffer = null,
    bitsPerIndex = 8,
    paletteOffset = 0,
    paletteByteLength = null,
    indicesOffset = 0,
    indicesByteLength = null
  ) {
    if (paletteBuffer && indicesBuffer) {
      this.size = [size[0], size[1], size[2]];
      this.bitsPerIndex = bitsPerIndex;
      paletteByteLength = paletteByteLength || paletteBuffer.length;
      indicesByteLength = indicesByteLength || indicesBuffer.length;

      this.palette = new Uint32Array(paletteBuffer, paletteOffset || 0, paletteByteLength / 4);
      this.indices = Bits.create(indicesBuffer, bitsPerIndex, indicesOffset, indicesByteLength);
      this.xShift = shiftForSize(size[0]);
      this.yShift = shiftForSize(size[1]);
      this.zShift = shiftForSize(size[2]);
      this._rebuildRefCounts();
    } else if (size) {
      // Need at least two bits to start because of empty,
      // remove, and palette value. Start with palette of size 2.
      const [buffer, palette, indices] = createViewsForBitsPerIndex(size, 1);
      this.palette = palette;
      this.indices = indices;
      this._refCounts = new Array(this.palette.length).fill(0);

      this._recomputeSizeFieldsForBuffer(buffer);
    }
  }

  _recomputeSizeFieldsForBuffer(buffer) {
    const header = new Uint8Array(buffer, 0, HEADER_SIZE);
    this.size = [0, 0, 0];

    [, this.size[0], this.size[1], this.size[2], this.bitsPerIndex] = header;
    this.xShift = shiftForSize(this.size[0]);
    this.yShift = shiftForSize(this.size[1]);
    this.zShift = shiftForSize(this.size[2]);
  }

  getPaletteIndexAt(x, y, z) {
    const { indices } = this;
    const offset = this._getOffset(x, y, z);
    return indices.get(offset);
  }

  getPaletteIndexAtOffset(offset) {
    const { indices } = this;
    return indices.get(offset);
  }

  getColorAt(x, y, z) {
    const idx = this.getPaletteIndexAt(x, y, z);
    return this.colorForPaletteIndex(idx);
  }

  hasVoxelAt(x, y, z) {
    return this.getPaletteIndexAt(x, y, z) !== 0;
  }

  getTotalNonEmptyVoxels() {
    let sum = 0;

    for (let i = 0; i < this._refCounts.length; i += 1) {
      sum += this._refCounts[i];
    }

    return sum;
  }

  getPaletteColor(idx) {
    return this.palette[(idx - RESERVED_PALETTE_INDEXES) * PALETTE_ENTRY_SIZE_INTS];
  }

  setPaletteColor(idx, color) {
    this.palette[(idx - RESERVED_PALETTE_INDEXES) * PALETTE_ENTRY_SIZE_INTS] = color;
  }

  paletteHasReferences(idx) {
    return this._refCounts[idx - RESERVED_PALETTE_INDEXES] !== 0;
  }

  resetPaletteRefcountToOne(idx) {
    this._refCounts[idx - RESERVED_PALETTE_INDEXES] = 1;
  }

  incrementPaletteRefcount(idx) {
    this._refCounts[idx - RESERVED_PALETTE_INDEXES] += 1;
  }

  decrementPaletteRefcount(idx) {
    this._refCounts[idx - RESERVED_PALETTE_INDEXES] -= 1;
  }

  static isNonEmptyPaletteIndex(idx) {
    return idx !== 0;
  }

  setPaletteIndexAt(x, y, z, paletteIndex) {
    const offset = this._getOffset(x, y, z);
    this.setPaletteIndexAtOffset(offset, paletteIndex);
  }

  setPaletteIndexAtOffset(offset, paletteIndex) {
    const { indices } = this;

    const currentPaletteIndex = this.getPaletteIndexAtOffset(offset);

    if (VoxChunk.isNonEmptyPaletteIndex(currentPaletteIndex)) {
      // Is a color, decrement refcount
      this.decrementPaletteRefcount(currentPaletteIndex);
    }

    if (VoxChunk.isNonEmptyPaletteIndex(paletteIndex)) {
      // Is a color, increment refcount
      this.incrementPaletteRefcount(paletteIndex);
    }

    indices.set(offset, paletteIndex);
  }

  setEmptyAt(x, y, z) {
    this.setPaletteIndexAt(x, y, z, 0);
  }

  clear() {
    // Maintain palette + bitwidth across clears
    this.indices.clear();
    this._refCounts.fill(0);
  }

  setColorAt(x, y, z, color) {
    const offset = this._getOffset(x, y, z);
    return this.setColorAtOffset(offset, color);
  }

  // Returns the palette index for the set color.
  setColorAtOffset(offset, color) {
    const { palette, indices } = this;

    const currentPaletteIndex = this.getPaletteIndexAtOffset(offset);
    const currentIsColor = VoxChunk.isNonEmptyPaletteIndex(currentPaletteIndex);

    if (currentIsColor) {
      // Is a color, decrement refcount in palette
      this.decrementPaletteRefcount(currentPaletteIndex);
    }

    // Check if palette entry exists for this new value
    for (let i = 0; i < palette.length; i += 1) {
      const paletteIndex = i + RESERVED_PALETTE_INDEXES;
      const palColor = this.getPaletteColor(paletteIndex);

      if (palColor === color) {
        this.incrementPaletteRefcount(paletteIndex);
        indices.set(offset, paletteIndex);
        return paletteIndex;
      }
    }

    // New color, not in palette.
    //
    // Can re-purpose the existing palette entry, without updating indices?
    if (currentIsColor && !this.paletteHasReferences(currentPaletteIndex)) {
      this.setPaletteColor(currentPaletteIndex, color);
      this.resetPaletteRefcountToOne(currentPaletteIndex);
      return currentPaletteIndex;
    }

    // Need a new palette entry.
    // This may re-size the underlying data.
    const newEntryPaletteIndex = this._getFreePaletteIndex();

    this.setPaletteColor(newEntryPaletteIndex, color);
    this.resetPaletteRefcountToOne(newEntryPaletteIndex);

    // Re-reference this. since getFreePaletteEntryIndex may have expanded
    this.indices.set(offset, newEntryPaletteIndex);

    return newEntryPaletteIndex;
  }

  colorForPaletteIndex(idx) {
    return this.palette[(idx - RESERVED_PALETTE_INDEXES) * PALETTE_ENTRY_SIZE_INTS];
  }

  filterByChunk(targetChunk, offsetX, offsetY, offsetZ, filter) {
    if (filter === VOX_CHUNK_FILTERS.NONE) return;

    const targetSize = targetChunk.size;
    const [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);

    const { size } = this;

    const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const iPalOp = this.getPaletteIndexAt(x, y, z);

          // Skip cell if zero
          if (iPalOp === 0) continue; // eslint-disable-line
          const targetX = x + offsetX;
          const targetY = y + offsetY;
          const targetZ = z + offsetZ;

          const targetOutOfRange =
            targetX > targetMaxX ||
            targetX < targetMinX ||
            targetY > targetMaxY ||
            targetY < targetMinY ||
            targetZ > targetMaxZ ||
            targetZ < targetMinZ;

          const targetHasVoxel = !targetOutOfRange && targetChunk.hasVoxelAt(targetX, targetY, targetZ);

          if (
            (filter === VOX_CHUNK_FILTERS.PAINT && !targetHasVoxel) ||
            (filter === VOX_CHUNK_FILTERS.KEEP && targetHasVoxel)
          ) {
            this.setEmptyAt(x, y, z);
          }
        }
      }
    }
  }

  _getFreePaletteIndex() {
    const { palette, size, indices, bitsPerIndex } = this;

    for (let i = 0; i < palette.length; i += 1) {
      const paletteIndex = i + RESERVED_PALETTE_INDEXES;

      if (!this.paletteHasReferences(paletteIndex)) {
        return paletteIndex;
      }
    }

    // Couldn't find one. Grow the buffer. Prefer bits per index power of 2.
    const newBitsPerIndex = bitsPerIndex * 2;
    const [newBuffer, newPalette, newIndices] = createViewsForBitsPerIndex(size, newBitsPerIndex);

    for (let i = 0; i < palette.length * PALETTE_ENTRY_SIZE_INTS; i += 1) {
      newPalette[i] = palette[i];
    }

    while (this._refCounts.length < newPalette.length) {
      this._refCounts.push(0);
    }

    for (let i = 0, s = size[0] * size[1] * size[2]; i < s; i += 1) {
      const idx = indices.get(i);
      newIndices.set(i, idx);
    }

    this.palette = newPalette;
    this.indices = newIndices;

    this._recomputeSizeFieldsForBuffer(newBuffer);

    return this._getFreePaletteIndex();
  }

  resizeToFit(x, y, z) {
    const { size } = this;

    const sx = Math.max(1, size[0], Math.abs(x) * 2 + 1);
    const sy = Math.max(1, size[1], Math.abs(y) * 2 + 1);
    const sz = Math.max(1, size[2], Math.abs(z) * 2 + 1);

    // Resize pending if necessary to be able to fit brush end and start cells.
    this.resizeTo([sx, sy, sz]);
  }

  // Resizes this chunk to the specified size.
  resizeTo(size) {
    if (this.size[0] >= size[0] && this.size[1] >= size[1] && this.size[2] >= size[2]) return;

    // Create a new chunk and cpoy this chunk into it.
    const chunk = new VoxChunk(size);
    const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(this.size);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const idx = this.getPaletteIndexAt(x, y, z);

          if (idx !== 0) {
            chunk.setColorAt(x, y, z, this.getColorAt(x, y, z));
          }
        }
      }
    }

    // Reach in and grab buffer from the new chunk and assign it to this chunk.
    const { buffer } = chunk.palette;
    [this.size[0], this.size[1], this.size[2]] = size;
    const { bitsPerIndex } = chunk;
    this.bitsPerIndex = bitsPerIndex;

    const [, palette, indices] = createViewsForBitsPerIndex(size, bitsPerIndex, buffer);

    this.palette = palette;
    this.indices = indices;
    this._refCounts = chunk._refCounts;
    this._recomputeSizeFieldsForBuffer(buffer);
  }

  static fromJSON(json) {
    if (typeof json === "string") return VoxChunk.deserialize(json);

    const { size, palette, indices } = json;
    // Slow, only use for tests + debugging
    const chunk = new VoxChunk(size);

    // Set colors in palette order, so palette ends up matching order specified.
    for (let i = 0; i < palette.length + RESERVED_PALETTE_INDEXES; i += 1) {
      for (let j = 0; j < indices.length; j += 1) {
        const paletteIndex = indices[j];

        if (paletteIndex === i) {
          if (paletteIndex >= RESERVED_PALETTE_INDEXES) {
            const color = palette[paletteIndex - RESERVED_PALETTE_INDEXES];
            chunk.setColorAtOffset(j, color);
          } else if (paletteIndex === i) {
            chunk.setPaletteIndexAtOffset(j, paletteIndex);
          }
        }
      }
    }

    return chunk;
  }

  toJSON(arg, readable) {
    if (!readable) return this.serialize();

    const palette = [];
    const indices = [];

    for (let i = 0; i < this.palette.length; i += 1) {
      const paletteIndex = i + RESERVED_PALETTE_INDEXES;
      const color = this.getPaletteColor(paletteIndex);

      if (color > 0) {
        palette.push(color);
      }
    }

    for (let i = 0, s = this.size[0] * this.size[1] * this.size[2]; i < s; i += 1) {
      indices.push(this.indices.get(i));
    }

    return {
      size: [...this.size],
      palette,
      indices
    };
  }

  clone() {
    return new VoxChunk(
      this.size,
      this.palette.buffer.slice(0),
      this.indices.view.buffer.slice(0),
      this.bitsPerIndex,
      this.palette.byteOffset,
      this.palette.byteLength,
      this.indices.view.byteOffset,
      this.indices.view.byteLength
    );
  }

  _getOffset(x, y, z) {
    const { size, xShift, yShift, zShift } = this;

    return (x + xShift) * size[1] * size[2] + (y + yShift) * size[2] + (z + zShift);
  }

  _rebuildRefCounts() {
    this._refCounts = new Array(this.palette.length).fill(0);

    for (let i = 0, s = this.size[0] * this.size[1] * this.size[2]; i < s; i += 1) {
      const paletteIndex = this.getPaletteIndexAtOffset(i);

      if (VoxChunk.isNonEmptyPaletteIndex(paletteIndex)) {
        this.incrementPaletteRefcount(paletteIndex);
      }
    }
  }

  applyToChunk(targetChunk, offsetX = 0, offsetY = 0, offsetZ = 0) {
    iPalOpToIPalSnap.clear();

    let targetSize = targetChunk.size;
    let [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);

    const { size } = this;

    const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const iPalOp = this.getPaletteIndexAt(x, y, z);

          // Skip cell if zero
          if (iPalOp !== 0) {
            const targetX = x + offsetX;
            const targetY = y + offsetY;
            const targetZ = z + offsetZ;

            let requiredSizeX = targetSize[0];
            let requiredSizeY = targetSize[1];
            let requiredSizeZ = targetSize[2];

            // Check for chunk resize
            // If target we need to write to is out of range, resize frame.
            if (targetX > targetMaxX) {
              requiredSizeX = targetX * 2;
            }

            if (targetX < targetMinX) {
              requiredSizeX = Math.max(requiredSizeX, -targetX * 2 + 1);
            }

            if (targetY > targetMaxY) {
              requiredSizeY = targetY * 2;
            }

            if (targetY < targetMinY) {
              requiredSizeY = Math.max(requiredSizeY, -targetY * 2 + 1);
            }

            if (targetZ > targetMaxZ) {
              requiredSizeZ = targetZ * 2;
            }

            if (targetZ < targetMinZ) {
              requiredSizeZ = Math.max(requiredSizeZ, -targetZ * 2 + 1);
            }

            // If target is beyond bounds (ie, user submitted a voxel beyond range) skip it.
            if (requiredSizeX > MAX_SIZE || requiredSizeY > MAX_SIZE || requiredSizeZ > MAX_SIZE) {
              continue; // eslint-disable-line
            }

            if (targetSize[0] < requiredSizeX || targetSize[1] < requiredSizeY || targetSize[2] < requiredSizeZ) {
              targetChunk.resizeTo([requiredSizeX, requiredSizeY, requiredSizeZ]);
              targetSize = targetChunk.size;

              [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);

              // Palette may have been re-written in resize, clear cache.
              iPalOpToIPalSnap.clear();
            }

            const newIPalSnap = iPalOpToIPalSnap.get(iPalOp);

            if (newIPalSnap === undefined) {
              const color = this.getColorAt(x, y, z);

              if (color === REMOVE_VOXEL_COLOR) {
                // For remove, set target to empty cell
                targetChunk.setEmptyAt(targetX, targetY, targetZ);
              } else {
                // Otherwise, set the color and potentially expand target palette.
                const iPalSnap = targetChunk.setColorAt(targetX, targetY, targetZ, color);

                iPalOpToIPalSnap.set(iPalOp, iPalSnap);
              }
            } else {
              const currentIPalSnap = targetChunk.getPaletteIndexAt(targetX, targetY, targetZ);

              if (currentIPalSnap !== newIPalSnap) {
                targetChunk.setPaletteIndexAt(targetX, targetY, targetZ, newIPalSnap);
              }
            }
          }
        }
      }
    }
  }

  createInverse = (targetChunk, offset) => {
    iPalOpToIPalSnap.clear();

    const targetSize = targetChunk.size;
    const [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);

    const { size } = this;
    const inverse = new VoxChunk(size);

    const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const iPalOp = this.getPaletteIndexAt(x, y, z);

          // Skip cell if zero
        if (iPalOp === 0) continue; // eslint-disable-line
          const targetX = x + offset[0];
          const targetY = y + offset[1];
          const targetZ = z + offset[2];

          // Inverse of case where the target doesn't have a voxel is a remove.
          if (
            targetX > targetMaxX ||
            targetX < targetMinX ||
            targetY > targetMaxY ||
            targetY < targetMinY ||
            targetZ > targetMaxZ ||
            targetZ < targetMinZ ||
            !targetChunk.hasVoxelAt(targetX, targetY, targetZ)
          ) {
            inverse.setColorAt(x, y, z, REMOVE_VOXEL_COLOR);
          } else {
            const currentColor = targetChunk.getColorAt(targetX, targetY, targetZ);
            inverse.setColorAt(x, y, z, currentColor);
          }
        }
      }
    }

    return inverse;
  };
}

function voxColorForRGBT(r, g, b, t = VOXEL_TYPE_DIFFUSE) {
  return (r | (g << 8) | (b << 16) | (t << 24)) >>> 0;
}

function rgbtForVoxColor(voxColor) {
  const r = voxColor & 0x000000ff;
  const g = (voxColor & 0x0000ff00) >> 8;
  const b = (voxColor & 0x00ff0000) >> 16;
  const t = (voxColor & 0xff000000) >> 24;

  return {
    r,
    g,
    b,
    t
  };
}

module.exports = {
  VoxChunk,
  EMPTY_VOXEL_PALETTE_INDEX,
  shiftForSize,
  xyzRangeForSize,
  voxColorForRGBT,
  rgbtForVoxColor,
  VOXEL_TYPE_DIFFUSE,
  VOXEL_TYPE_REMOVE,
  REMOVE_VOXEL_COLOR,
  VOX_CHUNK_FILTERS,
  MAX_SIZE
};

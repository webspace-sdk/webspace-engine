// Adapted from https://github.com/inolen/bit-buffer/blob/master/bit-buffer.js
/* eslint-disable max-classes-per-file */
function set(offset, value, bits, view) {
  let bufOffset = bits * offset;

  for (let i = 0; i < bits; ) {
    const bitOffset = bufOffset & 7;
    const byteOffset = bufOffset >> 3;
    const remaining = bits - i;
    const residual = 8 - bitOffset;

    const wrote = remaining < residual ? remaining : residual;

    // create a mask with the correct bit width
    const mask = ~(0xff << wrote);

    // shift the bits we want to the start of the byte and mask of the rest
    const writeBits = value & mask;
    value >>= wrote;
    const destMask = ~(mask << bitOffset);
    view[byteOffset] = (view[byteOffset] & destMask) | (writeBits << bitOffset);
    bufOffset += wrote;
    i += wrote;
  }
}

class Bits1 {
  constructor(view) {
    this.view = view;
  }

  get(offset) {
    return (this.view[offset >> 3] >> (offset & 7)) & 0x1;
  }

  set(offset, value) {
    return set(offset, value, 1, this.view);
  }

  clear() {
    this.view.fill(0);
  }
}

class Bits2 {
  constructor(view) {
    this.view = view;
  }

  get(offset) {
    return (this.view[offset >> 2] >> ((offset & 3) << 1)) & 0x3;
  }

  set(offset, value) {
    return set(offset, value, 2, this.view);
  }

  clear() {
    this.view.fill(0);
  }
}

class Bits4 {
  constructor(view) {
    this.view = view;
  }

  get(offset) {
    return (this.view[offset >> 1] >> ((offset & 1) << 2)) & 0xf;
  }

  set(offset, value) {
    return set(offset, value, 4, this.view);
  }

  clear() {
    this.view.fill(0);
  }
}

class Bits8 {
  constructor(view) {
    this.view = view;
  }

  get(offset) {
    return this.view[offset] >>> 0;
  }

  set(offset, value) {
    return set(offset, value, 8, this.view);
  }

  clear() {
    this.view.fill(0);
  }
}

class BitsN {
  constructor(view, bits) {
    this.view = view;
    this.bits = bits;
  }

  get(offset) {
    const { view, bits } = this;
    let bufOffset = offset * bits;
    let value = 0;
    for (let i = 0; i < bits; ) {
      const bitOffset = bufOffset & 7;
      const byteOffset = bufOffset >> 3;

      const remaining = bits - i;
      const residual = 8 - bitOffset;

      const read = remaining < residual ? remaining : residual;
      const currentByte = view[byteOffset];

      const mask = ~(0xff << read);
      const readBits = (currentByte >> bitOffset) & mask;
      value |= readBits << i;

      bufOffset += read;
      i += read;
    }

    return value >>> 0;
  }

  set(offset, value) {
    set(offset, value, this.bits, this.view);
  }

  clear() {
    this.view.fill(0);
  }
}

class Bits {
  static create(buffer, bits, offset, length = null) {
    const view = length ? new Uint8Array(buffer, offset, length) : new Uint8Array(buffer, offset);

    switch (bits) {
      case 1:
        return new Bits1(view);
      case 2:
        return new Bits2(view);
      case 4:
        return new Bits4(view);
      case 8:
        return new Bits8(view);
      default:
        return new BitsN(view);
    }
  }
}
module.exports = Bits;

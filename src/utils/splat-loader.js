// Parsers for 3D Gaussian Splat files: .ply (standard 3DGS training output), .splat (antimatter15 format),
// and .spz (Niantic's compressed format). All return a common in-memory representation:
//
//   { count, positions: Float32Array(3n), scales: Float32Array(3n) (linear), rotations: Float32Array(4n) (x,y,z,w),
//     colors: Uint8Array(4n) (sRGB rgb + linear alpha) }
//
// Only the view-independent (degree 0) spherical harmonic term is used for color.

export const SPLAT_CONTENT_TYPE = "model/vnd.gaussian-splat";

const SH_C0 = 0.28209479177387814;

const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const sigmoid = v => 1 / (1 + Math.exp(-v));

function allocate(count) {
  return {
    count,
    positions: new Float32Array(count * 3),
    scales: new Float32Array(count * 3),
    rotations: new Float32Array(count * 4),
    colors: new Uint8Array(count * 4)
  };
}

function setRotation(out, i, x, y, z, w) {
  const len = Math.hypot(x, y, z, w) || 1;
  out.rotations[i * 4 + 0] = x / len;
  out.rotations[i * 4 + 1] = y / len;
  out.rotations[i * 4 + 2] = z / len;
  out.rotations[i * 4 + 3] = w / len;
}

export function detectSplatFormat(url, bytes) {
  const u8 = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (u8[0] === 0x70 && u8[1] === 0x6c && u8[2] === 0x79) return "ply"; // "ply"
  if (u8[0] === 0x1f && u8[1] === 0x8b) return "spz"; // gzip
  if (u8[0] === 0x4e && u8[1] === 0x47 && u8[2] === 0x53 && u8[3] === 0x50) return "spz-raw"; // "NGSP" uncompressed
  const ext = (url || "")
    .split(/[?#]/)[0]
    .split(".")
    .pop()
    .toLowerCase();
  if (ext === "splat") return "splat";
  return null;
}

export function isSplatUrl(url) {
  if (!url) return false;
  const ext = url
    .split(/[?#]/)[0]
    .split(".")
    .pop()
    .toLowerCase();
  return ext === "spz" || ext === "splat" || ext === "ply";
}

function parseAntimatterSplat(bytes) {
  const ROW = 32;
  const count = Math.floor(bytes.byteLength / ROW);
  const out = allocate(count);
  const f = new Float32Array(bytes, 0, count * 8);
  const u = new Uint8Array(bytes);

  for (let i = 0; i < count; i++) {
    out.positions.set(f.subarray(i * 8, i * 8 + 3), i * 3);
    out.scales.set(f.subarray(i * 8 + 3, i * 8 + 6), i * 3);
    out.colors.set(u.subarray(i * ROW + 24, i * ROW + 28), i * 4);
    const r = i * ROW + 28;
    // Stored as w, x, y, z
    setRotation(out, i, (u[r + 1] - 128) / 128, (u[r + 2] - 128) / 128, (u[r + 3] - 128) / 128, (u[r] - 128) / 128);
  }

  return out;
}

const PLY_TYPES = {
  char: ["getInt8", 1],
  int8: ["getInt8", 1],
  uchar: ["getUint8", 1],
  uint8: ["getUint8", 1],
  short: ["getInt16", 2],
  int16: ["getInt16", 2],
  ushort: ["getUint16", 2],
  uint16: ["getUint16", 2],
  int: ["getInt32", 4],
  int32: ["getInt32", 4],
  uint: ["getUint32", 4],
  uint32: ["getUint32", 4],
  float: ["getFloat32", 4],
  float32: ["getFloat32", 4],
  double: ["getFloat64", 8],
  float64: ["getFloat64", 8]
};

function parsePly(bytes) {
  const headerText = new TextDecoder().decode(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 64 * 1024)));
  const endIdx = headerText.indexOf("end_header");
  if (endIdx < 0) throw new Error("PLY: no end_header");
  const headerLen = headerText.indexOf("\n", endIdx) + 1;
  const lines = headerText.slice(0, endIdx).split(/\r?\n/);

  if (!lines.some(l => l.startsWith("format binary_little_endian"))) {
    throw new Error("PLY: only binary_little_endian is supported");
  }

  // Collect elements; only the "vertex" element holds splats but we must skip over any that precede it.
  const elements = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "element") {
      elements.push({ name: parts[1], count: parseInt(parts[2], 10), props: [], stride: 0 });
    } else if (parts[0] === "property" && elements.length) {
      const el = elements[elements.length - 1];
      if (parts[1] === "list") throw new Error("PLY: list properties are not supported");
      const [getter, size] = PLY_TYPES[parts[1]] || [];
      if (!getter) throw new Error(`PLY: unknown type ${parts[1]}`);
      el.props.push({ name: parts[2], getter, size, offset: el.stride });
      el.stride += size;
    }
  }

  let offset = headerLen;
  let vertex = null;
  for (const el of elements) {
    if (el.name === "vertex") {
      vertex = el;
      break;
    }
    offset += el.count * el.stride;
  }
  if (!vertex) throw new Error("PLY: no vertex element");

  const view = new DataView(bytes, offset);
  const byName = Object.fromEntries(vertex.props.map(p => [p.name, p]));
  const read = (p, base) => view[p.getter](base + p.offset, true);
  const count = vertex.count;
  const out = allocate(count);

  const { x, y, z } = byName;
  const isGaussian = !!(byName.scale_0 && byName.rot_0 && byName.opacity);
  const dc = [byName.f_dc_0, byName.f_dc_1, byName.f_dc_2];
  const rgb = [byName.red, byName.green, byName.blue];

  for (let i = 0; i < count; i++) {
    const b = i * vertex.stride;
    out.positions[i * 3] = read(x, b);
    out.positions[i * 3 + 1] = read(y, b);
    out.positions[i * 3 + 2] = read(z, b);

    if (dc[0]) {
      for (let c = 0; c < 3; c++) out.colors[i * 4 + c] = clamp255((0.5 + SH_C0 * read(dc[c], b)) * 255);
    } else if (rgb[0]) {
      const scale = rgb[0].size === 1 ? 1 : 255;
      for (let c = 0; c < 3; c++) out.colors[i * 4 + c] = clamp255(read(rgb[c], b) * scale);
    } else {
      out.colors.fill(255, i * 4, i * 4 + 3);
    }

    if (isGaussian) {
      out.colors[i * 4 + 3] = clamp255(sigmoid(read(byName.opacity, b)) * 255);
      out.scales[i * 3] = Math.exp(read(byName.scale_0, b));
      out.scales[i * 3 + 1] = Math.exp(read(byName.scale_1, b));
      out.scales[i * 3 + 2] = Math.exp(read(byName.scale_2, b));
      // rot_0 is w
      setRotation(out, i, read(byName.rot_1, b), read(byName.rot_2, b), read(byName.rot_3, b), read(byName.rot_0, b));
    } else {
      // Plain point cloud: small round splats
      out.colors[i * 4 + 3] = 255;
      out.scales.fill(0.01, i * 3, i * 3 + 3);
      setRotation(out, i, 0, 0, 0, 1);
    }
  }

  return out;
}

function halfToFloat(h) {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 0x1f) return f ? NaN : (s ? -1 : 1) * Infinity;
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

// See https://github.com/nianticlabs/spz — header is 16 bytes, followed by attribute planes.
function parseSpz(bytes) {
  const view = new DataView(bytes);
  const magic = view.getUint32(0, true);
  if (magic !== 0x5053474e) throw new Error("SPZ: bad magic");
  const version = view.getUint32(4, true);
  if (version < 1 || version > 3) throw new Error(`SPZ: unsupported version ${version}`);
  const count = view.getUint32(8, true);
  const fractionalBits = view.getUint8(13);
  const u8 = new Uint8Array(bytes);
  const out = allocate(count);

  let p = 16;

  if (version === 1) {
    // float16 positions
    for (let i = 0; i < count * 3; i++) out.positions[i] = halfToFloat(view.getUint16(p + i * 2, true));
    p += count * 6;
  } else {
    const scale = 1 / (1 << fractionalBits);
    for (let i = 0; i < count * 3; i++) {
      const o = p + i * 3;
      let v = u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16);
      if (v & 0x800000) v |= 0xff000000; // sign extend
      out.positions[i] = v * scale;
    }
    p += count * 9;
  }

  for (let i = 0; i < count; i++) out.colors[i * 4 + 3] = u8[p + i];
  p += count;

  const COLOR_SCALE = 0.15;
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) {
      const dcCoeff = (u8[p + i * 3 + c] / 255 - 0.5) / COLOR_SCALE;
      out.colors[i * 4 + c] = clamp255((0.5 + SH_C0 * dcCoeff) * 255);
    }
  }
  p += count * 3;

  for (let i = 0; i < count * 3; i++) out.scales[i] = Math.exp(u8[p + i] / 16 - 10);
  p += count * 3;

  if (version >= 3) {
    // "Smallest three" quaternion encoding in 32 bits
    const q = [0, 0, 0, 0];
    for (let i = 0; i < count; i++) {
      let comp = view.getUint32(p + i * 4, true);
      const iLargest = comp >>> 30;
      let sumSq = 0;
      for (let j = 3; j >= 0; j--) {
        if (j === iLargest) continue;
        const mag = comp & 511;
        const neg = (comp >>> 9) & 1;
        comp >>>= 10;
        q[j] = Math.SQRT1_2 * (mag / 511) * (neg ? -1 : 1);
        sumSq += q[j] * q[j];
      }
      q[iLargest] = Math.sqrt(Math.max(0, 1 - sumSq));
      setRotation(out, i, q[0], q[1], q[2], q[3]);
    }
  } else {
    for (let i = 0; i < count; i++) {
      const x = u8[p + i * 3] / 127.5 - 1;
      const y = u8[p + i * 3 + 1] / 127.5 - 1;
      const z = u8[p + i * 3 + 2] / 127.5 - 1;
      const w = Math.sqrt(Math.max(0, 1 - (x * x + y * y + z * z)));
      setRotation(out, i, x, y, z, w);
    }
  }

  return out;
}

export async function parseSplat(url, bytes) {
  const format = detectSplatFormat(url, bytes);

  switch (format) {
    case "ply":
      return parsePly(bytes);
    case "splat":
      return parseAntimatterSplat(bytes);
    case "spz": {
      const raw = await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))
      ).arrayBuffer();
      return parseSpz(raw);
    }
    case "spz-raw":
      return parseSpz(bytes);
    default:
      throw new Error(`Unrecognized splat file: ${url}`);
  }
}

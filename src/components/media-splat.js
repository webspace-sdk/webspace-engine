// Renders 3D Gaussian Splats (.spz, .ply, .splat) as a media object, so that a captured place or
// thing can be added to a world with a plain <model src="garden.spz"> tag.
//
// Splats are drawn as camera-facing instanced quads whose shape comes from the projected 3D covariance.
// Per-splat data lives in an integer data texture; back-to-front order is computed in a worker with a
// 16-bit counting sort and streamed into an instanced index attribute.
import { MEDIA_PRESENCE } from "../utils/media-utils";
import { disposeExistingMesh } from "../utils/three-utils";
import { parseSplat } from "../utils/splat-loader";
import { RENDER_ORDER } from "../constants";

const TEX_WIDTH = 3072; // 3 texels per splat, 1024 splats per row
const TEXELS_PER_SPLAT = 3;

const SORT_WORKER_SOURCE = `
let positions = null, count = 0, keys = null, depths = null;
const counts = new Uint32Array(65536);
onmessage = e => {
  const d = e.data;
  if (d.positions) {
    positions = d.positions; count = positions.length / 3;
    keys = new Uint32Array(count); depths = new Float32Array(count);
    return;
  }
  const [a, b, c, t] = d.row;
  const out = d.out;
  let min = Infinity, max = -Infinity;
  for (let i = 0, p = 0; i < count; i++, p += 3) {
    const z = a * positions[p] + b * positions[p + 1] + c * positions[p + 2] + t;
    depths[i] = z;
    if (z < min) min = z;
    if (z > max) max = z;
  }
  const scale = 65535 / Math.max(max - min, 1e-6);
  counts.fill(0);
  for (let i = 0; i < count; i++) {
    const k = ((depths[i] - min) * scale) | 0;
    keys[i] = k;
    counts[k]++;
  }
  // Ascending view-space z: farthest first (three.js cameras look down -z), so blending is back-to-front.
  let sum = 0;
  for (let k = 0; k < 65536; k++) { const n = counts[k]; counts[k] = sum; sum += n; }
  for (let i = 0; i < count; i++) out[counts[keys[i]]++] = i;
  postMessage({ out }, [out.buffer]);
};
`;

let sortWorkerUrl = null;
const getSortWorkerUrl = () =>
  sortWorkerUrl || (sortWorkerUrl = URL.createObjectURL(new Blob([SORT_WORKER_SOURCE], { type: "text/javascript" })));

const VERTEX_SHADER = `
precision highp float;
precision highp int;
precision highp usampler2D;

uniform usampler2D splatData;
uniform vec2 viewport;
uniform vec2 focal;
uniform float opacity;

attribute uint splatIndex;

varying vec4 vColor;
varying vec2 vPos;

void main() {
  uint base = splatIndex * ${TEXELS_PER_SPLAT}u;
  ivec2 t0 = ivec2(int(base % ${TEX_WIDTH}u), int(base / ${TEX_WIDTH}u));
  uvec4 a = texelFetch(splatData, t0, 0);

  vec4 cam = modelViewMatrix * vec4(uintBitsToFloat(a.xyz), 1.0);
  vec4 clip = projectionMatrix * cam;
  float bound = 1.2 * clip.w;

  if (cam.z > -0.05 || clip.x < -bound || clip.x > bound || clip.y < -bound || clip.y > bound) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }

  uvec4 b = texelFetch(splatData, t0 + ivec2(1, 0), 0);
  uvec4 c = texelFetch(splatData, t0 + ivec2(2, 0), 0);
  vec4 s0 = uintBitsToFloat(b);
  vec2 s1 = uintBitsToFloat(c.xy);

  // Symmetric 3D covariance: xx xy xz yy yz zz
  mat3 sigma = mat3(s0.x, s0.y, s0.z,
                    s0.y, s0.w, s1.x,
                    s0.z, s1.x, s1.y);

  float z2 = cam.z * cam.z;
  mat3 J = mat3(-focal.x / cam.z, 0.0, 0.0,
                0.0, -focal.y / cam.z, 0.0,
                focal.x * cam.x / z2, focal.y * cam.y / z2, 0.0);

  mat3 T = J * mat3(modelViewMatrix);
  mat3 cov2d = T * sigma * transpose(T);

  // Low-pass filter so splats are at least ~a pixel wide
  float xx = cov2d[0][0] + 0.3;
  float xy = cov2d[0][1];
  float yy = cov2d[1][1] + 0.3;

  float mid = 0.5 * (xx + yy);
  float radius = length(vec2(0.5 * (xx - yy), xy));
  float l1 = mid + radius;
  float l2 = max(mid - radius, 0.1);
  vec2 dir = normalize(vec2(xy, l1 - xx));
  if (abs(xy) < 1e-7) dir = xx >= yy ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

  // Quad spans +/- 3 sigma along each principal axis
  vec2 major = min(3.0 * sqrt(l1), 2048.0) * dir;
  vec2 minor = min(3.0 * sqrt(l2), 2048.0) * vec2(dir.y, -dir.x);

  uint rgba = a.w;
  vColor = vec4(float(rgba & 255u), float((rgba >> 8) & 255u), float((rgba >> 16) & 255u), float(rgba >> 24)) / 255.0;
  vColor.a *= opacity;
  vPos = position.xy * 3.0;

  vec2 ndc = clip.xy / clip.w;
  vec2 offset = (position.x * major + position.y * minor) * 2.0 / viewport;
  gl_Position = vec4(ndc + offset, clip.z / clip.w, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec4 vColor;
varying vec2 vPos;

layout(location = 0) out highp vec4 splatColor;

void main() {
  float power = -0.5 * dot(vPos, vPos);
  if (power < -4.5) discard;
  float alpha = vColor.a * exp(power);
  if (alpha < 1.0 / 255.0) discard;
  splatColor = vec4(vColor.rgb, alpha);
}
`;

function buildSplatTexture(splats) {
  const { count, positions, scales, rotations, colors } = splats;
  const rows = Math.max(1, Math.ceil((count * TEXELS_PER_SPLAT) / TEX_WIDTH));
  const u32 = new Uint32Array(TEX_WIDTH * rows * 4);
  const f32 = new Float32Array(u32.buffer);
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  for (let i = 0; i < count; i++) {
    const o = i * 12;
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    f32[o] = px;
    f32[o + 1] = py;
    f32[o + 2] = pz;

    if (px < min.x) min.x = px;
    if (py < min.y) min.y = py;
    if (pz < min.z) min.z = pz;
    if (px > max.x) max.x = px;
    if (py > max.y) max.y = py;
    if (pz > max.z) max.z = pz;

    u32[o + 3] =
      (colors[i * 4] | (colors[i * 4 + 1] << 8) | (colors[i * 4 + 2] << 16) | (colors[i * 4 + 3] << 24)) >>> 0;

    // M = R * S, sigma = M * M^T
    const x = rotations[i * 4];
    const y = rotations[i * 4 + 1];
    const z = rotations[i * 4 + 2];
    const w = rotations[i * 4 + 3];
    const sx = scales[i * 3];
    const sy = scales[i * 3 + 1];
    const sz = scales[i * 3 + 2];

    const r00 = 1 - 2 * (y * y + z * z);
    const r01 = 2 * (x * y - w * z);
    const r02 = 2 * (x * z + w * y);
    const r10 = 2 * (x * y + w * z);
    const r11 = 1 - 2 * (x * x + z * z);
    const r12 = 2 * (y * z - w * x);
    const r20 = 2 * (x * z - w * y);
    const r21 = 2 * (y * z + w * x);
    const r22 = 1 - 2 * (x * x + y * y);

    const m00 = r00 * sx;
    const m01 = r01 * sy;
    const m02 = r02 * sz;
    const m10 = r10 * sx;
    const m11 = r11 * sy;
    const m12 = r12 * sz;
    const m20 = r20 * sx;
    const m21 = r21 * sy;
    const m22 = r22 * sz;

    f32[o + 4] = m00 * m00 + m01 * m01 + m02 * m02;
    f32[o + 5] = m00 * m10 + m01 * m11 + m02 * m12;
    f32[o + 6] = m00 * m20 + m01 * m21 + m02 * m22;
    f32[o + 7] = m10 * m10 + m11 * m11 + m12 * m12;
    f32[o + 8] = m10 * m20 + m11 * m21 + m12 * m22;
    f32[o + 9] = m20 * m20 + m21 * m21 + m22 * m22;
  }

  const texture = new THREE.DataTexture(u32, TEX_WIDTH, rows, THREE.RGBAIntegerFormat, THREE.UnsignedIntType);
  texture.internalFormat = "RGBA32UI";
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;

  return { texture, box: new THREE.Box3(min, max) };
}

const tmpViewport = new THREE.Vector4();
const tmpModelView = new THREE.Matrix4();

AFRAME.registerComponent("media-splat", {
  schema: {
    src: { type: "string" },
    opacity: { default: 1.0 },
    blend: { type: "string", default: "normal" } // CSS mix-blend-mode
  },

  init() {
    this.mesh = null;
    this.loadedSrc = null;
    this.worker = null;
    this.sortInFlight = false;
    this.lastSortRow = new Float32Array(4).fill(NaN);
    this.spareOrder = null;
    this.skipDistanceDelay = true;
    SYSTEMS.mediaPresenceSystem.registerMediaComponent(this);
  },

  update(oldData) {
    if (this.mesh && oldData.opacity !== this.data.opacity) {
      this.mesh.material.uniforms.opacity.value = this.data.opacity;
    }

    if (this.mesh && oldData.blend !== this.data.blend) {
      this.applyBlend(this.mesh.material);
    }

    if (oldData.src !== this.data.src && this.data.src) {
      this.setMediaPresence(SYSTEMS.mediaPresenceSystem.getMediaPresence(this), true);
    }
  },

  remove() {
    this.removed = true;
    this.disposeSplats();
    SYSTEMS.mediaPresenceSystem.unregisterMediaComponent(this);
  },

  disposeSplats() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.mesh) {
      this.mesh.material.uniforms.splatData.value.dispose();
      disposeExistingMesh(this.el);
      this.mesh = null;
    }

    this.loadedSrc = null;
    this.sortInFlight = false;
    this.hasSorted = false;
    this.loadToken = (this.loadToken || 0) + 1; // invalidates any load still in flight
  },

  setMediaPresence(presence, refresh = false) {
    switch (presence) {
      case MEDIA_PRESENCE.PRESENT:
        return this.setMediaToPresent(refresh);
      case MEDIA_PRESENCE.HIDDEN:
        return this.setMediaToHidden(refresh);
    }
  },

  async setMediaToHidden() {
    SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PENDING);
    if (this.mesh) this.mesh.visible = false;
    SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.HIDDEN);
  },

  async setMediaToPresent(refresh) {
    const { src } = this.data;
    SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PENDING);

    try {
      if (this.mesh && !refresh && this.loadedSrc === src) {
        this.mesh.visible = this.hasSorted;
        return;
      }

      this.disposeSplats();
      const token = this.loadToken;
      const superseded = () => this.removed || token !== this.loadToken || this.data.src !== src;

      const res = await fetch(src);
      if (!res.ok) throw new Error(`Failed to fetch splats ${src}: ${res.status}`);
      const bytes = await res.arrayBuffer();
      if (superseded()) return;
      const splats = await parseSplat(src, bytes);
      if (superseded()) return; // Removed or src changed while loading

      this.buildMesh(splats);
      this.loadedSrc = src;
      this.el.emit("model-loaded", { format: "splat", count: splats.count });
    } catch (e) {
      console.error("Error loading splats", e);
      this.el.emit("model-error", { src });
    } finally {
      SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  buildMesh(splats) {
    const { texture, box } = buildSplatTexture(splats);
    const { count } = splats;

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);

    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) order[i] = i;
    const indexAttribute = new THREE.InstancedBufferAttribute(order, 1, false);
    indexAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("splatIndex", indexAttribute);
    geometry.instanceCount = count;
    geometry.boundingBox = box.clone();
    geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        splatData: { value: texture },
        viewport: { value: new THREE.Vector2(1, 1) },
        focal: { value: new THREE.Vector2(1, 1) },
        opacity: { value: this.data.opacity }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });

    this.applyBlend(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = RENDER_ORDER.MEDIA;
    mesh.visible = false; // Shown after the first depth sort completes
    mesh.raycast = () => {}; // Splat scenes are backdrops; don't block the cursor
    mesh.onBeforeRender = (renderer, scene, camera) => this.onBeforeRender(renderer, camera);

    this.mesh = mesh;
    this.hasSorted = false;
    this.spareOrder = new Uint32Array(count);

    this.worker = new Worker(getSortWorkerUrl());
    this.worker.onmessage = e => this.onSorted(e.data.out);
    this.worker.postMessage({ positions: splats.positions.slice() });

    this.el.setObject3D("mesh", mesh);

    // onBeforeRender only fires for visible meshes, so kick off the first sort directly.
    const camera = this.el.sceneEl.camera;
    if (camera) {
      camera.updateMatrixWorld();
      this.requestSort(camera);
    }
  },

  applyBlend(material) {
    const additive = ["plus-lighter", "screen", "lighten", "color-dodge"].includes(this.data.blend);
    material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    material.needsUpdate = true;
  },

  onBeforeRender(renderer, camera) {
    const { uniforms } = this.mesh.material;
    renderer.getCurrentViewport(tmpViewport);
    uniforms.viewport.value.set(tmpViewport.z, tmpViewport.w);
    const p = camera.projectionMatrix.elements;
    uniforms.focal.value.set((p[0] * tmpViewport.z) / 2, (p[5] * tmpViewport.w) / 2);

    // Only the main camera drives the sort order (reflection and preview cameras would thrash it).
    const mainCamera = this.el.sceneEl.camera;
    const xr = renderer.xr;
    const isXrEye = xr && xr.isPresenting && xr.getCamera().cameras.includes(camera);
    if (!mainCamera || camera === mainCamera || camera.parent === mainCamera || isXrEye) {
      this.requestSort(camera);
    }
  },

  requestSort(camera) {
    if (!this.worker || this.sortInFlight) return;

    this.mesh.updateMatrixWorld();
    tmpModelView.multiplyMatrices(camera.matrixWorldInverse, this.mesh.matrixWorld);
    const e = tmpModelView.elements;
    const row = [e[2], e[6], e[10], e[14]];
    const last = this.lastSortRow;

    if (
      this.hasSorted &&
      Math.abs(row[0] - last[0]) + Math.abs(row[1] - last[1]) + Math.abs(row[2] - last[2]) < 0.002 &&
      Math.abs(row[3] - last[3]) < 0.01
    ) {
      return;
    }

    last.set(row);
    this.sortInFlight = true;
    const out = this.spareOrder;
    this.spareOrder = null;
    this.worker.postMessage({ row, out }, [out.buffer]);
  },

  onSorted(order) {
    this.sortInFlight = false;
    if (!this.mesh) return;

    const attribute = this.mesh.geometry.attributes.splatIndex;
    this.spareOrder = attribute.array;
    attribute.array = order;
    attribute.needsUpdate = true;

    if (!this.hasSorted) {
      this.hasSorted = true;
      this.mesh.visible = true;
    }
  }
});

import avatarEyeImgSrc from "!!url-loader!../assets/images/avatar-eyes.png";
import avatarMouthImgSrc from "!!url-loader!../assets/images/avatar-mouths.png";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToShader } from "./terrain-system";
import { AvatarSphereBufferGeometry } from "../objects/avatar-sphere-buffer-geometry";

const {
  ShaderMaterial,
  Color,
  MeshBasicMaterial,
  VertexColors,
  Matrix4,
  ShaderLib,
  UniformsUtils,
  UnsignedByteType,
  RGBAFormat,
  DataTexture2DArray,
  MeshToonMaterial,
  ImageLoader,
  NearestFilter,
  LinearFilter,
  DataTexture,
  Vector4
} = THREE;

const DECAL_MAP_SIZE = 4096;
const NUM_DECAL_MAPS = 3;

const EYE_DECAL_NEUTRAL = 0;
const EYE_DECAL_UP = 1;
const EYE_DECAL_DOWN = 2;
const EYE_DECAL_LEFT = 3;
const EYE_DECAL_RIGHT = 4;
const EYE_DECAL_BLINK1 = 5;
const EYE_DECAL_BLINK2 = 6;
const EYE_DECAL_BLINK3 = 7;
const EYE_SHIFT_DECALS = [EYE_DECAL_LEFT, EYE_DECAL_RIGHT, EYE_DECAL_UP, EYE_DECAL_DOWN];
const BLINK_TRIGGER_PROBABILITY = 0.005;
const SHIFT_TRIGGER_PROBABILITY = 0.005;
const BLINK_FRAME_DURATION_MS = 25.0;
const EYE_SHIFT_DURATION_MS = 500.0;

let toonGradientMap;

(() => {
  const colors = new Uint8Array(3);

  for (let c = 0; c <= colors.length; c++) {
    colors[c] = (c / colors.length) * 256;
  }

  toonGradientMap = new DataTexture(colors, colors.length, 1, THREE.LuminanceFormat);
  toonGradientMap.minFilter = NearestFilter;
  toonGradientMap.magFilter = NearestFilter;
  toonGradientMap.generateMipmaps = false;
})();

const IDENTITY = new Matrix4();
const ZERO = new Vector4();
ZERO.w = 0.0;
const AVATAR_RADIUS = 0.4;

const avatarMaterial = new ShaderMaterial({
  name: "avatar",
  vertexColors: VertexColors,
  fog: true,
  fragmentShader: ShaderLib.phong.fragmentShader,
  vertexShader: ShaderLib.phong.vertexShader,
  lights: true,
  defines: {
    ...new MeshToonMaterial().defines
  },
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.phong.uniforms),
    ...{
      decalMap: {
        type: "t",
        value: null
      }
    }
  }
});

avatarMaterial.uniforms.gradientMap.value = toonGradientMap;
avatarMaterial.uniforms.shininess.value = 0.0001;
avatarMaterial.uniforms.diffuse.value = new Color(0.0, 0.22, 0.66);

avatarMaterial.stencilWrite = true; // Avoid SSAO
avatarMaterial.stencilFunc = THREE.AlwaysStencilFunc;
avatarMaterial.stencilRef = 2;
avatarMaterial.stencilZPass = THREE.ReplaceStencilOp;

const outlineMaterial = new MeshBasicMaterial({ color: new Color(0, 0, 0) });
const highlightMaterial = new MeshBasicMaterial({ color: new Color(1, 1, 1) });

avatarMaterial.onBeforeCompile = shader => {
  addVertexCurvingToShader(shader);

  // Add shader code to add decals
  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_pars_vertex>",
    [
      "#include <uv2_pars_vertex>",
      "attribute vec3 duv;",
      "varying vec3 vDuv;",
      "attribute float colorScale;",
      "varying float vColorScale;",
      "attribute vec4 duvOffset;",
      "varying vec4 vDuvOffset;"
    ].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_vertex>",
    ["#include <uv2_vertex>", "vDuv = duv;", "vDuvOffset = duvOffset;", "vColorScale = colorScale;"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <gradientmap_pars_fragment>",
    [
      "#include <gradientmap_pars_fragment>",
      "precision mediump sampler2DArray;",
      "uniform sampler2DArray decalMap;",
      "varying vec3 vDuv;",
      "varying vec4 vDuvOffset;",
      "varying float vColorScale;"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <tonemapping_fragment>",
    [
      // Refactored below: "float duOffset = vDuv.z == 0.0 ? vDuvOffset.x : vDuvOffset.z;",
      "float clampedLayer = clamp(vDuv.z, 0.0, 1.0);",
      "float duOffset = mix(vDuvOffset.x, vDuvOffset.z, clampedLayer);",
      "float dvOffset = mix(vDuvOffset.y, vDuvOffset.w, clampedLayer);",
      "vec4 texel = texture(decalMap, vec3(vDuv.x / 8.0 + duOffset / 8.0, vDuv.y / 8.0 + dvOffset / 8.0, vDuv.z));",
      "vec3 color = gl_FragColor.rgb * (1.0 - texel.a) + texel.rgb * texel.a;",
      "vec3 scaled = clamp(max(color * vColorScale, step(1.1, vColorScale)), 0.0, 1.0);",
      "gl_FragColor = vec4(scaled, gl_FragColor.a);",
      //"gl_FragColor = texel;",
      "#include <tonemapping_fragment>"
    ].join("\n")
  );
};

outlineMaterial.onBeforeCompile = shader => addVertexCurvingToShader(shader);
highlightMaterial.onBeforeCompile = shader => addVertexCurvingToShader(shader);

const MAX_AVATARS = 128;

// The is the number of ticks we continue to update the instance matrices of dirty
// avatars, since lerping may need to occur.
const MAX_LERP_TICKS = 30;

// Draws instanced avatar heads. IK controller now sets instanced heads to non-visible to avoid draw calls.
export class AvatarSystem {
  constructor(sceneEl, atmosphereSystem) {
    this.sceneEl = sceneEl;
    this.atmosphereSystem = atmosphereSystem;
    this.avatarEls = Array(MAX_AVATARS);
    this.scheduledEyeDecals = Array(MAX_AVATARS);

    for (let i = 0; i < this.scheduledEyeDecals.length; i++) {
      this.scheduledEyeDecals[i] = { t: 0.0, decal: 0, state: 0 };
    }

    this.dirtyAvatars = Array(MAX_AVATARS);
    this.dirtyAvatars.fill(0);

    this.maxRegisteredIndex = -1;

    this.createMesh();
    this.loadDecalMap();
  }

  async loadDecalMap() {
    const loader = new ImageLoader();
    const canvas = document.createElement("canvas");
    canvas.width = DECAL_MAP_SIZE;
    canvas.height = DECAL_MAP_SIZE;
    const ctx = canvas.getContext("2d");

    const data = new Uint8Array(DECAL_MAP_SIZE * DECAL_MAP_SIZE * NUM_DECAL_MAPS * 4);

    const loadImage = async (src, mapIndex) => {
      await new Promise(res => {
        loader.load(src, image => {
          ctx.clearRect(0, 0, DECAL_MAP_SIZE, DECAL_MAP_SIZE);
          ctx.drawImage(image, 0, 0);
          const d = ctx.getImageData(0, 0, DECAL_MAP_SIZE, DECAL_MAP_SIZE);
          data.set(new Uint8Array(d.data), mapIndex * DECAL_MAP_SIZE * DECAL_MAP_SIZE * 4);
          res();
        });
      });
    };

    await loadImage(avatarEyeImgSrc, 0);
    await loadImage(avatarMouthImgSrc, 1);

    const decalMap = new DataTexture2DArray(data, DECAL_MAP_SIZE, DECAL_MAP_SIZE, NUM_DECAL_MAPS);

    decalMap.magFilter = LinearFilter;
    decalMap.minFilter = LinearFilter;
    decalMap.format = RGBAFormat;
    decalMap.type = UnsignedByteType;
    avatarMaterial.uniforms.decalMap.value = decalMap;
  }

  register(el) {
    const index = this.mesh.addInstance(ZERO, IDENTITY);

    this.maxRegisteredIndex = Math.max(index, this.maxRegisteredIndex);
    this.avatarEls[index] = el;
    this.dirtyAvatars[index] = 0;
  }

  unregister(el) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (el === this.avatarEls[i]) {
        this.avatarEls[i] = null;
        this.mesh.freeInstance(i);
        return;
      }
    }
  }

  markDirty(el) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.avatarEls[i] === el) {
        this.dirtyAvatars[i] = MAX_LERP_TICKS;
        return;
      }
    }
  }

  createMesh() {
    this.mesh = new DynamicInstancedMesh(
      new AvatarSphereBufferGeometry(AVATAR_RADIUS, MAX_AVATARS),
      avatarMaterial,
      MAX_AVATARS
    );
    this.mesh.renderOrder = RENDER_ORDER.INSTANCED_AVATAR;
    this.mesh.castShadow = true;
    this.duvOffsetAttribute = this.mesh.geometry.instanceAttributes[0][1];

    this.sceneEl.object3D.add(this.mesh);
  }

  tick(t) {
    const {
      scheduledEyeDecals,
      avatarEls,
      maxRegisteredIndex,
      duvOffsetAttribute,
      mesh,
      atmosphereSystem,
      dirtyAvatars
    } = this;

    for (let i = 0; i <= maxRegisteredIndex; i++) {
      const scheduledEyeDecal = scheduledEyeDecals[i];
      const hasScheduledDecal = scheduledEyeDecal.t > 0.0;

      if (!hasScheduledDecal) {
        this.maybeScheduleEyeDecal(t, i);
      }

      const isDirty = dirtyAvatars[i] !== 0;
      const hasEyeDecalChange = hasScheduledDecal && scheduledEyeDecal.t < t;

      if (!isDirty && !hasEyeDecalChange) continue;

      const el = avatarEls[i];
      if (el === null) continue;

      if (hasEyeDecalChange) {
        duvOffsetAttribute.array[i * 4] = scheduledEyeDecal.decal;
        duvOffsetAttribute.needsUpdate = true;

        this.eyeDecalStateTransition(t, i);
      }

      const { head } = el.components["ik-controller"];

      // Force update if flags set since head will be marked not visible
      head.updateMatrices();

      mesh.setMatrixAt(i, head.matrixWorld);
      mesh.instanceMatrix.needsUpdate = true;

      atmosphereSystem.updateShadows();

      if (dirtyAvatars[i] > 0) {
        dirtyAvatars[i] -= 1;
      }
    }
  }

  maybeScheduleEyeDecal(t, i) {
    const scheduledEyeDecal = this.scheduledEyeDecals[i];

    // No scheduled decal change, see if we should generate one.
    const r = Math.random();

    // First see if we will potentially schedule a blink or a shift.
    if (r > 0.5 && r - 0.5 <= BLINK_TRIGGER_PROBABILITY) {
      scheduledEyeDecal.t = t + BLINK_FRAME_DURATION_MS;
      scheduledEyeDecal.decal = EYE_DECAL_BLINK1;
    } else if (r < 0.5 && r <= SHIFT_TRIGGER_PROBABILITY) {
      scheduledEyeDecal.t = t + EYE_SHIFT_DURATION_MS;
      scheduledEyeDecal.decal = EYE_SHIFT_DECALS[Math.floor(Math.random() * EYE_SHIFT_DECALS.length)];
    }
  }

  eyeDecalStateTransition(t, i) {
    const scheduledEyeDecal = this.scheduledEyeDecals[i];
    const { decal } = scheduledEyeDecal;

    // Perform decal state machine for blink/shift
    switch (decal) {
      case EYE_DECAL_BLINK1:
        scheduledEyeDecal.t = t + BLINK_FRAME_DURATION_MS;
        scheduledEyeDecal.decal = scheduledEyeDecal.state === 0 ? EYE_DECAL_BLINK2 : EYE_DECAL_NEUTRAL;
        break;
      case EYE_DECAL_BLINK2:
        scheduledEyeDecal.t = t + BLINK_FRAME_DURATION_MS;
        scheduledEyeDecal.decal = scheduledEyeDecal.state === 0 ? EYE_DECAL_BLINK3 : EYE_DECAL_BLINK1;
        break;
      case EYE_DECAL_BLINK3:
        scheduledEyeDecal.t = t + BLINK_FRAME_DURATION_MS;
        scheduledEyeDecal.decal = EYE_DECAL_BLINK2;
        scheduledEyeDecal.state = 1; // Used to know if closing or opening eyes in blink.
        break;
      case EYE_DECAL_UP:
      case EYE_DECAL_DOWN:
      case EYE_DECAL_LEFT:
      case EYE_DECAL_RIGHT:
        scheduledEyeDecal.t = t + EYE_SHIFT_DURATION_MS;
        scheduledEyeDecal.decal = EYE_DECAL_NEUTRAL;
        break;
      case EYE_DECAL_NEUTRAL:
        // Eye now neutral, deschedule decals.
        scheduledEyeDecal.t = 0.0;
        scheduledEyeDecal.state = 0;
    }
  }
}

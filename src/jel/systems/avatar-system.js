import avatarSheetImgSrc from "!!url-loader!../../assets/jel/images/avatar-sheet.png";
import avatarSheetBasisSrc from "!!url-loader!../../assets/jel/images/avatar-sheet.basis";
import HubsTextureLoader from "../../hubs/loaders/HubsTextureLoader";
import { createBasisTexture } from "../../hubs/utils/media-utils";
import { getCreator, getNetworkedEntity } from "../../jel/utils/ownership-utils";
import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToShader } from "./terrain-system";
import { AvatarSphereBufferGeometry } from "../objects/avatar-sphere-buffer-geometry";
import { rgbToCssRgb } from "../utils/dom-utils";
import { WORLD_MATRIX_CONSUMERS } from "../../hubs/utils/threejs-world-update";

const {
  ShaderMaterial,
  Color,
  MeshBasicMaterial,
  Matrix4,
  ShaderLib,
  UniformsUtils,
  MeshToonMaterial,
  NearestFilter,
  LinearFilter,
  DataTexture,
  Vector4
} = THREE;

const USE_BASIS = true;
const MAX_ANISOTROPY = 16;

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
  fog: true,
  fragmentShader: ShaderLib.toon.fragmentShader,
  vertexShader: ShaderLib.toon.vertexShader,
  lights: true,
  defines: {
    ...new MeshToonMaterial().defines,
    TWOPI: 3.1415926538
  },
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.toon.uniforms),
    ...{
      decalMap: {
        type: "t",
        value: null
      },
      time: { value: 0.0 }
    }
  }
});

avatarMaterial.uniforms.gradientMap.value = toonGradientMap;
avatarMaterial.uniforms.diffuse.value = new Color(0.5, 0.5, 0.5);

avatarMaterial.stencilWrite = true; // Avoid SSAO
avatarMaterial.stencilFunc = THREE.AlwaysStencilFunc;
avatarMaterial.stencilRef = 2;
avatarMaterial.stencilZPass = THREE.ReplaceStencilOp;

const outlineMaterial = new MeshBasicMaterial({ color: new Color(0, 0, 0) });
const highlightMaterial = new MeshBasicMaterial({ color: new Color(1, 1, 1) });

avatarMaterial.onBeforeCompile = shader => {
  // Float oscillation, vary period and freq by instance index
  const postCurveShader = [
    "gl_Position.y = gl_Position.y + sin(time * TWOPI * 0.001 * (mod(instanceIndex, 10.0) / 7.0) + instanceIndex * 7.0) * 0.025;"
  ].join("\n");

  addVertexCurvingToShader(shader, postCurveShader);

  // Add shader code to add decals
  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_pars_vertex>",
    [
      "#include <uv2_pars_vertex>",
      "attribute vec3 instanceColor;",
      "varying vec3 vInstanceColor;",
      "uniform float time;",
      "attribute vec3 duv;",
      "varying vec3 vDuv;",
      "attribute float colorScale;",
      "varying float vColorScale;",
      "attribute vec4 duvOffset;",
      "attribute float instanceIndex;",
      "varying vec4 vDuvOffset;"
    ].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <color_vertex>",
    [
      "#include <color_vertex>",
      "vDuv = duv;",
      "vDuvOffset = duvOffset;",
      "vColorScale = colorScale;",
      "vInstanceColor = instanceColor;"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <gradientmap_pars_fragment>",
    [
      "#include <gradientmap_pars_fragment>",
      "precision highp sampler2D;",
      "uniform sampler2D decalMap;",
      "varying vec3 vDuv;",
      "varying vec4 vDuvOffset;",
      "varying vec3 vInstanceColor;",
      "varying float vColorScale;"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    ["#include <color_fragment>", "diffuseColor.rgb = vInstanceColor.rgb;"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <tonemapping_fragment>",
    [
      // Refactored below: "float duOffset = vDuv.z == 0.0 ? vDuvOffset.x : vDuvOffset.z;",
      "float clampedLayer = clamp(vDuv.z, 0.0, 1.0);",
      "float duOffset = mix(vDuvOffset.x, vDuvOffset.z, clampedLayer);",
      "float dvOffset = mix(vDuvOffset.y, vDuvOffset.w, clampedLayer);",
      "vec4 texel = texture(decalMap, vec2(vDuv.x / 8.0 + duOffset / 8.0, vDuv.y / 16.0 + dvOffset / 16.0 + vDuv.z * 0.5));",
      "vec3 color = gl_FragColor.rgb * (1.0 - texel.a) + texel.rgb * texel.a;",
      "vec3 scaled = clamp(max(color * vColorScale, step(1.1, vColorScale)), 0.0, 1.0);",
      "gl_FragColor = vec4(scaled, gl_FragColor.a);",
      "#include <tonemapping_fragment>"
    ].join("\n")
  );
};

outlineMaterial.onBeforeCompile = shader => addVertexCurvingToShader(shader);
highlightMaterial.onBeforeCompile = shader => addVertexCurvingToShader(shader);

const MAX_AVATARS = 128;

// Draws instanced avatar heads. IK controller now sets instanced heads to non-visible to avoid draw calls.
export class AvatarSystem {
  constructor(sceneEl, atmosphereSystem) {
    this.sceneEl = sceneEl;
    this.atmosphereSystem = atmosphereSystem;
    this.avatarEls = Array(MAX_AVATARS).fill(null);
    this.avatarToIndex = new Map();
    this.avatarCreatorIds = Array(MAX_AVATARS).fill(null);
    this.currentVisemes = Array(MAX_AVATARS).fill(-1);
    this.dirtyColors = Array(MAX_AVATARS).fill(false);
    this.avatarIkControllers = Array(MAX_AVATARS).fill(null);
    this.selfEl = null;
    this.selfAvatarSwatch = null;

    this.scheduledEyeDecals = Array(MAX_AVATARS);

    for (let i = 0; i < this.scheduledEyeDecals.length; i++) {
      this.scheduledEyeDecals[i] = { t: 0.0, decal: 0, state: 0 };
    }

    for (let i = 0; i < this.currentVisemes.length; i++) {
      this.currentVisemes[i] = -1;
    }

    this.maxRegisteredIndex = -1;
    this.loadedDecals = false;

    this.createMesh();

    setInterval(() => {
      // When scene is off (since we're in a channel or paused) we need to keep updating the self avatar in the UI.
      if (sceneEl.is("off") || !sceneEl.object3D.isPlaying) {
        this.beginUpdatingSelfAsync();
      }
    }, 1000);
  }

  beginUpdatingSelfAsync() {
    if (this.selfUpdateInterval) return;

    // Update at 60 hz
    this.selfUpdateInterval = setInterval(() => {
      this.processAvatars(performance.now(), true);
    }, 1000.0 / 60.0);
  }

  stopUpdatingSelfAsync() {
    if (this.selfUpdateInterval) {
      clearInterval(this.selfUpdateInterval);
      this.selfUpdateInterval = null;
    }
  }

  async loadDecalMap() {
    let decalMap;

    if (USE_BASIS) {
      decalMap = await createBasisTexture(avatarSheetBasisSrc);
    } else {
      decalMap = new THREE.Texture();
      await new HubsTextureLoader().loadTextureAsync(decalMap, avatarSheetImgSrc);
    }

    decalMap.magFilter = LinearFilter;
    decalMap.minFilter = LinearFilter;
    decalMap.anisotropy = MAX_ANISOTROPY;
    avatarMaterial.uniforms.decalMap.value = decalMap;
    avatarMaterial.uniformsNeedUpdate = true;
  }

  register(el, isSelf) {
    const index = this.mesh.addInstance(ZERO, ZERO, IDENTITY);
    this.maxRegisteredIndex = Math.max(index, this.maxRegisteredIndex);
    this.avatarEls[index] = el;
    this.avatarToIndex.set(el, index);
    this.dirtyColors[index] = true;
    this.avatarIkControllers[index] = el.components["ik-controller"];

    if (isSelf) {
      this.selfEl = el;
    }

    getNetworkedEntity(el).then(e => (this.avatarCreatorIds[index] = getCreator(e)));
  }

  unregister(el) {
    if (!this.avatarToIndex.has(el)) return;
    const i = this.avatarToIndex.get(el);
    this.avatarEls[i] = null;
    this.avatarCreatorIds[i] = null;
    this.avatarIkControllers[i] = null;
    this.mesh.freeInstance(i);
    this.avatarToIndex.delete(el);

    if (this.selfEl === el) {
      this.selfEl = null;
    }

    if (this.maxRegisteredIndex === i) {
      this.maxRegisteredIndex--;
    }
  }

  markPersonaAvatarDirty(creatorId) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.avatarCreatorIds[i] === creatorId) {
        this.dirtyColors[i] = true;
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
    this.instanceColorAttribute = this.mesh.geometry.instanceAttributes[1][1];

    this.sceneEl.object3D.add(this.mesh);
  }

  tick(t) {
    this.stopUpdatingSelfAsync();

    if (!this.loadedDecals) {
      this.loadDecalMap();
      this.loadedDecals = true;
    }

    if (!avatarMaterial.uniforms.decalMap.value) return;
    if (!NAF.connection?.presence) return;

    avatarMaterial.uniforms.time.value = t;

    this.processAvatars(t);
  }

  getAvatarElForSessionId(sessionId) {
    for (const avatarEl of DOM_ROOT.querySelectorAll("[networked-avatar]")) {
      if (avatarEl.components.networked && avatarEl.components.networked.data.creator === sessionId) {
        return avatarEl;
      }
    }

    return null;
  }

  processAvatars(t, selfOnly = false) {
    const {
      scheduledEyeDecals,
      currentVisemes,
      avatarCreatorIds,
      avatarEls,
      maxRegisteredIndex,
      duvOffsetAttribute,
      instanceColorAttribute,
      mesh,
      atmosphereSystem,
      dirtyColors,
      avatarIkControllers
    } = this;

    const presenceStates = NAF.connection?.presence?.states;
    if (!presenceStates) return;

    const nafAdapter = NAF.connection.adapter;
    let duvNeedsUpdate = false,
      instanceMatrixNeedsUpdate = false,
      instanceColorNeedsUpdate = false;

    let selfChanged = false;
    let newSelfEyeDecal = null,
      newSelfViseme = null,
      newSelfColor = null;

    for (let i = 0; i <= maxRegisteredIndex; i++) {
      const el = avatarEls[i];
      if (el === null) continue;

      const isSelf = el === this.selfEl;
      if (selfOnly && !isSelf) continue;

      const scheduledEyeDecal = scheduledEyeDecals[i];
      const hasScheduledDecal = scheduledEyeDecal.t > 0.0;

      if (!hasScheduledDecal) {
        this.maybeScheduleEyeDecal(t, i);
      }

      const creatorId = avatarCreatorIds[i];
      const hasEyeDecalChange = hasScheduledDecal && scheduledEyeDecal.t < t;
      const prevViseme = currentVisemes[i];

      const hasDirtyColor = dirtyColors[i];
      const creatorPresenceState = NAF.connection.getPresenceStateForClientId(creatorId);

      if (hasDirtyColor && creatorPresenceState?.profile?.persona) {
        const color = creatorPresenceState.profile.persona.avatar.primary_color;

        if (isSelf) {
          newSelfColor = color;
          selfChanged = true;
        }

        instanceColorAttribute.array[i * 3 + 0] = color.r;
        instanceColorAttribute.array[i * 3 + 1] = color.g;
        instanceColorAttribute.array[i * 3 + 2] = color.b;

        instanceColorNeedsUpdate = true;
        dirtyColors[i] = false;
      }

      let currentViseme = 0;

      if (creatorPresenceState && !creatorPresenceState.unmuted) {
        // Do not show the mouth - viseme 12 is "mouth missing"
        currentViseme = 12;
      } else {
        if (nafAdapter && creatorId !== null) {
          currentViseme = nafAdapter.getCurrentViseme(creatorId);
        }
      }

      const hasNewViseme = currentViseme !== prevViseme;
      const head = avatarIkControllers[i].head;

      const hasDirtyMatrix = head.consumeIfDirtyWorldMatrix(WORLD_MATRIX_CONSUMERS.AVATARS);

      if (!hasDirtyMatrix && !hasEyeDecalChange && !hasNewViseme && !hasDirtyColor) continue;

      if (hasEyeDecalChange) {
        const newDecal = scheduledEyeDecal.decal;
        duvOffsetAttribute.array[i * 4] = newDecal;
        duvNeedsUpdate = true;

        if (isSelf) {
          newSelfEyeDecal = newDecal;
          selfChanged = true;
        }

        this.eyeDecalStateTransition(t, i);
      }

      if (hasNewViseme) {
        currentVisemes[i] = currentViseme;

        if (currentViseme <= 7) {
          duvOffsetAttribute.array[i * 4 + 2] = currentViseme;
          duvOffsetAttribute.array[i * 4 + 3] = 0;
        } else {
          duvOffsetAttribute.array[i * 4 + 2] = currentViseme - 8;
          duvOffsetAttribute.array[i * 4 + 3] = 1;
        }

        duvNeedsUpdate = true;

        if (isSelf) {
          newSelfViseme = currentViseme;
          selfChanged = true;
        }
      }

      if (hasDirtyMatrix) {
        const head = avatarIkControllers[i].head;

        head.updateMatrices();

        mesh.setMatrixAt(i, head.matrixWorld);
        instanceMatrixNeedsUpdate = true;

        if (el !== this.selfEl) {
          // Don't need to update shadows when rotating self
          atmosphereSystem.updateShadows();
        }
      }
    }

    if (selfChanged) {
      this.updateSelfAvatarSwatch(newSelfEyeDecal, newSelfViseme, newSelfColor);
    }

    duvOffsetAttribute.needsUpdate = duvNeedsUpdate;
    instanceColorAttribute.needsUpdate = instanceColorNeedsUpdate;
    mesh.instanceMatrix.needsUpdate = instanceMatrixNeedsUpdate;
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

  updateSelfAvatarSwatch(eyeDecal, viseme, color) {
    let swatch = this.selfAvatarSwatch;

    if (!swatch) {
      swatch = DOM_ROOT.getElementById("self-avatar-swatch");

      if (swatch) {
        swatch.setAttribute("data-eyes", 0);
        swatch.setAttribute("data-mouth", 0);
        this.selfAvatarSwatch = swatch;
      }
    }

    if (swatch) {
      if (eyeDecal !== null) {
        swatch.setAttribute("data-eyes", eyeDecal);
      }

      if (viseme !== null) {
        swatch.setAttribute("data-mouth", viseme);
      }

      if (color !== null) {
        const { r, g, b } = color;
        swatch.setAttribute("style", `color: rgb(${rgbToCssRgb(r)}, ${rgbToCssRgb(g)}, ${rgbToCssRgb(b)});`);
      }
    }
  }
}

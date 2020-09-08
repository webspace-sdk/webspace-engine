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
  DataTexture
} = THREE;

const DECAL_MAP_SIZE = 4096;
const NUM_DECAL_MAPS = 3;

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

const IDENITTY = new Matrix4();
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
      "attribute vec4 duvOffset;",
      "varying vec4 vDuvOffset;"
    ].join("\n")
  );

  shader.vertexShader = shader.vertexShader.replace(
    "#include <uv2_vertex>",
    ["#include <uv2_vertex>", "vDuv = duv;", "vDuvOffset = duvOffset;"].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <gradientmap_pars_fragment>",
    [
      "#include <gradientmap_pars_fragment>",
      "precision mediump sampler2DArray;",
      "uniform sampler2DArray decalMap;",
      "varying vec3 vDuv;",
      "varying vec4 vDuvOffset;"
    ].join("\n")
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <tonemapping_fragment>",
    [
      "vec4 texel = texture(decalMap, vec3(vDuv.x / 8.0, vDuv.y / 8.0, vDuv.z));",
      "gl_FragColor = vec4(gl_FragColor.rgb * (1.0 - texel.a) + texel.rgb * texel.a, gl_FragColor.a);",
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
    const index = this.mesh.addInstance(IDENITTY);

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

    this.sceneEl.object3D.add(this.mesh);
  }

  tick() {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.dirtyAvatars[i] === 0) continue;

      const el = this.avatarEls[i];
      if (el === null) continue;

      const { head } = el.components["ik-controller"];

      // Force update if flags set since head will be marked not visible
      head.updateMatrices();

      this.mesh.setMatrixAt(i, head.matrixWorld);
      this.mesh.instanceMatrix.needsUpdate = true;

      this.atmosphereSystem.updateShadows();

      this.dirtyAvatars[i] -= 1;
    }
  }
}

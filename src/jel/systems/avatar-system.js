import { DynamicInstancedMesh } from "../objects/DynamicInstancedMesh";
import { RENDER_ORDER } from "../../hubs/constants";
import { addVertexCurvingToShader } from "./terrain-system";

let toonGradientMap;

(() => {
  const colors = new Uint8Array(3);

  for (let c = 0; c <= colors.length; c++) {
    colors[c] = (c / colors.length) * 256;
  }

  toonGradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.LuminanceFormat);
  toonGradientMap.minFilter = THREE.NearestFilter;
  toonGradientMap.magFilter = THREE.NearestFilter;
  toonGradientMap.generateMipmaps = false;
})();

const {
  //InstancedMesh,
  ShaderMaterial,
  Color,
  //MeshStandardMaterial,
  VertexColors,
  //BufferGeometry,
  //BufferAttribute,
  //Object3D,
  Matrix4,
  ShaderLib,
  //Float32BufferAttribute,
  UniformsUtils,
  SphereBufferGeometry,
  //Uint16BufferAttribute,
  //Uint32BufferAttribute,
  //LOD,
  MeshToonMaterial
} = THREE;

const IDENITTY = new Matrix4();

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
    ...UniformsUtils.clone(ShaderLib.phong.uniforms)
  }
});

avatarMaterial.uniforms.gradientMap.value = toonGradientMap;
avatarMaterial.uniforms.shininess.value = 0.0001;
avatarMaterial.uniforms.diffuse.value = new Color(0.0, 0.22, 0.66);

avatarMaterial.stencilWrite = true; // Avoid SSAO
avatarMaterial.stencilFunc = THREE.AlwaysStencilFunc;
avatarMaterial.stencilRef = 2;
avatarMaterial.stencilZPass = THREE.ReplaceStencilOp;

avatarMaterial.onBeforeCompile = shader => {
  addVertexCurvingToShader(shader);
  //shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>", "vColor.xyz = color.xyz / 255.0;");
};

const MAX_AVATARS = 128;

// Draws instanced avatar heads. IK controller now sets instanced heads to non-visible to avoid draw calls.
export class AvatarSystem {
  constructor(sceneEl, atmosphereSystem) {
    this.sceneEl = sceneEl;
    this.atmosphereSystem = atmosphereSystem;
    this.avatarEls = Array(MAX_AVATARS);

    this.dirtyAvatars = Array(MAX_AVATARS);
    this.dirtyAvatars.fill(false);

    this.maxRegisteredIndex = -1;
    this.createMesh();
  }

  register(el) {
    const index = this.mesh.addMatrix(IDENITTY);
    this.maxRegisteredIndex = Math.max(index, this.maxRegisteredIndex);
    this.avatarEls[index] = el;
    this.dirtyAvatars[index] = true;
  }

  unregister(el) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (el === this.avatarEls[i]) {
        this.avatarEls[i] = null;
        this.mesh.removeMatrix(i);
        return;
      }
    }
  }

  markDirty(el) {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.avatarEls[i] === el) {
        this.dirtyAvatars[i] = true;
        return;
      }
    }
  }

  createMesh() {
    this.mesh = new DynamicInstancedMesh(new SphereBufferGeometry(0.25, 30, 30), avatarMaterial, 128);
    this.mesh.renderOrder = RENDER_ORDER.INSTANCED_AVATAR;
    this.mesh.castShadow = true;
    this.sceneEl.object3D.add(this.mesh);
  }

  tick() {
    for (let i = 0; i <= this.maxRegisteredIndex; i++) {
      if (this.dirtyAvatars[i] === false) continue;

      const el = this.avatarEls[i];
      if (el === null) continue;

      const { head } = el.components["ik-controller"];

      // Force update if flags set since head will be marked not visible
      head.updateMatrices();

      this.mesh.setMatrixAt(i, head.matrixWorld);
      this.mesh.instanceMatrix.needsUpdate = true;
      this.atmosphereSystem.updateShadows();

      this.dirtyAvatars[i] = false;
    }
  }
}

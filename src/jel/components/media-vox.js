import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { VOXLoader } from "../objects/VOXLoader";
import { VOXBufferGeometry } from "../objects/VOXBufferGeometry";
import { generateMeshBVH } from "../../hubs/components/gltf-model-plus";
import { addVertexCurvingToShader } from "../systems/terrain-system";

const {
  ShaderMaterial,
  ShaderLib,
  UniformsUtils,
  MeshBasicMaterial,
  NearestFilter,
  VertexColors,
  DataTexture,
  Color
} = THREE;

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

//const getVoxelMaterial = () => {
//  const voxelMaterial = new ShaderMaterial({
//    name: "vox",
//    vertexColors: VertexColors,
//    fog: true,
//    fragmentShader: ShaderLib.phong.fragmentShader,
//    vertexShader: ShaderLib.phong.vertexShader,
//    lights: true,
//    defines: {
//      ...new MeshToonMaterial().defines
//    },
//    uniforms: {
//      ...UniformsUtils.clone(ShaderLib.phong.uniforms)
//    }
//  });
//
//  voxelMaterial.onBeforeCompile = shader => {
//    addVertexCurvingToShader(shader);
//    shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>", "vColor.xyz = color.xyz / 255.0;");
//  };
//  voxelMaterial.uniforms.gradientMap.value = toonGradientMap;
//  voxelMaterial.uniforms.shininess.value = 0.0001;
//  voxelMaterial.uniforms.diffuse.value = new Color(0.5, 0.5, 0.5);
//  return voxelMaterial;
//};

const getVoxelMaterial = () => {
  const voxelMaterial = new ShaderMaterial({
    name: "beam",
    fog: false,
    fragmentShader: ShaderLib.basic.fragmentShader,
    vertexShader: ShaderLib.basic.vertexShader,
    lights: false,
    vertexColors: VertexColors,
    transparent: true,
    defines: {
      ...new MeshBasicMaterial().defines
    },
    uniforms: {
      ...UniformsUtils.clone(ShaderLib.basic.uniforms)
    }
  });

  voxelMaterial.onBeforeCompile = shader => {
    addVertexCurvingToShader(shader);
    shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>", "vColor.xyz = color.xyz / 255.0;");
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <fog_fragment>",
      "gl_FragColor = vec4(vColor.xyz, 1.0);"
    );
  };

  return voxelMaterial;
};

AFRAME.registerComponent("media-vox", {
  schema: {
    src: { type: "string" }
  },

  async init() {
    this.firedModelLoadedEvent = false;

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.registerMediaComponent(this);
    }
  },

  async update(oldData) {
    const { src } = this.data;
    if (!src) return;

    const refresh = src !== oldData.src;

    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    const hasLayer = hasMediaLayer(this.el);

    if (!hasLayer || refresh) {
      const newMediaPresence = hasLayer ? mediaPresenceSystem.getMediaPresence(this) : MEDIA_PRESENCE.PRESENT;
      this.setMediaPresence(newMediaPresence, refresh);
    }
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
    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    if (this.mesh) {
      this.mesh.visible = false;
    }

    mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.HIDDEN);
  },

  async setMediaToPresent(refresh) {
    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    try {
      if (
        mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.HIDDEN &&
        this.mesh &&
        !this.mesh.visible &&
        !refresh
      ) {
        this.mesh.visible = true;
      }

      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PENDING);

      const { src } = this.data;
      if (!src) return;

      if (!this.mesh) {
        disposeExistingMesh(this.el);

        this.el.emit("model-loading");

        const voxLoader = new VOXLoader();
        const chunks = await new Promise(res => voxLoader.load(src, res));
        const geo = new VOXBufferGeometry(chunks[0]);
        const mat = getVoxelMaterial();
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        await new Promise(res =>
          setTimeout(() => {
            generateMeshBVH(this.mesh);
            res();
          })
        );
        this.el.object3D.matrixNeedsUpdate = true;
        this.el.setObject3D("mesh", this.mesh);
        this.el.emit("model-loaded", { format: "vox", model: this.mesh });
      }
    } catch (e) {
      this.el.emit("model-error", { src: this.data.src });
      throw e;
    } finally {
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  remove() {
    disposeExistingMesh(this.el);

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }
  }
});

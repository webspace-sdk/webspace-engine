import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { VOXLoader } from "../objects/VOXLoader";
import { VOXBufferGeometry } from "../objects/VOXBufferGeometry";
import { generateMeshBVH } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "../systems/terrain-system";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshBasicMaterial, VertexColors } = THREE;

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
      ["gl_FragColor = vec4(vColor.xyz, 1.0);", "#include <fog_fragment>"].join("\n")
    );
  };

  voxelMaterial.stencilWrite = true;
  voxelMaterial.stencilFunc = THREE.AlwaysStencilFunc;
  voxelMaterial.stencilRef = 0;
  voxelMaterial.stencilZPass = THREE.ReplaceStencilOp;

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

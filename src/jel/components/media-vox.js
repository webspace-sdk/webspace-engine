import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh, disposeNode } from "../../hubs/utils/three-utils";
import { JelVoxBufferGeometry } from "../objects/JelVoxBufferGeometry";
import { generateMeshBVH } from "../../hubs/utils/three-utils";
import { addVertexCurvingToShader } from "../systems/terrain-system";
import { groundMedia, MEDIA_INTERACTION_TYPES } from "../../hubs/utils/media-utils";
import { getNetworkedEntity } from "../../jel/utils/ownership-utils";
import { Vox } from "ot-vox";
import "../utils/vox-sync";

const { ShaderMaterial, ShaderLib, UniformsUtils, MeshBasicMaterial, VertexColors } = THREE;

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

async function buildMeshForVoxChunk(voxChunk) {
  const geo = new JelVoxBufferGeometry(voxChunk);
  const mat = voxelMaterial;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;

  await new Promise(res =>
    setTimeout(() => {
      generateMeshBVH(mesh);
      res();
    })
  );

  return mesh;
}

AFRAME.registerComponent("media-vox", {
  schema: {
    src: { type: "string" }
  },

  async init() {
    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.registerMediaComponent(this);
    }

    getNetworkedEntity(this.el).then(networkedEl => {
      this.networkedEl = networkedEl;
    });

    this.voxId = null;

    // TODO animation
    this.meshes = [];
    this.visibleMeshIndex = 0;
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

    for (const mesh of this.meshes) {
      mesh.visible = false;
    }

    mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.HIDDEN);
  },

  async setMediaToPresent(refresh) {
    const mediaPresenceSystem = this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem;

    try {
      if (mediaPresenceSystem.getMediaPresence(this) === MEDIA_PRESENCE.HIDDEN && !refresh) {
        this.setCurrentMeshVisible();
      }

      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PENDING);

      const { src } = this.data;
      if (!src) return;

      if (this.meshes.length === 0) {
        // May have a loader
        disposeExistingMesh(this.el);

        const res = await fetch(this.data.src, { mode: "cors" });
        const {
          vox: [{ vox_id, frames }]
        } = await res.json();

        this.voxId = vox_id;

        this.el.emit("model-loading");

        if (frames.length === 0) {
          // TODO empty object placeholder
          const geo = new THREE.BoxBufferGeometry(1.0, 1.0, 1.0);
          const mat = new THREE.MeshBasicMaterial({ color: 0xffffffff });
          this.meshes.push(new THREE.Mesh(geo, mat));
          this.meshes[0].castShadow = true;
          this.el.setObject3D("mesh", this.meshes[0]);
        } else {
          this.vox = new Vox(frames);
          await this.rebuildVoxMeshes();
          await SYSTEMS.voxSystem.register(this.voxId, this.el.object3D);
        }

        this.el.object3D.matrixNeedsUpdate = true;
        this.el.emit("model-loaded", { model: this.meshes[0] });
      }
    } catch (e) {
      this.el.emit("model-error", { src: this.data.src });
      throw e;
    } finally {
      console.log("present", this.data.src);
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  async rebuildVoxMeshes() {
    if (!this.vox) return;

    this.disposeMeshes();

    for (let i = 0; i < this.vox.frames.length; i++) {
      const frameVoxChunk = this.vox.frames[i];

      // First mesh goes into usual mesh key, used for collision, etc.
      const meshKey = i === 0 ? "mesh" : `mesh_${i}`;
      const mesh = await buildMeshForVoxChunk(frameVoxChunk);
      this.el.setObject3D(meshKey, mesh);
      this.meshes.push(mesh);
    }

    console.log(this.el.getObject3D("mesh"));

    this.setCurrentMeshVisible();
  },

  setCurrentMeshVisible() {
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i].visible = i === this.visibleMeshIndex;
    }
  },

  handleMediaInteraction(type) {
    if (type === MEDIA_INTERACTION_TYPES.DOWN) {
      groundMedia(this.el);
    }
  },

  disposeMeshes() {
    for (const mesh of this.meshes) {
      // Avoid disposing material since it is shared across all vox objects.
      mesh.material = null;
    }

    // Primary mesh
    disposeExistingMesh(this.el);

    // Frame meshes
    for (let i = 0; i < this.meshes.length; i++) {
      const key = `mesh_${i}`;
      const mesh = this.el.getObject3D(key);
      if (!mesh) continue;

      disposeNode(mesh);
      this.el.removeObject3D(key);
    }

    this.meshes.length = 0;
  },

  remove() {
    this.disposeMeshes();

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }

    if (this.voxId) {
      SYSTEMS.voxSystem.unregister(this.object3D);
    }
  }
});

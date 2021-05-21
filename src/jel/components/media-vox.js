import { hasMediaLayer, MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { resetMediaRotation, MEDIA_INTERACTION_TYPES } from "../../hubs/utils/media-utils";
import { VOXEL_SIZE } from "../objects/JelVoxBufferGeometry";
import { getNetworkedEntity } from "../../jel/utils/ownership-utils";
import { endCursorLock } from "../utils/dom-utils";
import { MAX_FRAMES_PER_VOX } from "../systems/vox-system";
import { createVox } from "../../hubs/utils/phoenix-utils";
import { spawnMediaInfrontOfPlayer } from "../../hubs/utils/media-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import "../utils/vox-sync";

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
    this.el.classList.add("instanced");
    SYSTEMS.cursorTargettingSystem.setDirty();
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

        const geo = new THREE.BoxBufferGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
        const mat = new THREE.MeshBasicMaterial();
        mat.visible = false;
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = false;

        this.el.object3D.matrixNeedsUpdate = true;
        this.el.setObject3D("mesh", this.mesh);

        // Register returns vox id
        this.voxId = await SYSTEMS.voxSystem.register(src, this.mesh);

        this.el.emit("model-loaded", { format: "vox", model: this.mesh });
      }
    } catch (e) {
      this.el.emit("model-error", { src: this.data.src });
      throw e;
    } finally {
      mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.PRESENT);
    }
  },

  handleMediaInteraction(type) {
    if (type === MEDIA_INTERACTION_TYPES.DOWN) {
      const bbox = SYSTEMS.voxSystem.getBoundingBoxForSource(this.mesh, true);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      // Need to compute the offset of the generated mesh and the position of this source
      resetMediaRotation(this.el);
    } else if (type === MEDIA_INTERACTION_TYPES.EDIT) {
      if (SYSTEMS.cameraSystem.isInspecting()) return;
      if (!SYSTEMS.voxSystem.canEdit(this.voxId)) return;

      // Start inspecting with editing enabled
      SYSTEMS.cameraSystem.inspect(this.el.object3D, 2.0, false, true);

      // Show panels
      endCursorLock();

      if (!SYSTEMS.builderSystem.enabled) {
        SYSTEMS.builderSystem.toggle();
        SYSTEMS.launcherSystem.toggle();
      }
    } else if (type === MEDIA_INTERACTION_TYPES.SNAPSHOT) {
      if (this.voxId) {
        this.snapshotNewVox();
      }
    }
  },

  async snapshotNewVox() {
    const spaceId = window.APP.spaceChannel.spaceId;
    const { voxSystem } = SYSTEMS;

    const {
      vox: [{ vox_id: voxId, url }]
    } = await createVox(spaceId);

    const sync = await voxSystem.getSync(voxId);

    for (let i = 0; i < MAX_FRAMES_PER_VOX; i++) {
      const chunk = voxSystem.getChunkFrameOfVox(this.voxId, i);
      if (!chunk) continue;
      await sync.applyChunk(chunk, i, [0, 0, 0]);
    }

    // Skip resolving these URLs since they're from dyna.
    spawnMediaInfrontOfPlayer(url, null, ObjectContentOrigins.URL, null, {}, true, true, "model/vnd.jel-vox");
  },

  shouldBurstProjectileOnImpact() {
    if (!this.voxId) return true;
    return SYSTEMS.voxSystem.shouldBurstProjectileOnImpact(this.voxId);
  },

  remove() {
    if (this.mesh) {
      SYSTEMS.voxSystem.unregister(this.mesh);
    }

    disposeExistingMesh(this.el);

    if (hasMediaLayer(this.el)) {
      this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
    }
  }
});

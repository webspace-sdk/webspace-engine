import { MEDIA_PRESENCE } from "../../hubs/utils/media-utils";
import { disposeExistingMesh } from "../../hubs/utils/three-utils";
import { resetMediaRotation, MEDIA_INTERACTION_TYPES, isLockedMedia } from "../../hubs/utils/media-utils";
import { VOXEL_SIZE } from "../objects/vox-chunk-buffer-geometry";
import { getNetworkedEntity } from "../../jel/utils/ownership-utils";
import { endCursorLock } from "../utils/dom-utils";
import { addMediaInFrontOfPlayerIfPermitted } from "../../hubs/utils/media-utils";
import { gatePermission } from "../../hubs/utils/permissions-utils";
import { ObjectContentOrigins } from "../../hubs/object-types";
import { getSpawnInFrontZOffsetForEntity } from "../../hubs/utils/three-utils";
import { VOX_CONTENT_TYPE } from "../utils/vox-utils";
import "../utils/vox-sync";

AFRAME.registerComponent("media-vox", {
  schema: {
    src: { type: "string" }
  },

  async init() {
    SYSTEMS.mediaPresenceSystem.registerMediaComponent(this);

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

    if (refresh) {
      this.setMediaPresence(SYSTEMS.mediaPresenceSystem.getMediaPresence(this), refresh);
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
    if (this.mesh) {
      this.mesh.visible = false;
    }

    SYSTEMS.mediaPresenceSystem.setMediaPresence(this, MEDIA_PRESENCE.HIDDEN);
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

  async handleMediaInteraction(type) {
    if (!gatePermission("spawn_and_move_media")) return;

    if (type === MEDIA_INTERACTION_TYPES.RESET) {
      const bbox = SYSTEMS.voxSystem.getBoundingBoxForSource(this.mesh, true);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      // Need to compute the offset of the generated mesh and the position of this source
      resetMediaRotation(this.el);
    } else if (type === MEDIA_INTERACTION_TYPES.EDIT) {
      if (SYSTEMS.cameraSystem.isInspecting()) return;
      const { voxMetadata, accountChannel } = window.APP;

      const { is_published } = await voxMetadata.getOrFetchMetadata(this.voxId, true);

      if (is_published) {
        // Before entering editor, bake published vox.
        // Tnis ensures UI and editor doesn't need to properly deal with updating vox mid-session.
        await SYSTEMS.voxSystem.bakeOrInstantiatePublishedVoxEntities(this.voxId);
      } else {
        if (!(await SYSTEMS.voxSystem.canEditAsync(this.voxId))) return;
      }

      // Start inspecting with editing enabled
      SYSTEMS.cameraSystem.inspect(this.el.object3D, 2.0, false, true, true);
      accountChannel.subscribeToVox(this.voxId);

      SYSTEMS.cameraSystem.addEventListener(
        "mode_changing",
        () => {
          accountChannel.unsubscribeFromVox(this.voxId);
        },
        { once: true }
      );

      // Show panels
      endCursorLock();
    } else if (type === MEDIA_INTERACTION_TYPES.SNAPSHOT) {
      if (this.voxId) {
        this.snapshotNewVox();
      }
    }
  },

  async snapshotNewVox() {
    const { voxSystem } = SYSTEMS;
    const { url } = await voxSystem.copyVoxContent(this.voxId);
    const zOffset = getSpawnInFrontZOffsetForEntity(this.el);
    const sourceScale = this.el.object3D.scale;
    const { stackAxis, stackSnapPosition, stackSnapScale } = this.el.components["media-loader"].data;

    // Skip resolving these URLs since they're from dyna.
    const entity = addMediaInFrontOfPlayerIfPermitted(
      url,
      null,
      ObjectContentOrigins.URL,
      null,
      {},
      true,
      true,
      VOX_CONTENT_TYPE,
      zOffset,
      0, // yOffset
      stackAxis,
      stackSnapPosition,
      stackSnapScale
    ).entity;

    if (entity) {
      entity.object3D.scale.copy(sourceScale);
      entity.object3D.matrixNeedsUpdate = true;
    }
  },

  shouldBurstProjectileOnImpact() {
    if (!this.voxId) return true;
    return SYSTEMS.voxSystem.shouldBurstProjectileOnImpact(this.voxId) && !isLockedMedia(this.el);
  },

  remove() {
    if (this.mesh) {
      SYSTEMS.voxSystem.unregister(this.mesh);
    }

    disposeExistingMesh(this.el);

    this.el.sceneEl.systems["hubs-systems"].mediaPresenceSystem.unregisterMediaComponent(this);
  }
});

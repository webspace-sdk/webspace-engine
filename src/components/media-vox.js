import {
  MEDIA_PRESENCE,
  resetMediaRotation,
  MEDIA_INTERACTION_TYPES,
  isLockedMedia,
  addMediaInFrontOfPlayerIfPermitted
} from "../utils/media-utils";
import { disposeExistingMesh, getSpawnInFrontZOffsetForEntity } from "../utils/three-utils";
import { VOXEL_SIZE } from "../objects/voxels-buffer-geometry";
import { getNetworkedEntity } from "../utils/ownership-utils";
import { endCursorLock } from "../utils/dom-utils";
import { gatePermission } from "../utils/permissions-utils";
import { ObjectContentOrigins } from "../object-types";
import { VOX_CONTENT_TYPE } from "../utils/vox-utils";
import { assetFileNameForName } from "../utils/url-utils";

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
    } else if (type === MEDIA_INTERACTION_TYPES.OPEN) {
      console.log("Opening vox", this.voxId);
      const object3D = this.el.object3D;
      console.log(
        `${object3D.position.x},${object3D.position.y},${object3D.position.z},${object3D.rotation.x},${
          object3D.rotation.y
        },${object3D.rotation.z},${object3D.scale.x},${object3D.scale.y},${object3D.scale.z}`
      );
      const applyBits = (x, y, z, rx, ry, rz, sx, sy, sz) => {
        object3D.position.set(x, y, z);
        object3D.rotation.set(rx, ry, rz);
        object3D.scale.set(sx, sy, sz);
        object3D.matrixNeedsUpdate = true;
      };

      if (this.voxId === "ixipyyxeum32tdt8-149678") {
        // Left drawer
        const drawerOpenBits = [
          -19.791610840684083,
          2.41,
          19.398387535973267,
          0,
          -2.356185307179586,
          0,
          0.9999999999999998,
          1,
          0.9999999999999998
        ];

        const drawerCloseBits = [
          -19.26127588478859,
          2.41,
          19.92871275181287,
          0,
          -2.356185307179586,
          0,
          0.9999999999999998,
          1,
          0.9999999999999998
        ];

        const isOpen = Math.abs(object3D.position.x - drawerOpenBits[0]) < 0.1;

        if (isOpen) {
          applyBits(...drawerCloseBits);
        } else {
          applyBits(...drawerOpenBits);
        }
      } else if (this.voxId === "jj3jpp8ypovrvrqk-271648") {
        const doorOpenBits = [-17.87, 1.85, 17.62, 0, 1.5709999999999997, 0, 1, 1, 1];
        const doorCloseBits = [
          -17.879589080810547,
          1.85308086395264,
          17.570751190185547,
          2.34135871507469e-38,
          0.7856018169701229,
          2.788016196857255e-37,
          1,
          1,
          1
        ];
        const isOpen = Math.abs(object3D.position.z - doorOpenBits[2]) < 0.01;
        if (isOpen) {
          console.log("Closing)");
          applyBits(...doorCloseBits);
        } else {
          console.log("Opening)");
          applyBits(...doorOpenBits);
        }
      } else if (this.voxId === "vfboru5jxtcy8rj2-934173") {
        console.log("meow");
      }
    } else if (type === MEDIA_INTERACTION_TYPES.EDIT) {
      if (SYSTEMS.cameraSystem.isInspecting()) return;
      const { voxMetadata } = window.APP;

      const { is_published } = await voxMetadata.getOrFetchMetadata(this.voxId, true);
      if (is_published) {
        // TODO VOX
        // Before entering editor, bake published vox.
        // Tnis ensures UI and editor doesn't need to properly deal with updating vox mid-session.
        await SYSTEMS.voxSystem.bakeOrInstantiatePublishedVoxEntities(this.voxId);
      } else {
        if (!(await SYSTEMS.voxSystem.canEditAsync(this.voxId))) return;
      }

      // Start inspecting with editing enabled
      SYSTEMS.cameraSystem.inspect(this.el.object3D, 2.0, false, true, true);

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
    const { voxMetadata } = window.APP;

    const voxName = voxMetadata.hasMetadata(this.voxId) ? voxMetadata.getMetadata(this.voxId).name : "Untitled";
    const voxFilename = assetFileNameForName(voxName, "svox");

    const { url } = await voxSystem.createVoxInFrontOfPlayer(voxName, `assets/${voxFilename}`, this.voxId);

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

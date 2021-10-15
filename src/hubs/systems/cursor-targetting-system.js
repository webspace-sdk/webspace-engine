import { waitForDOMContentLoaded } from "../utils/async-utils";

const noop = function() {};
AFRAME.registerComponent("overwrite-raycast-as-noop", {
  init() {
    this.el.object3D.raycast = noop;
    this.mesh = this.el.getObject3D("mesh");
    if (this.mesh) {
      this.mesh.raycast = noop;
    } else {
      this.el.addEventListener("model-loaded", () => {
        this.mesh = this.el.getObject3D("mesh");
        if (this.mesh) {
          this.mesh.raycast = noop;
        }
      });
    }
  }
});

export class CursorTargettingSystem {
  constructor(sceneEl) {
    this.sceneEl = sceneEl;
    this.targets = [];
    this.setDirty = this.setDirty.bind(this);
    this.dirty = true;

    // TODO: Use the MutationRecords passed into the callback function to determine added/removed nodes!
    this.observer = new MutationObserver(this.setDirty);

    waitForDOMContentLoaded().then(() => {
      const scene = document.querySelector("a-scene");
      this.rightRemote = document.getElementById("right-cursor-controller");
      this.leftRemote = document.getElementById("left-cursor-controller");
      this.observer.observe(scene, { childList: true, attributes: true, subtree: true });
      scene.addEventListener("object3dset", this.setDirty);
      scene.addEventListener("object3dremove", this.setDirty);
      scene.addEventListener("transform_started", this.setDirty);
      scene.addEventListener("transform_stopped", this.setDirty);
      SYSTEMS.voxSystem.addEventListener("mesh_added", this.setDirty);
      SYSTEMS.voxSystem.addEventListener("mesh_removed", this.setDirty);
      SYSTEMS.voxmojiSystem.addEventListener("mesh_added", this.setDirty);
      SYSTEMS.voxmojiSystem.addEventListener("mesh_removed", this.setDirty);
      SYSTEMS.cameraSystem.addEventListener("mode_changed", this.setDirty);
    });
  }

  setDirty() {
    this.dirty = true;
  }

  getCursors() {
    const cursors = [];

    if (this.rightRemote) {
      cursors.push(this.rightRemote.components["cursor-controller"].data.cursor);
    }

    if (this.leftRemote) {
      cursors.push(this.leftRemote.components["cursor-controller"].data.cursor);
    }

    return cursors;
  }

  tick(t) {
    if (this.dirty) {
      this.populateEntities(this.targets);
      this.dirty = false;
    }

    if (this.rightRemote) {
      this.rightRemote.components["cursor-controller"].tick2(t);
    }

    if (this.leftRemote) {
      this.leftRemote.components["cursor-controller"].tick2(t, true);
    }
  }

  populateEntities(targets) {
    targets.length = 0;

    const els = this.sceneEl.querySelectorAll(".collidable, .interactable, .ui, .drawing");
    const { inspected } = SYSTEMS.cameraSystem;

    // If cursor is on in inspect mode, we only can target the inspected object (or instances)
    if (inspected) {
      for (let i = 0; i < els.length; i++) {
        if (els[i] === inspected && els[i].object3D && !els[i].classList.contains("instanced")) {
          targets.push(inspected.el.object3D);
          break;
        }
      }

      const inspectedMesh = inspected.el && inspected.el.getObject3D("mesh");

      if (inspectedMesh) {
        const voxMesh = SYSTEMS.voxSystem.getTargettableMeshForSource(inspectedMesh);

        if (voxMesh) {
          targets.push(voxMesh);
        }
      }

      return;
    }

    // TODO: Do not querySelectorAll on the entire scene every time anything changes!
    for (let i = 0; i < els.length; i++) {
      if (els[i].object3D && !els[i].classList.contains("instanced")) {
        targets.push(els[i].object3D);
      }
    }

    // Add instanced meshes
    for (const voxmojiMesh of SYSTEMS.voxmojiSystem.getMeshes()) {
      targets.push(voxmojiMesh);
    }

    for (const voxMesh of SYSTEMS.voxSystem.getTargettableMeshes()) {
      targets.push(voxMesh);
    }

    for (const terrainMesh of SYSTEMS.terrainSystem.activeTerrains) {
      targets.push(terrainMesh);
    }
  }

  remove() {
    this.observer.disconnect();
    AFRAME.scenes[0].removeEventListener("object3dset", this.setDirty);
    AFRAME.scenes[0].removeEventListener("object3dremove", this.setDirty);
  }
}

import { SOUND_SPAWN_PEN } from "../systems/sound-effects-system";

/**
 * HUD panel for muting, freezing, and other controls that don't necessarily have hardware buttons.
 * @namespace ui
 * @component in-world-hud
 */
AFRAME.registerComponent("in-world-hud", {
  init() {
    this.mic = this.el.querySelector(".mic");
    this.spawn = this.el.querySelector(".spawn");
    this.pen = this.el.querySelector(".penhud");
    this.cameraBtn = this.el.querySelector(".camera-btn");
    this.inviteBtn = this.el.querySelector(".invite-btn");
    this.background = this.el.querySelector(".bg");

    this.updateButtonStates = () => {
      this.mic.setAttribute("mic-button", "active", !this.el.sceneEl.is("unmuted"));
      this.pen.setAttribute("icon-button", "active", this.el.sceneEl.is("pen"));
      this.cameraBtn.setAttribute("icon-button", "active", this.el.sceneEl.is("camera"));
      if (window.APP.atomAccessManager) {
        this.spawn.setAttribute(
          "icon-button",
          "disabled",
          !window.APP.atomAccessManager.hubCan("spawn_and_move_media")
        );
        this.pen.setAttribute("icon-button", "disabled", !window.APP.atomAccessManager.hubCan("spawn_drawing"));
        this.cameraBtn.setAttribute("icon-button", "disabled", !window.APP.atomAccessManager.hubCan("spawn_camera"));
      }
    };

    this.onStateChange = evt => {
      if (!(evt.detail === "unmuted" || evt.detail === "frozen" || evt.detail === "pen" || evt.detail === "camera"))
        return;
      this.updateButtonStates();
    };

    this.onMicClick = () => {
      this.el.emit("action_mute");
    };

    this.onSpawnClick = () => {
      if (!window.APP.atomAccessManager.hubCan("spawn_and_move_media")) return;
      this.el.emit("action_spawn");
    };

    this.onPenClick = e => {
      if (!window.APP.atomAccessManager.hubCan("spawn_drawing")) return;
      this.el.emit("spawn_pen", { object3D: e.object3D });
      this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_SPAWN_PEN);
    };

    this.onCameraClick = () => {
      if (!window.APP.atomAccessManager.hubCan("spawn_camera")) return;
      this.el.emit("action_toggle_camera");
    };

    this.onInviteClick = () => {
      this.el.emit("action_invite");
    };
  },

  play() {
    this.el.sceneEl.addEventListener("stateadded", this.onStateChange);
    this.el.sceneEl.addEventListener("stateremoved", this.onStateChange);
    this.el.sceneEl.systems.permissions.onPermissionsUpdated(this.updateButtonStates);
    this.updateButtonStates();

    this.mic.object3D.addEventListener("interact", this.onMicClick);
    this.spawn.object3D.addEventListener("interact", this.onSpawnClick);
    this.pen.object3D.addEventListener("interact", this.onPenClick);
    this.cameraBtn.object3D.addEventListener("interact", this.onCameraClick);
    this.inviteBtn.object3D.addEventListener("interact", this.onInviteClick);
  },

  pause() {
    this.el.sceneEl.removeEventListener("stateadded", this.onStateChange);
    this.el.sceneEl.removeEventListener("stateremoved", this.onStateChange);
    window.APP.atomAccessManager.removeEventListener("permissions_updated", this.updateButtonStates);

    this.mic.object3D.removeEventListener("interact", this.onMicClick);
    this.spawn.object3D.removeEventListener("interact", this.onSpawnClick);
    this.pen.object3D.removeEventListener("interact", this.onPenClick);
    this.cameraBtn.object3D.removeEventListener("interact", this.onCameraClick);
    this.inviteBtn.object3D.removeEventListener("interact", this.onInviteClick);
  }
});

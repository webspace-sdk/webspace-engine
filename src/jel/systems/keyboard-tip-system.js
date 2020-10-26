export class KeyboardTipSystem {
  constructor(sceneEl, cameraSystem) {
    this.scene = sceneEl;
    this.tipsToShow = null;
    this.store = window.APP.store;
    this.interaction = sceneEl.systems.interaction;
    this.transformSystem = sceneEl.systems["transform-selected-object"];
    this.scaleSystem = sceneEl.systems["scale-object"];
    this.cameraSystem = cameraSystem;
  }

  tick() {
    let showTips = null;

    if (!this.tipEl) {
      this.tipEl = document.getElementById("key-tips");
      if (!this.tipEl) return;
    }

    const hidden = this.store.state.settings.hideKeyTips;

    if (!hidden) {
      if (this.scene.is("pointer-exited")) {
        showTips = this.scene.is("muted") ? "pointer_exited_muted" : "pointer_exited_unmuted";
      } else {
        if (this.cameraSystem.isInAvatarView()) {
          showTips = document.pointerLockElement
            ? this.scene.is("muted")
              ? "idle_full_muted"
              : "idle_full_unmuted"
            : "idle_panels";

          if (this.transformSystem.transforming) {
            showTips = this.scaleSystem.isScaling ? "scale" : "rotate";
          } else {
            const held =
              this.interaction.state.leftHand.held ||
              this.interaction.state.rightHand.held ||
              this.interaction.state.rightRemote.held ||
              this.interaction.state.leftRemote.held;

            if (held) {
              showTips = "holding_interactable";
            } else {
              const hovered =
                this.interaction.state.leftHand.hovered ||
                this.interaction.state.rightHand.hovered ||
                this.interaction.state.rightRemote.hovered ||
                this.interaction.state.leftRemote.hovered;

              if (hovered) {
                const { components } = hovered;

                if (components["media-text"]) {
                  showTips = "text";
                } else if (components["media-video"]) {
                  showTips = components["media-video"].data.videoPaused ? "video_paused" : "video_playing";
                } else if (components["media-pdf"]) {
                  showTips = "pdf";
                } else {
                  showTips = "hover_interactable";
                }
              }
            }
          }
        } else {
          showTips = "focus";
        }
      }
    } else {
      showTips = "closed";
    }

    if (showTips !== this.tipsToShow) {
      this.tipEl.setAttribute("data-show-tips", showTips);
      this.tipsToShow = showTips;
    }
  }
}

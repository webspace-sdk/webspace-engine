import { SOUND_MEDIA_LOADING } from "../systems/sound-effects-system";
import { getNetworkedEntity } from "../../jel/utils/ownership-utils";

AFRAME.registerComponent("local-refresh-media-button", {
  init() {
    this.onClick = async () => {
      if (this.targetEl) {
        this.targetEl.components["media-loader"] &&
          this.targetEl.components["media-loader"].update(this.targetEl.components["media-loader"].data, true);
      }
    };

    getNetworkedEntity(this.el)
      .then(networkedEl => {
        this.targetEl = networkedEl;
        const isNonLiveVideo =
          this.targetEl.components["media-video"] && this.targetEl.components["media-video"].videoIsLive === false;
        const src =
          (this.targetEl.components["media-loader"] && this.targetEl.components["media-loader"].data.src) || "";
        const shouldHaveLocalRefreshButton = !isNonLiveVideo && src.indexOf("twitch.tv") !== -1;
        if (!shouldHaveLocalRefreshButton) {
          this.el.parentNode.removeChild(this.el);
        } else {
          const onVideoIsLiveUpdate = e => {
            if (!e.detail.videoIsLive) {
              this.targetEl.removeEventListener("video_is_live_update", onVideoIsLiveUpdate);
              this.el.parentNode.removeChild(this.el);
            }
          };
          this.targetEl.addEventListener("video_is_live_update", onVideoIsLiveUpdate);
        }
      })
      .catch(() => {
        this.el.parentNode.removeChild(this.el);
      });
  },
  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  }
});

AFRAME.registerComponent("refresh-media-button", {
  init() {
    this.updateVisibility = this.updateVisibility.bind(this);

    this.onClick = async () => {
      const sfx = this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem;

      if (this.targetEl) {
        this.targetEl.components["media-loader"].refresh();

        // Hide button + do the sound effect here, so only the person who clicked hears it, not everyone.
        this.el.object3D.visible = false;
        const loadingSoundEffect = sfx.playPositionalSoundFollowing(SOUND_MEDIA_LOADING, this.targetEl.object3D, true);

        this.targetEl.addEventListener(
          "media_refreshed",
          () => {
            sfx.stopPositionalAudio(loadingSoundEffect);
            this.el.object3D.visible = true;
            this.updateVisibility();
          },
          { once: true }
        );
      }
    };

    getNetworkedEntity(this.el).then(networkedEl => {
      this.targetEl = networkedEl;

      window.APP.hubChannel.addEventListener("permissions_updated", this.updateVisibility);

      this.updateVisibility();
    });
  },

  updateVisibility() {
    if (!this.targetEl) return;

    this.el.object3D.visible = window.APP.hubChannel.can("spawn_and_move_media");
  },

  play() {
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  pause() {
    this.el.object3D.removeEventListener("interact", this.onClick);
  },

  remove() {
    window.APP.hubChannel.removeEventListener("permissions_updated", this.updateVisibility);
  }
});

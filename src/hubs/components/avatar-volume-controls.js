import { VOLUME_LABELS } from "./media-views";
const MAX_VOLUME = 8;
const SMALL_STEP = 1 / (VOLUME_LABELS.length / 2);
const BIG_STEP = (MAX_VOLUME - 1) / (VOLUME_LABELS.length / 2);
const DEFAULT_VOLUME = 75;

AFRAME.registerComponent("avatar-volume-controls", {
  schema: {
    volume: { type: "number", default: 1.0 },
    muted: { type: "boolean", default: false }
  },

  init() {
    this.volumeUp = this.volumeUp.bind(this);
    this.volumeDown = this.volumeDown.bind(this);
    this.changeVolumeBy = this.changeVolumeBy.bind(this);
    this.update = this.update.bind(this);
    window.APP.store.addEventListener("statechanged", this.update);
  },
  remove() {
    window.APP.store.removeEventListener("statechanged", this.update);
  },

  changeVolumeBy(v) {
    this.el.setAttribute("avatar-volume-controls", "volume", THREE.Math.clamp(this.data.volume + v, 0, MAX_VOLUME));
  },

  mute() {
    this.el.setAttribute("avatar-volume-controls", "muted", true);
  },

  unmute() {
    this.el.setAttribute("avatar-volume-controls", "muted", false);
  },

  volumeUp() {
    const step = this.data.volume > 1 - SMALL_STEP ? BIG_STEP : SMALL_STEP;
    this.changeVolumeBy(step);
  },

  volumeDown() {
    const step = this.data.volume > 1 + SMALL_STEP ? BIG_STEP : SMALL_STEP;
    this.changeVolumeBy(-1 * step);
  },

  update: (function() {
    const positionA = new THREE.Vector3();
    const positionB = new THREE.Vector3();
    return function update() {
      const audio = this.avatarAudioSource && this.avatarAudioSource.el.getObject3D(this.avatarAudioSource.attrName);
      if (!audio) {
        return;
      }

      const { audioOutputMode, globalVoiceVolume } = window.APP.store.state.preferences;
      const volumeModifier = (globalVoiceVolume !== undefined ? globalVoiceVolume : DEFAULT_VOLUME) / 100;
      let gain = this.data.muted ? 0 : volumeModifier * this.data.volume;
      if (audioOutputMode === "audio") {
        this.avatarAudioSource.el.object3D.getWorldPosition(positionA);
        this.el.sceneEl.camera.getWorldPosition(positionB);
        const squaredDistance = positionA.distanceToSquared(positionB);
        gain = gain * Math.min(1, 10 / Math.max(1, squaredDistance));
      }

      audio.gain.gain.value = gain;
    };
  })(),

  tick() {
    if (!this.avatarAudioSource && !this.searchFailed) {
      // Walk up to Spine and then search down.
      if (!this.el.components["avatar-audio-source"]) {
        this.searchFailed = true;
        return;
      }
      this.avatarAudioSource = this.el.components["avatar-audio-source"];
    }

    this.update();
  }
});

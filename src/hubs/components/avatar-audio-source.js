const INFO_INIT_FAILED = "Failed to initialize avatar-audio-source.";
const INFO_NO_NETWORKED_EL = "Could not find networked el.";
const INFO_NO_OWNER = "Networked component has no owner.";

// Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
// We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
// setting the volume to 0.
const SHOULD_CREATE_SILENT_AUDIO_ELS = /chrome/i.test(navigator.userAgent);
function createSilentAudioEl(stream) {
  const audioEl = new Audio();
  audioEl.setAttribute("autoplay", "autoplay");
  audioEl.setAttribute("playsinline", "playsinline");
  audioEl.srcObject = stream;
  audioEl.volume = 0; // we don't actually want to hear audio from this element
  return audioEl;
}

async function getOwnerId(el) {
  const networkedEl = await NAF.utils.getNetworkedEntity(el).catch(e => {
    console.error(INFO_INIT_FAILED, INFO_NO_NETWORKED_EL, e);
  });
  if (!networkedEl) {
    return null;
  }
  return networkedEl.components.networked.data.owner;
}

async function getMediaStream(el) {
  const peerId = await getOwnerId(el);
  if (!peerId) {
    console.error(INFO_INIT_FAILED, INFO_NO_OWNER);
    return null;
  }
  const stream = await NAF.connection.adapter.getMediaStream(peerId).catch(e => {
    console.error(INFO_INIT_FAILED, `Error getting media stream for ${peerId}`, e);
  });
  if (!stream) {
    return null;
  }
  return stream;
}

function getPreferredPanningModel() {
  // At lower detail levels, assume we are CPU bound and abandon trying to do HRTF.
  return window.APP.detailLevel > 0 ? "equalpower" : "HRTF";
}

function setPositionalAudioProperties(audio, settings) {
  audio.setDistanceModel(settings.distanceModel);
  audio.setMaxDistance(settings.maxDistance);
  audio.setRefDistance(settings.refDistance);
  audio.setRolloffFactor(settings.rolloffFactor);
}

function setPositionalAudioPanningModel(audio) {
  const panningModel = getPreferredPanningModel();

  if (audio.panner && audio.panner.panningModel !== panningModel) {
    if (audio.panner.panningModel !== panningModel) {
      audio.panner.panningModel = panningModel;
    }
  }
}

AFRAME.registerComponent("avatar-audio-source", {
  schema: {
    positional: { default: true },
    distanceModel: {
      default: "inverse",
      oneOf: ["linear", "inverse", "exponential"]
    },
    maxDistance: { default: 10000 },
    refDistance: { default: 1 },
    rolloffFactor: { default: 1 }
  },

  createAudio: async function() {
    this.isCreatingAudio = true;
    const stream = await getMediaStream(this.el);
    this.isCreatingAudio = false;
    const isRemoved = !this.el.parentNode;
    if (!stream || isRemoved) return;

    const audioListener = this.el.sceneEl.audioListener;
    const audio = this.data.positional ? new THREE.PositionalAudio(audioListener) : new THREE.Audio(audioListener);

    if (this.data.positional) {
      setPositionalAudioProperties(audio, this.data);
      setPositionalAudioPanningModel(audio);
    }

    if (SHOULD_CREATE_SILENT_AUDIO_ELS) {
      createSilentAudioEl(stream); // TODO: Do the audio els need to get cleaned up?
    }

    const mediaStreamSource = audio.context.createMediaStreamSource(stream);
    audio.setNodeSource(mediaStreamSource);
    this.el.setObject3D(this.attrName, audio);

    // Ensure panner node is positioned properly, even if tabbed away and
    // tick loop isn't running.
    audio.updateMatrixWorld();

    this.el.emit("sound-source-set", { soundSource: mediaStreamSource });
  },

  destroyAudio() {
    const audio = this.el.getObject3D(this.attrName);
    if (!audio) return;

    audio.disconnect();
    this.el.removeObject3D(this.attrName);
  },

  init() {
    this.handleDetailLevelChanged = this.handleDetailLevelChanged.bind(this);
    this.onAudioStreamChanged = this.onAudioStreamChanged.bind(this);

    SYSTEMS.audioSettingsSystem.registerAvatarAudioSource(this);

    this.el.sceneEl.addEventListener("detail-level-changed", this.handleDetailLevelChanged);

    this.createAudio();

    NAF.utils.getNetworkedEntity(this.el).then(() => {
      NAF.connection.adapter.addEventListener("audio_stream_changed", this.onAudioStreamChanged);
    });
  },

  handleDetailLevelChanged() {
    const audio = this.el.getObject3D(this.attrName);
    if (!audio) return;

    setPositionalAudioPanningModel(audio);
  },

  recreateAudio() {
    this.destroyAudio();
    this.createAudio();
  },

  update(oldData) {
    if (this.isCreatingAudio) return;

    const audio = this.el.getObject3D(this.attrName);
    if (!audio) return;

    const shouldRecreateAudio = oldData.positional !== this.data.positional;

    if (shouldRecreateAudio) {
      this.recreateAudio();
    } else if (this.data.positional) {
      setPositionalAudioProperties(audio, this.data);
      setPositionalAudioPanningModel(audio);
    }
  },

  onAudioStreamChanged: async function({ detail: { peerId } }) {
    const { el } = this;
    const ownerId = await getOwnerId(el);
    const audio = el.getObject3D(this.attrName);
    if (!audio || ownerId !== peerId) return;

    const newStream = await NAF.connection.adapter.getMediaStream(peerId, "audio").catch(e => {
      console.error(INFO_INIT_FAILED, `Error getting media stream for ${peerId}`, e);
    });

    if (!newStream) return;

    this.recreateAudio();
  },

  remove: function() {
    SYSTEMS.audioSettingsSystem.unregisterAvatarAudioSource(this);
    this.el.sceneEl.removeEventListener("detail-level-changed", this.handleDetailLevelChanged);
    this.destroyAudio();

    if (NAF.connection.adapter) {
      NAF.connection.adapter.removeEventListener("audio_stream_changed", this.onAudioStreamChanged);
    }
  }
});

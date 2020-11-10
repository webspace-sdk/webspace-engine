const isMobileVR = AFRAME.utils.device.isMobileVR();
const isFirefoxReality = isMobileVR && navigator.userAgent.match(/Firefox/);

export class MediaStreamSystem {
  constructor(sceneEl) {
    this.mediaStream = new MediaStream();
    this.scene = sceneEl;
    this.store = window.APP.store;
    this._addedAudioSystemTrack = false;

    document.body.addEventListener("connected", () => {
      NAF.connection.adapter.setLocalMediaStream(this.mediaStream);
    });
  }

  async addTrack(track) {
    this.mediaStream.addTrack(track);
    await NAF.connection.adapter.setLocalMediaStream(this.mediaStream);
  }

  async removeTrack(track) {
    this.mediaStream.removeTrack(track);
    await NAF.connection.adapter.setLocalMediaStream(this.mediaStream);
  }

  async stopVideoTracks() {
    for (const track of this.mediaStream.getVideoTracks()) {
      track.stop();
      await this.removeTrack(track);
    }

    await NAF.connection.adapter.setLocalMediaStream(this.mediaStream);
  }

  async updatePreferredMicDevice(deviceId) {
    this.store.update({ settings: { preferredMicDeviceId: deviceId } });

    if (this.micAudioTrack) {
      // We're already streaming audio, start streaming new mic.
      await this.beginStreamingPreferredMic();
    }
  }

  async beginStreamingPreferredMic() {
    const { preferredMicDeviceId } = this.store.state.settings;
    await this.enableMicAudioStream(preferredMicDeviceId);
  }

  async stopMicrophoneTrack() {
    if (!this.micAudioTrack) return;
    this.micAudioTrack.stop();
    this.micAudioTrack = null;
  }

  async enableMicAudioStream(deviceId) {
    if (deviceId) {
      await this.fetchAndAddAudioTrack({ audio: { deviceId: { ideal: deviceId } } });
    } else {
      await this.fetchAndAddAudioTrack({ audio: {} });
    }

    this.scene.emit("local-media-stream-created");
  }

  async fetchAndAddAudioTrack(constraints) {
    if (this.micAudioTrack) {
      this.micAudioTrack.stop();
      this.micAudioTrack = null;
    }

    constraints.audio.echoCancellation =
      window.APP.store.state.preferences.disableEchoCancellation === true ? false : true;
    constraints.audio.noiseSuppression =
      window.APP.store.state.preferences.disableNoiseSuppression === true ? false : true;
    constraints.audio.autoGainControl =
      window.APP.store.state.preferences.disableAutoGainControl === true ? false : true;

    if (isFirefoxReality) {
      //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1626081
      constraints.audio.echoCancellation =
        window.APP.store.state.preferences.disableEchoCancellation === false ? true : false;
      constraints.audio.noiseSuppression =
        window.APP.store.state.preferences.disableNoiseSuppression === false ? true : false;
      constraints.audio.autoGainControl =
        window.APP.store.state.preferences.disableAutoGainControl === false ? true : false;

      window.APP.store.update({
        preferences: {
          disableEchoCancellation: !constraints.audio.echoCancellation,
          disableNoiseSuppression: !constraints.audio.noiseSuppression,
          disableAutoGainControl: !constraints.audio.autoGainControl
        }
      });
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      const audioSystem = this.scene.systems["hubs-systems"].audioSystem;
      audioSystem.addStreamToOutboundAudio("microphone", newStream);
      this.micAudioTrack = newStream.getAudioTracks()[0];

      if (this.micAudioTrack) {
        const micDeviceLabel = this.micAudioTrack.label;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const micDeviceId = devices.filter(d => d.label === micDeviceLabel).map(d => d.deviceId)[0];
        this.scene.emit("mic_stream_created", micDeviceId);
      }

      this.scene.emit("local-media-stream-created");

      // If the audio system track has yet to be added to the outgoing media stream, add it.
      if (!this._addedAudioSystemTrack) {
        await this.addTrack(audioSystem.outboundStream.getAudioTracks()[0]);
        this._addedAudioSystemTrack = true;
      }

      if (/Oculus/.test(navigator.userAgent)) {
        // HACK Oculus Browser 6 seems to randomly end the microphone audio stream. This re-creates it.
        // Note the ended event will only fire if some external event ends the stream, not if we call stop().
        const recreateAudioStream = async () => {
          console.warn(
            "Oculus Browser 6 bug hit: Audio stream track ended without calling stop. Recreating audio stream."
          );

          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          const audioTrack = newStream.getAudioTracks()[0];

          audioSystem.addStreamToOutboundAudio("microphone", newStream);

          this.scene.emit("local-media-stream-created");

          audioTrack.addEventListener("ended", recreateAudioStream, { once: true });
        };

        this.micAudioTrack.addEventListener("ended", recreateAudioStream, { once: true });
      }

      return true;
    } catch (e) {
      // Error fetching audio track, most likely a permission denial.
      console.error("Error during getUserMedia: ", e);
      return false;
    }
  }
}

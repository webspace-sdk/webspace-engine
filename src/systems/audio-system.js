import audioForwardWorkletSrc from "!!raw-loader!../worklets/audio-forward.worklet.js";
import vadWorkletSrc from "!!raw-loader!../worklets/vad.worklet.js";
import lipSyncWorker from "../workers/lipsync.worker.js";
import sdpTransform from "sdp-transform";

import qsTruthy from "../utils/qs_truthy";

// Built via https://github.com/sipavlovic/wasm2js to load in worklet
import rnnWasm from "../wasm/rnnoise-vad-wasm.js";

const supportsInsertableStreams = !!(window.RTCRtpSender && !!RTCRtpSender.prototype.createEncodedStreams);

const skipLipsync = qsTruthy("skip_lipsync");
const skipVad = qsTruthy("skip_vad");

export const supportsLipSync = () =>
  !skipLipsync && typeof AudioWorklet == "function" && window.SharedArrayBuffer && supportsInsertableStreams;

export class AudioSystem {
  constructor(sceneEl, autoQualitySystem) {
    sceneEl.audioListener = sceneEl.audioListener || new THREE.AudioListener();
    if (sceneEl.camera) {
      sceneEl.camera.add(sceneEl.audioListener);
    }
    sceneEl.addEventListener("camera-set-active", evt => {
      evt.detail.cameraEl.getObject3D("camera").add(sceneEl.audioListener);
    });

    this.scene = sceneEl;
    this.lipSyncEnabled = false;
    this.audioContext = THREE.AudioContext.getContext();
    this.audioNodes = new Map();
    this.mediaStreamDestinationNode = this.audioContext.createMediaStreamDestination();
    this.outboundStream = this.mediaStreamDestinationNode.stream;
    this.outboundGainNode = this.audioContext.createGain();
    this.outboundAnalyser = this.audioContext.createAnalyser();
    this.outboundAnalyser.fftSize = 32;
    this.analyserLevels = new Uint8Array(this.outboundAnalyser.fftSize);
    this.outboundGainNode.connect(this.outboundAnalyser);
    this.outboundAnalyser.connect(this.mediaStreamDestinationNode);
    this.aecHackOutboundPeer = null;
    this.aecHackInboundPeer = null;
    this.aecHackApplyInterval = null;
    this.aecHackAudioEl = null;
    this.aecHackApplying = false;
    this.aecHackDisableAt = null;

    /**
     * Chrome and Safari will start Audio contexts in a "suspended" state.
     * A user interaction (touch/mouse event) is needed in order to resume the AudioContext.
     */
    const resume = () => {
      this.audioContext.resume();

      setTimeout(() => {
        if (this.audioContext.state === "running") {
          document.body.removeEventListener("touchend", resume, false);
          document.body.removeEventListener("mouseup", resume, false);
        }
      }, 0);
    };

    document.body.addEventListener("touchend", resume, false);
    document.body.addEventListener("mouseup", resume, false);

    if (!qsTruthy("noaechack") && !AFRAME.utils.device.isMobile() && /chrome/i.test(navigator.userAgent)) {
      this.aecHackApplyInterval = setInterval(() => {
        this.applyAECAndMediaSourceHack();
      }, 500);
    }

    autoQualitySystem.addEventListener("framerate_stable", () => {
      // Start lip syncing after level loads to avoid hitching.
      if (supportsLipSync()) {
        this.startLipSync(sceneEl);
      }
    });
  }

  disableLipSync() {
    if (!this.lipSyncEnabled) return;

    if (this.lipSyncGain) {
      this.outboundGainNode.disconnect(this.lipSyncGain);
      this.lipSyncForwardingNode.disconnect(this.lipSyncForwardingDestination);
      this.lipSyncHardLimit.disconnect(this.lipSyncVadProcessor);
      this.lipSyncGain.disconnect(this.lipSyncHardLimit);
      this.lipSyncHardLimit.disconnect(this.lipSyncForwardingNode);
      this.lipSyncVadProcessor.disconnect(this.lipSyncVadDestination);
      this.lipSyncEnabled = false;
    }
  }

  enableLipSync() {
    if (this.lipSyncEnabled) return;

    if (this.lipSyncGain) {
      this.outboundGainNode.connect(this.lipSyncGain);
      this.lipSyncForwardingNode.connect(this.lipSyncForwardingDestination);
      this.lipSyncHardLimit.connect(this.lipSyncVadProcessor);
      this.lipSyncGain.connect(this.lipSyncHardLimit);
      this.lipSyncHardLimit.connect(this.lipSyncForwardingNode);
      this.lipSyncVadProcessor.connect(this.lipSyncVadDestination);

      this.lipSyncEnabled = true;
    }
  }

  startLipSync(sceneEl) {
    // Lip syncing - add gain and compress and then send to forwarding and VAD worklets
    // Create buffers, worklet, VAD detector, and lip sync worker.

    this.lipSyncFeatureBuffer = new SharedArrayBuffer(28 * Float32Array.BYTES_PER_ELEMENT);
    this.lipSyncResultBuffer = new SharedArrayBuffer(1);
    this.lipSyncAudioFrameBuffer1 = new SharedArrayBuffer(2048 * 4);
    this.lipSyncAudioFrameBuffer2 = new SharedArrayBuffer(2048 * 4);
    this.lipSyncAudioOffsetBuffer = new SharedArrayBuffer(1);
    this.lipSyncVadBuffer = new SharedArrayBuffer(4);
    this.lipSyncFeatureData = new Float32Array(this.lipSyncFeatureBuffer.featureBuffer);
    this.lipSyncResultData = new Uint8Array(this.lipSyncResultBuffer);
    this.lipSyncVadData = new Float32Array(this.lipSyncVadBuffer);

    this.lipSyncGain = this.audioContext.createGain();
    this.lipSyncGain.gain.setValueAtTime(3.0, this.audioContext.currentTime);

    this.lipSyncHardLimit = this.audioContext.createDynamicsCompressor();
    this.lipSyncHardLimit.threshold.value = -12;
    this.lipSyncHardLimit.knee.value = 0.0;
    this.lipSyncHardLimit.ratio.value = 20.0;
    this.lipSyncHardLimit.attack.value = 0.005;
    this.lipSyncHardLimit.release.value = 0.05;

    this.lipSyncVadDestination = this.audioContext.createMediaStreamDestination();
    this.lipSyncForwardingDestination = this.audioContext.createMediaStreamDestination();

    const audioForwardWorkletBlob = new Blob([audioForwardWorkletSrc], { type: "text/javascript" });
    const audioForwardWorkletBlobUrl = URL.createObjectURL(audioForwardWorkletBlob);
    const vadWorkletBlob = new Blob([vadWorkletSrc], { type: "text/javascript" });
    const vadWorkletBlobUrl = URL.createObjectURL(vadWorkletBlob);

    this.audioContext.audioWorklet.addModule(audioForwardWorkletBlobUrl).then(() => {
      this.audioContext.audioWorklet.addModule(vadWorkletBlobUrl).then(() => {
        this.lipSyncForwardingNode = new AudioWorkletNode(this.audioContext, "audio-forwarder", {
          processorOptions: {
            audioFrameBuffer1: this.lipSyncAudioFrameBuffer1,
            audioFrameBuffer2: this.lipSyncAudioFrameBuffer2,
            audioOffsetBuffer: this.lipSyncAudioOffsetBuffer
          }
        });

        this.lipSyncVadProcessor = new AudioWorkletNode(this.audioContext, "vad", {
          processorOptions: {
            vadBuffer: this.lipSyncVadBuffer,
            rnnWasm,
            enabled: !skipVad
          }
        });

        this.lipSyncWorker = new lipSyncWorker();
        this.lipSyncWorker.postMessage(this.lipSyncFeatureBuffer);
        this.lipSyncWorker.postMessage(this.lipSyncResultBuffer);
        this.lipSyncWorker.postMessage(this.lipSyncAudioFrameBuffer1);
        this.lipSyncWorker.postMessage(this.lipSyncAudioFrameBuffer2);
        this.lipSyncWorker.postMessage(this.lipSyncVadBuffer);
        this.lipSyncWorker.postMessage(this.lipSyncAudioOffsetBuffer);

        if (this.scene.is("unmuted")) {
          this.enableLipSync();
        }

        const handleStateChange = e => {
          if (e.detail === "unmuted") {
            this.scene.is("unmuted") ? this.enableLipSync() : this.disableLipSync();
          }
        };

        this.scene.addEventListener("stateadded", handleStateChange);
        this.scene.addEventListener("stateremoved", handleStateChange);
      });
    });

    if (NAF.connection.adapter) {
      NAF.connection.adapter.setOutgoingVisemeBuffer(this.lipSyncResultData);
    }

    sceneEl.addEventListener("adapter-ready", () => {
      NAF.connection.adapter.setOutgoingVisemeBuffer(this.lipSyncResultData);
    });
  }

  enableOutboundAudioStream(id) {
    if (this.audioNodes.has(id)) {
      const { sourceNode, gainNode, connected } = this.audioNodes.get(id);

      if (!connected) {
        sourceNode.connect(gainNode);
        this.audioNodes.set(id, { sourceNode, gainNode, connected: true });
      }
    }
  }

  disableOutboundAudioStream(id) {
    if (this.audioNodes.has(id)) {
      const { sourceNode, gainNode, connected } = this.audioNodes.get(id);

      if (connected) {
        sourceNode.disconnect(gainNode);
        this.audioNodes.set(id, { sourceNode, gainNode, connected: false });
      }
    }
  }

  addStreamToOutboundAudio(id, mediaStream) {
    if (this.audioNodes.has(id)) {
      this.removeStreamFromOutboundAudio(id);
    }

    const sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
    const gainNode = this.audioContext.createGain();
    gainNode.connect(this.outboundGainNode);
    this.audioNodes.set(id, { sourceNode, gainNode, connected: false });
    this.enableOutboundAudioStream(id);
  }

  removeStreamFromOutboundAudio(id) {
    if (this.audioNodes.has(id)) {
      const nodes = this.audioNodes.get(id);
      nodes.sourceNode.disconnect();
      nodes.gainNode.disconnect();
      this.audioNodes.delete(id);
    }
  }

  /**
   *  workaround for both:
   *
   *  https://bugs.chromium.org/p/chromium/issues/detail?id=687574
   *  https://bugs.chromium.org/p/chromium/issues/detail?id=933677
   *
   *  1. grab the GainNode from the scene's THREE.AudioListener
   *  2. disconnect the GainNode from the AudioDestinationNode (basically the audio out), this prevents hearing the audio twice.
   *  3. create a local webrtc connection between two RTCPeerConnections (see this example: https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
   *  4. create a new MediaStreamDestination from the scene's THREE.AudioContext and connect the GainNode to it.
   *  5. add the MediaStreamDestination's track  to one of those RTCPeerConnections
   *  6. connect the other RTCPeerConnection's stream to a new audio element.
   *  All audio is now routed through Chrome's audio mixer, thus enabling AEC, while preserving all the audio processing that was performed via the WebAudio API.
   *  7. Add an audio element for the source, which will address 933677
   *
   *  This routine is run every 500ms, and determines if the hack should be enabled currently. It should be enabled if the user is unmuted or if there is another person in the room. Once this condition fails, the hack is disabled after 30s.
   */
  async applyAECAndMediaSourceHack() {
    if (this.aecHackApplying) return;

    this.aecHackApplying = true;

    try {
      this.audioContext = THREE.AudioContext.getContext();
      if (this.audioContext.state !== "running") return;
      if (!NAF.connection?.presence?.states) return;

      // We need the AEC + media stream source hack if the user is unmuted
      // or there are other avatars.
      const hackNeeded = this.scene.is("unmuted") || NAF.connection.presence.states.size > 1;

      const now = performance.now();

      // Disable the hack after a grace period when muted and no other avatar sources
      if (this.aecHackDisableAt === null && !hackNeeded) {
        this.aecHackDisableAt = now + 30000;
      } else if (hackNeeded && this.aecHackDisableAt !== null) {
        this.aecHackDisableAt = null;
      }

      const shouldApplyHack = this.aecHackDisableAt === null || this.aecHackDisableAt > performance.now();

      if (shouldApplyHack) {
        if (this.aecHackOutboundPeer) return;
        const gainNode = this.scene.audioListener.gain;

        const onError = e => {
          console.error("RTCPeerConnection loopback initialization error", e);
        };

        if (!this.aecHackAudioEl) {
          this.aecHackAudioEl = new Audio();
          this.aecHackAudioEl.setAttribute("autoplay", "autoplay");
          this.aecHackAudioEl.setAttribute("playsinline", "playsinline");
        }

        const context = THREE.AudioContext.getContext();
        const loopbackDestination = context.createMediaStreamDestination();
        this.aecHackOutboundPeer = new RTCPeerConnection();
        this.aecHackInboundPeer = new RTCPeerConnection();

        this.aecHackOutboundPeer.addEventListener("icecandidate", e => {
          this.aecHackInboundPeer.addIceCandidate(e.candidate).catch(onError);
        });

        this.aecHackInboundPeer.addEventListener("icecandidate", e => {
          this.aecHackOutboundPeer.addIceCandidate(e.candidate).catch(onError);
        });

        this.aecHackInboundPeer.addEventListener("track", e => {
          this.aecHackAudioEl.srcObject = e.streams[0];
        });

        //The following should never fail, but just in case, we won't disconnect/reconnect the gainNode unless all of this succeeds
        loopbackDestination.stream.getTracks().forEach(track => {
          this.aecHackOutboundPeer.addTrack(track, loopbackDestination.stream);
        });

        const offer = await this.aecHackOutboundPeer.createOffer();
        if (!this.aecHackOutboundPeer) return;
        this.aecHackOutboundPeer.setLocalDescription(offer);

        await this.aecHackInboundPeer.setRemoteDescription(offer);
        if (!this.aecHackOutboundPeer || !this.aecHackInboundPeer) return;

        // Bump opus bitrate and set mono
        const answer = await this.aecHackInboundPeer.createAnswer();
        const parsedSdp = sdpTransform.parse(answer.sdp);
        for (let i = 0; i < parsedSdp.media.length; i++) {
          for (let j = 0; j < parsedSdp.media[i].fmtp.length; j++) {
            parsedSdp.media[i].fmtp[j].config =
              parsedSdp.media[i].fmtp[j].config + ";stereo=1;maxaveragebitrate=510000;cbr=0;";
          }
        }

        answer.sdp = sdpTransform.write(parsedSdp);

        if (!this.aecHackOutboundPeer || !this.aecHackInboundPeer) return;

        this.aecHackInboundPeer.setLocalDescription(answer);
        this.aecHackOutboundPeer.setRemoteDescription(answer);

        gainNode.disconnect();
        gainNode.connect(loopbackDestination);
      } else {
        if (!this.aecHackOutboundPeer) return;

        const gainNode = this.scene.audioListener.gain;

        this.aecHackOutboundPeer.close();
        this.aecHackInboundPeer.close();
        this.aecHackOutboundPeer.srcObject = null;

        this.aecHackOutboundPeer = null;
        this.aecHackInboundPeer = null;
        gainNode.disconnect();
        gainNode.connect(this.audioContext.destination);
      }
    } catch (e) {
      console.error("AEC Hack error", e);
    } finally {
      this.aecHackApplying = false;
    }
  }
}

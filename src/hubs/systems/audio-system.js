import audioForwardWorkletSrc from "worklet-loader!../../jel/worklets/audio-forward-worklet";
import vadWorkletSrc from "worklet-loader!../../jel/worklets/vad-worklet";
import lipSyncWorker from "../../jel/workers/lipsync.worker.js";

// Built via https://github.com/sipavlovic/wasm2js to load in worklet
import rnnWasm from "../../jel/wasm/rnnoise-vad-wasm.js";

async function enableChromeAEC(gainNode) {
  /**
   *  workaround for: https://bugs.chromium.org/p/chromium/issues/detail?id=687574
   *  1. grab the GainNode from the scene's THREE.AudioListener
   *  2. disconnect the GainNode from the AudioDestinationNode (basically the audio out), this prevents hearing the audio twice.
   *  3. create a local webrtc connection between two RTCPeerConnections (see this example: https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
   *  4. create a new MediaStreamDestination from the scene's THREE.AudioContext and connect the GainNode to it.
   *  5. add the MediaStreamDestination's track  to one of those RTCPeerConnections
   *  6. connect the other RTCPeerConnection's stream to a new audio element.
   *  All audio is now routed through Chrome's audio mixer, thus enabling AEC, while preserving all the audio processing that was performed via the WebAudio API.
   */

  const audioEl = new Audio();
  audioEl.setAttribute("autoplay", "autoplay");
  audioEl.setAttribute("playsinline", "playsinline");

  const context = THREE.AudioContext.getContext();
  const loopbackDestination = context.createMediaStreamDestination();
  const outboundPeerConnection = new RTCPeerConnection();
  const inboundPeerConnection = new RTCPeerConnection();

  const onError = e => {
    console.error("RTCPeerConnection loopback initialization error", e);
  };

  outboundPeerConnection.addEventListener("icecandidate", e => {
    inboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
  });

  inboundPeerConnection.addEventListener("icecandidate", e => {
    outboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
  });

  inboundPeerConnection.addEventListener("track", e => {
    audioEl.srcObject = e.streams[0];
  });

  try {
    //The following should never fail, but just in case, we won't disconnect/reconnect the gainNode unless all of this succeeds
    loopbackDestination.stream.getTracks().forEach(track => {
      outboundPeerConnection.addTrack(track, loopbackDestination.stream);
    });

    const offer = await outboundPeerConnection.createOffer();
    outboundPeerConnection.setLocalDescription(offer);
    await inboundPeerConnection.setRemoteDescription(offer);

    const answer = await inboundPeerConnection.createAnswer();
    inboundPeerConnection.setLocalDescription(answer);
    outboundPeerConnection.setRemoteDescription(answer);

    gainNode.disconnect();
    gainNode.connect(loopbackDestination);
  } catch (e) {
    onError(e);
  }
}

export class AudioSystem {
  constructor(sceneEl) {
    sceneEl.audioListener = sceneEl.audioListener || new THREE.AudioListener();
    if (sceneEl.camera) {
      sceneEl.camera.add(sceneEl.audioListener);
    }
    sceneEl.addEventListener("camera-set-active", evt => {
      evt.detail.cameraEl.getObject3D("camera").add(sceneEl.audioListener);
    });

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

    this.enableLipSync = this.audioContext.audioWorklet && window.SharedArrayBuffer;

    // Lip syncing - add gain and compress and then the forwarding worklet
    if (this.enableLipSync) {
      this.startLipSync(sceneEl);
    }

    /**
     * Chrome and Safari will start Audio contexts in a "suspended" state.
     * A user interaction (touch/mouse event) is needed in order to resume the AudioContext.
     */
    const resume = () => {
      this.audioContext.resume();

      setTimeout(() => {
        if (this.audioContext.state === "running") {
          if (!AFRAME.utils.device.isMobile() && /chrome/i.test(navigator.userAgent)) {
            enableChromeAEC(sceneEl.audioListener.gain);
          }

          document.body.removeEventListener("touchend", resume, false);
          document.body.removeEventListener("mouseup", resume, false);
        }
      }, 0);
    };

    document.body.addEventListener("touchend", resume, false);
    document.body.addEventListener("mouseup", resume, false);
  }

  startLipSync(sceneEl) {
    // Create buffers, worklet, VAD detector, and lip sync worker.
    this.delayVoiceNode = this.audioContext.createDelay();
    this.delayVoiceNode.delayTime.value = 0.1; // Delay bc of inference
    this.outboundAnalyser.disconnect(this.mediaStreamDestinationNode);
    this.outboundAnalyser.connect(this.delayVoiceNode);
    this.delayVoiceNode.connect(this.mediaStreamDestinationNode);

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
    this.lipSyncGain.gain.setValueAtTime(2.0, this.audioContext.currentTime);

    this.lipSyncHardLimit = this.audioContext.createDynamicsCompressor();
    this.lipSyncHardLimit.threshold.value = -12;
    this.lipSyncHardLimit.knee.value = 0.0;
    this.lipSyncHardLimit.ratio.value = 20.0;
    this.lipSyncHardLimit.attack.value = 0.005;
    this.lipSyncHardLimit.release.value = 0.05;

    this.lipSyncVadDestination = this.audioContext.createMediaStreamDestination();
    this.lipSyncForwardingDestination = this.audioContext.createMediaStreamDestination();

    this.audioContext.audioWorklet.addModule(audioForwardWorkletSrc).then(() => {
      this.audioContext.audioWorklet.addModule(vadWorkletSrc).then(() => {
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
            rnnWasm
          }
        });

        this.outboundGainNode.connect(this.lipSyncGain);
        this.lipSyncGain.connect(this.lipSyncHardLimit);
        this.lipSyncHardLimit.connect(this.lipSyncForwardingNode);
        this.lipSyncHardLimit.connect(this.lipSyncVadProcessor);
        this.lipSyncVadProcessor.connect(this.lipSyncVadDestination);
        this.lipSyncForwardingNode.connect(this.lipSyncForwardingDestination);

        this.lipSyncWorker = new lipSyncWorker();
        this.lipSyncWorker.postMessage(this.lipSyncFeatureBuffer);
        this.lipSyncWorker.postMessage(this.lipSyncResultBuffer);
        this.lipSyncWorker.postMessage(this.lipSyncAudioFrameBuffer1);
        this.lipSyncWorker.postMessage(this.lipSyncAudioFrameBuffer2);
        this.lipSyncWorker.postMessage(this.lipSyncVadBuffer);
        this.lipSyncWorker.postMessage(this.lipSyncAudioOffsetBuffer);
      });
    });

    if (NAF.connection.adapter) {
      NAF.connection.adapter.setVisemeBuffer(this.lipSyncResultData);
    } else {
      sceneEl.addEventListener(
        "adapter-ready",
        () => {
          NAF.connection.adapter.setVisemeBuffer(this.lipSyncResultData);
        },
        { once: true }
      );
    }
  }
  addStreamToOutboundAudio(id, mediaStream) {
    if (this.audioNodes.has(id)) {
      this.removeStreamFromOutboundAudio(id);
    }

    const sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
    const gainNode = this.audioContext.createGain();
    sourceNode.connect(gainNode);
    gainNode.connect(this.outboundGainNode);
    this.audioNodes.set(id, { sourceNode, gainNode });
  }

  removeStreamFromOutboundAudio(id) {
    if (this.audioNodes.has(id)) {
      const nodes = this.audioNodes.get(id);
      nodes.sourceNode.disconnect();
      nodes.gainNode.disconnect();
      this.audioNodes.delete(id);
    }
  }
}

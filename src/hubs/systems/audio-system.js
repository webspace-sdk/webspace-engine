import audioForwardWorkletSrc from "worklet-loader!../../jel/worklets/audio-forward-worklet";
import lipSyncWorker from "../../jel/workers/lipsync.worker.js";

const LIP_SYNC_WORKER_COMMAND_INIT = 0;
//const LIP_SYNC_WORKER_COMMAND_FRAME_1_READY = 1;
//const LIP_SYNC_WORKER_COMMAND_FRAME_2_READY = 2;

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
    sceneEl.addEventListener("camera-set- active", evt => {
      evt.detail.cameraEl.getObject3D("camera").add(sceneEl.audioListener);
    });

    this.lipsyncFeatureBuffer = new SharedArrayBuffer(28 * Float32Array.BYTES_PER_ELEMENT);
    this.lipsyncResultBuffer = new SharedArrayBuffer(1);
    this.lipsyncAudioFrameBuffer1 = new SharedArrayBuffer(1024 * 4);
    this.lipsyncAudioFrameBuffer2 = new SharedArrayBuffer(1024 * 4);
    this.lipsyncFeatureData = new Float32Array(this.lipsyncFeatureBuffer.featureBuffer);
    this.lipsyncResultData = new Uint8Array(this.lipsyncResultBuffer);

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

    // Lip syncing - add gain and compress and then the forwarding worklet
    if (this.audioContext.audioWorklet && window.SharedArrayBuffer) {
      this.lipSyncWorker = new lipSyncWorker();
      this.lipSyncWorker.postMessage(this.lipSyncFeatureBuffer);
      this.lipSyncWorker.postMessage(this.lipSyncResultBuffer);
      this.lipSyncWorker.postMessage(this.lipSyncAudioFrameBuffer1);
      this.lipSyncWorker.postMessage(this.lipSyncAudioFrameBuffer2);

      this.lipSyncWorkeh.postMessage(LIP_SYNC_WORKER_COMMAND_INIT);
      this.lipsyncGain = this.audioContext.createGain();
      this.lipsyncGain.gain.setValueAtTime(3.0, this.audioContext.currentTime);
      this.outboundGainNode.connect(this.lipsyncGain);

      this.lipsyncHardLimit = this.audioContext.createDynamicsCompressor();
      this.lipsyncHardLimit.threshold.value = -12;
      this.lipsyncHardLimit.knee.value = 0.0;
      this.lipsyncHardLimit.ratio.value = 20.0;
      this.lipsyncHardLimit.attack.value = 0.005;
      this.lipsyncHardLimit.release.value = 0.05;

      this.lipsyncGain.connect(this.lipsyncHardLimit);

      this.lipsyncDestination = this.audioContext.createMediaStreamDestination();
      this.audioContext.audioWorklet.addModule(audioForwardWorkletSrc).then(() => {
        const audioFrameBuffer1 = null;
        const audioFrameBuffer2 = null;

        this.lipsyncForwardingNode = new AudioWorkletNode(this.audioContext, "audio-forwarder", {
          processorOptions: { audioFrameBuffer1, audioFrameBuffer2 }
        });

        this.lipsyncHardLimit.connect(this.lipsyncForwardingNode);
        this.lipsyncForwardingNode.connect(this.lipsyncDestination);
      });
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

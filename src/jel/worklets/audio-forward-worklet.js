const PROCESSOR_NAME = "audio-forwarder";

class AudioForwarder extends AudioWorkletProcessor {
  constructor({ audioContext, processorOptions }) {
    super(audioContext, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1
    });

    this.frameData1 = new Float32Array(processorOptions.audioFrameBuffer1);
    this.frameData2 = new Float32Array(processorOptions.audioFrameBuffer2);
    this.frameDatas = [this.frameData1, this.frameData2];
    this.frameData = this.frameData1;
    this.frameLength = this.frameData.length;
    this.iFrame = 0;
    this.iSample = 0;
    this.sendPort = this.port;
  }
  process(inputs) {
    const inbuf = inputs[0][0];
    const { frameLength, frameData } = this;

    frameData.set(inbuf, this.iSample);
    this.iSample += inbuf.length;

    if (this.iSample > frameLength - 1) {
      this.iSample = 0;
      // Send true if frame 1 ready, false if frame 2 ready
      this.sendPort.postMessage(this.iFrame % 2 === 0);

      this.iFrame = (this.iFrame + 1) % 2;
      this.frameData = this.frameDatas[this.iFrame];
    }

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, AudioForwarder);

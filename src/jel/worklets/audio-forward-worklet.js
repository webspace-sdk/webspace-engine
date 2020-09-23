const ready1Message = { frame1Ready: true };
const ready2Message = { frame2Ready: true };

const PROCESSOR_NAME = "audio-forwarder";

class AudioForwarder extends AudioWorkletProcessor {
  constructor({ audioContext, processorOptions }) {
    super(audioContext, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1
    });

    //this.frameData1 = new Float32Array(processorOptions.audioFrameBuffer1);
    //this.frameData2 = new Float32Array(processorOptions.audioFrameBuffer2);
    //this.frameData = this.frameData1;
    //this.frameLength = this.frameData.length;
    //this.iFrame = 0;
  }
  process(inputs) {
    const inbuf = inputs[0][0];
    //const { frameLength, frameData, port } = this;

    //// Assume one channel
    //for (let i = 0, l = inbuf.length; i < l; i++) {
    //  frameData[this.iFrame] = inbuf[i];
    //  this.iFrame++;

    //  if (this.iFrame == frameLength) {
    //    this.iFrame = 0;

    //    if (frameData === this.frameData1) {
    //      port.postMessage(ready1Message);
    //      this.frameData = this.frameData2;
    //    } else {
    //      port.postMessage(ready2Message);
    //      this.frameData = this.frameData1;
    //    }
    //  }
    //}

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, AudioForwarder);

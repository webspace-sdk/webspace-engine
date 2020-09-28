const PROCESSOR_NAME = "audio-forwarder";
const EMPTY = [];

class AudioForwarder extends AudioWorkletProcessor {
  constructor({ audioContext, processorOptions }) {
    super(audioContext, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1
    });

    // The second frame buffer is offset by 1024 bytes to ensure
    // we can always grab one windows worth of data without a copy.
    this.frameData1 = new Float32Array(processorOptions.audioFrameBuffer1);
    this.frameData2 = new Float32Array(processorOptions.audioFrameBuffer2);
    this.offsetData = new Uint8Array(processorOptions.audioOffsetBuffer);
    this.offset = 0;
  }
  process(inputs) {
    const inbuf = inputs[0][0] || EMPTY; // Always 128 bytes per spec
    const { frameData1, frameData2 } = this;

    const dataOffset = this.offset * 128;
    frameData1.set(inbuf, dataOffset);
    frameData2.set(inbuf, (dataOffset + 1024) % 2048);
    this.offsetData[0] = this.offset;
    this.offset = (this.offset + 1) % 16;

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, AudioForwarder);

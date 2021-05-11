const PROCESSOR_NAME = "vad";
const SAMPLE_LENGTH = 480;
const BUFFER_SIZE = SAMPLE_LENGTH * 4;
import loadRnnNoiseVad from "../../jel/wasm/rnnoise-vad.js";

class VadWorklet extends AudioWorkletProcessor {
  constructor({ audioContext, processorOptions }) {
    super(audioContext, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1
    });

    this.bufferResidue = [];
    this.vadData = new Float32Array(processorOptions.vadBuffer);
    this.rnn = null;
    this.processFrame = (sample, i) => 1.0; // eslint-disable-line
    const rnnWasm = processorOptions.rnnWasm;

    const instantiateWasm = (imports, cb) =>
      WebAssembly.instantiate(rnnWasm, imports).then(({ instance }) => cb(instance));

    if (processorOptions.enabled) {
      // TODO move wasm to CDN
      loadRnnNoiseVad({ instantiateWasm }).then(rnnoise => {
        const {
          _rnnoise_create: createNoise,
          _malloc: malloc,
          _rnnoise_process_frame_vad: processNoiseVad,
          HEAPF32
        } = rnnoise;

        const pcmInputBuf = malloc(BUFFER_SIZE);
        const pcmInputIndex = pcmInputBuf / 4;

        this.rnn = createNoise();

        this.processFrame = (data, idx) => {
          for (let i = 0; i < SAMPLE_LENGTH; i++) {
            HEAPF32[pcmInputIndex + i] = data[idx + i] * 0x7fff;
          }
          return processNoiseVad(this.rnn, pcmInputBuf);
        };
      });
    }
  }

  process(inputs) {
    if (inputs[0].length === 0) return true;

    const { bufferResidue, vadData } = this;
    // proces data based on the sample length, use leftover buffer from previous process
    const inBuf = inputs[0][0];
    for (let i = 0, l = inBuf.length; i < l; i++) {
      bufferResidue.push(inBuf[i]);
    }

    let i = 0;
    const l = bufferResidue.length - SAMPLE_LENGTH;

    // process each viable sample
    for (; i < l; i += SAMPLE_LENGTH) {
      vadData[0] = this.processFrame(bufferResidue, i);
    }

    this.bufferResidue = i === 0 ? bufferResidue : bufferResidue.slice(i);

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, VadWorklet);

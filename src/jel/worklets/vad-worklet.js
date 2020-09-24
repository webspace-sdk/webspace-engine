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

    this.bufferResidue = new Float32Array([]);
    this.vadData = new Float32Array(processorOptions.vadBuffer);
    this.rnn = null;
    this.processFrame = sample => 0; // eslint-disable-line
    this.processFrame([0.1]); // Prime JIT, hacky
    const rnnWasm = processorOptions.rnnWasm;

    const instantiateWasm = (imports, cb) =>
      WebAssembly.instantiate(rnnWasm, imports).then(({ instance }) => cb(instance));

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

      this.processFrame = sample => {
        for (const [i, value] of sample.entries()) sample[i] = value * 0x7fff;
        HEAPF32.set(sample, pcmInputIndex);
        return processNoiseVad(this.rnn, pcmInputBuf);
      };
    });
  }

  process(inputs) {
    // proces data based on the sample length, use leftover buffer from previous process
    const inData = [...this.bufferResidue, ...inputs[0][0]];

    let i = 0;

    // process each viable sample
    for (; i + SAMPLE_LENGTH < inData.length; i += SAMPLE_LENGTH) {
      const sample = inData.slice(i, i + SAMPLE_LENGTH);
      this.vadData[0] = this.processFrame(sample);
    }

    this.bufferResidue = inData.slice(i);

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, VadWorklet);

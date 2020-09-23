import Meyda from "meyda";

// Trouble loading wasm backend in worker, revisit this once wasm is included in tfjs proper
// and import it normally via NPM
const tfjsSrc = require("!!file-loader!../assets/js/tfjs.js");
const tfjsWasmBackendSrc = require("!!file-loader!../assets/js/tfjs-backend-wasm.js");
importScripts(tfjsSrc);
importScripts(tfjsWasmBackendSrc);

const modelSrc = "https://s3.amazonaws.com/jel.ai/lipsync-quant/model.json";

// HACK this was manually added to the wasm-backend.js file since no other way to get at it
// this too should be removed once wasm is properly added to the tfjs bundle
self.tfjsSetWasmPaths("https://s3.amazonaws.com/jel.ai/wasm/");

const buf = Array(5); // Need to keep two windows on each side for computing derivatives
let ibuf = 0;

for (let i = 0; i < buf.length; i++) {
  // 13 MFCCs and energy
  buf[i] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
}

const means = [
  -2.33635101318359375e1,
  1.54891138076782226562e1,
  -3.170543670654296875,
  4.40934228897094726562,
  -2.40078017115592956543e-1,
  1.27933037281036376953,
  -7.07275569438934326172e-1,
  2.08839267492294311523e-1,
  -9.70815956592559814453e-1,
  -1.18599012494087219238e-1,
  -3.84294837713241577148e-1,
  -3.85968178510665893555e-1,
  3.18839341402053833008e-1,
  -1.71497452259063720703,
  1.10032238875845678194e-9,
  0.0,
  -3.43850753425911648264e-10,
  0.0,
  -2.75080597189614195486e-10,
  -1.03155220476658371354e-10,
  -5.15776102383291856768e-11,
  1.37540298594807097743e-10,
  0.0,
  6.87701492974035488714e-11,
  -1.03155220476658371354e-10,
  3.43850746487017744357e-11,
  -5.15776102383291856768e-11,
  -2.75080597189614195486e-10
];

const variances = [
  3.18626678466796875e2,
  9.242635345458984375e1,
  2.99521007537841796875e1,
  1.75220279693603515625e1,
  1.3809696197509765625e1,
  1.258782196044921875e1,
  7.1483249664306640625,
  4.50083684921264648438,
  3.9669322967529296875,
  3.10881447792053222656,
  2.34000921249389648438,
  1.75634896755218505859,
  1.45549249649047851562,
  1.3600605010986328125e1,
  1.1041149139404296875e1,
  4.0492706298828125,
  2.53357553482055664062,
  1.09852516651153564453,
  7.26375877857208251953e-1,
  5.59060394763946533203e-1,
  5.09417831897735595703e-1,
  4.09739643335342407227e-1,
  3.55646163225173950195e-1,
  3.16192328929901123047e-1,
  2.65648037195205688477e-1,
  2.28556200861930847168e-1,
  2.01975867152214050293e-1,
  5.21265506744384765625e-1
];

const vbuf = [0, 0, 0];
let curViseme = 0;
let curVisemeDuration = 0;
let ivbuf = 0;
let featureData;
let resultData;
let audioFrame1Data;
let audioFrame2Data;
let workletPort;
let featureArr;

const meydaExtract = Meyda.extract.bind(Meyda);
Meyda.sampleRate = 44100; // TODO use input sample rate properly
Meyda.bufferSize = 1024;
Meyda.hopSize = Math.floor(Meyda.sampleRate / 100.0);
Meyda.melBands = 26;

const meydaFeatures = ["mfcc", "energy"];

async function performPrediction(model, frameData) {
  const { mfcc, energy } = meydaExtract(meydaFeatures, frameData);

  // Buffer frame to write
  const d = buf[ibuf];

  // Perform the prediction of frame ibuf - 2 so we have 2-frame lookahead derivatives
  // Buffer is of length 5 so 2 frames ago is three ahead
  const ipred = (ibuf + 3) % buf.length;
  const ahead1i = (ipred + 1) % buf.length; // 1 frame ahead
  const ahead2i = (ahead1i + 1) % buf.length; // 2 frames ahead
  const behind2i = (ahead2i + 1) % buf.length; // 2 frames behind
  const behind1i = (behind2i + 1) % buf.length; // 1 frame behind

  // Increment ibuf (and don't use it again below)
  ibuf = (ibuf + 1) % buf.length;

  // update spectral data size

  // Store mfccs and energy
  for (let i = 0; i < 13; i++) {
    d[i] = mfcc[i];

    if (i === 0) {
      // pytorch mel0 is negated at this window size
      d[i] = -d[i];
    }
  }

  d[13] = Math.log(energy);

  // Current frame is now stored in buf[ibuf]

  // Compute + append derivatives. Buffer is of length 5 so the left side of the window is one element past the right side;
  const current = buf[ipred];
  const ahead1 = buf[ahead1i];
  const behind1 = buf[behind1i];
  const ahead2 = buf[ahead2i];
  const behind2 = buf[behind2i];

  for (let i = 0; i < 14; i++) {
    featureData[i] = (current[i] - means[i]) / (variances[i] + 0.001);
  }

  // Build derivative estimates
  for (let i = 0; i < 14; i++) {
    const dv = ((ahead2[i] + ahead1[i]) / 2.0 - (behind1[i] + behind2[i]) / 2.0) / 2.0;
    const d = (dv - means[14 + i]) / (variances[14 + i] + 0.001); // Normalize
    featureData[14 + i] = d;
  }

  if (model) {
    const features = tf.tensor3d(featureArr);
    const pred = model.predict(features);

    const result = pred.dataSync();
    features.dispose();
    pred.dispose();

    let max = -Infinity;
    let v = -1; // Predicted viseme

    for (let i = 0; i < 12; i++) {
      if (result[i] > max) {
        max = result[i];
        v = i;
      }
    }

    if (v !== -1) {
      vbuf[ivbuf % vbuf.length] = v;

      if (v !== curViseme) {
        let allowTransition = true;

        if (curVisemeDuration < 2) {
          allowTransition = false;
        }
        /* else {
        //  allowTransition = true;

        //  for (let iv = 0; iv < vbuf.length; iv++) {
        //    if (vbuf[iv] !== v) {
        //      allowTransition = false;
        //    }
        //  }
        //}*/

        if (allowTransition) {
          curViseme = v;
          curVisemeDuration = 0;
          resultData[0] = v;
        }
      }

      curVisemeDuration++;
      ivbuf++;
    } else {
      // Model diverged, reset
      model.layers[1].resetStates();
    }
  }
}

onmessage = async function(event) {
  if (!featureData) {
    featureData = new Float32Array(event.data);
    featureArr = [[featureData]];
  } else if (!resultData) {
    resultData = new Uint8Array(event.data);
  } else if (!audioFrame1Data) {
    audioFrame1Data = new Float32Array(event.data);
  } else if (!audioFrame2Data) {
    audioFrame2Data = new Float32Array(event.data);
  } else {
    workletPort = event.data;

    tf.setBackend("wasm").then(() => {
      tf.loadLayersModel(modelSrc).then(model => {
        workletPort.onmessage = event => {
          if (event.data.frame1Ready) {
            performPrediction(model, audioFrame1Data);
          } else {
            performPrediction(model, audioFrame2Data);
          }
        };
      });
    });
  }
};

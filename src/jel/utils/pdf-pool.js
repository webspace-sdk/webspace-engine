import pdfjs from "pdfjs-dist";

/**
 * Warning! This require statement is fragile!
 *
 * How it works:
 * require -> require the file after all import statements have been called, particularly the configs.js import which modifies __webpack_public_path__
 * !! -> don't run any other loaders
 * file-loader -> make webpack move the file into the dist directory and return the file path
 * outputPath -> where to put the file
 * name -> how to name the file
 * Then the path to the worker script
 */
pdfjs.GlobalWorkerOptions.workerSrc = require("!!file-loader?outputPath=assets/js&name=[name]-[hash].js!pdfjs-dist/build/pdf.worker.min.js");

// Entries { getPdfPromise, src, refs } where refs is a ref count.
const pdfs = [];

export async function retainPdf(src) {
  for (const entry of pdfs) {
    if (entry.src === src) {
      entry.refs++;
      return await entry.getPdfPromise;
    }
  }

  let pdf;
  try {
    const promise = pdfjs.getDocument(src).promise;
    pdfs.push({ src, getPdfPromise: promise, refs: 1 });
    return await promise;
  } catch (e) {
    if (pdf) {
      pdf.destroy();
    }

    throw e;
  }
}

export async function releasePdf(pdf) {
  let removeAtIndex = -1;

  for (let i = 0; i < pdfs.length; i++) {
    const entry = pdfs[i];
    const entryPdf = await entry.getPdfPromise;

    if (entryPdf !== pdf) continue;
    removeAtIndex = i;
    entry.refs--;
    if (entry.refs <= 0) {
      entryPdf.destroy();
      removeAtIndex = i;
    }

    break;
  }

  if (removeAtIndex !== -1) {
    pdfs.splice(removeAtIndex, 1);
  }
}

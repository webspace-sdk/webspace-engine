import * as pdfjs from "pdfjs-dist";

const pdfjsWorker = require("pdfjs-dist/build/pdf.worker.js");
pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([pdfjsWorker], { type: "text/javascript" }));

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

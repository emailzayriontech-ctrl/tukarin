// Client-only pdfjs loader with bundled worker.
import * as pdfjsLib from "pdfjs-dist";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

let configured = false;

export async function getPdfjs() {
  if (!configured && typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
    configured = true;
  }
  return pdfjsLib;
}

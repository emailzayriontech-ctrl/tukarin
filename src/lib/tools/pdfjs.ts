let configured = false;
let pdfjsLibInstance: any = null;

export async function getPdfjs() {
  if (typeof window === "undefined") {
    // Return a dummy object or handle gracefully on server
    return null as any;
  }

  if (!pdfjsLibInstance) {
    pdfjsLibInstance = await import("pdfjs-dist");
  }

  if (!configured) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - vite worker import
    const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
    pdfjsLibInstance.GlobalWorkerOptions.workerPort = new PdfWorker();
    configured = true;
  }
  return pdfjsLibInstance;
}


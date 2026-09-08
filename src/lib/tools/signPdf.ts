import { PDFDocument } from "pdf-lib";

export async function signPdfDocument(
  file: File,
  signatureDataUrl: string, // PNG Base64 data URL
  opts: {
    targetPages: number[]; // 0-indexed page numbers
    xPercent?: number; // 0-100% of width
    yPercent?: number; // 0-100% of height
    scalePercent?: number; // e.g. 20-50% width
  }
): Promise<Blob> {
  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(pdfBytes);
  
  // Embed PNG signature image
  const sigImageBytes = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
  const sigImage = await doc.embedPng(new Uint8Array(sigImageBytes));

  const pages = opts.targetPages.length > 0 
    ? opts.targetPages 
    : Array.from({ length: doc.getPageCount() }, (_, i) => i);

  for (const pIdx of pages) {
    if (pIdx < 0 || pIdx >= doc.getPageCount()) continue;
    const page = doc.getPage(pIdx);
    const { width, height } = page.getSize();

    // Default: bottom-right area if not specified
    const xPct = opts.xPercent ?? 65;
    const yPct = opts.yPercent ?? 15;
    const scalePct = opts.scalePercent ?? 25;

    const sigWidth = (width * scalePct) / 100;
    const sigHeight = (sigImage.height / sigImage.width) * sigWidth;

    const x = (width * xPct) / 100;
    const y = (height * yPct) / 100;

    page.drawImage(sigImage, {
      x,
      y,
      width: sigWidth,
      height: sigHeight,
    });
  }

  const resultBytes = await doc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

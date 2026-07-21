import { PDFDocument } from "pdf-lib";

export async function reorderOrDeletePdfPages(
  file: File,
  keptPageIndexes: number[], // 0-indexed page numbers in desired order
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(srcDoc, keptPageIndexes);
  for (const p of copiedPages) {
    newDoc.addPage(p);
  }

  const resultBytes = await newDoc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

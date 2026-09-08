import { PDFDocument } from "pdf-lib";

export async function extractPdfPages(
  file: File,
  pageIndexes: number[] // 0-indexed array of page numbers to extract
): Promise<Blob> {
  if (!pageIndexes.length) {
    throw new Error("Pilih setidaknya 1 halaman untuk diekstrak.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();

  const validIndexes = pageIndexes.filter(
    (i) => i >= 0 && i < srcDoc.getPageCount()
  );

  if (!validIndexes.length) {
    throw new Error("Halaman yang dipilih tidak valid.");
  }

  const copiedPages = await newDoc.copyPages(srcDoc, validIndexes);
  for (const p of copiedPages) {
    newDoc.addPage(p);
  }

  const resultBytes = await newDoc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

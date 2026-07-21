import { PDFDocument, degrees } from "pdf-lib";

export async function rotatePdf(
  file: File,
  angle: number, // e.g. 90, 180, 270
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  for (const page of pages) {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + angle) % 360));
  }

  const resultBytes = await doc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

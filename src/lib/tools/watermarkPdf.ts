import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export async function watermarkPdf(
  file: File,
  text: string,
  opacity: number = 0.3,
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textSize = 42;
    const textWidth = font.widthOfTextAtSize(text, textSize);
    const textHeight = font.heightAtSize(textSize);

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: textSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
      opacity,
      rotate: degrees(45),
    });
  }

  const resultBytes = await doc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

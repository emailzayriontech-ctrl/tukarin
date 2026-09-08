import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PageNumberPosition = "bottom-center" | "bottom-right" | "bottom-left" | "top-right" | "top-center";

export async function addPageNumbersToPdf(
  file: File,
  opts: {
    format: "Halaman X dari Y" | "X / Y" | "Hal X" | "X";
    position: PageNumberPosition;
    fontSize?: number;
    margin?: number;
  }
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = opts.fontSize || 10;
  const margin = opts.margin || 25;

  for (let i = 0; i < total; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const pageNum = i + 1;

    let text = `${pageNum}`;
    if (opts.format === "Halaman X dari Y") {
      text = `Halaman ${pageNum} dari ${total}`;
    } else if (opts.format === "X / Y") {
      text = `${pageNum} / ${total}`;
    } else if (opts.format === "Hal X") {
      text = `Hal ${pageNum}`;
    }

    const textWidth = font.widthOfTextAtSize(text, size);
    let x = margin;
    let y = margin;

    if (opts.position === "bottom-center") {
      x = (width - textWidth) / 2;
      y = margin;
    } else if (opts.position === "bottom-right") {
      x = width - textWidth - margin;
      y = margin;
    } else if (opts.position === "bottom-left") {
      x = margin;
      y = margin;
    } else if (opts.position === "top-right") {
      x = width - textWidth - margin;
      y = height - margin - size;
    } else if (opts.position === "top-center") {
      x = (width - textWidth) / 2;
      y = height - margin - size;
    }

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const resultBytes = await doc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

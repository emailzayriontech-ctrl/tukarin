import { PDFDocument, degrees } from "pdf-lib";

export type PageSize = "fit" | "a4" | "letter";
export type Orientation = "auto" | "portrait" | "landscape";

const PAGE_DIMENSIONS = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};

type ImageInput = { file: File; rotation: number };

export async function imagesToPdf(
  inputs: ImageInput[],
  opts: { pageSize: PageSize; orientation: Orientation; margin: number },
): Promise<Blob> {
  const pdf = await PDFDocument.create();

  for (const { file, rotation } of inputs) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = file.type.toLowerCase();
    let img;
    if (type.includes("png")) {
      img = await pdf.embedPng(bytes);
    } else if (type.includes("jpeg") || type.includes("jpg")) {
      img = await pdf.embedJpg(bytes);
    } else {
      // Re-encode anything else (webp etc.) to PNG via canvas
      const png = await reencodeToPng(file);
      img = await pdf.embedPng(png);
    }

    const imgW = img.width;
    const imgH = img.height;
    let pageW: number;
    let pageH: number;
    let drawW: number;
    let drawH: number;
    let x = 0;
    let y = 0;

    if (opts.pageSize === "fit") {
      pageW = imgW;
      pageH = imgH;
      drawW = imgW;
      drawH = imgH;
    } else {
      const base = PAGE_DIMENSIONS[opts.pageSize];
      const isLandscape =
        opts.orientation === "landscape" ||
        (opts.orientation === "auto" && imgW > imgH);
      pageW = isLandscape ? base.h : base.w;
      pageH = isLandscape ? base.w : base.h;
      const innerW = pageW - opts.margin * 2;
      const innerH = pageH - opts.margin * 2;
      const ratio = Math.min(innerW / imgW, innerH / imgH);
      drawW = imgW * ratio;
      drawH = imgH * ratio;
      x = (pageW - drawW) / 2;
      y = (pageH - drawH) / 2;
    }

    const page = pdf.addPage([pageW, pageH]);
    page.drawImage(img, {
      x,
      y,
      width: drawW,
      height: drawH,
      rotate: rotation ? degrees(rotation) : undefined,
    });
  }

  const out = await pdf.save();
  return new Blob([out as unknown as ArrayBuffer], { type: "application/pdf" });
}

async function reencodeToPng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Gagal mengonversi gambar.");
  return new Uint8Array(await blob.arrayBuffer());
}

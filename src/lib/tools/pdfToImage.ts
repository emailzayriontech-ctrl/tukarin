import { getPdfjs } from "./pdfjs";

export type ImgFormat = "image/png" | "image/jpeg";

export async function renderPdfPages(
  file: File,
  opts: { scale: number; format: ImgFormat; pages?: number[] },
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; name: string; pageNumber: number }[]> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;
  const pages = (opts.pages && opts.pages.length ? opts.pages : Array.from({ length: total }, (_, i) => i + 1))
    .filter((p) => p >= 1 && p <= total);

  const baseName = file.name.replace(/\.pdf$/i, "");
  const ext = opts.format === "image/png" ? "png" : "jpg";
  const results: { blob: Blob; name: string; pageNumber: number }[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageNumber = pages[i]!;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: opts.scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    if (opts.format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, opts.format, opts.format === "image/jpeg" ? 0.92 : undefined),
    );
    if (!blob) throw new Error("Gagal merender halaman.");
    results.push({ blob, name: `${baseName}-hal-${String(pageNumber).padStart(3, "0")}.${ext}`, pageNumber });
    onProgress?.(i + 1, pages.length);
  }

  await doc.cleanup();
  return results;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const n = doc.numPages;
  await doc.cleanup();
  return n;
}

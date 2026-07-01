import { PDFDocument } from "pdf-lib";
import { getPdfjs } from "./pdfjs";

export type CompressLevel = "lossless" | "low" | "medium" | "high" | "target";

const LEVEL_OPTS: Record<Exclude<CompressLevel, "lossless" | "target">, { scale: number; quality: number }> = {
  low: { scale: 2.0, quality: 0.92 },
  medium: { scale: 1.5, quality: 0.82 },
  high: { scale: 1.1, quality: 0.65 },
};

async function losslessResave(file: File): Promise<Blob> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(data, { updateMetadata: false });
  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 200,
  });
  return new Blob([bytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

async function rasterize(
  file: File,
  scale: number,
  quality: number,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const src = await pdfjs.getDocument({ data }).promise;
  const total = src.numPages;
  const out = await PDFDocument.create();

  for (let i = 1; i <= total; i++) {
    const page = await src.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob) throw new Error("Gagal merender halaman.");
    const jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const origViewport = page.getViewport({ scale: 1 });
    const newPage = out.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(jpg, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
    onProgress?.(i, total);
  }

  await src.cleanup();
  const bytes = await out.save({ useObjectStreams: true });
  return new Blob([bytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

export async function compressPdf(
  file: File,
  level: CompressLevel,
  onProgress?: (done: number, total: number) => void,
  targetMB?: number,
): Promise<Blob> {
  if (level === "lossless") {
    onProgress?.(1, 1);
    return losslessResave(file);
  }

  if (level === "target") {
    const target = (targetMB ?? 1) * 1024 * 1024;
    // First try lossless — if already small enough, done.
    const lossless = await losslessResave(file);
    if (lossless.size <= target) {
      onProgress?.(1, 1);
      return lossless;
    }
    // Try from highest quality down. Return the FIRST result that fits
    // under the target, so we use as much of the "budget" as possible
    // instead of over-compressing (e.g. target 20MB → hasil ~18MB, bukan 2MB).
    const steps: { scale: number; quality: number }[] = [
      { scale: 3.0, quality: 0.98 },
      { scale: 2.5, quality: 0.95 },
      { scale: 2.2, quality: 0.92 },
      { scale: 2.0, quality: 0.9 },
      { scale: 1.8, quality: 0.85 },
      { scale: 1.6, quality: 0.82 },
      { scale: 1.4, quality: 0.78 },
      { scale: 1.3, quality: 0.72 },
      { scale: 1.1, quality: 0.65 },
      { scale: 0.9, quality: 0.55 },
      { scale: 0.75, quality: 0.45 },
      { scale: 0.6, quality: 0.4 },
      { scale: 0.5, quality: 0.35 },
    ];
    let best: Blob = lossless;
    let bestDiff = lossless.size - target; // > 0 karena sudah di atas target
    for (const s of steps) {
      const out = await rasterize(file, s.scale, s.quality, onProgress);
      if (out.size <= target) return out;
      const diff = out.size - target;
      if (diff < bestDiff) {
        best = out;
        bestDiff = diff;
      }
    }
    return best;
  }

  const { scale, quality } = LEVEL_OPTS[level];
  return rasterize(file, scale, quality, onProgress);
}

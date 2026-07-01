import { PDFDocument } from "pdf-lib";

export type SplitRange = { from: number; to: number; label?: string };

export function parseRanges(input: string, totalPages: number): SplitRange[] {
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  const ranges: SplitRange[] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error(`Format tidak valid: "${part}"`);
    const from = parseInt(m[1]!, 10);
    const to = m[2] ? parseInt(m[2], 10) : from;
    if (from < 1 || to > totalPages || from > to) {
      throw new Error(`Rentang di luar batas: "${part}" (total ${totalPages} halaman)`);
    }
    ranges.push({ from, to });
  }
  return ranges;
}

export async function splitPdfByRanges(
  file: File,
  ranges: SplitRange[],
): Promise<{ blob: Blob; name: string }[]> {
  const baseName = file.name.replace(/\.pdf$/i, "");
  const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
  const out: { blob: Blob; name: string }[] = [];
  for (const r of ranges) {
    const doc = await PDFDocument.create();
    const indices = [];
    for (let i = r.from - 1; i <= r.to - 1; i++) indices.push(i);
    const pages = await doc.copyPages(src, indices);
    pages.forEach((p) => doc.addPage(p));
    const data = await doc.save();
    const suffix = r.from === r.to ? `hal-${r.from}` : `hal-${r.from}-${r.to}`;
    out.push({
      blob: new Blob([data as unknown as ArrayBuffer], { type: "application/pdf" }),
      name: `${baseName}-${suffix}.pdf`,
    });
  }
  return out;
}

export async function splitPdfEachPage(file: File): Promise<{ blob: Blob; name: string }[]> {
  const baseName = file.name.replace(/\.pdf$/i, "");
  const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
  const total = src.getPageCount();
  const out: { blob: Blob; name: string }[] = [];
  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [p] = await doc.copyPages(src, [i]);
    doc.addPage(p);
    const data = await doc.save();
    out.push({
      blob: new Blob([data as unknown as ArrayBuffer], { type: "application/pdf" }),
      name: `${baseName}-hal-${String(i + 1).padStart(3, "0")}.pdf`,
    });
  }
  return out;
}

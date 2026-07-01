import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { renderPdfPages, getPdfPageCount, type ImgFormat } from "@/lib/tools/pdfToImage";
import { downloadAsZip, downloadBlob } from "@/lib/downloadHelpers";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "pdf-to-image")!;

export const Route = createFileRoute("/pdf-to-image")({
  head: () => ({
    meta: [
      { title: "PDF ke Gambar — Tukar.in" },
      { name: "description", content: "Konversi setiap halaman PDF menjadi JPG atau PNG resolusi tinggi." },
      { property: "og:title", content: "PDF ke Gambar — Tukar.in" },
      { property: "og:description", content: "Ubah PDF menjadi gambar JPG/PNG dengan satu klik." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number>(0);
  const [pageInput, setPageInput] = useState("");
  const [format, setFormat] = useState<ImgFormat>("image/jpeg");
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<{ blob: Blob; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setResults(null);
    try {
      const n = await getPdfPageCount(f);
      setPages(n);
      setPageInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF tidak dapat dibaca.");
      setFile(null);
    }
  }

  function parsePages(): number[] | undefined {
    const s = pageInput.trim();
    if (!s) return undefined;
    const out = new Set<number>();
    for (const part of s.split(",").map((x) => x.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw new Error(`Format halaman tidak valid: "${part}"`);
      const a = parseInt(m[1]!, 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      for (let i = a; i <= b; i++) {
        if (i < 1 || i > pages) throw new Error(`Halaman ${i} di luar batas (1-${pages}).`);
        out.add(i);
      }
    }
    return Array.from(out).sort((a, b) => a - b);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: 0 });
    try {
      const selected = parsePages();
      const out = await renderPdfPages(
        file,
        { format, scale, pages: selected },
        (d, t) => setProgress({ done: d, total: t }),
      );
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengonversi PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResults(null);
    setError(null);
    setPages(0);
  }

  function downloadAll() {
    if (!results) return;
    if (results.length === 1) downloadBlob(results[0]!.blob, results[0]!.name);
    else downloadAsZip(results, `${file!.name.replace(/\.pdf$/i, "")}-gambar.zip`);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && !results && (
        <FileDropzone
          onFiles={onPick}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Letakkan PDF di sini"
          hint="Satu file PDF — semua halaman atau pilih halaman tertentu"
        />
      )}

      {file && !results && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="font-medium">{file.name}</div>
            <div className="text-muted-foreground">{pages} halaman</div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-3">
            <Field label="Format">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ImgFormat)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </Field>
            <Field label={`Resolusi (${scale.toFixed(1)}x)`}>
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full"
              />
            </Field>
            <Field label="Halaman (opsional)">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder="contoh: 1-3, 5"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {busy && progress.total > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Merender halaman {progress.done} / {progress.total}…
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses…
                </>
              ) : (
                "Konversi ke gambar"
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={reset} disabled={busy}>
              Reset
            </Button>
          </div>
        </div>
      )}

      {results && (
        <ResultPanel
          totalSize={results.reduce((s, r) => s + r.blob.size, 0)}
          description={`${results.length} gambar siap diunduh${results.length > 1 ? " (ZIP)" : ""}.`}
          onDownload={downloadAll}
          onReset={reset}
          downloadLabel={results.length > 1 ? "Unduh ZIP" : "Unduh gambar"}
        />
      )}
    </ToolPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

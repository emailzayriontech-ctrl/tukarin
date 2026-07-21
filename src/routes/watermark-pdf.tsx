import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { watermarkPdf } from "@/lib/tools/watermarkPdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "watermark-pdf")!;

export const Route = createFileRoute("/watermark-pdf")({
  head: () => ({
    meta: [
      { title: "Watermark PDF — Tukar.in" },
      { name: "description", content: "Tambahkan stempel / teks watermark kustom ke atas dokumen PDF kamu." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("RAHASIA");
  const [opacity, setOpacity] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: File[]) {
    if (files.length > 0) {
      setFile(files[0]!);
      setResult(null);
      setError(null);
    }
  }

  async function run() {
    if (!file || !watermarkText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await watermarkPdf(file, watermarkText.trim(), opacity);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambahkan watermark.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && (
        <FileDropzone
          onFiles={handleFiles}
          accept={{ "application/pdf": [".pdf"] }}
          label="Letakkan file PDF di sini"
          hint="Pilih 1 file PDF yang ingin diberi watermark"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                Ganti file
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Teks Watermark
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Contoh: RAHASIA / DRAFT / CONFIDENTIAL"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Transparansi ({Math.round(opacity * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy || !watermarkText.trim()} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membubuhi Watermark…
                </>
              ) : (
                "Tambah Watermark"
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={reset} disabled={busy}>
              Reset
            </Button>
          </div>
        </div>
      )}

      {result && file && (
        <ResultPanel
          originalSize={file.size}
          totalSize={result.size}
          description="Watermark berhasil ditambahkan ke PDF!"
          onDownload={() => downloadBlob(result, `watermarked-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF"
        />
      )}
    </ToolPageShell>
  );
}

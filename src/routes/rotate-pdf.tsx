import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { rotatePdf } from "@/lib/tools/rotatePdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, RotateCw, RotateCcw } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "rotate-pdf")!;

export const Route = createFileRoute("/rotate-pdf")({
  head: () => ({
    meta: [
      { title: "Putar PDF — Tukar.in" },
      { name: "description", content: "Putar orientasi halaman file PDF 90°, 180°, atau 270° langsung di browser." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState(90);
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
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await rotatePdf(file, angle);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memutar PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setAngle(90);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && (
        <FileDropzone
          onFiles={handleFiles}
          accept={{ "application/pdf": [".pdf"] }}
          label="Letakkan file PDF di sini"
          hint="Pilih 1 file PDF yang ingin diputar"
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

            <div className="mt-6">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Pilih Sudut Putaran
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={angle === 90 ? "default" : "outline"}
                  onClick={() => setAngle(90)}
                  className="flex items-center gap-2"
                >
                  <RotateCw className="h-4 w-4" /> 90° Searah Jarum Jam
                </Button>
                <Button
                  type="button"
                  variant={angle === 180 ? "default" : "outline"}
                  onClick={() => setAngle(180)}
                  className="flex items-center gap-2"
                >
                  <RotateCw className="h-4 w-4" /> 180° Terbalik
                </Button>
                <Button
                  type="button"
                  variant={angle === 270 ? "default" : "outline"}
                  onClick={() => setAngle(270)}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" /> 270° Berlawanan Jam
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memutar PDF…
                </>
              ) : (
                "Putar PDF"
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
          description="Halaman PDF berhasil diputar!"
          onDownload={() => downloadBlob(result, `rotated-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF"
        />
      )}
    </ToolPageShell>
  );
}

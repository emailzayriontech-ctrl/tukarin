import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { addPageNumbersToPdf, type PageNumberPosition } from "@/lib/tools/pageNumbersPdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, Hash } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "page-numbers-pdf")!;

export const Route = createFileRoute("/page-numbers-pdf")({
  head: () => ({
    meta: [
      { title: "Tambah Nomor Halaman PDF — Tukar.in" },
      { name: "description", content: "Bubuhi nomor halaman otomatis pada PDF dengan posisi dan format posisi pilihan." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"Halaman X dari Y" | "X / Y" | "Hal X" | "X">("Halaman X dari Y");
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
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
      const res = await addPageNumbersToPdf(file, { format, position });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambahkan nomor halaman.");
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
          hint="Pilih 1 file PDF yang ingin diberi nomor halaman"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                Ganti file
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/50">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" /> Format Penomoran
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Halaman X dari Y">Halaman 1 dari 10</option>
                  <option value="X / Y">1 / 10</option>
                  <option value="Hal X">Hal 1</option>
                  <option value="X">1</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Posisi Nomor</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="bottom-center">Bawah - Tengah</option>
                  <option value="bottom-right">Bawah - Kanan</option>
                  <option value="bottom-left">Bawah - Kiri</option>
                  <option value="top-right">Atas - Kanan</option>
                  <option value="top-center">Atas - Tengah</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-44">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menambahkan Nomor...
                </>
              ) : (
                "Bubuhi Nomor Halaman"
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
          description="Nomor halaman berhasil ditambahkan ke dokumen PDF!"
          onDownload={() => downloadBlob(result, `numbered-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF Berpenomoran"
        />
      )}
    </ToolPageShell>
  );
}

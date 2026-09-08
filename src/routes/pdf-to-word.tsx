import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { convertPdfToWord } from "@/lib/tools/pdfToWord";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "pdf-to-word")!;

export const Route = createFileRoute("/pdf-to-word")({
  head: () => ({
    meta: [
      { title: "Konversi PDF ke Word — Tukar.in" },
      { name: "description", content: "Ubah file PDF menjadi dokumen Word (.doc) yang bisa diedit langsung secara gratis dan privat." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"visual" | "text">("visual");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: File[]) {
    if (files.length > 0) {
      setFile(files[0]!);
      setResult(null);
      setError(null);
      setProgress({ done: 0, total: 0 });
    }
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await convertPdfToWord(
        file,
        (done, total) => {
          setProgress({ done, total });
        },
        mode
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengonversi PDF ke Word.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && (
        <FileDropzone
          onFiles={handleFiles}
          accept={{ "application/pdf": [".pdf"] }}
          label="Letakkan file PDF di sini"
          hint="Pilih 1 file PDF untuk dikonversi menjadi dokumen Word (.doc)"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                Ganti file
              </Button>
            </div>

            <div className="pt-3 border-t border-border/50 space-y-2">
              <label className="text-sm font-semibold">Mode Hasil Konversi Word:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "visual" | "text")}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium"
              >
                <option value="visual">
                  ✨ Presisi Visual 1:1 (Menjaga Banner Hijau, Warna, Tabel & Grafik Sesuai PDF Asli)
                </option>
                <option value="text">
                  📝 Ekstraksi Teks (Hanya Teks Polos tanpa Warna/Tabel)
                </option>
              </select>
            </div>
            
            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
              💡 <strong>Rekomendasi:</strong> Gunakan mode <strong>Presisi Visual 1:1</strong> untuk menjaga banner header hijau, tabel, warna latar, logo, dan tata letak PDF agar 100% identik di Microsoft Word.
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  {progress.total > 0 
                    ? `Mengonversi (${progress.done}/${progress.total})…` 
                    : "Memproses..."}
                </>
              ) : (
                "Konversi ke Word"
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
          description="Konversi PDF ke dokumen Word selesai!"
          onDownload={() => {
            const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            downloadBlob(result, `${baseName}.doc`);
          }}
          onReset={reset}
          downloadLabel="Unduh File Word"
        />
      )}
    </ToolPageShell>
  );
}

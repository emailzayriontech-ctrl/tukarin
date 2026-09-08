import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { extractPdfPages } from "@/lib/tools/extractPagesPdf";
import { getPdfPageCount } from "@/lib/tools/pdfToImage";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, FileDigit } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "extract-pages")!;

export const Route = createFileRoute("/extract-pages")({
  head: () => ({
    meta: [
      { title: "Ekstrak Halaman PDF — Tukar.in" },
      { name: "description", content: "Pilih halaman-halaman tertentu dari dokumen PDF untuk diekstrak menjadi PDF baru." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    if (files.length > 0) {
      const f = files[0]!;
      setFile(f);
      setResult(null);
      setError(null);
      setLoadingCount(true);
      try {
        const count = await getPdfPageCount(f);
        setTotalPages(count);
        setSelectedPages(Array.from({ length: count }, (_, i) => i));
      } catch (e) {
        setError("Gagal membaca jumlah halaman PDF.");
      } finally {
        setLoadingCount(false);
      }
    }
  }

  function togglePage(pIdx: number) {
    if (selectedPages.includes(pIdx)) {
      setSelectedPages(selectedPages.filter((i) => i !== pIdx));
    } else {
      setSelectedPages([...selectedPages, pIdx].sort((a, b) => a - b));
    }
  }

  async function run() {
    if (!file || !selectedPages.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await extractPdfPages(file, selectedPages);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengekstrak halaman PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setTotalPages(0);
    setSelectedPages([]);
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
          hint="Pilih 1 file PDF yang halamannya ingin diekstrak"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.size)} • {totalPages} Halaman</div>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                Ganti file
              </Button>
            </div>

            {loadingCount ? (
              <div className="py-8 flex justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membaca dokumen...
              </div>
            ) : (
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <FileDigit className="h-4 w-4 text-primary" /> Pilih Halaman untuk Diekstrak ({selectedPages.length} Dipilih)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i))}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPages([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {Array.from({ length: totalPages }, (_, i) => {
                    const isSelected = selectedPages.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => togglePage(i)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                            : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        Hal {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy || loadingCount || !selectedPages.length} className="min-w-44">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengekstrak Halaman...
                </>
              ) : (
                "Ekstrak Halaman Pilihan"
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
          description="Halaman pilihan berhasil diekstrak menjadi PDF baru!"
          onDownload={() => downloadBlob(result, `extracted-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF Ekstraksi"
        />
      )}
    </ToolPageShell>
  );
}

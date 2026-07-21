import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { reorderOrDeletePdfPages } from "@/lib/tools/organizePdf";
import { getPdfPageCount } from "@/lib/tools/pdfToImage";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, Trash2, ArrowLeft, ArrowRight } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "organize-pdf")!;

export const Route = createFileRoute("/organize-pdf")({
  head: () => ({
    meta: [
      { title: "Susun & Hapus Halaman PDF — Tukar.in" },
      { name: "description", content: "Hapus halaman yang tidak terpakai atau atur ulang urutan halaman PDF kamu." },
    ],
  }),
  component: Page,
});

type PageItem = { pageIndex: number; pageNumber: number };

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    if (files.length > 0) {
      const f = files[0]!;
      setFile(f);
      setResult(null);
      setError(null);
      setLoadingPages(true);

      try {
        const count = await getPdfPageCount(f);
        const list: PageItem[] = Array.from({ length: count }, (_, i) => ({
          pageIndex: i,
          pageNumber: i + 1,
        }));
        setPages(list);
      } catch (e) {
        setError("Gagal membaca halaman PDF.");
      } finally {
        setLoadingPages(false);
      }
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    const temp = next[index]!;
    next[index] = next[target]!;
    next[target] = temp;
    setPages(next);
  }

  function removePage(index: number) {
    setPages((p) => p.filter((_, i) => i !== index));
  }

  async function run() {
    if (!file || !pages.length) return;
    setBusy(true);
    setError(null);
    try {
      const keptIndexes = pages.map((p) => p.pageIndex);
      const res = await reorderOrDeletePdfPages(file, keptIndexes);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengurutkan PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPages([]);
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
          hint="Pilih 1 file PDF yang ingin diatur/dihapus halamannya"
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

            {loadingPages ? (
              <div className="my-8 flex justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membaca halaman PDF...
              </div>
            ) : (
              <div className="mt-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Daftar Halaman ({pages.length} Halaman Tersisa)
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {pages.map((p, idx) => (
                    <div
                      key={`${p.pageIndex}-${idx}`}
                      className="relative flex flex-col items-center justify-between rounded-xl border border-border bg-background p-3 shadow-sm"
                    >
                      <div className="flex h-16 w-full items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                        Hal {p.pageNumber}
                      </div>

                      <div className="mt-3 flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={idx === 0}
                          onClick={() => move(idx, -1)}
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removePage(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={idx === pages.length - 1}
                          onClick={() => move(idx, 1)}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button
              size="lg"
              onClick={run}
              disabled={busy || loadingPages || !pages.length}
              className="min-w-40"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses PDF…
                </>
              ) : (
                "Simpan PDF Baru"
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
          description="Halaman PDF berhasil disusun ulang!"
          onDownload={() => downloadBlob(result, `organized-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF"
        />
      )}
    </ToolPageShell>
  );
}

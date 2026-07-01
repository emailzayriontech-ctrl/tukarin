import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { getPdfPageCount } from "@/lib/tools/pdfToImage";
import { parseRanges, splitPdfByRanges, splitPdfEachPage } from "@/lib/tools/splitPdf";
import { downloadAsZip, downloadBlob } from "@/lib/downloadHelpers";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "split-pdf")!;

export const Route = createFileRoute("/split-pdf")({
  head: () => ({
    meta: [
      { title: "Pisah PDF — Tukar.in" },
      { name: "description", content: "Pisah PDF berdasarkan rentang halaman atau ekstrak tiap halaman jadi file sendiri." },
      { property: "og:title", content: "Pisah PDF — Tukar.in" },
      { property: "og:description", content: "Split PDF dengan rentang custom atau per-halaman." },
    ],
  }),
  component: Page,
});

type Mode = "ranges" | "each";

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [mode, setMode] = useState<Mode>("ranges");
  const [rangeInput, setRangeInput] = useState("");
  const [busy, setBusy] = useState(false);
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
      setRangeInput(`1-${n}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF tidak dapat dibaca.");
      setFile(null);
    }
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const out =
        mode === "each"
          ? await splitPdfEachPage(file)
          : await splitPdfByRanges(file, parseRanges(rangeInput, pages));
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memisah PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPages(0);
    setResults(null);
    setError(null);
  }

  function downloadAll() {
    if (!results) return;
    if (results.length === 1) downloadBlob(results[0]!.blob, results[0]!.name);
    else downloadAsZip(results, `${file!.name.replace(/\.pdf$/i, "")}-pisah.zip`);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && !results && (
        <FileDropzone
          onFiles={onPick}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Letakkan PDF di sini"
          hint="Satu file PDF"
        />
      )}

      {file && !results && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="font-medium">{file.name}</div>
            <div className="text-muted-foreground">{pages} halaman</div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-2 gap-2">
              <ModeButton active={mode === "ranges"} onClick={() => setMode("ranges")}>
                Berdasarkan rentang
              </ModeButton>
              <ModeButton active={mode === "each"} onClick={() => setMode("each")}>
                Setiap halaman jadi file
              </ModeButton>
            </div>

            {mode === "ranges" && (
              <label className="block">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rentang halaman
                </div>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="contoh: 1-3, 5, 7-10"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Setiap rentang akan dijadikan satu file PDF terpisah.
                </p>
              </label>
            )}

            {mode === "each" && (
              <p className="text-sm text-muted-foreground">
                Akan menghasilkan {pages} file PDF, masing-masing berisi satu halaman.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses…
                </>
              ) : (
                "Pisah PDF"
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
          description={`${results.length} file PDF dihasilkan${results.length > 1 ? " (ZIP)" : ""}.`}
          onDownload={downloadAll}
          onReset={reset}
          downloadLabel={results.length > 1 ? "Unduh ZIP" : "Unduh PDF"}
        />
      )}
    </ToolPageShell>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

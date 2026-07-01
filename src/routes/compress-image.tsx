import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { compressImageFile } from "@/lib/tools/compressImage";
import { downloadAsZip, downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "compress-image")!;

export const Route = createFileRoute("/compress-image")({
  head: () => ({
    meta: [
      { title: "Kompres Gambar — Tukar.in" },
      { name: "description", content: "Perkecil ukuran JPG, PNG, atau WebP dengan kontrol kualitas dan dimensi maksimum." },
      { property: "og:title", content: "Kompres Gambar — Tukar.in" },
      { property: "og:description", content: "Kompres gambar di browser dengan preview before/after." },
    ],
  }),
  component: Page,
});

type Row = { id: string; file: File; previewUrl: string; result?: File; resultUrl?: string };

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [quality, setQuality] = useState(0.7);
  const [maxDim, setMaxDim] = useState(2000);
  const [useTarget, setUseTarget] = useState(false);
  const [targetMB, setTargetMB] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      rows.forEach((r) => {
        URL.revokeObjectURL(r.previewUrl);
        if (r.resultUrl) URL.revokeObjectURL(r.resultUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(files: File[]) {
    const accepted = files.filter((f) => /^image\/(png|jpe?g|webp)$/i.test(f.type));
    const next: Row[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setRows((p) => [...p, ...next]);
    setDone(false);
    setError(null);
  }

  function remove(id: string) {
    setRows((p) => {
      const t = p.find((x) => x.id === id);
      if (t) {
        URL.revokeObjectURL(t.previewUrl);
        if (t.resultUrl) URL.revokeObjectURL(t.resultUrl);
      }
      return p.filter((x) => x.id !== id);
    });
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const updated: Row[] = [];
      for (const r of rows) {
        const result = await compressImageFile(r.file, {
          quality,
          maxDimension: maxDim,
          targetMB: useTarget ? targetMB : undefined,
        });
        if (r.resultUrl) URL.revokeObjectURL(r.resultUrl);
        updated.push({ ...r, result, resultUrl: URL.createObjectURL(result) });
      }
      setRows(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengompres gambar.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    rows.forEach((r) => {
      URL.revokeObjectURL(r.previewUrl);
      if (r.resultUrl) URL.revokeObjectURL(r.resultUrl);
    });
    setRows([]);
    setDone(false);
    setError(null);
  }

  function downloadAll() {
    const files = rows
      .filter((r) => r.result)
      .map((r) => ({ blob: r.result!, name: r.result!.name || r.file.name }));
    if (files.length === 1) downloadBlob(files[0]!.blob, files[0]!.name);
    else downloadAsZip(files, "tukar-in-kompres.zip");
  }

  const origTotal = rows.reduce((s, r) => s + r.file.size, 0);
  const compTotal = rows.reduce((s, r) => s + (r.result?.size ?? 0), 0);

  return (
    <ToolPageShell tool={TOOL}>
      {!rows.length && (
        <FileDropzone
          onFiles={add}
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
          label="Letakkan gambar di sini"
          hint="JPG, PNG, WebP — multi-file"
        />
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">{rows.length} gambar siap dikompres</div>

          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
            <Field label={`Kualitas (${Math.round(quality * 100)}%)`}>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full"
              />
            </Field>
            <Field label={`Dimensi maks (${maxDim}px)`}>
              <input
                type="range"
                min={500}
                max={4000}
                step={100}
                value={maxDim}
                onChange={(e) => setMaxDim(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={useTarget}
                onChange={(e) => setUseTarget(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Batasi ukuran hasil (MB)
            </label>
            {useTarget && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={0.05}
                  step={0.1}
                  value={targetMB}
                  onChange={(e) => setTargetMB(Math.max(0.05, parseFloat(e.target.value) || 0.05))}
                  className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="text-sm text-muted-foreground">MB per gambar</span>
              </div>
            )}
            {useTarget && (
              <p className="mt-2 text-xs text-muted-foreground">
                Kualitas akan diturunkan otomatis sampai ukuran tiap gambar di bawah batas ini.
              </p>
            )}
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <img
                  src={r.previewUrl}
                  alt=""
                  className="h-12 w-12 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.file.name}</div>
                  <div className="text-xs text-muted-foreground">{formatBytes(r.file.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  Hapus
                </button>
              </div>
            ))}
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengompres…
                </>
              ) : (
                "Kompres gambar"
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={reset} disabled={busy}>
              Reset
            </Button>
          </div>
        </div>
      )}

      {done && (
        <div className="space-y-6">
          <ResultPanel
            originalSize={origTotal}
            totalSize={compTotal}
            description={`${rows.length} gambar berhasil dikompres.`}
            onDownload={downloadAll}
            onReset={reset}
            downloadLabel={rows.length > 1 ? "Unduh ZIP" : "Unduh gambar"}
          />

          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <img src={r.resultUrl ?? r.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="line-through">{formatBytes(r.file.size)}</span>
                    {" → "}
                    <span className="font-medium text-[color:var(--color-cat-optimize)]">
                      {formatBytes(r.result?.size ?? 0)}
                    </span>
                    {r.result && (
                      <span className="ml-2 text-muted-foreground">
                        (−{Math.max(0, Math.round((1 - r.result.size / r.file.size) * 100))}%)
                      </span>
                    )}
                  </div>
                </div>
                {r.result && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadBlob(r.result!, r.result!.name || r.file.name)}
                  >
                    Unduh
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
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

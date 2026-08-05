import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { upscaleImageFile } from "@/lib/tools/upscaleImage";
import { downloadAsZip, downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "upscale-image")!;

export const Route = createFileRoute("/upscale-image")({
  head: () => ({
    meta: [
      { title: "Perbesar Resolusi Gambar (Upscale) — Tukar.in" },
      { name: "description", content: "Tingkatkan resolusi gambar buram Anda menjadi tajam dan berkualitas HD / 4K secara instan." },
    ],
  }),
  component: Page,
});

type Row = {
  id: string;
  file: File;
  previewUrl: string;
  resultBlob?: Blob;
  resultName?: string;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [scale, setScale] = useState<number>(2);
  const [sharpen, setSharpen] = useState<number>(0.2); // 0 to 1
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(files: File[]) {
    const accepted = files.filter((f) => /^image\/(png|jpe?g|webp|gif)$/i.test(f.type));
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
      if (t) URL.revokeObjectURL(t.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const updated: Row[] = [];
      for (const r of rows) {
        const blob = await upscaleImageFile(r.file, scale, sharpen);
        
        const baseName = r.file.name.substring(0, r.file.name.lastIndexOf(".")) || r.file.name;
        const ext = r.file.name.substring(r.file.name.lastIndexOf(".") + 1) || "png";
        const suffix = scale === 4 ? "4K" : "HD";
        const resultName = `${baseName}-${suffix}.${ext}`;
        
        updated.push({ ...r, resultBlob: blob, resultName });
      }
      setRows(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbesar resolusi gambar.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setRows([]);
    setDone(false);
    setError(null);
  }

  function downloadAll() {
    const files = rows
      .filter((r) => r.resultBlob)
      .map((r) => ({ blob: r.resultBlob!, name: r.resultName! }));
    if (files.length === 1) downloadBlob(files[0]!.blob, files[0]!.name);
    else downloadAsZip(files, "tukar-in-upscale-gambar.zip");
  }

  const origTotal = rows.reduce((s, r) => s + r.file.size, 0);
  const compTotal = rows.reduce((s, r) => s + (r.resultBlob?.size ?? 0), 0);

  return (
    <ToolPageShell tool={TOOL}>
      {!rows.length && (
        <FileDropzone
          onFiles={add}
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
          label="Letakkan gambar buram di sini"
          hint="JPG, PNG, WebP — Mendukung banyak file"
        />
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-6">
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Perbesaran Resolusi (Skala)
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scale === 2 ? "default" : "outline"}
                  onClick={() => setScale(2)}
                  className="flex-1"
                >
                  2x Lipat (HD)
                </Button>
                <Button
                  type="button"
                  variant={scale === 4 ? "default" : "outline"}
                  onClick={() => setScale(4)}
                  className="flex-1"
                >
                  4x Lipat (4K)
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tingkat Penajaman (Sharpen): {Math.round(sharpen * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.05}
                value={sharpen}
                onChange={(e) => setSharpen(parseFloat(e.target.value))}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <img src={r.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
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

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memperbesar Resolusi…
                </>
              ) : (
                "Perbesar Resolusi"
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
            description={`${rows.length} gambar berhasil diperbesar.`}
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
                <img src={r.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.resultName}</div>
                  <div className="text-xs text-muted-foreground">
                    <span>Asli: {formatBytes(r.file.size)}</span>
                    {" → "}
                    <span className="font-medium text-primary">
                      Hasil: {formatBytes(r.resultBlob?.size ?? 0)}
                    </span>
                  </div>
                </div>
                {r.resultBlob && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadBlob(r.resultBlob!, r.resultName!)}
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

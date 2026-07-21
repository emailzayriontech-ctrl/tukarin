import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { convertImageFile, type TargetFormat } from "@/lib/tools/convertImage";
import { downloadAsZip, downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "convert-image")!;

export const Route = createFileRoute("/convert-image")({
  head: () => ({
    meta: [
      { title: "Konversi Gambar — Tukar.in" },
      { name: "description", content: "Ubah format gambar antara JPG, PNG, dan WebP secara instan di browser." },
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
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("image/jpeg");
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
        const { blob, filename } = await convertImageFile(r.file, targetFormat);
        updated.push({ ...r, resultBlob: blob, resultName: filename });
      }
      setRows(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengonversi gambar.");
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
    else downloadAsZip(files, "tukar-in-konversi-gambar.zip");
  }

  const origTotal = rows.reduce((s, r) => s + r.file.size, 0);
  const compTotal = rows.reduce((s, r) => s + (r.resultBlob?.size ?? 0), 0);

  return (
    <ToolPageShell tool={TOOL}>
      {!rows.length && (
        <FileDropzone
          onFiles={add}
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] }}
          label="Letakkan gambar di sini"
          hint="JPG, PNG, WebP, GIF — multi-file"
        />
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Konversi Ke Format
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={targetFormat === "image/jpeg" ? "default" : "outline"}
                onClick={() => setTargetFormat("image/jpeg")}
              >
                JPG (.jpg)
              </Button>
              <Button
                type="button"
                variant={targetFormat === "image/png" ? "default" : "outline"}
                onClick={() => setTargetFormat("image/png")}
              >
                PNG (.png)
              </Button>
              <Button
                type="button"
                variant={targetFormat === "image/webp" ? "default" : "outline"}
                onClick={() => setTargetFormat("image/webp")}
              >
                WebP (.webp)
              </Button>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengonversi…
                </>
              ) : (
                "Konversi Gambar"
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
            description={`${rows.length} gambar berhasil dikonversi.`}
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
                    <span className="line-through">{formatBytes(r.file.size)}</span>
                    {" → "}
                    <span className="font-medium text-primary">
                      {formatBytes(r.resultBlob?.size ?? 0)}
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

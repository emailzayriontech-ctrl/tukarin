import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { convertHeicFile } from "@/lib/tools/heicConverter";
import { downloadAsZip, downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "heic-to-jpg")!;

export const Route = createFileRoute("/heic-to-jpg")({
  head: () => ({
    meta: [
      { title: "Konversi HEIC ke JPG — Tukar.in" },
      { name: "description", content: "Ubah foto Apple HEIC / HEIF menjadi JPG atau PNG secara instan dan privat di browser." },
    ],
  }),
  component: Page,
});

type Row = {
  id: string;
  file: File;
  resultBlob?: Blob;
  resultName?: string;
  error?: string;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [toType, setToType] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add(files: File[]) {
    // Strictly filter based on file extension, ignoring what the browser MIME type says
    const accepted = files.filter((f) => 
      /\.(heic|heif)$/i.test(f.name)
    );

    if (accepted.length === 0) {
      setError("Silakan pilih berkas foto dengan format .heic atau .heif.");
      return;
    }

    const next: Row[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
    }));
    setRows((p) => [...p, ...next]);
    setDone(false);
    setError(null);
  }

  function remove(id: string) {
    setRows((p) => p.filter((x) => x.id !== id));
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const updated: Row[] = [];
      for (const r of rows) {
        try {
          const blob = await convertHeicFile(r.file, toType);
          const baseName = r.file.name.substring(0, r.file.name.lastIndexOf(".")) || r.file.name;
          const ext = toType === "image/png" ? "png" : "jpg";
          updated.push({
            ...r,
            resultBlob: blob,
            resultName: `${baseName}.${ext}`,
          });
        } catch (e) {
          updated.push({
            ...r,
            error: e instanceof Error ? e.message : "Gagal mengonversi file ini.",
          });
        }
      }
      setRows(updated);
      setDone(true);
    } catch (e) {
      setError("Gagal memproses konversi HEIC.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setRows([]);
    setDone(false);
    setError(null);
  }

  function downloadAll() {
    const files = rows
      .filter((r) => r.resultBlob)
      .map((r) => ({ blob: r.resultBlob!, name: r.resultName! }));
    if (files.length === 1) downloadBlob(files[0]!.blob, files[0]!.name);
    else downloadAsZip(files, "tukar-in-heic-konversi.zip");
  }

  const origTotal = rows.reduce((s, r) => s + r.file.size, 0);
  const compTotal = rows.reduce((s, r) => s + (r.resultBlob?.size ?? 0), 0);

  return (
    <ToolPageShell tool={TOOL}>
      {!rows.length && (
        <FileDropzone
          onFiles={add}
          accept={{
            "image/*": [".heic", ".heif", ".HEIC", ".HEIF"],
            "video/*": [".heic", ".heif", ".HEIC", ".HEIF"],
            "application/octet-stream": [".heic", ".heif", ".HEIC", ".HEIF"]
          }}
          label="Letakkan file HEIC / HEIF di sini"
          hint="Mendukung konversi sekaligus banyak file (.heic, .heif)"
        />
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Konversi Ke Format
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={toType === "image/jpeg" ? "default" : "outline"}
                onClick={() => setToType("image/jpeg")}
                className="flex-1"
              >
                JPEG (.jpg)
              </Button>
              <Button
                type="button"
                variant={toType === "image/png" ? "default" : "outline"}
                onClick={() => setToType("image/png")}
                className="flex-1"
              >
                PNG (.png)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengonversi HEIC…
                </>
              ) : (
                "Konversi HEIC"
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
            description={`${rows.filter((r) => r.resultBlob).length} gambar berhasil dikonversi.`}
            onDownload={downloadAll}
            onReset={reset}
            downloadLabel={rows.length > 1 ? "Unduh ZIP" : "Unduh hasil"}
          />

          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.resultName || r.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.error ? (
                      <span className="text-destructive font-medium">{r.error}</span>
                    ) : (
                      <>
                        <span>Asli: {formatBytes(r.file.size)}</span>
                        {" → "}
                        <span className="font-medium text-primary">
                          Hasil: {formatBytes(r.resultBlob?.size ?? 0)}
                        </span>
                      </>
                    )}
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

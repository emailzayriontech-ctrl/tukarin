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
import { Loader2, ShieldCheck, Sparkles, SlidersHorizontal } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "convert-image")!;

type SearchParams = {
  format?: "webp" | "jpg" | "png";
};

export const Route = createFileRoute("/convert-image")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      format: search.format === "webp" || search.format === "jpg" || search.format === "png"
        ? (search.format as "webp" | "jpg" | "png")
        : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Konversi & Kompres Gambar ke WebP, JPG, PNG — Tukar.in" },
      {
        name: "description",
        content:
          "Ubah dan kompres banyak gambar ke format WebP, JPG, atau PNG sekaligus per batch tanpa mengubah nama file asli. Cepat dan privat di browser.",
      },
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
  const search = Route.useSearch();
  const initialFormat: TargetFormat =
    search.format === "png"
      ? "image/png"
      : search.format === "jpg"
        ? "image/jpeg"
        : "image/webp";

  const [rows, setRows] = useState<Row[]>([]);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>(initialFormat);
  const [quality, setQuality] = useState<number>(0.8);
  const [maxDim, setMaxDim] = useState<number>(0); // 0 = original
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(files: File[]) {
    const accepted = files.filter((f) => /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name));
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
    setProgress({ current: 0, total: rows.length });
    try {
      const updated: Row[] = [];
      for (let i = 0; i < rows.length; i++) {
        setProgress({ current: i + 1, total: rows.length });
        const r = rows[i];
        const { blob, filename } = await convertImageFile(
          r.file,
          targetFormat,
          quality,
          maxDim > 0 ? maxDim : undefined,
        );
        updated.push({ ...r, resultBlob: blob, resultName: filename });
      }
      setRows(updated);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengonversi gambar.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function reset() {
    rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setRows([]);
    setDone(false);
    setProgress(null);
    setError(null);
  }

  function downloadAll() {
    const files = rows
      .filter((r) => r.resultBlob && r.resultName)
      .map((r) => ({ blob: r.resultBlob!, name: r.resultName! }));
    if (files.length === 1) {
      downloadBlob(files[0]!.blob, files[0]!.name);
    } else {
      const extName = targetFormat === "image/webp" ? "webp" : targetFormat === "image/jpeg" ? "jpg" : "png";
      downloadAsZip(files, `tukar-in-${extName}-batch.zip`);
    }
  }

  const origTotal = rows.reduce((s, r) => s + r.file.size, 0);
  const compTotal = rows.reduce((s, r) => s + (r.resultBlob?.size ?? 0), 0);

  return (
    <ToolPageShell tool={TOOL}>
      {!rows.length && (
        <div className="space-y-4">
          <FileDropzone
            onFiles={add}
            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"] }}
            label="Letakkan banyak gambar di sini untuk kompres & konversi batch"
            hint="Mendukung JPG, PNG, WebP, GIF, AVIF — Pilih puluhan/ratusan gambar sekaligus"
          />

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs sm:text-sm text-foreground space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Jaminan 100% Nama File Asli Dipertahankan:</span>
            </div>
            <p className="text-muted-foreground pl-6">
              Nama asli setiap gambar akan tetap utuh tanpa tambahan awalan/akhiran apa pun (contoh:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">
                produk-sepatu.jpg
              </code>{" "}
              →{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-primary font-mono font-medium">
                produk-sepatu.webp
              </code>
              ). Sangat ideal untuk kebutuhan katalog e-commerce, web development, dan SEO.
            </p>
          </div>
        </div>
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-6">
          {/* FORMAT & COMPRESSION SETTINGS */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Format Target Output
                </label>
                <span className="text-xs font-medium text-primary">
                  {targetFormat === "image/webp" ? "⭐ Paling Hemat & Modern" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTargetFormat("image/webp")}
                  className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                    targetFormat === "image/webp"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border/80 bg-background hover:bg-accent"
                  }`}
                >
                  <div className="font-semibold text-sm">WebP (.webp)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Sangat ringan, hemat hingga 85%, mendukung transparansi.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat("image/jpeg")}
                  className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                    targetFormat === "image/jpeg"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border/80 bg-background hover:bg-accent"
                  }`}
                >
                  <div className="font-semibold text-sm">JPG (.jpg)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Format universal, kompatibel untuk semua software & printer.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFormat("image/png")}
                  className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                    targetFormat === "image/png"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border/80 bg-background hover:bg-accent"
                  }`}
                >
                  <div className="font-semibold text-sm">PNG (.png)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Kualitas lossless dengan transparansi background utuh.
                  </div>
                </button>
              </div>
            </div>

            {/* QUALITY SLIDER FOR WEBP / JPG */}
            {targetFormat !== "image/png" && (
              <div className="border-t border-border/60 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    Kualitas Kompresi:{" "}
                    <span className="text-primary font-bold text-sm">
                      {Math.round(quality * 100)}%
                    </span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuality(0.7)}
                      className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        quality === 0.7
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      70% (Ekstra Hemat)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality(0.8)}
                      className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        quality === 0.8
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      80% (Rekomendasi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuality(0.9)}
                      className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                        quality === 0.9
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      90% (Tajam)
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[11px] text-muted-foreground">
                  {quality >= 0.85
                    ? "Kualitas hampir identik dengan aslinya dengan kompresi sedang (~40-60% pengurangan ukuran)."
                    : quality >= 0.75
                      ? "Standar emas WebP: Hasil sangat tajam di layar dengan penghematan ukuran fantastis (~70-85%)."
                      : "Kompresi agresif: Ukuran file menjadi sangat kecil, sangat cocok untuk toko online berkapasitas besar."}
                </p>
              </div>
            )}

            {/* OPTIONAL MAX DIMENSION */}
            <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resolusi Maksimal (Resize Otomatis)
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Batas dimensi terpanjang tanpa mengubah rasio aspek gambar.
                </div>
              </div>
              <select
                value={maxDim}
                onChange={(e) => setMaxDim(parseInt(e.target.value, 10))}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={0}>Resolusi Asli (Tanpa Resize)</option>
                <option value={1920}>Maks 1920px (Full HD - Standar Web)</option>
                <option value={2560}>Maks 2560px (2K QHD - Layar Tajam)</option>
                <option value={1280}>Maks 1280px (HD - Toko Online / Mobile)</option>
                <option value={800}>Maks 800px (Thumbnail / Blog)</option>
              </select>
            </div>

            {/* NAME PRESERVATION ASSURANCE */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Nama File Asli Dipertahankan:</strong> Setiap file hasil kompresi akan menggunakan nama asli yang sama persis (misal:{" "}
                <span className="font-mono font-medium">nama-foto.{targetFormat === "image/webp" ? "webp" : targetFormat === "image/jpeg" ? "jpg" : "png"}</span>
                ).
              </span>
            </div>
          </div>

          {/* LIST OF UPLOADED IMAGES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Daftar Gambar Siap Diproses ({rows.length} file)
              </span>
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files?.length) add(Array.from(files));
                  };
                  input.click();
                }}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                + Tambah gambar lagi
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
              {rows.map((r, idx) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-2xs"
                >
                  <span className="text-xs text-muted-foreground font-mono w-5 text-center">
                    {idx + 1}
                  </span>
                  <img src={r.previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.file.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{formatBytes(r.file.size)}</span>
                      <span>•</span>
                      <span className="text-primary font-mono text-[11px]">
                        → {r.file.name.substring(0, r.file.name.lastIndexOf(".")) || r.file.name}.
                        {targetFormat === "image/webp" ? "webp" : targetFormat === "image/jpeg" ? "jpg" : "png"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={run}
              disabled={busy}
              className="min-w-56 h-12 text-base font-semibold shadow-md cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {progress
                    ? `Memproses ${progress.current} dari ${progress.total} gambar...`
                    : "Mengonversi…"}
                </>
              ) : (
                `Kompres & Konversi ${rows.length} Gambar`
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Batalkan / Hapus Semua
            </Button>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {done && (
        <div className="space-y-6">
          <ResultPanel
            originalSize={origTotal}
            totalSize={compTotal}
            description={`${rows.length} gambar berhasil dikonversi dan dikompres ke format ${
              targetFormat === "image/webp" ? "WebP" : targetFormat === "image/jpeg" ? "JPG" : "PNG"
            } dengan nama asli tetap sama.`}
            onDownload={downloadAll}
            onReset={reset}
            downloadLabel={
              rows.length > 1
                ? `Unduh Semua ZIP (${rows.length} file)`
                : `Unduh ${rows[0]?.resultName || "Gambar"}`
            }
          />

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-center justify-between text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Seluruh file di dalam unduhan mempertahankan nama gambar aslinya.</span>
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Hemat{" "}
              {origTotal > 0
                ? Math.round(((origTotal - compTotal) / origTotal) * 100)
                : 0}
              %
            </span>
          </div>

          <div className="space-y-2">
            <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rincian Hasil Tiap Gambar ({rows.length})
            </div>
            <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
              {rows.map((r, idx) => {
                const saving =
                  r.resultBlob && r.file.size > 0
                    ? Math.round(((r.file.size - r.resultBlob.size) / r.file.size) * 100)
                    : 0;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs"
                  >
                    <span className="text-xs text-muted-foreground font-mono w-5 text-center">
                      {idx + 1}
                    </span>
                    <img src={r.previewUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {r.resultName}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="line-through">{formatBytes(r.file.size)}</span>
                        <span>→</span>
                        <span className="font-bold text-primary">
                          {formatBytes(r.resultBlob?.size ?? 0)}
                        </span>
                        {saving > 0 && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            -{saving}%
                          </span>
                        )}
                      </div>
                    </div>
                    {r.resultBlob && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadBlob(r.resultBlob!, r.resultName!)}
                        className="cursor-pointer"
                      >
                        Unduh
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import {
  compressVideoFile,
  type VideoCompressPreset,
} from "@/lib/tools/compressVideo";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import {
  Loader2,
  AlertCircle,
  Video,
  Clock,
  Zap,
  Sparkles,
  ShieldCheck,
  Film,
  Sliders,
  Play,
  RotateCcw,
} from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "compress-video")!;

export const Route = createFileRoute("/compress-video")({
  head: () => ({
    meta: [
      { title: "Kompres Video (MP4, WebM, MOV) — Perkecil Ukuran Video | Tukar.in" },
      {
        name: "description",
        content:
          "Perkecil ukuran video secara gratis dan privat langsung di browser tanpa upload ke server. Pilihan kompresi 1080p, 720p, 480p, kontrol bitrate, dan tanpa watermark.",
      },
    ],
  }),
  component: Page,
});

type VideoMeta = {
  width: number;
  height: number;
  duration: number;
  previewUrl: string;
};

const PRESETS: {
  id: VideoCompressPreset;
  title: string;
  badge?: string;
  badgeColor?: string;
  desc: string;
  resLabel: string;
  estSaving: string;
}[] = [
  {
    id: "medium",
    title: "Seimbang (Rekomendasi)",
    badge: "Paling Populer",
    badgeColor: "bg-primary/15 text-primary border-primary/30",
    desc: "Kualitas gambar tetap jernih dan tajam, ukuran menyusut drastis.",
    resLabel: "Maks. 720p HD",
    estSaving: "~50% - 65%",
  },
  {
    id: "high",
    title: "Kompresi Ekstrem (Ukuran Sangat Kecil)",
    badge: "Hemat Maksimal",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    desc: "Ukuran file turun drastis untuk menghemat kuota & mudah dikirim via chat/email.",
    resLabel: "Maks. 480p SD",
    estSaving: "~70% - 85%",
  },
  {
    id: "low",
    title: "Kualitas Tinggi (Ringan)",
    desc: "Menjaga ketajaman visual mendekati aslinya dengan kompresi bitrate moderat.",
    resLabel: "Maks. 1080p Full HD",
    estSaving: "~25% - 40%",
  },
  {
    id: "custom",
    title: "Pengaturan Kustom",
    desc: "Sesuaikan sendiri resolusi maksimum, target bitrate, atau batas ukuran MB.",
    resLabel: "Sesuai Pilihan",
    estSaving: "Fleksibel",
  },
];

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [preset, setPreset] = useState<VideoCompressPreset>("medium");
  const [customRes, setCustomRes] = useState<number>(1280);
  const [customBitrate, setCustomBitrate] = useState<number>(1500);
  const [useTarget, setUseTarget] = useState(false);
  const [targetMB, setTargetMB] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    percent: number;
    currentTime: number;
    duration: number;
    elapsedSec: number;
    etaSec: number | null;
  } | null>(null);
  const [result, setResult] = useState<{
    blob: Blob;
    filename: string;
    url: string;
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortSignal | null>(null);

  useEffect(() => {
    return () => {
      if (meta?.previewUrl) URL.revokeObjectURL(meta.previewUrl);
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [meta, result]);

  function onPick(files: File[]) {
    const f = files[0];
    if (!f) return;

    if (meta?.previewUrl) URL.revokeObjectURL(meta.previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);

    setFile(f);
    setResult(null);
    setError(null);
    setProgress(null);

    const url = URL.createObjectURL(f);
    const tempVid = document.createElement("video");
    tempVid.preload = "metadata";
    tempVid.src = url;

    tempVid.onloadedmetadata = () => {
      setMeta({
        width: tempVid.videoWidth || 1280,
        height: tempVid.videoHeight || 720,
        duration: tempVid.duration || 0,
        previewUrl: url,
      });
      // Default custom target MB to ~50% of original
      const halfMB = Math.max(1, Math.round((f.size / (1024 * 1024)) * 0.5));
      setTargetMB(halfMB);
    };

    tempVid.onerror = () => {
      setError("Format video tidak dapat dibaca oleh browser. Pastikan video valid (MP4, WebM, MOV).");
    };
  }

  async function handleCompress() {
    if (!file) return;

    try {
      setBusy(true);
      setError(null);
      setResult(null);
      setProgress({
        percent: 0,
        currentTime: 0,
        duration: meta?.duration || 1,
        elapsedSec: 0,
        etaSec: null,
      });

      const res = await compressVideoFile(file, {
        preset,
        maxDimension: preset === "custom" ? customRes : undefined,
        targetBitrateKbps: preset === "custom" ? customBitrate : undefined,
        targetMB: preset === "custom" && useTarget ? targetMB : undefined,
        onProgress: (p) => {
          setProgress(p);
        },
      });

      const resultUrl = URL.createObjectURL(res.blob);
      setResult({
        blob: res.blob,
        filename: res.filename,
        url: resultUrl,
        originalSize: res.originalSize,
        compressedSize: res.compressedSize,
      });
    } catch (e: any) {
      setError(e.message || "Gagal mengompres video.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    if (meta?.previewUrl) URL.revokeObjectURL(meta.previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setMeta(null);
    setResult(null);
    setProgress(null);
    setError(null);
    setBusy(false);
  }

  return (
    <ToolPageShell tool={TOOL}>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {!file && !result && (
          <FileDropzone
            onFiles={onPick}
            accept={{
              "video/mp4": [".mp4"],
              "video/webm": [".webm"],
              "video/quicktime": [".mov"],
              "video/x-matroska": [".mkv"],
              "video/avi": [".avi"],
            }}
            multiple={false}
            label="Pilih atau seret file video ke sini"
            hint="Mendukung format MP4, WebM, MOV, MKV, AVI (Privat di browser)"
          />
        )}

        {file && !result && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Informasi File Video Asli */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                  {meta?.previewUrl ? (
                    <video
                      src={meta.previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Video className="h-8 w-8 text-muted-foreground" />
                  )}
                  {meta && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(meta.duration)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Video Asli
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{file.name}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate">
                    {file.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Ukuran: <strong className="text-foreground">{formatBytes(file.size)}</strong>
                    </span>
                    {meta && (
                      <>
                        <span>•</span>
                        <span>
                          Resolusi: <strong className="text-foreground">{meta.width}x{meta.height}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Durasi: <strong className="text-foreground">{formatTime(meta.duration)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={busy}
                  className="shrink-0 cursor-pointer self-start sm:self-center"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Ganti
                </Button>
              </div>
            </div>

            {/* Pilihan Level Kompresi */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Pilih Tingkat Kompresi
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESETS.map((p) => {
                  const isSelected = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id)}
                      disabled={busy}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border bg-card hover:bg-accent/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {p.title}
                          </span>
                          {p.badge && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.badgeColor}`}
                            >
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {p.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-3 text-xs">
                        <span className="font-mono text-muted-foreground">
                          {p.resLabel}
                        </span>
                        <span className="font-bold text-primary">
                          Hemat {p.estSaving}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pengaturan Kustom (Jika Dipilih) */}
            {preset === "custom" && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>Pengaturan Kustom Lanjutan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Resolusi Maksimal
                    </label>
                    <select
                      value={customRes}
                      onChange={(e) => setCustomRes(parseInt(e.target.value, 10))}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      <option value={0}>Resolusi Asli ({meta ? `${meta.width}x${meta.height}` : "Original"})</option>
                      <option value={1920}>1080p (Full HD - 1920px)</option>
                      <option value={1280}>720p (HD - 1280px)</option>
                      <option value={854}>480p (SD - 854px)</option>
                      <option value={640}>360p (Standar - 640px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                      Target Bitrate Video ({customBitrate} kbps)
                    </label>
                    <input
                      type="range"
                      min={400}
                      max={5000}
                      step={100}
                      value={customBitrate}
                      onChange={(e) => setCustomBitrate(parseInt(e.target.value, 10))}
                      className="w-full accent-primary mt-2"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1 font-mono">
                      <span>400k (Kecil)</span>
                      <span>1500k (Sedang)</span>
                      <span>5000k (HD)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTarget}
                      onChange={(e) => setUseTarget(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <span>Batasi target ukuran hasil video (MB)</span>
                  </label>
                  {useTarget && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={targetMB}
                        onChange={(e) => setTargetMB(Math.max(0.5, parseFloat(e.target.value) || 1))}
                        className="w-28 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-xs"
                      />
                      <span className="text-xs text-muted-foreground">MB (bitrate dihitung otomatis)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banner Jaminan Nama File Asli */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>100% Privat & Nama File Asli:</strong> Video diproses secara lokal di browser Anda tanpa diunggah ke server mana pun, dan nama asli file dipertahankan utuh.
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {/* Progress Estimasi Selesai & Durasi Pengerjaan */}
            {busy && progress && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      Sedang Mengompres Video...
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">
                    {progress.percent}%
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-150 rounded-full"
                    style={{ width: `${Math.max(3, progress.percent)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left pt-0.5">
                  <div className="rounded-xl border border-border/80 bg-background/90 p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Estimasi Selesai</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {progress.etaSec !== null ? `~${progress.etaSec} detik lagi` : "Menghitung..."}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/90 p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary" />
                      <span>Durasi Berjalan</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {progress.elapsedSec} detik
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/80 bg-background/90 p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Film className="h-3 w-3 text-blue-500" />
                      <span>Waktu Video</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5 font-mono">
                      {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Eksekusi Kompresi */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={handleCompress}
                disabled={busy}
                className="min-w-56 h-12 text-base font-semibold shadow-md cursor-pointer"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Mengompres Video ({progress?.percent || 0}%)…
                  </>
                ) : (
                  "Mulai Kompres Video"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Hasil Kompresi */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <ResultPanel
              originalSize={result.originalSize}
              totalSize={result.compressedSize}
              description={`Video berhasil dikompres dan siap diunduh dengan ukuran ${formatBytes(
                result.compressedSize
              )}.`}
              onDownload={() => downloadBlob(result.blob, result.filename)}
              onReset={handleReset}
              downloadLabel={`Unduh ${result.filename}`}
            />

            {/* Video Player Preview */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Play className="h-4 w-4 text-primary" />
                  Pratinjau Hasil Video Kompresi
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Hemat {Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100)}%
                </span>
              </div>

              <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-[360px] mx-auto flex items-center justify-center">
                <video
                  src={result.url}
                  controls
                  playsInline
                  className="w-full h-full max-h-[360px] object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}

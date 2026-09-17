import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import {
  Loader2,
  AlertCircle,
  Download,
  CheckCircle2,
  Film,
  Music,
  Clock,
  User,
  Zap,
} from "lucide-react";
import { trackUsage } from "@/lib/usageTracker";
import { downloadVideo, type VideoFormatOption } from "@/lib/videoDownloader";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";

const TOOL = TOOLS.find((t) => t.slug === "video-downloader")!;

export const Route = createFileRoute("/video-downloader")({
  head: () => ({
    meta: [
      { title: "Pengunduh Video (YouTube, Instagram, TikTok) — Tukar.in" },
      {
        name: "description",
        content:
          "Unduh video HD dengan berbagai pilihan resolusi (1080p, 720p, 480p, 360p, MP3) dari YouTube, Instagram Reels, dan TikTok. Cepat, gratis, dan tanpa iklan.",
      },
    ],
  }),
  component: Page,
});

type DownloadResult = {
  title?: string;
  thumbnail?: string;
  author?: string;
  duration?: string;
  url: string;
  formats?: VideoFormatOption[];
};

type DownloadProgress = {
  formatLabel: string;
  receivedBytes: number;
  totalBytes: number;
  percent: number;
  speed: number;
  elapsedSec: number;
  etaSec: number | null;
  status: "downloading" | "completed" | "error";
};

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "0 KB/s";
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "Menghitung…";
  if (seconds <= 0) return "Hampir selesai";
  if (seconds < 60) return `~${seconds} detik lagi`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `~${m}m ${s}s lagi` : `~${m} menit lagi`;
}

function Page() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [processElapsed, setProcessElapsed] = useState(0);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);

  // Live timer saat menganalisis link video
  useEffect(() => {
    let interval: any;
    if (busy) {
      setProcessElapsed(0);
      interval = setInterval(() => {
        setProcessElapsed((v) => v + 1);
      }, 1000);
    } else {
      setProcessElapsed(0);
    }
    return () => clearInterval(interval);
  }, [busy]);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setBusy(true);
      setError(null);
      setDownloadResult(null);
      setDownloadProgress(null);

      const targetUrl = url.trim();

      // Memanggil server function
      const result = await downloadVideo({ data: targetUrl });

      if (result.status === "success" && (result.url || (result.formats && result.formats.length > 0))) {
        setDownloadResult({
          title: result.title,
          thumbnail: result.thumbnail,
          author: result.author,
          duration: result.duration,
          url: result.url || result.formats![0].url,
          formats: result.formats,
        });

        trackUsage(TOOL.slug, 1);
      } else {
        throw new Error(result.error || "Gagal mendapatkan tautan unduhan.");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memproses link video.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveFile(fmt: VideoFormatOption) {
    const startTime = Date.now();
    let lastUpdate = 0;

    const cleanTitle = (downloadResult?.title || "video-tukarin")
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .trim()
      .slice(0, 45) || "video-tukarin";

    const ext = fmt.isAudioOnly ? "m4a" : "mp4";
    const filename = `${cleanTitle}-${fmt.label}.${ext}`;

    try {
      setDownloadingUrl(fmt.url);
      setDownloadProgress({
        formatLabel: fmt.displayName || fmt.label,
        receivedBytes: 0,
        totalBytes: fmt.bytes || 0,
        percent: 0,
        speed: 0,
        elapsedSec: 0,
        etaSec: null,
        status: "downloading",
      });

      const res = await fetch(fmt.url);
      if (!res.ok) throw new Error(`Gagal mengunduh file: HTTP ${res.status}`);

      const headerLen = res.headers.get("content-length");
      const total = headerLen ? parseInt(headerLen, 10) : (fmt.bytes || 0);

      if (!res.body) {
        const blob = await res.blob();
        downloadBlob(blob, filename);
        setDownloadProgress((prev) => (prev ? { ...prev, percent: 100, status: "completed" } : null));
        return;
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        const now = Date.now();
        if (now - lastUpdate > 100) {
          lastUpdate = now;
          const elapsed = (now - startTime) / 1000;
          const speed = elapsed > 0 ? received / elapsed : 0;
          const remaining = total > received ? total - received : 0;
          const eta = speed > 0 && remaining > 0 ? Math.ceil(remaining / speed) : null;
          const pct = total > 0 ? Math.min(99, Math.round((received / total) * 100)) : 0;

          setDownloadProgress({
            formatLabel: fmt.displayName || fmt.label,
            receivedBytes: received,
            totalBytes: total,
            percent: pct,
            speed,
            elapsedSec: Math.floor(elapsed),
            etaSec: eta,
            status: "downloading",
          });
        }
      }

      const totalElapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      setDownloadProgress({
        formatLabel: fmt.displayName || fmt.label,
        receivedBytes: received,
        totalBytes: total || received,
        percent: 100,
        speed: received / totalElapsed,
        elapsedSec: totalElapsed,
        etaSec: 0,
        status: "completed",
      });

      const mimeType = fmt.isAudioOnly ? "audio/mp4" : "video/mp4";
      const finalBlob = new Blob(chunks as any, { type: mimeType });
      downloadBlob(finalBlob, filename);
    } catch (e) {
      console.warn("Direct blob stream error, fallback to browser native download:", e);
      // Fallback direct browser download
      const a = document.createElement("a");
      a.href = fmt.url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadProgress(null);
    } finally {
      setDownloadingUrl(null);
    }
  }

  return (
    <ToolPageShell tool={TOOL}>
      <div className="mx-auto w-full max-w-2xl">
        <form onSubmit={handleDownload} className="relative mt-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              placeholder="Tempel link YouTube, Instagram (Reels), atau TikTok di sini..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-4 py-4 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            />
            <Button type="submit" size="lg" className="h-[58px] px-8 rounded-xl font-bold cursor-pointer" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Proses"}
            </Button>
          </div>
        </form>

        {/* Indikator Durasi Proses saat Menganalisis Video */}
        {busy && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 animate-in fade-in duration-200">
            <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            <div className="text-left text-xs">
              <div className="font-bold text-foreground">
                Sedang Menganalisis Video & Opsi Resolusi...
              </div>
              <div className="text-muted-foreground mt-0.5">
                Durasi pengerjaan: <span className="font-mono font-medium text-foreground">{processElapsed} detik</span> • Estimasi selesai: ~2-5 detik
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {downloadResult && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Video Preview */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {downloadResult.thumbnail && (
                <div className="relative shrink-0 w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                  <img
                    src={downloadResult.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {downloadResult.duration && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-mono font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {downloadResult.duration}
                    </span>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Video Berhasil Ditemukan</span>
                </div>
                {downloadResult.title && (
                  <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug">
                    {downloadResult.title}
                  </h3>
                )}
                {downloadResult.author && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>{downloadResult.author}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Progress Estimasi Selesai & Durasi Pengerjaan Unduhan */}
            {downloadProgress && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {downloadProgress.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {downloadProgress.status === "completed"
                        ? `Unduhan Selesai (${downloadProgress.formatLabel})`
                        : `Mengunduh ${downloadProgress.formatLabel}...`}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary shrink-0">
                    {downloadProgress.percent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 rounded-full ${
                      downloadProgress.status === "completed"
                        ? "bg-emerald-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.max(3, downloadProgress.percent)}%` }}
                  />
                </div>

                {/* 4 Metric Chips: Estimasi Selesai, Durasi, Kecepatan, Ukuran */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left pt-0.5">
                  <div className="rounded-lg border border-border/80 bg-background/90 p-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Estimasi Selesai</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {downloadProgress.status === "completed"
                        ? "Selesai"
                        : formatEta(downloadProgress.etaSec)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/90 p-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary" />
                      <span>Durasi Proses</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {downloadProgress.elapsedSec} detik
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/90 p-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span>Kecepatan</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5">
                      {formatSpeed(downloadProgress.speed)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/90 p-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                      <Download className="h-3 w-3 text-blue-500" />
                      <span>Ukuran File</span>
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5 truncate">
                      {formatBytes(downloadProgress.receivedBytes)}
                      {downloadProgress.totalBytes > 0
                        ? ` / ${formatBytes(downloadProgress.totalBytes)}`
                        : ""}
                    </div>
                  </div>
                </div>

                {downloadProgress.status === "completed" && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✅ Berhasil diunduh dan disimpan ke perangkat Anda dalam waktu {downloadProgress.elapsedSec} detik.
                  </p>
                )}
              </div>
            )}

            {/* Pilihan Resolusi (Jika Tersedia) */}
            {downloadResult.formats && downloadResult.formats.length > 0 ? (
              <div className="space-y-3 pt-2 border-t border-border/70">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Film className="h-4 w-4 text-primary" />
                    Pilihan Resolusi Video
                  </span>
                  <span>{downloadResult.formats.length} Opsi Tersedia</span>
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border/80 overflow-hidden bg-muted/20">
                  {downloadResult.formats.map((fmt, idx) => {
                    const isCurrentDownloading = downloadingUrl === fmt.url;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 sm:px-4 hover:bg-accent/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                              fmt.isAudioOnly
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {fmt.isAudioOnly ? (
                              <Music className="h-4 w-4" />
                            ) : (
                              <Film className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">
                                {fmt.displayName}
                              </span>
                              {fmt.badge && (
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    fmt.badge === "Kualitas Terbaik"
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                      : fmt.badge === "Rekomendasi"
                                      ? "bg-primary/15 text-primary border border-primary/30"
                                      : fmt.badge === "Hemat Kuota"
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {fmt.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Format: {fmt.isAudioOnly ? "M4A Audio" : "MP4 Video"}
                              {fmt.size ? ` • Ukuran ~${fmt.size}` : ""}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleSaveFile(fmt)}
                          disabled={isCurrentDownloading || !!downloadingUrl}
                          className="shrink-0 font-semibold gap-1.5 cursor-pointer min-w-28"
                        >
                          {isCurrentDownloading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Mengunduh...
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              Unduh {fmt.label}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Fallback Single Download Button */
              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={() =>
                    handleSaveFile({
                      label: "HD",
                      displayName: "Video HD",
                      url: downloadResult.url,
                    })
                  }
                  disabled={!!downloadingUrl}
                  className="px-8 py-3.5 h-auto rounded-xl font-bold text-base shadow-md hover:shadow-lg cursor-pointer"
                >
                  {downloadingUrl ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Mengunduh File...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Unduh Video (.mp4)
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-1">
              File video MP4 akan langsung disimpan ke folder Download perangkat Anda tanpa watermark.
            </p>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm font-medium text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#FF0000] font-bold block mb-1">YouTube</span>
            Video / Shorts
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#E1306C] font-bold block mb-1">Instagram</span>
            Reels / Post
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#000000] dark:text-white font-bold block mb-1">TikTok</span>
            Video HD
          </div>
        </div>
        
        <p className="mt-6 text-center text-xs text-muted-foreground bg-primary/10 text-primary p-3 rounded-lg border border-primary/20">
          💡 <strong>Info:</strong> Fitur ini memproses unduhan YouTube, Instagram Reels, dan TikTok secara langsung di Tukar.in (maksimal 3 unduhan per hari per IP).
        </p>
      </div>
    </ToolPageShell>
  );
}

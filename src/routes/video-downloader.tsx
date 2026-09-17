import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  Sparkles,
} from "lucide-react";
import { trackUsage } from "@/lib/usageTracker";
import { downloadVideo, type VideoFormatOption } from "@/lib/videoDownloader";
import { downloadBlob } from "@/lib/downloadHelpers";

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

function Page() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setBusy(true);
      setError(null);
      setDownloadResult(null);

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
    try {
      setDownloadingUrl(fmt.url);
      const res = await fetch(fmt.url);
      if (!res.ok) throw new Error("Network error");
      const blob = await res.blob();

      const cleanTitle = (downloadResult?.title || "video-tukarin")
        .replace(/[^a-zA-Z0-9\s_-]/g, "")
        .trim()
        .slice(0, 45) || "video-tukarin";

      const ext = fmt.isAudioOnly ? "m4a" : "mp4";
      const filename = `${cleanTitle}-${fmt.label}.${ext}`;

      downloadBlob(blob, filename);
    } catch (e) {
      // Fallback jika direct blob fetch diblokir oleh CORS browser
      const cleanTitle = (downloadResult?.title || "video-tukarin")
        .replace(/[^a-zA-Z0-9\s_-]/g, "")
        .trim()
        .slice(0, 45) || "video-tukarin";

      const ext = fmt.isAudioOnly ? "m4a" : "mp4";
      const a = document.createElement("a");
      a.href = fmt.url;
      a.download = `${cleanTitle}-${fmt.label}.${ext}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

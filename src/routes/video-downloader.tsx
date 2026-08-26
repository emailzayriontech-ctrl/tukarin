import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { Loader2, AlertCircle, Download, CheckCircle2 } from "lucide-react";
import { trackUsage } from "@/lib/usageTracker";
import { downloadVideo } from "@/lib/videoDownloader";
import { downloadBlob } from "@/lib/downloadHelpers";

const TOOL = TOOLS.find((t) => t.slug === "video-downloader")!;

export const Route = createFileRoute("/video-downloader")({
  head: () => ({
    meta: [
      { title: "Pengunduh Video (YouTube, Instagram, TikTok) — Tukar.in" },
      { name: "description", content: "Unduh video HD tanpa watermark dari YouTube, Instagram Reels, dan TikTok. Cepat, gratis, dan tanpa iklan." },
    ],
  }),
  component: Page,
});

type DownloadResult = {
  title?: string;
  url: string;
};

function Page() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(false);
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
      
      // Memanggil fungsi server
      const result = await downloadVideo({ data: targetUrl });
      
      if (result.status === "success" && result.url) {
        setDownloadResult({
          title: result.title,
          url: result.url,
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

  async function handleSaveFile(videoUrl: string) {
    try {
      setDownloadingFile(true);
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error("Network error");
      const blob = await res.blob();
      
      const cleanTitle = (downloadResult?.title || "video-tukarin")
        .replace(/[^a-zA-Z0-9\s_-]/g, "")
        .trim()
        .slice(0, 40) || "video-tukarin";

      downloadBlob(blob, `${cleanTitle}.mp4`);
    } catch (e) {
      // Fallback jika dikunci CORS oleh browser
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = "video-tukarin.mp4";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingFile(false);
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
            <Button type="submit" size="lg" className="h-[58px] px-8 rounded-xl font-bold" disabled={busy}>
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
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-center gap-2 text-primary font-semibold text-base sm:text-lg">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <span>Video Siap Diunduh!</span>
            </div>
            
            {downloadResult.title && (
              <p className="text-sm font-medium text-foreground max-w-md mx-auto line-clamp-2">
                {downloadResult.title}
              </p>
            )}

            <div className="pt-2">
              <Button
                size="lg"
                onClick={() => handleSaveFile(downloadResult.url)}
                disabled={downloadingFile}
                className="px-8 py-3.5 h-auto rounded-xl font-bold text-base shadow-md hover:shadow-lg"
              >
                {downloadingFile ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Mengunduh File MP4...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Unduh File Video (.mp4)
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              File video MP4 akan langsung disimpan ke perangkat Anda tanpa tab pemutar.
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

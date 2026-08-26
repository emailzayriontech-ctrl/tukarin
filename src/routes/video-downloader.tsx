import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { Loader2, AlertCircle, Download, CheckCircle2, ExternalLink } from "lucide-react";
import { trackUsage } from "@/lib/usageTracker";
import { downloadVideo } from "@/lib/videoDownloader";

const TOOL = TOOLS.find((t) => t.slug === "video-downloader")!;

export const Route = createFileRoute("/video-downloader")({
  head: () => ({
    meta: [
      { title: "Pengunduh Video (YouTube, TikTok, IG) — Tukar.in" },
      { name: "description", content: "Unduh video HD tanpa watermark dari YouTube, TikTok, Instagram, Twitter, Facebook, dan lainnya. Cepat dan gratis." },
    ],
  }),
  component: Page,
});

type DownloadResult = {
  status: "success" | "fallback";
  title?: string;
  url: string;
};

function Page() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
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
      
      const finalUrl = (result.status === "success" && result.url) 
        ? result.url 
        : (result.fallbackUrl || `https://sfrom.net/${targetUrl}`);
        
      const resStatus = (result.status === "success" && result.url) ? "success" : "fallback";

      setDownloadResult({
        status: resStatus,
        title: result.title,
        url: finalUrl,
      });

      // Coba buka otomatis di tab baru (jika tidak diblokir browser popup blocker)
      try {
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        // Jika diblokir popup blocker, pengguna bisa klik tombol di kartu hasil
      }
      
      trackUsage(TOOL.slug, 1);
    } catch (err: any) {
      setError(err.message || "Gagal memproses link video.");
    } finally {
      setBusy(false);
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
              placeholder="Tempel link video di sini (contoh: https://youtu.be/...)"
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
              <span>{downloadResult.status === "success" ? "Video Siap Diunduh!" : "Link Siap Diproses"}</span>
            </div>
            
            {downloadResult.title && (
              <p className="text-sm font-medium text-foreground max-w-md mx-auto line-clamp-2">
                {downloadResult.title}
              </p>
            )}

            <div className="pt-2">
              <a
                href={downloadResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg text-base"
              >
                {downloadResult.status === "success" ? (
                  <>
                    <Download className="h-5 w-5" />
                    Unduh Video HD
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5" />
                    Buka Link Unduhan (SaveFrom)
                  </>
                )}
              </a>
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              {downloadResult.status === "success"
                ? "Klik tombol di atas jika unduhan otomatis tidak berjalan."
                : "Klik tombol di atas untuk mengunduh video via SaveFrom.net."}
            </p>
          </div>
        )}

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm font-medium text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#FF0000] font-bold block mb-1">YouTube</span>
            Video / Shorts
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#000000] dark:text-white font-bold block mb-1">TikTok</span>
            Tanpa Watermark
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#E1306C] font-bold block mb-1">Instagram</span>
            Reels / Post
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <span className="text-[#1DA1F2] font-bold block mb-1">Twitter/X</span>
            Video HD
          </div>
        </div>
        
        <p className="mt-6 text-center text-xs text-muted-foreground bg-primary/10 text-primary p-3 rounded-lg border border-primary/20">
          💡 <strong>Info:</strong> Kami mencoba memberikan link download langsung. Jika batas pemakaian server telah habis atau format belum didukung, video akan diunduh melalui layanan gratis <b>SaveFrom.net</b>.
        </p>
      </div>
    </ToolPageShell>
  );
}

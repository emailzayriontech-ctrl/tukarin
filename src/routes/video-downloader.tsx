import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { Loader2, AlertCircle } from "lucide-react";
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

function Page() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setBusy(true);
      setError(null);
      
      const targetUrl = url.trim();
      
      // Memanggil fungsi server (yang akan mengecek IP limit dan memanggil RapidAPI untuk YouTube)
      const result = await downloadVideo({ data: targetUrl });
      
      if (result.status === "success" && result.url) {
        // Berhasil mendapatkan link langsung dari RapidAPI (via server)
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        // Fallback: Limit habis atau bukan YouTube (atau API error)
        // Buka lewat SaveFrom.net
        window.open(result.fallbackUrl || `https://sfrom.net/${targetUrl}`, "_blank", "noopener,noreferrer");
      }
      
      trackUsage(TOOL.slug, 1);
      setUrl(""); // Reset form
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
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Unduh"}
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
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
          💡 <strong>Info:</strong> Kami mencoba memberikan link download langsung. Jika batas pemakaian server telah habis atau format belum didukung, video akan diunduh melalui layanan gratis <b>SaveFrom.net</b> di tab baru.
        </p>
      </div>
    </ToolPageShell>
  );
}

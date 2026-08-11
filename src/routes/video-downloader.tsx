import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { downloadVideo, type CobaltResponse } from "@/lib/videoDownloader";
import { Loader2, Download, Video, AlertCircle, Image as ImageIcon } from "lucide-react";
import { trackUsage } from "@/lib/usageTracker";

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
  const [result, setResult] = useState<CobaltResponse | null>(null);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setBusy(true);
      setError(null);
      setResult(null);

      const data = await downloadVideo(url.trim());
      setResult(data);
      trackUsage(TOOL.slug, 1);
    } catch (err: any) {
      setError(err.message || "Gagal memproses link video.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setUrl("");
    setResult(null);
    setError(null);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!result ? (
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
          
          <p className="mt-6 text-center text-xs text-muted-foreground">
            * Layanan ini bersifat percobaan (eksperimental). Terdapat batas global maksimal 30 unduhan per hari untuk semua pengguna Tukar.in.
          </p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" /> Hasil Unduhan
              </h3>
              <Button variant="ghost" size="sm" onClick={handleReset}>Unduh Video Lain</Button>
            </div>

            {(result.status === "redirect" || result.status === "stream") && result.url && (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  <Download className="h-5 w-5" /> Simpan Video (HD)
                </a>
                <p className="mt-4 text-xs text-muted-foreground text-center max-w-sm">
                  Jika video terbuka dan memutar di tab baru, klik kanan (atau tahan lama di HP) lalu pilih "Save video as...".
                </p>
              </div>
            )}

            {result.status === "picker" && result.picker && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Ditemukan beberapa item (seperti Album/Carousel IG):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {result.picker.map((item, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-muted">
                      {item.thumb ? (
                        <img src={item.thumb} alt={`Item ${idx+1}`} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-muted/50">
                          {item.type === "video" ? <Video className="h-8 w-8 text-muted-foreground" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                        </div>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1"
                      >
                        <Download className="h-5 w-5" /> Unduh
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.status === "success" && (
              <div className="text-center p-6 text-sm">
                Berhasil diproses! Jika tidak otomatis terunduh, silakan gunakan link manual.
              </div>
            )}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}

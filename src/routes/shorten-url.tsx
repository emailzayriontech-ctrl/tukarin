import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TOOLS } from "@/lib/tools/registry";
import { trackUsage } from "@/lib/usageTracker";
import {
  shortenUrlServerFn,
  normalizeUrl,
  validateCustomAlias,
  generateQrCode,
  downloadQrImage,
  getHistory,
  saveToHistory,
  removeFromHistory,
  clearHistory,
  type ShortenerProvider,
  type ShortenUrlResult,
  type HistoryItem,
} from "@/lib/tools/shortenUrl";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Download,
  Trash2,
  History,
  Sparkles,
  Share2,
  Globe,
  SlidersHorizontal,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ClipboardPaste,
  X,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Send,
  Loader2,
  FileDown,
} from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "shorten-url")!;

export const Route = createFileRoute("/shorten-url")({
  head: () => ({
    meta: [
      { title: "Persingkat Link URL & Buat QR Code Gratis — Tukar.in" },
      {
        name: "description",
        content:
          "Perpendek tautan URL panjang menjadi link pendek yang rapi, ringkas, dan mudah dibagikan. Dilengkapi QR Code otomatis dan tanpa perlu daftar akun.",
      },
      { property: "og:title", content: "Persingkat Link URL & Buat QR Code — Tukar.in" },
      {
        property: "og:description",
        content:
          "Perpendek link panjang, buat tautan kustom, dan unduh QR Code resolusi tinggi gratis.",
      },
    ],
  }),
  component: ShortenUrlPage,
});

const PROVIDER_OPTIONS: { id: ShortenerProvider; name: string; domain: string; desc: string }[] = [
  {
    id: "auto",
    name: "Otomatis (Rekomendasi)",
    domain: "Multi-Server",
    desc: "Pilih server tercepat dengan auto-failover otomatis",
  },
  {
    id: "tinyurl",
    name: "TinyURL",
    domain: "tinyurl.com",
    desc: "Layanan paling populer, stabil, & terpercaya",
  },
  {
    id: "dagd",
    name: "da.gd",
    domain: "da.gd",
    desc: "Sangat pendek, bersih, tanpa redirect berbelit",
  },
  { id: "vgd", name: "v.gd", domain: "v.gd", desc: "Ringkas, cepat, dan terpercaya" },
  {
    id: "ulvis",
    name: "ulvis.net",
    domain: "ulvis.net",
    desc: "Mendukung nama alias kustom fleksibel",
  },
  { id: "clck", name: "clck.ru", domain: "clck.ru", desc: "Cepat dan handal untuk tautan umum" },
];

const QR_COLOR_OPTIONS = [
  { label: "Navy Brand", value: "#0D1B2A" },
  { label: "Biru Tukar.in", value: "#1565D8" },
  { label: "Hitam Pekat", value: "#000000" },
  { label: "Hijau Emerald", value: "#059669" },
];

function ShortenUrlPage() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // Single URL state
  const [longUrl, setLongUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [provider, setProvider] = useState<ShortenerProvider>("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenUrlResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // QR Code state
  const [qrColor, setQrColor] = useState("#0D1B2A");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryQr, setActiveHistoryQr] = useState<HistoryItem | null>(null);
  const [historyQrDataUrl, setHistoryQrDataUrl] = useState<string | null>(null);

  // Batch URL state
  const [batchText, setBatchText] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [batchResults, setBatchResults] = useState<
    { original: string; short: string; success: boolean; error?: string }[]
  >([]);
  const [copiedBatchAll, setCopiedBatchAll] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  // Generate QR Code when result changes or qrColor changes
  useEffect(() => {
    if (!result?.shortUrl) {
      setQrDataUrl(null);
      return;
    }

    let isCurrent = true;
    setQrGenerating(true);
    generateQrCode(result.shortUrl, { colorDark: qrColor, width: 600, margin: 2 })
      .then((dataUrl) => {
        if (isCurrent) setQrDataUrl(dataUrl);
      })
      .catch((e) => console.error("QR Code error:", e))
      .finally(() => {
        if (isCurrent) setQrGenerating(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [result?.shortUrl, qrColor]);

  // Handle single shorten
  async function handleShorten(e: React.FormEvent) {
    e.preventDefault();
    if (!longUrl.trim()) return;

    setError(null);
    setBusy(true);
    setResult(null);

    try {
      const normalized = normalizeUrl(longUrl);
      const alias = customAlias.trim() ? validateCustomAlias(customAlias) : undefined;

      const data = await shortenUrlServerFn({
        data: {
          url: normalized,
          provider,
          customAlias: alias,
        },
      });

      setResult(data);
      const updatedHistory = saveToHistory(data);
      setHistory(updatedHistory);
      trackUsage("shorten-url", 1);
    } catch (err: unknown) {
      console.error(err);
      setError(
        (err instanceof Error ? err.message : null) ||
          "Terjadi kesalahan saat mempersingkat URL. Periksa koneksi internet Anda.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Handle Paste from clipboard
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLongUrl(text.trim());
      }
    } catch {
      setError("Gagal mengakses papan klip (clipboard). Silakan tempel tautan secara manual.");
    }
  }

  // Copy Short Link to clipboard
  async function handleCopyLink(textToCopy?: string) {
    const target = textToCopy || result?.shortUrl;
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = target;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  // Copy QR Image to clipboard
  async function handleCopyQrImage() {
    if (!qrDataUrl) return;

    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (
        typeof window !== "undefined" &&
        "ClipboardItem" in window &&
        typeof navigator.clipboard?.write === "function"
      ) {
        const ClipboardItemConstructor = (
          window as unknown as { ClipboardItem: typeof ClipboardItem }
        ).ClipboardItem;
        await navigator.clipboard.write([new ClipboardItemConstructor({ "image/png": blob })]);
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 2000);
      } else {
        handleDownloadQr();
      }
    } catch {
      handleDownloadQr();
    }
  }

  // Download QR Code PNG
  function handleDownloadQr() {
    if (!qrDataUrl || !result) return;
    const safeDomain = result.shortUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "-");
    downloadQrImage(qrDataUrl, `tukar-in-qr-${safeDomain}.png`);
  }

  // Native Web Share API
  async function handleNativeShare() {
    if (!result?.shortUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tautan Pendek via Tukar.in",
          text: `Buka tautan ini: ${result.shortUrl}`,
          url: result.shortUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  }

  // History QR Modal trigger
  async function openHistoryQr(item: HistoryItem) {
    setActiveHistoryQr(item);
    try {
      const dataUrl = await generateQrCode(item.shortUrl, { colorDark: "#0D1B2A", width: 400 });
      setHistoryQrDataUrl(dataUrl);
    } catch {
      setHistoryQrDataUrl(null);
    }
  }

  // Delete item from history
  function handleDeleteHistoryItem(id: string) {
    const updated = removeFromHistory(id);
    setHistory(updated);
  }

  // Clear all history
  function handleClearAllHistory() {
    if (
      window.confirm("Apakah Anda yakin ingin menghapus seluruh riwayat tautan di perangkat ini?")
    ) {
      clearHistory();
      setHistory([]);
    }
  }

  // Handle Batch Shortening
  async function handleBatchShorten(e: React.FormEvent) {
    e.preventDefault();
    const lines = batchText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;
    if (lines.length > 30) {
      setError("Maksimal 30 tautan sekaligus untuk mode batch.");
      return;
    }

    setError(null);
    setBatchBusy(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: lines.length });

    const results: { original: string; short: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      setBatchProgress({ current: i + 1, total: lines.length });

      try {
        const normalized = normalizeUrl(raw);
        const res = await shortenUrlServerFn({
          data: {
            url: normalized,
            provider: "auto",
          },
        });
        results.push({ original: normalized, short: res.shortUrl, success: true });
        saveToHistory(res);
      } catch (err: unknown) {
        results.push({
          original: raw,
          short: "-",
          success: false,
          error: (err instanceof Error ? err.message : null) || "Gagal diproses",
        });
      }
    }

    setBatchResults(results);
    setBatchBusy(false);
    setBatchProgress(null);
    setHistory(getHistory());
    trackUsage("shorten-url", results.filter((r) => r.success).length);
  }

  // Copy all batch results
  async function handleCopyBatchAll() {
    const text = batchResults
      .filter((r) => r.success)
      .map((r) => `${r.original} -> ${r.short}`)
      .join("\n");

    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedBatchAll(true);
    setTimeout(() => setCopiedBatchAll(false), 2000);
  }

  // Download batch as TXT
  function handleDownloadBatchTxt() {
    const text = [
      "HASIL PERSINGKAT LINK URL — TUKAR.IN",
      `Tanggal: ${new Date().toLocaleString("id-ID")}`,
      "------------------------------------------",
      ...batchResults.map(
        (r, idx) =>
          `${idx + 1}. ${r.original}\n   Pendek: ${r.short}${r.error ? ` (Gagal: ${r.error})` : ""}`,
      ),
      "------------------------------------------",
      "Dibuat secara gratis di https://tukar.in",
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tukar-in-batch-shorten-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <ToolPageShell tool={TOOL}>
      <div className="space-y-8">
        {/* TABS SELECTOR */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl bg-muted p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition cursor-pointer ${
                activeTab === "single"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="h-4 w-4" />
              Satu Tautan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition cursor-pointer ${
                activeTab === "batch"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
              Banyak Tautan (Batch)
            </button>
          </div>
        </div>

        {/* ERROR MESSAGE ALERT */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-md p-1 hover:bg-destructive/15 text-destructive cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TAB 1: SINGLE URL SHORTENER */}
        {activeTab === "single" && (
          <div className="space-y-6">
            {/* INPUT FORM CARD */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm">
              <form onSubmit={handleShorten} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="url-input"
                      className="text-sm font-bold text-foreground flex items-center gap-2"
                    >
                      <span>Masukkan Tautan Panjang</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        (https:// atau www...)
                      </span>
                    </label>
                    {longUrl && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {longUrl.length} karakter
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <div className="pointer-events-none absolute left-4 text-muted-foreground">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <input
                      id="url-input"
                      type="text"
                      value={longUrl}
                      onChange={(e) => setLongUrl(e.target.value)}
                      placeholder="https://contoh-situs-kamu.com/halaman/artikel/promosi-panjang-banget"
                      className="w-full rounded-2xl border border-border bg-background pl-12 pr-28 py-4 text-sm md:text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 shadow-xs"
                      autoFocus
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {longUrl ? (
                        <button
                          type="button"
                          onClick={() => setLongUrl("")}
                          aria-label="Hapus teks"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePaste}
                          title="Tempel dari Clipboard"
                          className="flex items-center gap-1.5 rounded-xl bg-muted/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition cursor-pointer"
                        >
                          <ClipboardPaste className="h-3.5 w-3.5" />
                          <span>Tempel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ADVANCED ACCORDION TOGGLE */}
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 transition">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex w-full items-center justify-between text-left text-xs md:text-sm font-semibold text-foreground/90 hover:text-primary transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      <span>Opsi Lanjutan &amp; Nama Kustom (Opsional)</span>
                      {customAlias && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/10 text-primary"
                        >
                          Alias Aktif
                        </Badge>
                      )}
                    </div>
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 pt-4 border-t border-border/60 space-y-4">
                      {/* Custom Alias */}
                      <div>
                        <label
                          htmlFor="alias-input"
                          className="block text-xs font-semibold text-foreground mb-1"
                        >
                          Nama Alias Kustom (Custom Slug / Back-half)
                        </label>
                        <div className="flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs md:text-sm shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                          <span className="text-muted-foreground font-mono select-none pr-1">
                            {provider === "dagd"
                              ? "da.gd/"
                              : provider === "vgd"
                                ? "v.gd/"
                                : "tinyurl.com/"}
                          </span>
                          <input
                            id="alias-input"
                            type="text"
                            value={customAlias}
                            onChange={(e) =>
                              setCustomAlias(
                                e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
                              )
                            }
                            placeholder="nama-tautan-kamu"
                            maxLength={40}
                            className="flex-1 bg-transparent outline-none font-medium text-foreground placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Gunakan huruf kecil, angka, tanda strip (-), atau garis bawah (_). Minimal
                          3 karakter.
                        </p>
                      </div>

                      {/* Provider selection */}
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">
                          Pilihan Server Pemendek Tautan
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {PROVIDER_OPTIONS.map((opt) => {
                            const isSelected = provider === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setProvider(opt.id)}
                                className={`flex flex-col text-left rounded-xl p-3 border transition cursor-pointer ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-foreground shadow-xs ring-1 ring-primary"
                                    : "border-border/80 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-foreground">
                                    {opt.name}
                                  </span>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                                </div>
                                <span className="text-[11px] font-mono text-primary font-medium">
                                  {opt.domain}
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {opt.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SUBMIT BUTTON */}
                <Button
                  type="submit"
                  disabled={busy || !longUrl.trim()}
                  className="w-full h-13 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition cursor-pointer"
                >
                  {busy ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Sedang Mempersingkat Tautan…</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      <span>Persingkat URL Sekarang</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  )}
                </Button>
              </form>
            </div>

            {/* RESULT PANEL */}
            {result && (
              <div className="rounded-3xl border border-primary/30 bg-card p-6 md:p-8 shadow-lg ring-1 ring-primary/20 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Tautan Berhasil Dipersingkat!
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Diproses via {result.providerLabel}
                      </p>
                    </div>
                  </div>

                  {result.savingsPercent > 0 && (
                    <Badge
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Hemat {result.savingsPercent}% Panjang Karakter
                    </Badge>
                  )}
                </div>

                {/* Short link box */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Link Pendek Kamu:
                  </span>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-border bg-background p-2.5 shadow-xs">
                    <div className="flex-1 px-3 py-1 font-mono text-base md:text-lg font-bold text-primary truncate select-all">
                      {result.shortUrl}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        onClick={() => handleCopyLink()}
                        className={`rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                          copiedLink
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {copiedLink ? (
                          <>
                            <Check className="h-4 w-4 mr-1.5" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" />
                            Salin Link
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          window.open(result.shortUrl, "_blank", "noopener,noreferrer")
                        }
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer"
                        title="Buka di tab baru"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Original URL Comparison */}
                <div className="rounded-2xl bg-muted/40 p-4 text-xs space-y-1.5 border border-border/60">
                  <div className="flex items-center justify-between text-muted-foreground font-medium">
                    <span>Tautan Asli:</span>
                    <span className="font-mono">{result.originalUrl.length} karakter</span>
                  </div>
                  <div className="font-mono text-muted-foreground truncate select-all">
                    {result.originalUrl}
                  </div>
                </div>

                {/* QR CODE & SHARING GRID */}
                <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-border/60">
                  {/* QR Code Section */}
                  <div className="flex flex-col items-center sm:items-start space-y-3 rounded-2xl border border-border/70 bg-background/50 p-5">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">QR Code Gratis</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Siap Cetak (HD)</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                      {/* QR Display */}
                      <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-2xl border border-border/80 bg-white p-2 shadow-sm">
                        {qrGenerating ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="QR Code"
                            className="h-full w-full object-contain rounded-lg"
                          />
                        ) : null}
                      </div>

                      {/* QR Actions & Color options */}
                      <div className="flex-1 space-y-2.5 text-center sm:text-left">
                        <div>
                          <span className="text-[11px] text-muted-foreground block mb-1">
                            Pilihan Warna QR:
                          </span>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            {QR_COLOR_OPTIONS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => setQrColor(c.value)}
                                title={c.label}
                                className={`h-6 w-6 rounded-full border-2 transition cursor-pointer ${
                                  qrColor === c.value
                                    ? "border-primary scale-110 shadow-xs"
                                    : "border-transparent opacity-75 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: c.value }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleDownloadQr}
                            className="rounded-xl text-xs font-semibold gap-1.5 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Unduh QR (PNG)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCopyQrImage}
                            className="rounded-xl text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                          >
                            {copiedQr ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedQr ? "Tersalin!" : "Salin QR"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Instant Sharing Section */}
                  <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-border/70 bg-background/50 p-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Share2 className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          Bagikan Tautan Cepat
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Kirim tautan pendek langsung ke kontak atau sosial media tanpa ribet.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Halo, silakan buka link berikut: ${result.shortUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition text-center"
                      >
                        <Smartphone className="h-4 w-4" />
                        WhatsApp
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(result.shortUrl)}&text=${encodeURIComponent("Tautan singkat via Tukar.in")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 transition text-center"
                      >
                        <Send className="h-4 w-4" />
                        Telegram
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Cek tautan ini: ${result.shortUrl}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-accent transition text-center"
                      >
                        <Share className="h-4 w-4" />X / Twitter
                      </a>
                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition text-center cursor-pointer"
                      >
                        <Share2 className="h-4 w-4" />
                        Bagikan
                      </button>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResult(null);
                          setLongUrl("");
                          setCustomAlias("");
                        }}
                        className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Persingkat Tautan Lainnya
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BATCH URL SHORTENER */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-sm space-y-5">
              <div>
                <label
                  htmlFor="batch-textarea"
                  className="block text-sm font-bold text-foreground mb-1"
                >
                  Persingkat Banyak Link Sekaligus (Batch)
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Masukkan satu tautan per baris (maksimal 30 tautan). Setiap tautan akan otomatis
                  diproses dan menghasilkan link pendek &amp; QR.
                </p>
                <textarea
                  id="batch-textarea"
                  rows={6}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder="https://contoh.com/link-1&#10;https://contoh.com/link-2&#10;https://youtube.com/watch?v=xyz"
                  className="w-full rounded-2xl border border-border bg-background p-4 text-xs md:text-sm font-mono outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
                />
              </div>

              {batchProgress && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Memproses tautan…</span>
                    <span>
                      {batchProgress.current} dari {batchProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleBatchShorten}
                disabled={batchBusy || !batchText.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition cursor-pointer"
              >
                {batchBusy ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sedang Memproses Daftar Tautan…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>Persingkat Semua Tautan Baris</span>
                  </div>
                )}
              </Button>
            </div>

            {/* BATCH RESULTS TABLE */}
            {batchResults.length > 0 && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Hasil Batch ({batchResults.filter((r) => r.success).length} Berhasil)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tautan sudah siap disalin atau diunduh sebagai berkas teks.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyBatchAll}
                      className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      {copiedBatchAll ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedBatchAll ? "Semua Tersalin!" : "Salin Semua"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadBatchTxt}
                      className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Unduh TXT
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                  {batchResults.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-muted-foreground font-mono truncate">
                          {item.original}
                        </div>
                        {item.success ? (
                          <div className="font-mono font-bold text-primary truncate select-all">
                            {item.short}
                          </div>
                        ) : (
                          <div className="text-destructive font-medium">{item.error}</div>
                        )}
                      </div>
                      {item.success && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(item.short)}
                          className="h-8 px-2.5 rounded-lg cursor-pointer"
                          title="Salin tautan"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOCAL HISTORY SECTION */}
        {history.length > 0 && (
          <div className="rounded-3xl border border-border/70 bg-card/60 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Riwayat Tautan di Perangkat Ini ({history.length})
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAllHistory}
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8 px-2.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Riwayat</span>
              </Button>
            </div>

            <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/30 px-2 rounded-xl transition"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary truncate">
                        {item.shortUrl}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                        {item.providerLabel}
                      </span>
                      {item.savingsPercent > 0 && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          -{item.savingsPercent}%
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground font-mono truncate text-[11px]">
                      {item.originalUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(item.shortUrl)}
                      className="h-8 px-2.5 rounded-lg cursor-pointer"
                      title="Salin tautan"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openHistoryQr(item)}
                      className="h-8 px-2.5 rounded-lg cursor-pointer"
                      title="Tampilkan QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(item.shortUrl, "_blank", "noopener,noreferrer")}
                      className="h-8 px-2.5 rounded-lg cursor-pointer"
                      title="Buka tautan"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      className="h-8 px-2.5 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Hapus dari riwayat"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL QR CODE UNTUK RIWAYAT */}
        {activeHistoryQr && historyQrDataUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">QR Code Tautan</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveHistoryQr(null);
                    setHistoryQrDataUrl(null);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid place-items-center rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
                <img
                  src={historyQrDataUrl}
                  alt="QR Code"
                  className="h-56 w-56 object-contain rounded-lg"
                />
              </div>

              <div className="text-center space-y-1">
                <div className="font-mono text-xs font-bold text-primary truncate">
                  {activeHistoryQr.shortUrl}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeHistoryQr.originalUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    downloadQrImage(
                      historyQrDataUrl,
                      `qr-${activeHistoryQr.shortUrl.replace(/[^a-zA-Z0-9]/g, "-")}.png`,
                    )
                  }
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh PNG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyLink(activeHistoryQr.shortUrl)}
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin Link
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FITUR & KEUNGGULAN SECTION */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 pt-6">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">100% Gratis &amp; Tanpa Kuota</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Persingkat berapa pun tautan tanpa batasan kuota harian dan tanpa keharusan mendaftar
              akun.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">QR Code HD Siap Cetak</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Setiap tautan yang dipersingkat langsung dilengkapi gambar QR Code beresolusi tinggi
              untuk brosur atau kartu nama.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Multi-Server Failover</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Didukung sistem cerdas dengan pilihan TinyURL, da.gd, v.gd, ulvis, dan clck yang tetap
              online kapan pun.
            </p>
          </div>
        </div>

        {/* FAQ ACCORDION */}
        <div className="rounded-3xl border border-border/70 bg-card/40 p-6 md:p-8 space-y-4">
          <h3 className="text-base font-bold text-foreground">
            Pertanyaan yang Sering Diajukan (FAQ)
          </h3>

          <div className="space-y-3 text-xs md:text-sm text-muted-foreground">
            <details className="rounded-2xl border border-border/60 bg-background/50 p-4 transition group">
              <summary className="font-semibold text-foreground cursor-pointer flex items-center justify-between list-none">
                <span>Apakah link pendek ini memiliki masa kedaluwarsa?</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2.5 leading-relaxed text-muted-foreground">
                Tidak. Tautan yang dipersingkat melalui jaringan TinyURL, da.gd, dan v.gd bersifat
                permanen dan tidak akan kedaluwarsa selama tautan tujuan asli masih aktif dan tidak
                melanggar ketentuan layanan.
              </p>
            </details>

            <details className="rounded-2xl border border-border/60 bg-background/50 p-4 transition group">
              <summary className="font-semibold text-foreground cursor-pointer flex items-center justify-between list-none">
                <span>Apakah aman dibagikan di WhatsApp, Instagram, dan TikTok?</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2.5 leading-relaxed text-muted-foreground">
                Sangat aman. Link pendek yang dihasilkan langsung mengarahkan pengunjung ke halaman
                tujuan Anda tanpa popup iklan atau interstitial penipuan yang sering ditemui pada
                pemendek link lainnya.
              </p>
            </details>

            <details className="rounded-2xl border border-border/60 bg-background/50 p-4 transition group">
              <summary className="font-semibold text-foreground cursor-pointer flex items-center justify-between list-none">
                <span>Bagaimana cara membuat link dengan nama kustom (alias)?</span>
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2.5 leading-relaxed text-muted-foreground">
                Buka menu "Opsi Lanjutan &amp; Nama Kustom", lalu ketikkan nama panggilan yang kamu
                inginkan (misal: <code>promo-hebat</code>). Jika nama tersebut belum dipakai oleh
                orang lain, tautanmu akan menjadi <code>https://tinyurl.com/promo-hebat</code>.
              </p>
            </details>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

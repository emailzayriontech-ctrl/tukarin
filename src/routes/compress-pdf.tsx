import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { compressPdf, type CompressLevel } from "@/lib/tools/compressPdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { Loader2 } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "compress-pdf")!;

export const Route = createFileRoute("/compress-pdf")({
  head: () => ({
    meta: [
      { title: "Kompres PDF — Tukar.in" },
      { name: "description", content: "Perkecil ukuran file PDF dengan menurunkan resolusi halaman. 3 level kompresi." },
      { property: "og:title", content: "Kompres PDF — Tukar.in" },
      { property: "og:description", content: "Kurangi ukuran PDF dengan cepat — pilih level Low, Medium, atau High." },
    ],
  }),
  component: Page,
});

const LEVELS: { value: CompressLevel; label: string; desc: string; badge?: string }[] = [
  {
    value: "lossless",
    label: "Cerdas",
    desc: "Teks tetap tajam, tanpa kehilangan kualitas. Cocok untuk dokumen teks.",
    badge: "Direkomendasikan",
  },
  {
    value: "target",
    label: "Target ukuran",
    desc: "Tentukan batas MB — kualitas diturunkan otomatis sampai tercapai.",
  },
  { value: "low", label: "Kualitas tinggi", desc: "Hampir tidak ada penurunan visual" },
  { value: "medium", label: "Seimbang", desc: "Kualitas bagus, ukuran lebih kecil" },
  { value: "high", label: "Ukuran terkecil", desc: "Kompresi maksimal untuk PDF dari scan/gambar" },
];

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressLevel>("lossless");
  const [targetMB, setTargetMB] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: 0 });
    try {
      const blob = await compressPdf(
        file,
        level,
        (d, t) => setProgress({ done: d, total: t }),
        targetMB,
      );
      setResult(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengompres PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && !result && (
        <FileDropzone
          onFiles={onPick}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Letakkan PDF yang ingin dikompres"
          hint="Satu file PDF"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="font-medium">{file.name}</div>
            <div className="text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Level kompresi
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={`relative rounded-xl border p-4 text-left transition ${
                    level === l.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{l.label}</div>
                    {l.badge && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {l.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{l.desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Mode <strong>Cerdas</strong> menjaga teks tetap tajam tanpa kehilangan kualitas. Mode
              lainnya me-raster halaman menjadi gambar — cocok untuk PDF hasil scan atau dokumen
              berisi banyak gambar.
            </p>

            {level === "target" && (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Target ukuran maksimal (MB)
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={targetMB}
                    onChange={(e) => setTargetMB(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tukar.in akan menurunkan kualitas secara bertahap sampai hasilnya di bawah batas
                  ini. Jika target sangat kecil, kualitas akhir bisa cukup rendah.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {busy && progress.total > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Memproses halaman {progress.done} / {progress.total}…
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengompres…
                </>
              ) : (
                "Kompres PDF"
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={reset} disabled={busy}>
              Reset
            </Button>
          </div>
        </div>
      )}

      {result && file && (
        <ResultPanel
          originalSize={file.size}
          totalSize={result.size}
          description="PDF kamu sudah dikompres."
          onDownload={() => downloadBlob(result, file.name.replace(/\.pdf$/i, "") + "-kompres.pdf")}
          onReset={reset}
        />
      )}
    </ToolPageShell>
  );
}

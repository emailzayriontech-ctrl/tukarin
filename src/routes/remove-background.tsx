import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { removeColorBackground } from "@/lib/tools/removeBackground";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, Pipette } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "remove-background")!;

export const Route = createFileRoute("/remove-background")({
  head: () => ({
    meta: [
      { title: "Hapus Latar Belakang (Magic Wand) — Tukar.in" },
      { name: "description", content: "Hapus warna background solid (seperti putih/hijau) secara instan secara privat di browser." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetColor, setTargetColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });
  const [tolerance, setTolerance] = useState(30);
  const [feather, setFeather] = useState(5);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFiles(files: File[]) {
    if (files.length > 0) {
      const f = files[0]!;
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setResult(null);
      setError(null);
      // Default color to white
      setTargetColor({ r: 255, g: 255, b: 255 });
    }
  }

  // Draw target preview on changes
  useEffect(() => {
    if (!file || !previewUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Scale canvas to fit container but keep aspect ratio
      const maxW = 500;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Perform real-time preview removal on canvas
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const tr = targetColor.r;
      const tg = targetColor.g;
      const tb = targetColor.b;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const dist = Math.sqrt((r - tr) * (r - tr) + (g - tg) * (g - tg) + (b - tb) * (b - tb));

        if (dist <= tolerance) {
          data[i + 3] = 0;
        } else if (dist <= tolerance + feather && feather > 0) {
          const factor = (dist - tolerance) / feather;
          data[i + 3] = Math.min(data[i + 3]!, Math.round(factor * 255));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };
    img.src = previewUrl;
  }, [file, previewUrl, targetColor, tolerance, feather]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !previewUrl) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Temporary canvas to sample the original un-modified pixel color
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    const img = new Image();
    img.onload = () => {
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      const pixel = tempCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      setTargetColor({
        r: pixel[0]!,
        g: pixel[1]!,
        b: pixel[2]!,
      });
      setResult(null);
    };
    img.src = previewUrl;
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await removeColorBackground(file, targetColor, tolerance, feather);
      setResult(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus background.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setTargetColor({ r: 255, g: 255, b: 255 });
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && (
        <FileDropzone
          onFiles={handleFiles}
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
          label="Letakkan gambar di sini"
          hint="JPG, PNG, WebP dengan latar belakang putih/hijau/solid"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <div className="mb-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Pipette className="h-3.5 w-3.5" /> Klik bagian gambar untuk memilih warna background
              </div>
              <div
                className="relative overflow-hidden rounded-lg bg-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><rect width='10' height='10' fill='%23e5e5e5'/><rect x='10' y='10' width='10' height='10' fill='%23e5e5e5'/></svg>")`
                }}
              >
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="cursor-crosshair block max-w-full h-auto"
                />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                File: {file.name} ({formatBytes(file.size)})
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Warna yang Dihapus (RGB)
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg border border-border"
                    style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
                  />
                  <span className="text-sm font-mono text-muted-foreground">
                    rgb({targetColor.r}, {targetColor.g}, {targetColor.b})
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Toleransi Warna (Tolerance): {tolerance}
                </label>
                <input
                  type="range"
                  min={1}
                  max={150}
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Tingkatkan nilai jika warna latar belakang masih tersisa di sekitar objek.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kelembutan Pinggiran (Feather): {feather}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={feather}
                  onChange={(e) => setFeather(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Haluskan pinggiran potongan agar tidak terlihat tajam/kasar.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses…
                </>
              ) : (
                "Hapus Background"
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
          description="Background berhasil dihapus!"
          onDownload={() => {
            const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            downloadBlob(result, `${baseName}-no-bg.png`);
          }}
          onReset={reset}
          downloadLabel="Unduh Gambar PNG"
        />
      )}
    </ToolPageShell>
  );
}

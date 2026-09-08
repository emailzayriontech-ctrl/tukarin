import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { signPdfDocument } from "@/lib/tools/signPdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, PenTool, Eraser, Upload } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "sign-pdf")!;

export const Route = createFileRoute("/sign-pdf")({
  head: () => ({
    meta: [
      { title: "Tanda Tangan PDF — Tukar.in" },
      { name: "description", content: "Bubuhkan tanda tangan digital pada halaman PDF kamu secara langsung." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Canvas ref for drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  function handleFiles(files: File[]) {
    if (files.length > 0) {
      setFile(files[0]!);
      setResult(null);
      setError(null);
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureUrl(null);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSignatureUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(f);
    }
  }

  // Canvas drawing handlers
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }

  function stopDrawing() {
    if (isDrawing.current) {
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureUrl(canvas.toDataURL("image/png"));
      }
    }
  }

  async function run() {
    if (!file || !signatureUrl) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signPdfDocument(file, signatureUrl, {
        targetPages: [], // all pages or last page
        xPercent: 60,
        yPercent: 10,
        scalePercent: 30,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal meletakkan tanda tangan pada PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setSignatureUrl(null);
    setResult(null);
    setError(null);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!file && (
        <FileDropzone
          onFiles={handleFiles}
          accept={{ "application/pdf": [".pdf"] }}
          label="Letakkan file PDF di sini"
          hint="Pilih 1 file PDF yang ingin ditandatangani"
        />
      )}

      {file && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>
                Ganti file
              </Button>
            </div>

            <div className="pt-3 border-t border-border/50 space-y-3">
              <label className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-primary" /> Buat / Upload Tanda Tangan
                </span>
                <div className="flex gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                    <Upload className="h-3.5 w-3.5" /> Upload File TTD
                    <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <button type="button" onClick={clearCanvas} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                    <Eraser className="h-3.5 w-3.5" /> Hapus
                  </button>
                </div>
              </label>

              <div className="rounded-xl border-2 border-dashed border-border bg-background p-2 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="cursor-crosshair touch-none bg-white rounded-lg w-full max-w-md h-36 border border-border/60 shadow-inner"
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Gunakan tetikus (mouse) atau layar sentuh untuk melukis tanda tangan di atas kotak.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy || !signatureUrl} className="min-w-44">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membubuhi TTD...
                </>
              ) : (
                "Bubuhkan Tanda Tangan"
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
          description="Tanda tangan berhasil dibubuhkan pada dokumen PDF!"
          onDownload={() => downloadBlob(result, `signed-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF Tertanda Tangan"
        />
      )}
    </ToolPageShell>
  );
}

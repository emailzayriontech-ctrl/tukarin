import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { protectPdf } from "@/lib/tools/protectPdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "protect-pdf")!;

export const Route = createFileRoute("/protect-pdf")({
  head: () => ({
    meta: [
      { title: "Kunci PDF dengan Kata Sandi — Tukar.in" },
      { name: "description", content: "Amankan dokumen PDF kamu dengan memberikan kata sandi enkripsi rahasia." },
    ],
  }),
  component: Page,
});

function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: File[]) {
    if (files.length > 0) {
      setFile(files[0]!);
      setResult(null);
      setError(null);
    }
  }

  async function run() {
    if (!file) return;
    if (!password.trim()) {
      setError("Silakan masukkan kata sandi terlebih dahulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await protectPdf(file, password.trim());
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunci PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPassword("");
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
          hint="Pilih 1 file PDF yang ingin diamankan dengan kata sandi"
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

            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Kata Sandi Enkripsi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi rahasia..."
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy || !password.trim()} className="min-w-44">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunci PDF...
                </>
              ) : (
                "Kunci PDF Sekarang"
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
          description="PDF berhasil dikunci dengan kata sandi enkripsi!"
          onDownload={() => downloadBlob(result, `protected-${file.name}`)}
          onReset={reset}
          downloadLabel="Unduh PDF Terkunci"
        />
      )}
    </ToolPageShell>
  );
}

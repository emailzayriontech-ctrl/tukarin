import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { SortableFileGrid, type SortableItem } from "@/components/tools/SortableFileGrid";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { imagesToPdf, type PageSize, type Orientation } from "@/lib/tools/imageToPdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { Loader2, Plus } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "image-to-pdf")!;

export const Route = createFileRoute("/image-to-pdf")({
  head: () => ({
    meta: [
      { title: "Gambar ke PDF — Tukar.in" },
      {
        name: "description",
        content:
          "Ubah JPG, PNG, atau WebP menjadi PDF. Multi-file, drag untuk reorder, putar halaman, atur ukuran kertas.",
      },
      { property: "og:title", content: "Gambar ke PDF — Tukar.in" },
      {
        property: "og:description",
        content: "Gabungkan beberapa gambar menjadi satu PDF rapi dalam hitungan detik.",
      },
    ],
  }),
  component: Page,
});

type Item = SortableItem & { file: File };

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState(24);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      items.forEach((i) => i.thumbnailUrl && URL.revokeObjectURL(i.thumbnailUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(files: File[]) {
    const accepted = files.filter((f) => /^image\/(png|jpe?g|webp)$/i.test(f.type));
    const newItems: Item[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      file,
      rotation: 0,
      thumbnailUrl: URL.createObjectURL(file),
    }));
    setItems((prev) => [...prev, ...newItems]);
    setResult(null);
    setError(null);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function rotateItem(id: string) {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: ((p.rotation ?? 0) + 90) % 360 } : p)),
    );
  }

  async function convert() {
    setBusy(true);
    setError(null);
    try {
      const blob = await imagesToPdf(
        items.map((i) => ({ file: i.file, rotation: i.rotation ?? 0 })),
        { pageSize, orientation, margin },
      );
      setResult(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan saat membuat PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    items.forEach((i) => i.thumbnailUrl && URL.revokeObjectURL(i.thumbnailUrl));
    setItems([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!items.length && !result && (
        <FileDropzone
          onFiles={addFiles}
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
          label="Letakkan gambar di sini, atau klik untuk memilih"
          hint="Mendukung JPG, PNG, dan WebP — bisa pilih banyak file sekaligus"
        />
      )}

      {items.length > 0 && !result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {items.length} gambar • drag untuk atur urutan
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
              <Plus className="h-4 w-4" /> Tambah gambar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
              />
            </label>
          </div>

          <SortableFileGrid
            items={items}
            onChange={(next) =>
              setItems(next.map((n) => items.find((i) => i.id === n.id)!) as Item[])
            }
            onRemove={removeItem}
            onRotate={rotateItem}
          />

          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-3">
            <Field label="Ukuran halaman">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="fit">Fit (ikuti gambar)</option>
              </select>
            </Field>
            <Field label="Orientasi">
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as Orientation)}
                disabled={pageSize === "fit"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="auto">Otomatis</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </Field>
            <Field label={`Margin (${margin}pt)`}>
              <input
                type="range"
                min={0}
                max={72}
                step={4}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                disabled={pageSize === "fit"}
                className="w-full"
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={convert} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses…
                </>
              ) : (
                "Buat PDF"
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={reset} disabled={busy}>
              Reset
            </Button>
          </div>
        </div>
      )}

      {result && (
        <ResultPanel
          totalSize={result.size}
          description={`PDF kamu (${items.length} halaman) siap diunduh.`}
          onDownload={() => downloadBlob(result, "tukar-in.pdf")}
          onReset={reset}
        />
      )}
    </ToolPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

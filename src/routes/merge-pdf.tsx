import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { SortableFileGrid, type SortableItem } from "@/components/tools/SortableFileGrid";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { mergePdfs } from "@/lib/tools/mergePdf";
import { downloadBlob } from "@/lib/downloadHelpers";
import { Loader2, Plus } from "lucide-react";

const TOOL = TOOLS.find((t) => t.slug === "merge-pdf")!;

export const Route = createFileRoute("/merge-pdf")({
  head: () => ({
    meta: [
      { title: "Gabung PDF — Tukar.in" },
      { name: "description", content: "Gabungkan beberapa file PDF menjadi satu dokumen dengan urutan yang kamu mau." },
      { property: "og:title", content: "Gabung PDF — Tukar.in" },
      { property: "og:description", content: "Merge banyak PDF jadi satu file. Drag untuk atur urutan." },
    ],
  }),
  component: Page,
});

type Item = SortableItem & { file: File };

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  function add(files: File[]) {
    const accepted = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const next: Item[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      file,
    }));
    setItems((p) => [...p, ...next]);
    setResult(null);
    setError(null);
  }

  function remove(id: string) {
    setItems((p) => p.filter((x) => x.id !== id));
  }

  async function run() {
    if (items.length < 2) {
      setError("Pilih minimal 2 file PDF untuk digabung.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await mergePdfs(items.map((i) => i.file));
      setResult(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menggabung PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setItems([]);
    setResult(null);
    setError(null);
  }

  return (
    <ToolPageShell tool={TOOL}>
      {!items.length && !result && (
        <FileDropzone
          onFiles={add}
          accept={{ "application/pdf": [".pdf"] }}
          label="Letakkan PDF di sini (minimal 2 file)"
          hint="Drag file lain untuk menambah, atau gunakan tombol di bawah"
        />
      )}

      {items.length > 0 && !result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {items.length} file • drag untuk atur urutan
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
              <Plus className="h-4 w-4" /> Tambah PDF
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && add(Array.from(e.target.files))}
              />
            </label>
          </div>

          <SortableFileGrid
            items={items}
            onChange={(next) =>
              setItems(next.map((n) => items.find((i) => i.id === n.id)!) as Item[])
            }
            onRemove={remove}
          />

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={run} disabled={busy} className="min-w-40">
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menggabung…
                </>
              ) : (
                "Gabung PDF"
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
          description={`Berhasil menggabung ${items.length} file PDF.`}
          onDownload={() => downloadBlob(result, "tukar-in-gabung.pdf")}
          onReset={reset}
        />
      )}
    </ToolPageShell>
  );
}

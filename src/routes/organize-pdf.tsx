import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { FileDropzone } from "@/components/tools/FileDropzone";
import { ResultPanel } from "@/components/tools/ResultPanel";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools/registry";
import { reorderOrDeletePdfPages } from "@/lib/tools/organizePdf";
import { renderPdfPages } from "@/lib/tools/pdfToImage";
import { downloadBlob } from "@/lib/downloadHelpers";
import { formatBytes } from "@/lib/formatBytes";
import { Loader2, Trash2, GripVertical, FilePlus2, ImagePlus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TOOL = TOOLS.find((t) => t.slug === "organize-pdf")!;

export const Route = createFileRoute("/organize-pdf")({
  head: () => ({
    meta: [
      { title: "Edit & Susun Halaman PDF — Tukar.in" },
      { name: "description", content: "Geser halaman PDF, hapus yang tidak perlu, atau gabungkan dengan PDF lain secara visual." },
    ],
  }),
  component: Page,
});

type PageItem = {
  id: string; // unique string for dnd-kit
  fileId: string;
  pageIndex: number; // 0-indexed original page
  pageNumber: number; // visual page number from original file
  thumbnailUrl: string;
  sourceFileName: string;
  isImage?: boolean; // flag if it's an image file
};

function Page() {
  const [filesMap, setFilesMap] = useState<Record<string, File>>({});
  const [pages, setPages] = useState<PageItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setResult(null);
    setError(null);
    setLoadingPages(true);

    try {
      const newPages: PageItem[] = [...pages];
      const newFilesMap = { ...filesMap };

      for (const file of files) {
        const fileId = `${file.name}-${file.size}-${Date.now()}`;
        newFilesMap[fileId] = file;

        if (file.type.startsWith("image/")) {
          // It's an image, just add it directly as 1 page
          newPages.push({
            id: `${fileId}-img`,
            fileId,
            pageIndex: 0,
            pageNumber: 1, // It's just 1 page
            thumbnailUrl: URL.createObjectURL(file),
            sourceFileName: file.name,
            isImage: true,
          });
        } else {
          // It's a PDF, extract its pages
          const rendered = await renderPdfPages(
            file,
            { scale: 0.3, format: "image/jpeg" }
          );

          for (const item of rendered) {
            newPages.push({
              id: `${fileId}-${item.pageNumber}`,
              fileId,
              pageIndex: item.pageNumber - 1,
              pageNumber: item.pageNumber,
              thumbnailUrl: URL.createObjectURL(item.blob),
              sourceFileName: file.name,
            });
          }
        }
      }

      setFilesMap(newFilesMap);
      setPages(newPages);
    } catch (e) {
      setError("Gagal membaca dokumen PDF/Gambar. Pastikan file tidak rusak.");
    } finally {
      setLoadingPages(false);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((i) => i.id === active.id);
    const newIndex = pages.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setPages(arrayMove(pages, oldIndex, newIndex));
  }

  function removePage(id: string) {
    setPages((p) => p.filter((item) => item.id !== id));
  }

  async function run() {
    if (!Object.keys(filesMap).length || !pages.length) return;
    setBusy(true);
    setError(null);
    try {
      const keptPages = pages.map((p) => ({
        fileId: p.fileId,
        pageIndex: p.pageIndex,
        isImage: p.isImage,
      }));
      const res = await reorderOrDeletePdfPages(filesMap, keptPages);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan PDF.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    // Revoke object urls to free memory
    pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    setFilesMap({});
    setPages([]);
    setResult(null);
    setError(null);
  }

  function onAddFileClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  const hasFiles = Object.keys(filesMap).length > 0;

  return (
    <ToolPageShell tool={TOOL}>
      {/* Hidden file input for adding more PDFs or Images */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf, image/jpeg, image/png, image/webp"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {!hasFiles && (
        <FileDropzone
          onFiles={handleFiles}
          accept={{ "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
          label="Letakkan file PDF / Gambar di sini"
          hint="Pilih 1 atau lebih file PDF/JPG yang halamannya ingin diatur/digabung"
          multiple
        />
      )}

      {hasFiles && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-lg">Editor Halaman PDF</div>
                <div className="text-sm text-muted-foreground">
                  {Object.keys(filesMap).length} file dimuat • {pages.length} halaman
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onAddFileClick} disabled={loadingPages}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Tambah PDF/Gambar
                </Button>
                <Button size="sm" variant="ghost" onClick={reset}>
                  Mulai Ulang
                </Button>
              </div>
            </div>

            {loadingPages && (
              <div className="my-10 flex flex-col items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mb-3 h-6 w-6 animate-spin text-primary" />
                Membaca dan merender halaman...
              </div>
            )}

            {!loadingPages && (
              <div className="mt-8">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {pages.map((p, idx) => (
                        <SortablePageTile
                          key={p.id}
                          item={p}
                          index={idx}
                          onRemove={removePage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={run}
              disabled={busy || loadingPages || !pages.length}
              className="min-w-48 text-base h-12 rounded-xl"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses PDF...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </div>
      )}

      {result && hasFiles && (
        <ResultPanel
          originalSize={Object.values(filesMap).reduce((acc, f) => acc + f.size, 0)}
          totalSize={result.size}
          description="Halaman PDF berhasil disusun, digabung, dan dibersihkan!"
          onDownload={() => downloadBlob(result, `edited-pdf.pdf`)}
          onReset={reset}
          downloadLabel="Unduh PDF Baru"
        />
      )}
    </ToolPageShell>
  );
}

function SortablePageTile({
  item,
  index,
  onRemove,
}: {
  item: PageItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[1/1.414] w-full bg-muted/30">
        <img
          src={item.thumbnailUrl}
          alt={`Halaman ${item.pageNumber}`}
          className="h-full w-full object-cover object-top"
          draggable={false}
        />
        
        {/* Hapus Button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-destructive/90 text-destructive-foreground opacity-0 shadow-sm transition-opacity hover:bg-destructive group-hover:opacity-100"
          title="Hapus Halaman"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute bottom-2 left-2 grid h-8 w-8 cursor-grab place-items-center rounded-md bg-background/90 text-foreground shadow-sm hover:bg-background active:cursor-grabbing"
          title="Geser"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Page Sequence Indicator */}
        <div className="absolute bottom-2 right-2 rounded-md bg-primary/90 px-2 py-1 text-xs font-bold text-primary-foreground shadow-sm">
          {index + 1}
        </div>
      </div>
      <div className="px-3 py-2 border-t border-border/50">
        <div className="text-xs font-semibold text-foreground">Hal {item.pageNumber}</div>
        <div className="truncate text-[10px] text-muted-foreground" title={item.sourceFileName}>
          {item.sourceFileName}
        </div>
      </div>
    </div>
  );
}

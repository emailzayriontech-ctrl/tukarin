import { CheckCircle2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/formatBytes";

type Props = {
  title?: string;
  description?: string;
  totalSize?: number;
  originalSize?: number;
  onDownload: () => void;
  onReset: () => void;
  downloadLabel?: string;
};

export function ResultPanel({
  title = "Selesai!",
  description = "File kamu siap diunduh.",
  totalSize,
  originalSize,
  onDownload,
  onReset,
  downloadLabel = "Unduh hasil",
}: Props) {
  const saved =
    originalSize && totalSize && originalSize > totalSize
      ? Math.round((1 - totalSize / originalSize) * 100)
      : null;
  return (
    <div className="rounded-2xl border border-[color:var(--color-cat-optimize)]/30 bg-[color:var(--color-cat-optimize-soft)]/60 p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--color-cat-optimize)] text-white">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-3 text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {(totalSize !== undefined || saved !== null) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          {originalSize !== undefined && (
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground line-through">
              {formatBytes(originalSize)}
            </span>
          )}
          {totalSize !== undefined && (
            <span className="rounded-full bg-foreground px-2.5 py-1 font-medium text-background">
              {formatBytes(totalSize)}
            </span>
          )}
          {saved !== null && saved > 0 && (
            <span className="rounded-full bg-[color:var(--color-cat-optimize)] px-2.5 py-1 font-semibold text-white">
              −{saved}%
            </span>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" /> {downloadLabel}
        </Button>
        <Button size="lg" variant="outline" onClick={onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Mulai lagi
        </Button>
      </div>
    </div>
  );
}

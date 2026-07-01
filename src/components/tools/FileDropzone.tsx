import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

export function FileDropzone({
  onFiles,
  accept,
  multiple = true,
  label = "Letakkan file di sini, atau klik untuk memilih",
  hint,
  className,
}: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    onDrop: (files) => files.length && onFiles(files),
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 text-center transition-colors hover:border-primary/60 hover:bg-accent/40",
        isDragActive && "border-primary bg-accent/60",
        className,
      )}
    >
      <input {...getInputProps()} />
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <UploadCloud className="h-7 w-7" />
      </div>
      <p className="mt-4 text-base font-semibold">{label}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

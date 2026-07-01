import imageCompression from "browser-image-compression";

export type ImgQuality = "low" | "medium" | "high";

export async function compressImageFile(
  file: File,
  opts: { quality: number; maxDimension: number; targetMB?: number },
): Promise<File> {
  return await imageCompression(file, {
    maxSizeMB: opts.targetMB && opts.targetMB > 0 ? opts.targetMB : 50,
    maxWidthOrHeight: opts.maxDimension,
    initialQuality: opts.quality,
    useWebWorker: true,
    fileType: file.type.includes("png") ? "image/png" : "image/jpeg",
  });
}

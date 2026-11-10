import imageCompression from "browser-image-compression";
import { convertImageFile, type TargetFormat } from "./convertImage";

export type ImgQuality = "low" | "medium" | "high";

export async function compressImageFile(
  file: File,
  opts: { quality: number; maxDimension: number; targetMB?: number; outputFormat?: string },
): Promise<File> {
  let targetType = file.type;
  if (opts.outputFormat && opts.outputFormat !== "original") {
    targetType = opts.outputFormat;
  }

  const origMB = file.size / (1024 * 1024);

  // Calculate intelligent maxSizeMB ceiling so compressor never assumes 50MB is fine.
  // If targetMB is provided, respect it. Otherwise, always target less than the input file size.
  let calculatedTargetMB = opts.targetMB;
  if (!calculatedTargetMB || calculatedTargetMB <= 0) {
    if (opts.quality <= 0.25) {
      calculatedTargetMB = Math.min(0.095, Math.max(0.02, origMB * 0.5));
    } else if (opts.quality <= 0.5) {
      calculatedTargetMB = Math.max(0.03, origMB * 0.7);
    } else {
      calculatedTargetMB = Math.max(0.04, origMB * 0.92);
    }
  }

  // If output format is WebP, use our adaptive canvas engine directly:
  // It guarantees no size bloat, fast client-side execution, and strict file size reduction (<100KB on low quality).
  if (targetType === "image/webp") {
    const targetBytes = calculatedTargetMB ? calculatedTargetMB * 1024 * 1024 : undefined;
    const { blob, filename } = await convertImageFile(
      file,
      "image/webp",
      opts.quality,
      opts.maxDimension,
      targetBytes,
    );
    return new File([blob], filename, { type: "image/webp", lastModified: Date.now() });
  }

  let compressedBlob: Blob;
  try {
    const result = await imageCompression(file, {
      maxSizeMB: calculatedTargetMB,
      maxWidthOrHeight: opts.maxDimension,
      initialQuality: opts.quality,
      useWebWorker: true,
      fileType: targetType,
    });
    compressedBlob = result;
  } catch {
    // If browser-image-compression fails, fall back to our adaptive canvas engine
    const targetBytes = calculatedTargetMB ? calculatedTargetMB * 1024 * 1024 : undefined;
    const targetFmt: TargetFormat = targetType === "image/png" ? "image/png" : "image/jpeg";
    const { blob } = await convertImageFile(
      file,
      targetFmt,
      opts.quality,
      opts.maxDimension,
      targetBytes,
    );
    compressedBlob = blob;
  }

  // Anti-bloat guarantee: If the compressed file is larger than the original file,
  // adaptively scale it down so it never upscales in size.
  if (compressedBlob.size > file.size) {
    try {
      const targetBytes = calculatedTargetMB ? calculatedTargetMB * 1024 * 1024 : file.size * 0.9;
      const targetFmt: TargetFormat = targetType === "image/png" ? "image/png" : "image/jpeg";
      const { blob } = await convertImageFile(
        file,
        targetFmt,
        Math.min(opts.quality, 0.6),
        Math.min(opts.maxDimension, 1920),
        targetBytes,
      );
      if (blob.size < compressedBlob.size) {
        compressedBlob = blob;
      }
    } catch {
      // ignore
    }

    // If still larger than original and format is original, keep original file
    if (compressedBlob.size >= file.size && (opts.outputFormat === "original" || targetType === file.type)) {
      return file;
    }
  }

  const lastDot = file.name.lastIndexOf(".");
  const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
  let newName = file.name;

  if (targetType === "image/jpeg") {
    newName = `${baseName}.jpg`;
  } else if (targetType === "image/png") {
    newName = `${baseName}.png`;
  } else if (targetType === "image/webp") {
    newName = `${baseName}.webp`;
  } else {
    newName = file.name;
  }

  return new File([compressedBlob], newName, { type: targetType, lastModified: Date.now() });
}



import imageCompression from "browser-image-compression";

export type ImgQuality = "low" | "medium" | "high";

export async function compressImageFile(
  file: File,
  opts: { quality: number; maxDimension: number; targetMB?: number; outputFormat?: string },
): Promise<File> {
  let targetType = file.type;
  if (opts.outputFormat && opts.outputFormat !== "original") {
    targetType = opts.outputFormat;
  }

  const result = await imageCompression(file, {
    maxSizeMB: opts.targetMB && opts.targetMB > 0 ? opts.targetMB : 50,
    maxWidthOrHeight: opts.maxDimension,
    initialQuality: opts.quality,
    useWebWorker: true,
    fileType: targetType,
  });

  // Adjust filename extension if the format was converted
  if (opts.outputFormat && opts.outputFormat !== "original") {
    const lastDot = file.name.lastIndexOf(".");
    const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
    let newName = file.name;

    if (targetType === "image/jpeg") {
      newName = `${baseName}.jpg`;
    } else if (targetType === "image/png") {
      newName = `${baseName}.png`;
    } else if (targetType === "image/webp") {
      newName = `${baseName}.webp`;
    }

    return new File([result], newName, { type: targetType, lastModified: Date.now() });
  }

  return result;
}


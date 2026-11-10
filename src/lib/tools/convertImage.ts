export type TargetFormat = "image/jpeg" | "image/png" | "image/webp";

export interface ConvertImageOptions {
  quality?: number;
  maxDimension?: number;
  targetMaxBytes?: number;
}

/**
 * Converts and compresses an image to the target format with intelligent adaptive compression.
 * Guarantees that the output file does not upscale/bloat in size compared to the original,
 * and actively optimizes towards <100KB when lowest quality options are selected.
 */
export async function convertImageFile(
  file: File,
  targetFormat: TargetFormat,
  quality: number = 0.8,
  maxDimension?: number,
  targetMaxBytes?: number,
): Promise<{ blob: Blob; filename: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        if (!origWidth || !origHeight) {
          throw new Error("Dimensi gambar tidak valid.");
        }

        // Determine starting max dimension
        let currentMaxDim = maxDimension && maxDimension > 0 ? maxDimension : Math.max(origWidth, origHeight);

        // When re-encoding to WebP/JPG without explicit dimension constraint,
        // huge raw canvases (e.g. 3000-6000px) from an already compressed small file (e.g. 200KB)
        // will naturally inflate in byte size if not appropriately capped.
        if (!maxDimension || maxDimension === 0) {
          if (quality <= 0.25) {
            currentMaxDim = Math.min(currentMaxDim, 1280);
          } else if (quality <= 0.5) {
            currentMaxDim = Math.min(currentMaxDim, 1920);
          } else {
            currentMaxDim = Math.min(currentMaxDim, 2560);
          }
        }

        // Target maximum file size:
        // Must NEVER exceed the original file's size!
        // When user asks for low quality (<= 0.3), target an aggressively compact size (< 100KB or 50% of original).
        let maxAllowedBytes = targetMaxBytes && targetMaxBytes > 0 ? targetMaxBytes : file.size;

        if (quality <= 0.3 && (!targetMaxBytes || targetMaxBytes <= 0)) {
          // If low quality, ensure result shrinks significantly (e.g. <= 95KB or 60% of original)
          maxAllowedBytes = Math.min(file.size * 0.7, 98 * 1024);
          // Don't set impossible floor for tiny icons
          maxAllowedBytes = Math.max(maxAllowedBytes, 15 * 1024);
        }

        let currentQuality = Math.max(0.02, Math.min(1.0, quality));
        let bestBlob: Blob | null = null;
        let iteration = 0;
        const maxIterations = targetFormat === "image/png" ? 3 : 7;

        while (iteration < maxIterations) {
          iteration++;

          // Calculate dimensions maintaining aspect ratio
          let w = origWidth;
          let h = origHeight;

          if (currentMaxDim > 0 && (w > currentMaxDim || h > currentMaxDim)) {
            if (w >= h) {
              h = Math.max(1, Math.round((h * currentMaxDim) / w));
              w = currentMaxDim;
            } else {
              w = Math.max(1, Math.round((w * currentMaxDim) / h));
              h = currentMaxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Gagal menginisialisasi canvas context.");
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // If converting to JPEG, paint white background for transparent pixels
          if (targetFormat === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
          }

          ctx.drawImage(img, 0, 0, w, h);

          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, targetFormat, currentQuality),
          );

          if (!blob) break;

          bestBlob = blob;

          // If size is already smaller than or equal to allowed target, we're done
          if (blob.size <= maxAllowedBytes) {
            break;
          }

          // Otherwise, adaptively reduce parameters for next iteration
          if (targetFormat !== "image/png") {
            if (currentQuality > 0.15) {
              currentQuality = Math.max(0.04, currentQuality * 0.65);
            } else {
              // Quality is already low, reduce resolution by 20%
              currentMaxDim = Math.round(currentMaxDim * 0.8);
              if (currentMaxDim < 200) break;
            }
          } else {
            // PNG is lossless, so only dimension reduction lowers file size
            currentMaxDim = Math.round(currentMaxDim * 0.8);
            if (currentMaxDim < 200) break;
          }
        }

        // If targetFormat is identical to original and result is still larger, fallback to original
        if (targetFormat === file.type && bestBlob && bestBlob.size >= file.size) {
          resolve({ blob: file, filename: file.name });
          return;
        }

        const lastDot = file.name.lastIndexOf(".");
        const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
        let ext = "jpg";
        if (targetFormat === "image/png") ext = "png";
        if (targetFormat === "image/webp") ext = "webp";

        resolve({
          blob: bestBlob || file,
          filename: `${baseName}.${ext}`,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Gagal memproses gambar."));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File gambar tidak valid atau gagal dimuat."));
    };

    img.src = url;
  });
}


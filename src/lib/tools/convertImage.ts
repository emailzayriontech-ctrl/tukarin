export type TargetFormat = "image/jpeg" | "image/png" | "image/webp";

export async function convertImageFile(
  file: File,
  targetFormat: TargetFormat,
  quality: number = 0.8,
  maxDimension?: number,
): Promise<{ blob: Blob; filename: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down proportionately if maxDimension is set
      if (maxDimension && maxDimension > 0) {
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Gagal menginisialisasi canvas context."));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // If converting to JPEG, paint a white background for PNG transparency
      if (targetFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengonversi format gambar."));
            return;
          }

          // Strictly preserve the original base name
          const lastDot = file.name.lastIndexOf(".");
          const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
          let ext = "jpg";
          if (targetFormat === "image/png") ext = "png";
          if (targetFormat === "image/webp") ext = "webp";

          resolve({ blob, filename: `${baseName}.${ext}` });
        },
        targetFormat,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File gambar tidak valid atau gagal dimuat."));
    };

    img.src = url;
  });
}

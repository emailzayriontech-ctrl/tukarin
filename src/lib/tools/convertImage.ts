export type TargetFormat = "image/jpeg" | "image/png" | "image/webp";

export async function convertImageFile(
  file: File,
  targetFormat: TargetFormat,
  quality: number = 0.92,
): Promise<{ blob: Blob; filename: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Gagal menginisialisasi canvas context."));
        return;
      }

      // If converting to JPEG, paint a white background for PNG transparency
      if (targetFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengonversi format gambar."));
            return;
          }

          const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
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

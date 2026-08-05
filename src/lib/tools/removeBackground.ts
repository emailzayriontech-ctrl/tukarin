export async function removeColorBackground(
  file: File,
  targetColor: { r: number; g: number; b: number },
  tolerance: number, // 0 to 200
  feather: number, // 0 to 50
): Promise<Blob> {
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

      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const tr = targetColor.r;
      const tg = targetColor.g;
      const tb = targetColor.b;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;

        // Euclidean color distance
        const dist = Math.sqrt((r - tr) * (r - tr) + (g - tg) * (g - tg) + (b - tb) * (b - tb));

        if (dist <= tolerance) {
          data[i + 3] = 0;
        } else if (dist <= tolerance + feather && feather > 0) {
          const factor = (dist - tolerance) / feather;
          data[i + 3] = Math.min(data[i + 3]!, Math.round(factor * 255));
        }
      }

      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal menghapus latar belakang."));
            return;
          }
          resolve(blob);
        },
        "image/png"
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar."));
    };

    img.src = url;
  });
}

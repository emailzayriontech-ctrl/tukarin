export async function upscaleImageFile(
  file: File,
  scale: number, // 2 or 4
  sharpenAmount: number, // 0 to 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const w = img.width * scale;
      const h = img.height * scale;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal menginisialisasi canvas context."));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      if (sharpenAmount > 0) {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const width = imgData.width;
        const height = imgData.height;
        const output = ctx.createImageData(w, h);
        const dst = output.data;

        // Sharpening kernel weights
        const k = sharpenAmount;
        const weights = [
          0, -k, 0,
          -k, 1 + 4 * k, -k,
          0, -k, 0
        ];
        const side = 3;
        const halfSide = 1;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const dstOff = (y * width + x) * 4;

            let r = 0, g = 0, b = 0;

            for (let cy = 0; cy < side; cy++) {
              for (let cx = 0; cx < side; cx++) {
                const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
                const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
                const srcOff = (scy * width + scx) * 4;
                const wt = weights[cy * side + cx]!;

                r += data[srcOff]! * wt;
                g += data[srcOff + 1]! * wt;
                b += data[srcOff + 2]! * wt;
              }
            }

            dst[dstOff] = Math.min(255, Math.max(0, r));
            dst[dstOff + 1] = Math.min(255, Math.max(0, g));
            dst[dstOff + 2] = Math.min(255, Math.max(0, b));
            dst[dstOff + 3] = data[dstOff + 3]!; // preserve alpha
          }
        }
        ctx.putImageData(output, 0, 0);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal melakukan upscaling gambar."));
            return;
          }
          resolve(blob);
        },
        file.type,
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar gagal dimuat."));
    };

    img.src = url;
  });
}

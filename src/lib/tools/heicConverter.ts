export async function convertHeicFile(
  file: File,
  toType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("Konversi HEIC hanya didukung di browser.");
  }
  
  // Dynamically import heic2any only on client side to prevent SSR compile errors
  const heic2any = (await import("heic2any")).default;
  
  const converted = await heic2any({
    blob: file,
    toType,
    quality: 0.92,
  });

  if (Array.isArray(converted)) {
    return converted[0]!;
  }
  return converted;
}

import { PDFDocument } from "pdf-lib";

export async function unlockPdf(file: File, password?: string): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  
  try {
    const doc = await PDFDocument.load(bytes, {
      password: password || "",
      ignoreEncryption: !password,
    });

    // Save clean PDF without encryption
    const resultBytes = await doc.save({ useObjectStreams: true });
    return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
  } catch (e: any) {
    if (e.message?.toLowerCase().includes("password") || e.message?.toLowerCase().includes("encrypt")) {
      throw new Error("Kata sandi yang dimasukkan salah atau file memerlukan kata sandi.");
    }
    throw new Error("Gagal membuka proteksi PDF. Pastikan kata sandi benar.");
  }
}

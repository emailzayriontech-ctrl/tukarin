import { PDFDocument } from "pdf-lib";

export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword?: string,
): Promise<Blob> {
  if (!userPassword) {
    throw new Error("Kata sandi tidak boleh kosong.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // Encrypt with passwords
  doc.encrypt({
    userPassword,
    ownerPassword: ownerPassword || userPassword,
    permissions: {
      printing: "highResolution",
      modifying: false,
      copying: true,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: false,
    },
  });

  const resultBytes = await doc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

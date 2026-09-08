import { PDFDocument } from "pdf-lib";

export async function repairPdfDocument(file: File): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    
    // Create clean new PDF and copy pages
    const newDoc = await PDFDocument.create();
    const pageIndexes = Array.from({ length: doc.getPageCount() }, (_, i) => i);
    const copiedPages = await newDoc.copyPages(doc, pageIndexes);
    
    for (const p of copiedPages) {
      newDoc.addPage(p);
    }

    const resultBytes = await newDoc.save({ useObjectStreams: true });
    return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
  } catch (e: any) {
    throw new Error("Gagal memperbaiki dokumen PDF. File mungkin rusak total atau terproteksi kata sandi.");
  }
}

import { PDFDocument } from "pdf-lib";

export async function reorderOrDeletePdfPages(
  filesMap: Record<string, File>,
  keptPages: { fileId: string; pageIndex: number; isImage?: boolean }[],
): Promise<Blob> {
  const newDoc = await PDFDocument.create();

  // Cache loaded PDF documents to avoid redundant loading
  const loadedDocs: Record<string, PDFDocument> = {};

  for (const p of keptPages) {
    const file = filesMap[p.fileId];
    if (!file) throw new Error("File tidak ditemukan.");

    if (p.isImage || file.type.startsWith("image/")) {
      // Handle Image
      const bytes = new Uint8Array(await file.arrayBuffer());
      let img;
      if (file.type === "image/png") {
        img = await newDoc.embedPng(bytes);
      } else {
        // Fallback to JPG for jpeg, webp (note: pdf-lib only natively supports JPG and PNG, 
        // so WebP might fail if not converted, but we'll try to treat non-png as JPG)
        img = await newDoc.embedJpg(bytes);
      }
      
      const page = newDoc.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    } else {
      // Handle PDF
      if (!loadedDocs[p.fileId]) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        loadedDocs[p.fileId] = await PDFDocument.load(bytes);
      }

      const srcDoc = loadedDocs[p.fileId];
      
      // Copy only the required page
      const [copiedPage] = await newDoc.copyPages(srcDoc, [p.pageIndex]);
      newDoc.addPage(copiedPage);
    }
  }

  const resultBytes = await newDoc.save({ useObjectStreams: true });
  return new Blob([resultBytes as unknown as ArrayBuffer], { type: "application/pdf" });
}

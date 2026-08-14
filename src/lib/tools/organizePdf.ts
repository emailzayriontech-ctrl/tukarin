import { PDFDocument } from "pdf-lib";

export async function reorderOrDeletePdfPages(
  filesMap: Record<string, File>,
  keptPages: { fileId: string; pageIndex: number; isImage?: boolean }[],
): Promise<Blob> {
  const newDoc = await PDFDocument.create();

  // Cache loaded PDF documents to avoid redundant loading
  const loadedDocs: Record<string, PDFDocument> = {};

  // Find reference page size from the first PDF page (default to standard A4: 595.28 x 841.89)
  let refWidth = 595.28;
  let refHeight = 841.89;

  for (const p of keptPages) {
    const file = filesMap[p.fileId];
    if (file && !p.isImage && !file.type.startsWith("image/")) {
      try {
        if (!loadedDocs[p.fileId]) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          loadedDocs[p.fileId] = await PDFDocument.load(bytes);
        }
        const srcDoc = loadedDocs[p.fileId];
        const page = srcDoc.getPage(p.pageIndex);
        const size = page.getSize();
        refWidth = size.width;
        refHeight = size.height;
        break;
      } catch (e) {
        // Fallback to standard A4 if loading fails
      }
    }
  }

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
        // Fallback to JPG for jpeg, webp
        img = await newDoc.embedJpg(bytes);
      }

      // Add page with reference dimensions (matches original PDF or A4)
      const page = newDoc.addPage([refWidth, refHeight]);

      // Calculate scale to fit image within reference page bounds while preserving aspect ratio
      const scale = Math.min(refWidth / img.width, refHeight / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;

      // Center the image on the page
      const x = (refWidth - drawWidth) / 2;
      const y = (refHeight - drawHeight) / 2;

      page.drawImage(img, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
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

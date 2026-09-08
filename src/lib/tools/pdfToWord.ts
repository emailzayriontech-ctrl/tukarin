import { getPdfjs } from "./pdfjs";

export async function convertPdfToWord(
  file: File,
  onProgress?: (done: number, total: number) => void,
  mode: "visual" | "text" = "visual"
): Promise<Blob> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;

  let htmlContent = "";

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);

    let pageHtml = "";

    if (mode === "visual") {
      // Visual 1:1 Mode: Use scale 1.0 and 70% JPEG quality so data URI is <100KB.
      // This prevents MS Word from dropping large data URIs (>500KB) which causes blank white pages.
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      
      // Compress to 0.70 JPEG to fit MS Word attribute limit
      const pageImageDataUrl = canvas.toDataURL("image/jpeg", 0.70);

      pageHtml = `
        <div style="text-align:center; margin-bottom:0pt;">
          <img src="${pageImageDataUrl}" style="width:100%; max-width:6.5in; height:auto;" alt="Halaman ${i}" />
        </div>
      `;
    } else {
      // Text & Layout Mode: Extract text items and structure with MSO styles
      const viewport = page.getViewport({ scale: 1.2 });
      const textContent = await page.getTextContent();
      const items = (textContent.items as any[]).filter(
        (item) => typeof item.str === "string" && item.str.trim().length > 0
      );

      if (items.length === 0) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const pageImageDataUrl = canvas.toDataURL("image/jpeg", 0.70);

        pageHtml = `
          <div style="text-align:center; margin-bottom:12pt;">
            <img src="${pageImageDataUrl}" style="max-width:100%; height:auto;" alt="Halaman ${i}" />
          </div>
        `;
      } else {
        type TextLine = {
          y: number;
          fontSize: number;
          isBold: boolean;
          isItalic: boolean;
          items: any[];
          minX: number;
          maxX: number;
        };

        const lines: TextLine[] = [];

        for (const item of items) {
          const x = item.transform[4];
          const y = item.transform[5];
          const fontSize = Math.round(
            Math.hypot(item.transform[0], item.transform[1]) || item.height || 11
          );
          const fontName = (item.fontName || "").toLowerCase();
          const isBold = fontName.includes("bold") || fontName.includes("black") || fontName.includes("heavy");
          const isItalic = fontName.includes("italic") || fontName.includes("oblique");

          let line = lines.find((l) => Math.abs(l.y - y) <= Math.max(4, fontSize * 0.4));
          if (!line) {
            line = {
              y,
              fontSize,
              isBold,
              isItalic,
              items: [],
              minX: x,
              maxX: x + (item.width || 0),
            };
            lines.push(line);
          }

          line.items.push(item);
          line.minX = Math.min(line.minX, x);
          line.maxX = Math.max(line.maxX, x + (item.width || 0));
        }

        lines.sort((a, b) => b.y - a.y);
        const pageWidth = viewport.width;

        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          const line = lines[lIdx];
          line.items.sort((a, b) => a.transform[4] - b.transform[4]);
          const lineText = line.items.map((it) => it.str).join(" ").replace(/\s+/g, " ");

          const lineCenterX = (line.minX + line.maxX) / 2;
          const pageCenterX = pageWidth / 2;
          let align = "left";
          if (Math.abs(lineCenterX - pageCenterX) < 60 && lineText.length < 80) {
            align = "center";
          } else if (line.minX > pageWidth * 0.65) {
            align = "right";
          }

          const styleParts: string[] = [];
          styleParts.push(`font-size:${Math.min(36, Math.max(9, line.fontSize))}pt`);
          if (line.isBold) styleParts.push("font-weight:bold");
          if (line.isItalic) styleParts.push("font-style:italic");
          if (align !== "left") styleParts.push(`text-align:${align}`);
          styleParts.push("margin-top:0pt;margin-bottom:6pt;line-height:1.15;");

          pageHtml += `<p style="${styleParts.join(";")}">${escapeHtml(lineText)}</p>`;
        }
      }
    }

    // Add page section with Word page break
    htmlContent += `
      <div style="${i > 1 ? 'page-break-before:always; mso-break-type:section-break;' : ''} margin-bottom:0pt;">
        ${pageHtml}
      </div>
    `;

    onProgress?.(i, total);
  }

  await doc.cleanup();

  const wordTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Dokumen Konversi Word</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 8.5in 11.0in;
          margin: 0.5in 0.5in 0.5in 0.5in;
          mso-header-margin: 0.3in;
          mso-footer-margin: 0.3in;
        }
        div.Section1 {
          page: Section1;
        }
        body {
          font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;
          font-size: 11pt;
          line-height: 1.15;
          color: #000000;
          margin: 0;
          padding: 0;
        }
        p {
          margin: 0in;
          margin-bottom: 6pt;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${htmlContent}
      </div>
    </body>
    </html>
  `;

  return new Blob([wordTemplate], { type: "application/msword;charset=utf-8" });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import { getPdfjs } from "./pdfjs";

export async function convertPdfToWord(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;

  let htmlContent = "";

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.2 });
    const textContent = await page.getTextContent();
    const items = (textContent.items as any[]).filter(
      (item) => typeof item.str === "string" && item.str.trim().length > 0
    );

    type TextLine = {
      y: number;
      fontSize: number;
      isBold: boolean;
      isItalic: boolean;
      items: any[];
      minX: number;
      maxX: number;
      fullText: string;
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
          fullText: "",
        };
        lines.push(line);
      }

      line.items.push(item);
      line.minX = Math.min(line.minX, x);
      line.maxX = Math.max(line.maxX, x + (item.width || 0));
    }

    // Sort lines top-to-bottom (Y desc)
    lines.sort((a, b) => b.y - a.y);

    // Build full text per line
    for (const line of lines) {
      line.items.sort((a, b) => a.transform[4] - b.transform[4]);
      line.fullText = line.items.map((it) => it.str).join(" ").replace(/\s+/g, " ");
    }

    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    let pageHtml = "";
    let inTable = false;
    let tableHtml = "";

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];
      const text = line.fullText;

      // 1. Detect Header Banner (Top section of page 1 with large text or title)
      const isTopSection = i === 1 && line.y > pageHeight * 0.72;
      const isHeadingNum = /^\d+\.\s+[A-Z\s&]{3,}/.test(text);

      if (isTopSection && lIdx === 0) {
        // Start dark green header banner block
        pageHtml += `
          <div style="background-color:#1e4638; color:#ffffff; padding:16pt 20pt; margin-bottom:16pt; border-radius:4pt;">
            <p style="font-size:18pt; font-weight:bold; color:#ffffff; margin-bottom:4pt;">${escapeHtml(text)}</p>
        `;
        continue;
      }

      if (isTopSection && lIdx < 4) {
        pageHtml += `<p style="font-size:${line.fontSize}pt; color:#e2e8f0; margin-bottom:2pt;">${escapeHtml(text)}</p>`;
        if (lIdx === 3 || lIdx === lines.length - 1 || lines[lIdx + 1]?.y <= pageHeight * 0.72) {
          pageHtml += `</div>`; // Close banner
        }
        continue;
      }

      // Close header banner if open
      if (pageHtml.endsWith(";\">") && !pageHtml.endsWith("</div>")) {
        pageHtml += `</div>`;
      }

      // 2. Detect Section Titles (e.g., "1. EXECUTIVE SUMMARY & OBJECTIVE")
      if (isHeadingNum) {
        if (inTable) {
          pageHtml += tableHtml + "</table>";
          inTable = false;
          tableHtml = "";
        }
        pageHtml += `
          <p style="font-size:13pt; font-weight:bold; color:#1e4638; border-left:4pt solid #1e4638; padding-left:8pt; margin-top:14pt; margin-bottom:8pt;">
            ${escapeHtml(text)}
          </p>
        `;
        continue;
      }

      // 3. Detect Bullet points
      const isBullet = text.startsWith("•") || text.startsWith("-") || text.startsWith("*");

      // 4. Alignments
      const lineCenterX = (line.minX + line.maxX) / 2;
      const pageCenterX = pageWidth / 2;
      let align = "left";
      if (Math.abs(lineCenterX - pageCenterX) < 60 && text.length < 80) {
        align = "center";
      } else if (line.minX > pageWidth * 0.65) {
        align = "right";
      }

      // Styling
      const styleParts: string[] = [];
      styleParts.push(`font-size:${Math.min(36, Math.max(9, line.fontSize))}pt`);
      if (line.isBold) styleParts.push("font-weight:bold");
      if (line.isItalic) styleParts.push("font-style:italic");
      if (align !== "left") styleParts.push(`text-align:${align}`);
      if (isBullet) styleParts.push("margin-left:18pt;");
      styleParts.push("margin-top:0pt;margin-bottom:6pt;line-height:1.2;color:#1e293b;");

      pageHtml += `<p style="${styleParts.join(";")}">${escapeHtml(text)}</p>`;
    }

    if (inTable) {
      pageHtml += tableHtml + "</table>";
    }

    // Add page section with Word page break
    htmlContent += `
      <div style="${i > 1 ? 'page-break-before:always; mso-break-type:section-break;' : ''} margin-bottom:18pt;">
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
          margin: 0.8in 0.8in 0.8in 0.8in;
          mso-header-margin: 0.3in;
          mso-footer-margin: 0.3in;
        }
        div.Section1 {
          page: Section1;
        }
        body {
          font-family: 'Calibri', 'Arial', 'Times New Roman', sans-serif;
          font-size: 11pt;
          line-height: 1.2;
          color: #1e293b;
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

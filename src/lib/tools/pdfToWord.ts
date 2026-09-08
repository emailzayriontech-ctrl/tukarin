import JSZip from "jszip";
import { getPdfjs } from "./pdfjs";

export async function convertPdfToWord(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;

  const zip = new JSZip();

  const _relsFolder = zip.folder("_rels");
  const wordFolder = zip.folder("word");
  const wordRelsFolder = wordFolder?.folder("_rels");

  let firstPageWidthPt = 612;
  let firstPageHeightPt = 792;

  const bodyElementsXml: string[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    if (i === 1) {
      firstPageWidthPt = viewport.width;
      firstPageHeightPt = viewport.height;
    }

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
      const isBold =
        fontName.includes("bold") ||
        fontName.includes("black") ||
        fontName.includes("heavy") ||
        fontName.includes("bld");
      const isItalic =
        fontName.includes("italic") || fontName.includes("oblique");

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

      line.items.push({ ...item, isBold, isItalic, fontSize, x, y });
      line.minX = Math.min(line.minX, x);
      line.maxX = Math.max(line.maxX, x + (item.width || 0));
    }

    // Sort lines top-to-bottom (Y desc)
    lines.sort((a, b) => b.y - a.y);

    // Build full text per line
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      line.fullText = line.items.map((it) => it.str).join(" ").replace(/\s+/g, " ");
    }

    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    // Detect Page 1 Top Banner Lines
    let bannerLeftLines: TextLine[] = [];
    let bannerRightLines: TextLine[] = [];
    let startBodyIdx = 0;

    if (i === 1) {
      const topSectionLines: TextLine[] = [];
      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        const isHeadingNum = /^\d+\.\s+[A-Z\s&]{3,}/.test(line.fullText);
        if (isHeadingNum || line.y < pageHeight * 0.65) {
          startBodyIdx = lIdx;
          break;
        }
        topSectionLines.push(line);
        startBodyIdx = lIdx + 1;
      }

      const isBannerPresent = topSectionLines.some((l) =>
        /product|requirement|document|prd|klien|proyek|versi|tanggal|status|sistem/i.test(
          l.fullText
        )
      );

      if (isBannerPresent && topSectionLines.length > 0) {
        for (const line of topSectionLines) {
          const isRightMeta =
            line.minX > pageWidth * 0.45 ||
            /^(klien|proyek|versi|tanggal|status):/i.test(line.fullText.trim());
          if (isRightMeta) {
            bannerRightLines.push(line);
          } else {
            bannerLeftLines.push(line);
          }
        }
      } else {
        startBodyIdx = 0;
      }
    }

    // Emit Green Header Banner Table if present
    if (bannerLeftLines.length > 0 || bannerRightLines.length > 0) {
      const leftCellXml = bannerLeftLines
        .map((l) => {
          const szHalfPt = Math.round(l.fontSize * 2);
          const isBig = l.fontSize >= 16;
          return `
            <w:p>
              <w:pPr>
                <w:spacing w:before="0" w:after="${isBig ? "60" : "30"}" w:line="240" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="${szHalfPt}"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(l.fullText)}</w:t>
              </w:r>
            </w:p>
          `;
        })
        .join("");

      const rightCellXml = bannerRightLines
        .map((l) => {
          const szHalfPt = Math.round(l.fontSize * 2);
          return `
            <w:p>
              <w:pPr>
                <w:jc w:val="right"/>
                <w:spacing w:before="0" w:after="30" w:line="240" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="${Math.max(18, szHalfPt)}"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(l.fullText)}</w:t>
              </w:r>
            </w:p>
          `;
        })
        .join("");

      const bannerTableXml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            <w:tblBorders>
              <w:top w:val="none"/>
              <w:left w:val="none"/>
              <w:bottom w:val="none"/>
              <w:right w:val="none"/>
              <w:insideH w:val="none"/>
              <w:insideV w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
              <w:top w:w="280" w:type="dxa"/>
              <w:left w:w="320" w:type="dxa"/>
              <w:bottom w:w="280" w:type="dxa"/>
              <w:right w:w="320" w:type="dxa"/>
            </w:tblCellMar>
          </w:tblPr>
          <w:tr>
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="3000" w:type="pct"/>
                <w:shd w:val="clear" w:color="auto" w:fill="1E4638"/>
                <w:vAlign w:val="center"/>
              </w:tcPr>
              ${leftCellXml || "<w:p/>"}
            </w:tc>
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="2000" w:type="pct"/>
                <w:shd w:val="clear" w:color="auto" w:fill="1E4638"/>
                <w:vAlign w:val="center"/>
              </w:tcPr>
              ${rightCellXml || "<w:p/>"}
            </w:tc>
          </w:tr>
        </w:tbl>
        <w:p><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr></w:p>
      `;

      bodyElementsXml.push(bannerTableXml);
    }

    // Process Body Lines
    for (let lIdx = startBodyIdx; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];
      const text = line.fullText.trim();
      if (!text) continue;

      const isHeadingNum = /^\d+\.\s+[A-Z\s&]{3,}/.test(text);
      const isBullet = text.startsWith("•") || text.startsWith("-") || text.startsWith("*");
      const isLabelValue = /^[A-Za-z0-9\s]+:\s+/.test(text);

      // Alignment calculation
      const lineCenterX = (line.minX + line.maxX) / 2;
      const pageCenterX = pageWidth / 2;
      let align = "left";
      if (Math.abs(lineCenterX - pageCenterX) < 50 && text.length < 80) {
        align = "center";
      } else if (line.minX > pageWidth * 0.65) {
        align = "right";
      }

      if (isHeadingNum) {
        // Section Title with Green Accent Left Border
        bodyElementsXml.push(`
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:left w:val="single" w:sz="24" w:space="12" w:color="1E4638"/>
              </w:pBdr>
              <w:spacing w:before="240" w:after="120"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="26"/>
                <w:color w:val="1E4638"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(text)}</w:t>
            </w:r>
          </w:p>
        `);
        continue;
      }

      // Paragraph formatting
      const szHalfPt = Math.round(Math.min(36, Math.max(9, line.fontSize)) * 2);
      const alignXml = align !== "left" ? `<w:jc w:val="${align}"/>` : "";
      const indentXml = isBullet ? `<w:ind w:left="360"/>` : "";

      // Label: Value rendering (e.g. "Objective: Build a centralized...")
      if (isLabelValue && !isBullet) {
        const colonIdx = text.indexOf(":");
        const labelPart = text.substring(0, colonIdx + 1);
        const valuePart = text.substring(colonIdx + 1);

        bodyElementsXml.push(`
          <w:p>
            <w:pPr>
              ${alignXml}
              ${indentXml}
              <w:spacing w:before="0" w:after="120" w:line="280" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="${szHalfPt}"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(labelPart)}</w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="${szHalfPt}"/>
                <w:color w:val="1E293B"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(valuePart)}</w:t>
            </w:r>
          </w:p>
        `);
        continue;
      }

      // Normal Paragraph / Bullet
      const boldXml = line.isBold ? "<w:b/>" : "";
      const italicXml = line.isItalic ? "<w:i/>" : "";

      bodyElementsXml.push(`
        <w:p>
          <w:pPr>
            ${alignXml}
            ${indentXml}
            <w:spacing w:before="0" w:after="120" w:line="280" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              ${boldXml}
              ${italicXml}
              <w:sz w:val="${szHalfPt}"/>
              <w:color w:val="1E293B"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(text)}</w:t>
          </w:r>
        </w:p>
      `);
    }

    if (i < total) {
      bodyElementsXml.push(`
        <w:p>
          <w:r>
            <w:br w:type="page"/>
          </w:r>
        </w:p>
      `);
    }

    onProgress?.(i, total);
  }

  await doc.cleanup();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  zip.file("[Content_Types].xml", contentTypesXml);

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  _relsFolder?.file(".rels", rootRelsXml);

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
  wordRelsFolder?.file("document.xml.rels", docRelsXml);

  const widthTwips = Math.round(firstPageWidthPt * 20);
  const heightTwips = Math.round(firstPageHeightPt * 20);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyElementsXml.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="${widthTwips}" w:h="${heightTwips}"/>
      <w:pgMar w:top="1152" w:right="1152" w:bottom="1152" w:left="1152" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  wordFolder?.file("document.xml", documentXml);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

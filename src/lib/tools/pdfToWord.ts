import JSZip from "jszip";
import { getPdfjs } from "./pdfjs";

export type ConversionMode = "editable" | "exact";

type Fragment = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  fontName: string;
};

type Line = {
  y: number;
  fontSize: number;
  minX: number;
  maxX: number;
  items: Fragment[];
  fullText: string;
};

export async function convertPdfToWord(
  file: File,
  mode: ConversionMode = "editable",
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  if (mode === "exact") {
    return convertPdfToWordExact(file, onProgress);
  }
  return convertPdfToWordEditable(file, onProgress);
}

// ---------------------------------------------------------------------------
// MODE 1: EXACT 1:1 VISUAL PRESERVATION (Native High-Res Page DOCX)
// ---------------------------------------------------------------------------
async function convertPdfToWordExact(
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
  const mediaFolder = wordFolder?.folder("media");

  let firstPageWidthPt = 595.28;
  let firstPageHeightPt = 841.89;

  const relsXmlLines: string[] = [];
  const bodyParagraphs: string[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    if (i === 1) {
      firstPageWidthPt = unscaledViewport.width;
      firstPageHeightPt = unscaledViewport.height;
    }

    const renderScale = 2.0;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const imageBytes = base64ToUint8Array(dataUrl);

    const imageName = `image${i}.jpg`;
    mediaFolder?.file(imageName, imageBytes);

    const relId = `rId${i}`;
    relsXmlLines.push(
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`
    );

    const cxEmu = Math.round(unscaledViewport.width * 12700);
    const cyEmu = Math.round(unscaledViewport.height * 12700);

    const paragraph = `
      <w:p>
        <w:pPr>
          <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${cxEmu}" cy="${cyEmu}"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="${i}" name="Page ${i}"/>
              <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
              </wp:cNvGraphicFramePr>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="${i}" name="Page Image ${i}"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${relId}"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${cxEmu}" cy="${cyEmu}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    `;

    bodyParagraphs.push(paragraph);

    if (i < total) {
      bodyParagraphs.push(`
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

  // 1. [Content_Types].xml
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  _relsFolder?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  wordRelsFolder?.file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relsXmlLines.join("\n")}
</Relationships>`
  );

  // 4. word/document.xml
  const widthTwips = Math.round(firstPageWidthPt * 20);
  const heightTwips = Math.round(firstPageHeightPt * 20);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyParagraphs.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="${widthTwips}" w:h="${heightTwips}"/>
      <w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  wordFolder?.file("document.xml", documentXml);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ---------------------------------------------------------------------------
// MODE 2: EDITABLE DOCUMENT (Native Word Tables, Headings, Footers, and Text)
// ---------------------------------------------------------------------------
async function convertPdfToWordEditable(
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

  let firstPageWidthPt = 595.28;
  let firstPageHeightPt = 841.89;

  const bodyElementsXml: string[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    if (pageNum === 1) {
      firstPageWidthPt = viewport.width;
      firstPageHeightPt = viewport.height;
    }

    const textContent = await page.getTextContent();
    const styles = textContent.styles || {};

    const rawFragments: Fragment[] = [];

    for (const item of textContent.items as any[]) {
      if (typeof item.str !== "string" || item.str.length === 0) continue;

      const x = item.transform[4];
      const y = item.transform[5];
      const fontSize = Math.round(
        Math.hypot(item.transform[0], item.transform[1]) || item.height || 10
      );

      const fontKey = item.fontName || "";
      const fontObj = styles[fontKey];
      const fontNameLower = (fontKey + " " + (fontObj?.fontFamily || "")).toLowerCase();

      const isBold =
        fontNameLower.includes("bold") ||
        fontNameLower.includes("black") ||
        fontNameLower.includes("heavy") ||
        fontNameLower.includes("bld") ||
        fontNameLower.includes("w7") ||
        fontNameLower.includes("w8") ||
        fontNameLower.includes("w9") ||
        fontNameLower.includes("f1");

      const isItalic =
        fontNameLower.includes("italic") || fontNameLower.includes("oblique");

      rawFragments.push({
        str: item.str,
        x,
        y,
        width: item.width || 0,
        height: item.height || fontSize,
        fontSize,
        isBold,
        isItalic,
        fontName: fontKey,
      });
    }

    // 1. Page 1 Header Banner (Y >= 745)
    if (pageNum === 1) {
      const bannerFragments = rawFragments.filter((it) => it.y >= 745);
      if (bannerFragments.length > 0) {
        const leftFrags = bannerFragments.filter((it) => it.x < 350);
        const rightFrags = bannerFragments.filter((it) => it.x >= 350);

        const leftLines = groupFragmentsIntoLines(leftFrags);
        const rightLines = groupFragmentsIntoLines(rightFrags);

        const leftCellXml = leftLines
          .map((l) => {
            const isBig = l.fontSize >= 15;
            const szVal = Math.round(l.fontSize * 2);
            return `
              <w:p>
                <w:pPr>
                  <w:spacing w:before="0" w:after="${isBig ? "60" : "30"}" w:line="240" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="${szVal}"/>
                    <w:color w:val="FFFFFF"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(l.fullText)}</w:t>
                </w:r>
              </w:p>
            `;
          })
          .join("");

        const rightCellXml = rightLines
          .map((l) => {
            const szVal = Math.max(16, Math.round(l.fontSize * 2));
            return `
              <w:p>
                <w:pPr>
                  <w:jc w:val="right"/>
                  <w:spacing w:before="0" w:after="30" w:line="240" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="${szVal}"/>
                    <w:color w:val="FFFFFF"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(l.fullText)}</w:t>
                </w:r>
              </w:p>
            `;
          })
          .join("");

        bodyElementsXml.push(`
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
                <w:top w:w="300" w:type="dxa"/>
                <w:left w:w="360" w:type="dxa"/>
                <w:bottom w:w="300" w:type="dxa"/>
                <w:right w:w="360" w:type="dxa"/>
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
        `);
      }
    }

    // 2. Body items: exclude header on p1 (y >= 745) and footer (y <= 35)
    const bodyFrags = rawFragments.filter(
      (it) => it.y > 35 && !(pageNum === 1 && it.y >= 745)
    );

    // 3. Find table regions on the page
    const tableHeaderTriggers = [
      /^(as-is process|to-be process)/i,
      /^field name\b/i,
      /^priority\b/i,
      /^column name\b/i,
    ];

    bodyFrags.sort((a, b) => b.y - a.y || a.x - b.x);

    const tableRanges: { topY: number; bottomY: number; headerAnchorY: number }[] = [];
    for (let fIdx = 0; fIdx < bodyFrags.length; fIdx++) {
      const f = bodyFrags[fIdx];
      if (tableHeaderTriggers.some((rgx) => rgx.test(f.str.trim()))) {
        const headerAnchorY = f.y;
        if (tableRanges.some((tr) => Math.abs(tr.headerAnchorY - headerAnchorY) < 30)) {
          continue;
        }

        let bottomY = 36;
        for (const item of bodyFrags) {
          if (item.y > headerAnchorY + 15) continue;
          if (/^\d+(\.\d+)*\.?\s+[A-Za-z0-9\s&()—\-/]{3,}/.test(item.str.trim())) {
            bottomY = item.y + 2;
            break;
          }
          if (item.str.trim() === "•" || item.str.trim() === "◦") {
            bottomY = item.y + 2;
            break;
          }
          if (
            item.x < 38 &&
            item.width > 450 &&
            !/^(column name|field name|priority|p0|p1|p2|id|client_name)/i.test(item.str.trim())
          ) {
            bottomY = item.y + 2;
            break;
          }
          bottomY = Math.min(bottomY, item.y - 5);
        }

        tableRanges.push({
          topY: headerAnchorY + 14,
          bottomY,
          headerAnchorY,
        });
      }
    }

    const processedTableIndices = new Set<number>();

    let fIdx = 0;
    while (fIdx < bodyFrags.length) {
      const curFrag = bodyFrags[fIdx];

      // Check if inside a table range
      const matchedTableIdx = tableRanges.findIndex(
        (tr, tIdx) =>
          !processedTableIndices.has(tIdx) &&
          curFrag.y <= tr.topY &&
          curFrag.y >= tr.bottomY
      );

      if (matchedTableIdx !== -1) {
        processedTableIndices.add(matchedTableIdx);
        const tr = tableRanges[matchedTableIdx];
        const tableFrags = bodyFrags.filter(
          (it) => it.y <= tr.topY && it.y >= tr.bottomY
        );

        const tableXml = buildAdvancedTableXml(tableFrags, tr.headerAnchorY);
        bodyElementsXml.push(tableXml);

        while (fIdx < bodyFrags.length && bodyFrags[fIdx].y >= tr.bottomY) {
          fIdx++;
        }
        continue;
      }

      // Collect contiguous non-table frags until next table range or page end
      const nextTableRange = tableRanges.find(
        (tr, tIdx) => !processedTableIndices.has(tIdx) && tr.topY <= curFrag.y
      );
      const chunkFrags: Fragment[] = [];
      while (fIdx < bodyFrags.length) {
        const item = bodyFrags[fIdx];
        if (nextTableRange && item.y <= nextTableRange.topY) break;
        chunkFrags.push(item);
        fIdx++;
      }

      const chunkLines = groupFragmentsIntoLines(chunkFrags);
      let lIdx = 0;
      while (lIdx < chunkLines.length) {
        const line = chunkLines[lIdx];
        const text = line.fullText.trim();

        // 1. Major Section Heading (e.g., 1. EXECUTIVE SUMMARY, 4. SYSTEM FEATURES...)
        const isMajorHeading =
          /^\d+\.\s+[A-Z0-9\s&()—\-/]{3,}/.test(text) &&
          (line.fontSize >= 11 || text === text.toUpperCase());
        if (isMajorHeading) {
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
          lIdx++;
          continue;
        }

        // 2. Sub-Heading (e.g., 4.1 Dashboard..., 4.2 Feature Backlog...)
        const isSubHeading = /^\d+\.\d+(\.\d+)*\.?\s+[A-Za-z0-9\s&()—\-/]{3,}/.test(text);
        if (isSubHeading) {
          bodyElementsXml.push(`
            <w:p>
              <w:pPr>
                <w:spacing w:before="180" w:after="80"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="22"/>
                  <w:color w:val="1E4638"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          `);
          lIdx++;
          continue;
        }

        // 3. Named Subsections (e.g. Target Users, Form Source Input Example:, Database Schema Draft...)
        const isNamedSub =
          line.items[0]?.isBold &&
          (text.length < 50 ||
            text.includes("Database Schema") ||
            text.includes("Target Users") ||
            text.includes("Input Example")) &&
          !text.startsWith("•") &&
          !text.startsWith("◦") &&
          !/^\d+\./.test(text);
        if (isNamedSub) {
          bodyElementsXml.push(`
            <w:p>
              <w:pPr>
                <w:spacing w:before="140" w:after="60"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="1E4638"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          `);
          lIdx++;
          continue;
        }

        // 4. Numbered List items (e.g. 1. Nama : Inna, 2. Nama Company : GMF...)
        const isNumberedItem = /^\d+\.\s+/.test(text);
        if (isNumberedItem) {
          bodyElementsXml.push(`
            <w:p>
              <w:pPr>
                <w:ind w:left="360"/>
                <w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="20"/>
                  <w:color w:val="1E293B"/>
                </w:rPr>
                <w:t xml:space="preserve">${escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          `);
          lIdx++;
          continue;
        }

        // 5. Bullet items (with multi-line wrap continuation)
        const isBullet =
          text.startsWith("•") ||
          text.startsWith("-") ||
          text.startsWith("*") ||
          text.startsWith("◦");
        if (isBullet) {
          const isSubBullet = text.startsWith("◦");
          const indent = isSubBullet ? "720" : "360";
          const bulletSymbol = isSubBullet ? "◦" : "•";

          const bulletLines = [line];
          lIdx++;
          while (lIdx < chunkLines.length) {
            const nextLine = chunkLines[lIdx];
            const nextText = nextLine.fullText.trim();
            if (/^\d+(\.\d+)*\.?\s+[A-Za-z0-9\s&()—\-/]{3,}/.test(nextText)) break;
            if (
              nextText.startsWith("•") ||
              nextText.startsWith("-") ||
              nextText.startsWith("*") ||
              nextText.startsWith("◦")
            )
              break;
            if (/^\d+\.\s+/.test(nextText)) break;
            if (nextLine.items[0]?.isBold && nextText.length < 50) break;
            if (bulletLines[bulletLines.length - 1].y - nextLine.y > line.fontSize * 1.8) break;

            bulletLines.push(nextLine);
            lIdx++;
          }

          const bulletFrags: Fragment[] = [];
          bulletLines.forEach((bl, bIdx) => {
            if (bIdx > 0 && bulletFrags.length > 0) {
              const last = bulletFrags[bulletFrags.length - 1];
              if (!last.str.endsWith(" ")) bulletFrags.push({ ...last, str: " " });
            }
            if (bIdx === 0) {
              const cleaned = bl.items.filter((it) => !/^[•\-*◦]$/.test(it.str.trim()));
              bulletFrags.push(...cleaned);
            } else {
              bulletFrags.push(...bl.items);
            }
          });

          const runsXml = renderFragsToRuns(bulletFrags, "1E293B");
          bodyElementsXml.push(`
            <w:p>
              <w:pPr>
                <w:ind w:left="${indent}"/>
                <w:spacing w:before="0" w:after="80" w:line="240" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="20"/>
                  <w:color w:val="1E293B"/>
                </w:rPr>
                <w:t xml:space="preserve">${bulletSymbol} </w:t>
              </w:r>
              ${runsXml}
            </w:p>
          `);
          continue;
        }

        // 6. Normal paragraph (merge contiguous lines)
        const paraLines = [line];
        lIdx++;
        while (lIdx < chunkLines.length) {
          const nextLine = chunkLines[lIdx];
          const nextText = nextLine.fullText.trim();
          if (/^\d+(\.\d+)*\.?\s+[A-Za-z0-9\s&()—\-/]{3,}/.test(nextText)) break;
          if (
            nextText.startsWith("•") ||
            nextText.startsWith("-") ||
            nextText.startsWith("*") ||
            nextText.startsWith("◦")
          )
            break;
          if (/^\d+\.\s+/.test(nextText)) break;
          if (nextLine.items[0]?.isBold && nextText.length < 50) break;
          if (paraLines[paraLines.length - 1].y - nextLine.y > line.fontSize * 1.8) break;

          paraLines.push(nextLine);
          lIdx++;
        }

        const paraFrags: Fragment[] = [];
        paraLines.forEach((pl, idx) => {
          if (idx > 0 && paraFrags.length > 0) {
            const last = paraFrags[paraFrags.length - 1];
            if (!last.str.endsWith(" ")) {
              paraFrags.push({ ...last, str: " " });
            }
          }
          paraFrags.push(...pl.items);
        });

        const runsXml = renderFragsToRuns(paraFrags, "1E293B");
        bodyElementsXml.push(`
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="120" w:line="280" w:lineRule="auto"/>
            </w:pPr>
            ${runsXml}
          </w:p>
        `);
      }
    }

    if (pageNum < total) {
      bodyElementsXml.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }

    onProgress?.(pageNum, total);
  }

  await doc.cleanup();

  // 1. [Content_Types].xml
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  _relsFolder?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  wordRelsFolder?.file(
    "document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`
  );

  // 4. word/footer1.xml
  wordFolder?.file(
    "footer1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:tabs><w:tab w:val="right" w:pos="10080"/></w:tabs>
      <w:spacing w:before="0" w:after="0"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="16"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t>The Highland Park Resort - Inquiry Management System</w:t>
    </w:r>
    <w:r><w:tab/></w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="16"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t>Halaman </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="16"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t> dari </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:ftr>`
  );

  // 5. word/document.xml
  const widthTwips = Math.round(firstPageWidthPt * 20);
  const heightTwips = Math.round(firstPageHeightPt * 20);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyElementsXml.join("\n")}
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rIdFooter1"/>
      <w:pgSz w:w="${widthTwips}" w:h="${heightTwips}"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  wordFolder?.file("document.xml", documentXml);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function groupFragmentsIntoLines(fragments: Fragment[]): Line[] {
  const lines: Line[] = [];
  fragments.forEach((frag) => {
    let l = lines.find(
      (line) => Math.abs(line.y - frag.y) <= Math.max(3, frag.fontSize * 0.35)
    );
    if (!l) {
      l = {
        y: frag.y,
        fontSize: frag.fontSize,
        minX: frag.x,
        maxX: frag.x + frag.width,
        items: [],
        fullText: "",
      };
      lines.push(l);
    }
    l.items.push(frag);
    l.minX = Math.min(l.minX, frag.x);
    l.maxX = Math.max(l.maxX, frag.x + frag.width);
    l.fontSize = Math.max(l.fontSize, frag.fontSize);
  });
  lines.sort((a, b) => b.y - a.y);
  lines.forEach((l) => {
    l.items.sort((a, b) => a.x - b.x);
    l.fullText = l.items.map((it) => it.str).join(" ").replace(/\s+/g, " ");
  });
  return lines;
}

function buildAdvancedTableXml(tableFrags: Fragment[], headerAnchorY: number): string {
  // 1. Gather all header items within ±12 pt of headerAnchorY
  const headerFrags = tableFrags.filter((it) => Math.abs(it.y - headerAnchorY) <= 12);

  // Find column clusters
  const cols: { x: number; items: Fragment[] }[] = [];
  headerFrags.sort((a, b) => a.x - b.x);
  headerFrags.forEach((hf) => {
    let c = cols.find((col) => Math.abs(col.x - hf.x) <= 25);
    if (!c) {
      c = { x: hf.x, items: [] };
      cols.push(c);
    }
    c.items.push(hf);
  });
  cols.sort((a, b) => a.x - b.x);

  const numCols = Math.max(cols.length, 2);

  // Column cuts
  const colCuts: number[] = [];
  for (let cIdx = 0; cIdx < cols.length - 1; cIdx++) {
    const rightA = Math.max(...cols[cIdx].items.map((it) => it.x + it.width));
    const leftB = cols[cIdx + 1].x;
    const cut = Math.min(leftB - 15, Math.max(rightA + 5, leftB - 22));
    colCuts.push(cut);
  }

  // Row start detection via Column 0 items
  const col0Frags = tableFrags.filter((it) => it.x < (colCuts[0] || 9999));
  const col0Lines: { y: number; items: Fragment[] }[] = [];
  col0Frags.forEach((it) => {
    let l = col0Lines.find((line) => Math.abs(line.y - it.y) <= 4);
    if (!l) {
      l = { y: it.y, items: [] };
      col0Lines.push(l);
    }
    l.items.push(it);
  });
  col0Lines.sort((a, b) => b.y - a.y);

  const rowStartYs = [headerAnchorY + 8];
  for (let lIdx = 1; lIdx < col0Lines.length; lIdx++) {
    const prevLine = col0Lines[lIdx - 1];
    const currLine = col0Lines[lIdx];
    if (prevLine.y - currLine.y >= 20) {
      rowStartYs.push(currLine.y + 7);
    }
  }

  const minY = Math.min(...tableFrags.map((it) => it.y));
  rowStartYs.push(minY - 15);

  const numRows = rowStartYs.length - 1;
  const rows: Fragment[][][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => [])
  );

  tableFrags.forEach((it) => {
    let cIdx = 0;
    for (let c = 0; c < colCuts.length; c++) {
      if (it.x >= colCuts[c]) cIdx = c + 1;
    }
    if (cIdx >= numCols) cIdx = numCols - 1;

    for (let r = 0; r < numRows; r++) {
      const topY = rowStartYs[r];
      const bottomY = rowStartYs[r + 1];
      if (it.y <= topY && it.y > bottomY) {
        rows[r][cIdx].push(it);
        break;
      }
    }
  });

  // Calculate proportional column widths
  const minTableX = Math.min(...tableFrags.map((it) => it.x));
  const maxTableX = Math.max(...tableFrags.map((it) => it.x + it.width));
  const totalTableSpan = Math.max(maxTableX - minTableX, 400);

  const colWidthsPct: number[] = [];
  for (let c = 0; c < numCols; c++) {
    const leftX = c === 0 ? minTableX : colCuts[c - 1];
    const rightX = c === numCols - 1 ? maxTableX : colCuts[c];
    const pct = Math.round(((rightX - leftX) / totalTableSpan) * 5000);
    colWidthsPct.push(pct);
  }

  const rowsXml = rows
    .map((r, rIdx) => {
      const isHeader = rIdx === 0;
      const cellsXml = r
        .map((cellFrags, cIdx) => {
          cellFrags.sort((a, b) => b.y - a.y || a.x - b.x);
          const cellText = cellFrags
            .map((f) => f.str)
            .join(" ")
            .replace(/\s+/g, " ");
          const shdXml = isHeader
            ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
            : "";
          const bXml = isHeader ? "<w:b/>" : "";
          const widthPct = colWidthsPct[cIdx] || Math.round(5000 / numCols);

          return `
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="${widthPct}" w:type="pct"/>
                ${shdXml}
                <w:vAlign w:val="center"/>
              </w:tcPr>
              <w:p>
                <w:pPr><w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    ${bXml}
                    <w:sz w:val="18"/>
                    <w:color w:val="1E293B"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${escapeXml(cellText)}</w:t>
                </w:r>
              </w:p>
            </w:tc>
          `;
        })
        .join("");

      return `<w:tr>${cellsXml}</w:tr>`;
    })
    .join("\n");

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:left w:w="160" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:right w:w="160" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      ${rowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr></w:p>
  `;
}

function renderFragsToRuns(fragments: Fragment[], defaultColor: string): string {
  if (!fragments || fragments.length === 0) return "";
  return fragments
    .map((f, i) => {
      const prev = fragments[i - 1];
      let space = "";
      if (
        prev &&
        f.x - (prev.x + prev.width) > 2 &&
        !prev.str.endsWith(" ") &&
        !f.str.startsWith(" ")
      ) {
        space = " ";
      }
      const bXml = f.isBold ? "<w:b/>" : "";
      const iXml = f.isItalic ? "<w:i/>" : "";
      const szVal = Math.round(Math.min(36, Math.max(9, f.fontSize)) * 2);
      return (
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>' +
        bXml +
        iXml +
        '<w:sz w:val="' +
        szVal +
        '"/>' +
        '<w:color w:val="' +
        defaultColor +
        '"/>' +
        '</w:rPr><w:t xml:space="preserve">' +
        space +
        escapeXml(f.str) +
        "</w:t></w:r>"
      );
    })
    .join("");
}

function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.replace(/^data:image\/(jpeg|png);base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

import JSZip from "jszip";
import { getPdfjs } from "./pdfjs";

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
    const lines = groupFragmentsIntoLines(bodyFrags);

    // 3. Process lines: Headings, Tables, Bullets, Paragraphs
    let lIdx = 0;
    while (lIdx < lines.length) {
      const line = lines[lIdx];
      const text = line.fullText.trim();

      // Heading Section
      const isHeading = /^\d+(\.\d+)*\.\s+[A-Z\s&]{3,}/.test(text);
      if (isHeading) {
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

      // Table Header detection
      const isTableHeader = /^(as-is process|field name|priority|column name)\b/i.test(text);
      if (isTableHeader) {
        const tableLines = [line];
        lIdx++;
        while (lIdx < lines.length) {
          const nextLine = lines[lIdx];
          const nextText = nextLine.fullText.trim();
          if (/^\d+(\.\d+)*\.\s+[A-Z\s&]{3,}/.test(nextText)) break;
          // Check if paragraph text outside table
          if (
            nextLine.minX < 38 &&
            nextLine.maxX > 500 &&
            !/^(column name|field name|priority|p0|p1|p2|id|client_name|staff)/i.test(nextText)
          ) {
            break;
          }
          tableLines.push(nextLine);
          lIdx++;
        }

        const tableXml = buildTableXml(tableLines);
        bodyElementsXml.push(tableXml);
        continue;
      }

      // Bullet items
      const isBullet =
        text.startsWith("•") ||
        text.startsWith("-") ||
        text.startsWith("*") ||
        text.startsWith("◦");
      if (isBullet) {
        const cleanText = text.replace(/^[•\-*◦]\s*/, "");
        const indent = text.startsWith("◦") ? "720" : "360";
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
              <w:t xml:space="preserve">• ${escapeXml(cleanText)}</w:t>
            </w:r>
          </w:p>
        `);
        lIdx++;
        continue;
      }

      // Normal paragraph (merge contiguous lines)
      const paraLines = [line];
      lIdx++;
      while (lIdx < lines.length) {
        const nextLine = lines[lIdx];
        const nextText = nextLine.fullText.trim();
        if (/^\d+(\.\d+)*\.\s+[A-Z\s&]{3,}/.test(nextText)) break;
        if (/^(as-is process|field name|priority|column name)\b/i.test(nextText)) break;
        if (
          nextText.startsWith("•") ||
          nextText.startsWith("-") ||
          nextText.startsWith("*") ||
          nextText.startsWith("◦")
        )
          break;
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

function buildTableXml(tableLines: Line[]): string {
  const headerLine = tableLines[0];
  const headerItems = headerLine.items;

  const colCuts: number[] = [];
  for (let i = 0; i < headerItems.length - 1; i++) {
    const itA = headerItems[i];
    const itB = headerItems[i + 1];
    colCuts.push((itA.x + itA.width + itB.x) / 2);
  }

  const numCols = headerItems.length > 1 ? headerItems.length : 3;

  type TableRowData = {
    startY: number;
    cells: Fragment[][];
  };

  const rows: TableRowData[] = [];
  let currentRow: TableRowData | null = null;

  tableLines.forEach((l, idx) => {
    const col0Items = l.items.filter(
      (it) => colCuts.length === 0 || it.x < colCuts[0]
    );
    const isNewRow =
      idx === 0 ||
      (col0Items.length > 0 &&
        currentRow &&
        Math.abs(currentRow.startY - l.y) > 10);

    if (isNewRow) {
      currentRow = {
        startY: l.y,
        cells: Array.from({ length: numCols }, () => []),
      };
      rows.push(currentRow);
    }

    l.items.forEach((it) => {
      let colIdx = 0;
      for (let c = 0; c < colCuts.length; c++) {
        if (it.x >= colCuts[c]) colIdx = c + 1;
      }
      if (colIdx >= numCols) colIdx = numCols - 1;
      currentRow?.cells[colIdx].push(it);
    });
  });

  const pctPerCol = Math.round(5000 / numCols);
  const rowsXml = rows
    .map((r, rIdx) => {
      const isHeader = rIdx === 0;
      const cellsXml = r.cells
        .map((cellFrags) => {
          const cellText = cellFrags
            .map((f) => f.str)
            .join(" ")
            .replace(/\s+/g, " ");
          const shdXml = isHeader
            ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
            : "";
          const bXml = isHeader ? "<w:b/>" : "";

          return `
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="${pctPerCol}" w:type="pct"/>
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
          <w:top w:w="100" w:type="dxa"/>
          <w:left w:w="140" w:type="dxa"/>
          <w:bottom w:w="100" w:type="dxa"/>
          <w:right w:w="140" w:type="dxa"/>
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

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

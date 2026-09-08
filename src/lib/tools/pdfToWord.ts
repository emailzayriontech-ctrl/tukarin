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

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    if (pageNum === 1) {
      firstPageWidthPt = viewport.width;
      firstPageHeightPt = viewport.height;
    }

    const textContent = await page.getTextContent();
    const styles = textContent.styles || {};

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

    const fragments: Fragment[] = [];

    for (const item of textContent.items as any[]) {
      if (typeof item.str !== "string" || item.str.length === 0) continue;

      const x = item.transform[4];
      const y = item.transform[5];
      const fontSize = Math.round(
        Math.hypot(item.transform[0], item.transform[1]) || item.height || 11
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
        fontNameLower.includes("w9");

      const isItalic =
        fontNameLower.includes("italic") || fontNameLower.includes("oblique");

      fragments.push({
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

    type Line = {
      y: number;
      fontSize: number;
      minX: number;
      maxX: number;
      fragments: Fragment[];
      fullText: string;
    };

    const lines: Line[] = [];

    for (const frag of fragments) {
      let line = lines.find(
        (l) => Math.abs(l.y - frag.y) <= Math.max(3, frag.fontSize * 0.35)
      );
      if (!line) {
        line = {
          y: frag.y,
          fontSize: frag.fontSize,
          minX: frag.x,
          maxX: frag.x + frag.width,
          fragments: [],
          fullText: "",
        };
        lines.push(line);
      }
      line.fragments.push(frag);
      line.minX = Math.min(line.minX, frag.x);
      line.maxX = Math.max(line.maxX, frag.x + frag.width);
      line.fontSize = Math.max(line.fontSize, frag.fontSize);
    }

    // Sort lines top-to-bottom (Y desc)
    lines.sort((a, b) => b.y - a.y);

    // Build fullText and sort fragments left-to-right (X asc)
    for (const line of lines) {
      line.fragments.sort((a, b) => a.x - b.x);
      line.fullText = line.fragments.map((f) => f.str).join("").replace(/\s+/g, " ");
    }

    const pageHeight = viewport.height;
    const pageWidth = viewport.width;

    let bannerLeftLines: Line[] = [];
    let bannerRightLines: Line[] = [];
    let startBodyLineIdx = 0;

    if (pageNum === 1) {
      const topLines: Line[] = [];
      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        const isHeadingNum = /^\d+\.\s+[A-Z\s&]{3,}/.test(line.fullText.trim());
        if (isHeadingNum || line.y < pageHeight * 0.62) {
          startBodyLineIdx = lIdx;
          break;
        }
        topLines.push(line);
        startBodyLineIdx = lIdx + 1;
      }

      const hasBannerKeywords = topLines.some((l) =>
        /product|requirement|document|prd|klien|proyek|versi|tanggal|status|sistem/i.test(
          l.fullText
        )
      );

      if (hasBannerKeywords && topLines.length > 0) {
        for (const line of topLines) {
          const isRightSide =
            line.minX > pageWidth * 0.42 ||
            /^(klien|proyek|versi|tanggal|status):/i.test(line.fullText.trim());
          if (isRightSide) {
            bannerRightLines.push(line);
          } else {
            bannerLeftLines.push(line);
          }
        }
      } else {
        startBodyLineIdx = 0;
      }
    }

    if (bannerLeftLines.length > 0 || bannerRightLines.length > 0) {
      const renderCellLines = (cellLines: Line[], isRightAlign: boolean) => {
        return cellLines
          .map((line) => {
            const runsXml = renderFragmentsToRuns(line.fragments, "FFFFFF");
            const alignXml = isRightAlign ? `<w:jc w:val="right"/>` : "";
            return `
              <w:p>
                <w:pPr>
                  ${alignXml}
                  <w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/>
                </w:pPr>
                ${runsXml}
              </w:p>
            `;
          })
          .join("");
      };

      const leftXml = renderCellLines(bannerLeftLines, false);
      const rightXml = renderCellLines(bannerRightLines, true);

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
              ${leftXml || "<w:p/>"}
            </w:tc>
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="2000" w:type="pct"/>
                <w:shd w:val="clear" w:color="auto" w:fill="1E4638"/>
                <w:vAlign w:val="center"/>
              </w:tcPr>
              ${rightXml || "<w:p/>"}
            </w:tc>
          </w:tr>
        </w:tbl>
        <w:p><w:pPr><w:spacing w:before="0" w:after="180"/></w:pPr></w:p>
      `;

      bodyElementsXml.push(bannerTableXml);
    }

    type ParagraphGroup = {
      isHeading: boolean;
      isBullet: boolean;
      align: string;
      lines: Line[];
    };

    const paragraphs: ParagraphGroup[] = [];
    let currentPara: ParagraphGroup | null = null;

    for (let lIdx = startBodyLineIdx; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];
      const text = line.fullText.trim();
      if (!text) continue;

      const isHeadingNum = /^\d+\.\s+[A-Z\s&]{3,}/.test(text);
      const isBullet = text.startsWith("•") || text.startsWith("-") || text.startsWith("*");

      const lineCenterX = (line.minX + line.maxX) / 2;
      const pageCenterX = pageWidth / 2;
      let align = "left";
      if (Math.abs(lineCenterX - pageCenterX) < 50 && text.length < 80) {
        align = "center";
      } else if (line.minX > pageWidth * 0.65) {
        align = "right";
      }

      if (isHeadingNum) {
        currentPara = { isHeading: true, isBullet: false, align: "left", lines: [line] };
        paragraphs.push(currentPara);
        currentPara = null;
        continue;
      }

      if (isBullet) {
        currentPara = { isHeading: false, isBullet: true, align, lines: [line] };
        paragraphs.push(currentPara);
        continue;
      }

      if (currentPara && !currentPara.isHeading && !currentPara.isBullet) {
        const lastLine = currentPara.lines[currentPara.lines.length - 1];
        const yDiff = lastLine.y - line.y;
        const fontMatch = Math.abs(lastLine.fontSize - line.fontSize) <= 2;
        const xMatch = Math.abs(lastLine.minX - line.minX) < 40;

        if (yDiff > 0 && yDiff <= line.fontSize * 1.8 && fontMatch && xMatch) {
          currentPara.lines.push(line);
          continue;
        }
      }

      currentPara = { isHeading: false, isBullet: false, align, lines: [line] };
      paragraphs.push(currentPara);
    }

    for (const para of paragraphs) {
      if (para.isHeading) {
        const line = para.lines[0];
        const runsXml = renderFragmentsToRuns(line.fragments, "1E4638", true);
        bodyElementsXml.push(`
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:left w:val="single" w:sz="24" w:space="12" w:color="1E4638"/>
              </w:pBdr>
              <w:spacing w:before="240" w:after="120"/>
            </w:pPr>
            ${runsXml}
          </w:p>
        `);
        continue;
      }

      const paraFragments: Fragment[] = [];
      for (let lIdx = 0; lIdx < para.lines.length; lIdx++) {
        const line = para.lines[lIdx];
        if (lIdx > 0 && paraFragments.length > 0) {
          const lastFrag = paraFragments[paraFragments.length - 1];
          if (!lastFrag.str.endsWith(" ")) {
            paraFragments.push({
              ...lastFrag,
              str: " ",
            });
          }
        }
        paraFragments.push(...line.fragments);
      }

      const alignXml = para.align !== "left" ? `<w:jc w:val="${para.align}"/>` : "";
      const indentXml = para.isBullet ? `<w:ind w:left="360"/>` : "";
      const runsXml = renderFragmentsToRuns(paraFragments, "1E293B");

      bodyElementsXml.push(`
        <w:p>
          <w:pPr>
            ${alignXml}
            ${indentXml}
            <w:spacing w:before="0" w:after="120" w:line="280" w:lineRule="auto"/>
          </w:pPr>
          ${runsXml}
        </w:p>
      `);
    }

    if (pageNum < total) {
      bodyElementsXml.push(`
        <w:p>
          <w:r>
            <w:br w:type="page"/>
          </w:r>
        </w:p>
      `);
    }

    onProgress?.(pageNum, total);
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

function renderFragmentsToRuns(
  fragments: any[],
  defaultColor: string = "1E293B",
  forceBold: boolean = false
): string {
  if (fragments.length === 0) return "";

  type RunGroup = {
    text: string;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
  };

  const groups: RunGroup[] = [];

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    const prevFrag = fragments[i - 1];

    let addLeadingSpace = false;
    if (prevFrag) {
      const gap = frag.x - (prevFrag.x + prevFrag.width);
      if (gap > 2.0 && !prevFrag.str.endsWith(" ") && !frag.str.startsWith(" ")) {
        addLeadingSpace = true;
      }
    }

    const currentText = (addLeadingSpace ? " " : "") + frag.str;
    const isBold = forceBold || frag.isBold;

    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      lastGroup.isBold === isBold &&
      lastGroup.isItalic === frag.isItalic &&
      lastGroup.fontSize === frag.fontSize
    ) {
      lastGroup.text += currentText;
    } else {
      groups.push({
        text: currentText,
        fontSize: frag.fontSize,
        isBold,
        isItalic: frag.isItalic,
      });
    }
  }

  return groups
    .map((g) => {
      const szHalfPt = Math.round(Math.min(36, Math.max(9, g.fontSize)) * 2);
      const boldXml = g.isBold ? "<w:b/>" : "";
      const italicXml = g.isItalic ? "<w:i/>" : "";

      return `
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            ${boldXml}
            ${italicXml}
            <w:sz w:val="${szHalfPt}"/>
            <w:color w:val="${defaultColor}"/>
          </w:rPr>
          <w:t xml:space="preserve">${escapeXml(g.text)}</w:t>
        </w:r>
      `;
    })
    .join("");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
  const mediaFolder = wordFolder?.folder("media");

  let firstPageWidthPt = 612;
  let firstPageHeightPt = 792;

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

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
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

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  zip.file("[Content_Types].xml", contentTypesXml);

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  _relsFolder?.file(".rels", rootRelsXml);

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relsXmlLines.join("\n")}
</Relationships>`;
  wordRelsFolder?.file("document.xml.rels", docRelsXml);

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

function base64ToUint8Array(base64: string): Uint8Array {
  const base64Data = base64.replace(/^data:image\/(jpeg|png);base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

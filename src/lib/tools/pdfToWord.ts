import { getPdfjs } from "./pdfjs";

export async function convertPdfToWord(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;

  let htmlContent = "";

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Sort items: top-to-bottom (Y desc), then left-to-right (X asc)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 8) return yDiff; // different lines
      return a.transform[4] - b.transform[4]; // same line
    });

    let pageText = "";
    let lastY = -1;

    for (const item of items) {
      if (typeof item.str !== "string") continue;
      const str = item.str;
      if (!str.trim()) continue;

      const currentY = item.transform[5];
      if (lastY !== -1 && Math.abs(currentY - lastY) > 12) {
        pageText += "</p><p style='margin-top:0pt;margin-bottom:8pt;'>";
      } else if (lastY !== -1) {
        pageText += " ";
      }

      pageText += str;
      lastY = currentY;
    }

    htmlContent += `<p style='margin-top:0pt;margin-bottom:8pt;'>${pageText}</p>`;
    
    // Add Word page break
    if (i < total) {
      htmlContent += `<br clear="all" style="page-break-before: always; mso-break-type: section-break;" />`;
    }

    onProgress?.(i, total);
  }

  await doc.cleanup();

  // Create a Microsoft Word compatible HTML document
  const wordTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Converted Document</title>
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
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          font-size: 11.0pt;
          line-height: 1.15;
        }
        p {
          margin: 0in;
          margin-bottom: 8.0pt;
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

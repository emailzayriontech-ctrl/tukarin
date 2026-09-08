import { getPdfjs } from "./pdfjs";

export async function convertPdfToMarkdown(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;

  let markdownContent = `# ${file.name.replace(/\.pdf$/i, "")}\n\n`;

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const items = (textContent.items as any[]).filter(
      (item) => typeof item.str === "string" && item.str.trim().length > 0
    );

    // Group items into lines
    type TextLine = {
      y: number;
      fontSize: number;
      isBold: boolean;
      items: any[];
    };

    const lines: TextLine[] = [];

    for (const item of items) {
      const y = item.transform[5];
      const fontSize = Math.round(
        Math.hypot(item.transform[0], item.transform[1]) || item.height || 11
      );
      const fontName = (item.fontName || "").toLowerCase();
      const isBold = fontName.includes("bold") || fontName.includes("black");

      let line = lines.find((l) => Math.abs(l.y - y) <= Math.max(4, fontSize * 0.4));
      if (!line) {
        line = { y, fontSize, isBold, items: [] };
        lines.push(line);
      }
      line.items.push(item);
    }

    lines.sort((a, b) => b.y - a.y);

    markdownContent += `## Halaman ${i}\n\n`;

    for (const line of lines) {
      line.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const text = line.items.map((it) => it.str).join(" ").replace(/\s+/g, " ");

      if (line.fontSize >= 18) {
        markdownContent += `# ${text}\n\n`;
      } else if (line.fontSize >= 14) {
        markdownContent += `### ${text}\n\n`;
      } else if (line.isBold) {
        markdownContent += `**${text}**\n\n`;
      } else {
        markdownContent += `${text}\n\n`;
      }
    }

    onProgress?.(i, total);
  }

  await doc.cleanup();
  return new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
}

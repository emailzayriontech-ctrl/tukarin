import { saveAs } from "file-saver";
import JSZip from "jszip";

export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}

export async function downloadAsZip(
  files: { blob: Blob; name: string }[],
  zipName: string,
) {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  const out = await zip.generateAsync({ type: "blob" });
  saveAs(out, zipName);
}

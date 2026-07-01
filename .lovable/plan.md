
## Tujuan
Membangun platform konversi & manipulasi file berbasis web (responsive) dengan 6 tools inti, semua diproses di browser pengguna — tanpa upload ke server, cepat, dan privat. Bahasa antarmuka: Bahasa Indonesia.

## Tools MVP
1. **Image to PDF** — JPG/PNG/WebP → PDF (multi-file, reorder, rotate, hapus, pilih A4/Letter/Fit, orientasi, margin)
2. **PDF to Image** — PDF → JPG/PNG per halaman (pilih halaman, resolusi)
3. **Merge PDF** — gabung beberapa PDF dengan drag-to-reorder
4. **Split PDF** — pisah berdasarkan range halaman atau per-halaman
5. **Compress PDF** — re-encode + downsample gambar (target: low/medium/high)
6. **Compress Image** — kompres JPG/PNG/WebP dengan slider kualitas + preview before/after

> Catatan teknis: HEIC dilewati di MVP (butuh dekoder berat). Konversi Office (Word/Excel/PPT) tidak feasible di Cloudflare Workers — dijadwalkan fase berikutnya bila ada layanan eksternal.

## Arsitektur

**100% client-side processing** — file tidak pernah meninggalkan browser pengguna.

Library:
- `pdf-lib` — buat/merge/split/manipulasi PDF
- `pdfjs-dist` — render PDF ke canvas (untuk PDF→Image & thumbnail preview)
- `browser-image-compression` — kompres gambar
- `react-dropzone` — upload drag & drop
- `@dnd-kit/sortable` — reorder file/halaman
- `file-saver` + `jszip` — download single/zip

## Struktur Route (TanStack Start)
```
src/routes/
  __root.tsx          (sudah ada — update meta + header/footer)
  index.tsx           (landing: hero + grid 6 tool cards)
  image-to-pdf.tsx
  pdf-to-image.tsx
  merge-pdf.tsx
  split-pdf.tsx
  compress-pdf.tsx
  compress-image.tsx
  tentang.tsx         (about + privasi singkat)
```
Tiap route punya `head()` sendiri (title, description, og:title, og:description) dalam Bahasa Indonesia.

## Struktur Komponen
```
src/components/
  layout/
    SiteHeader.tsx    (logo + nav: Beranda, Tools dropdown, Tentang)
    SiteFooter.tsx
  tools/
    ToolCard.tsx          (kartu di landing)
    ToolPageShell.tsx     (header tool: icon besar, judul, deskripsi, area kerja)
    FileDropzone.tsx      (drag & drop reusable)
    FileList.tsx          (daftar file dengan thumbnail + remove)
    SortableFileGrid.tsx  (grid thumbnail dengan dnd-kit)
    ProcessButton.tsx     (CTA + progress)
    ResultPanel.tsx       (preview hasil + download)
  ui/ (shadcn — sudah ada)
src/lib/
  tools/
    imageToPdf.ts
    pdfToImage.ts
    mergePdf.ts
    splitPdf.ts
    compressPdf.ts
    compressImage.ts
  i18n/id.ts          (kamus string Bahasa Indonesia, single file)
  formatBytes.ts
```

## Desain — bersih & ramah (mirip iLovePDF)

- **Palet:** putih bersih sebagai base; aksen merah hangat sebagai brand color (mengingatkan iLovePDF tapi tidak meniru — kita pakai coral/terracotta, bukan crimson murni); abu-abu netral untuk teks sekunder; setiap kategori tool dapat warna aksen lembut (Convert = coral, Organize = biru, Optimize = hijau, Security = ungu — siap untuk fase 2)
- **Tipografi:** Plus Jakarta Sans (display + body) — modern, ramah, dan ada dukungan karakter Indonesia yang baik. Hindari Inter/Poppins
- **Landing:** hero ringkas ("Konversi file PDF & gambar, gratis & langsung di browser"), trust badges (gratis, tanpa daftar, file tidak diupload), lalu grid 6 ToolCard dengan ikon Lucide besar, judul, dan 1 kalimat deskripsi
- **Halaman tool:** layout terpusat (max-w-3xl), dropzone besar di tengah, opsi di sidebar/atas, CTA besar di bawah, hasil muncul inline tanpa pindah halaman
- **Mobile-first** dengan touch target generous

Token desain didefinisikan di `src/styles.css` via `@theme`.

## Detail teknis per tool (singkat)

| Tool | Library | Opsi yang ditampilkan |
|---|---|---|
| Image to PDF | pdf-lib | Page size (A4/Letter/Fit), orientasi, margin, urutan |
| PDF to Image | pdfjs-dist | Format (JPG/PNG), pilih halaman, scale |
| Merge PDF | pdf-lib | Urutan file via drag |
| Split PDF | pdf-lib | Mode: range atau per-halaman |
| Compress PDF | pdf-lib + canvas | Level Low/Medium/High (re-encode image streams) |
| Compress Image | browser-image-compression | Slider kualitas + max dimensi + preview |

## Yang TIDAK termasuk MVP
- Login/akun, riwayat, batch processing premium
- Konversi Office (Word/Excel/PPT) — butuh server berat
- Google Drive/Dropbox integration
- OCR, e-signature, watermark, protect/unlock PDF
- Mobile native app, monetisasi/iklan
- HEIC support (perlu dekoder tambahan)

## Urutan implementasi
1. Install dependencies + setup font + design tokens di `styles.css`
2. Layout shell (SiteHeader, SiteFooter) + landing page dengan ToolCard grid
3. Komponen reusable (FileDropzone, SortableFileGrid, ResultPanel)
4. 6 halaman tool + lib fungsinya, satu per satu
5. Halaman Tentang + finalisasi meta SEO per route

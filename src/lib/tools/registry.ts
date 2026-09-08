import {
  Image as ImageIcon,
  FileImage,
  FileText,
  Combine,
  Scissors,
  Minimize2,
  ImageDown,
  RotateCw,
  Layers,
  Stamp,
  RefreshCw,
  Sparkles,
  Eraser,
  Download,
  Lock,
  Unlock,
  PenTool,
  Hash,
  FileSpreadsheet,
  FileCode,
  Wrench,
  FileDigit,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory = "convert" | "organize" | "optimize" | "security";

export type ToolDef = {
  slug: string;
  title: string;
  short: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  to:
    | "/image-to-pdf"
    | "/pdf-to-image"
    | "/merge-pdf"
    | "/split-pdf"
    | "/compress-pdf"
    | "/compress-image"
    | "/rotate-pdf"
    | "/organize-pdf"
    | "/watermark-pdf"
    | "/convert-image"
    | "/pdf-to-word"
    | "/upscale-image"
    | "/remove-background"
    | "/heic-to-jpg"
    | "/video-downloader"
    | "/protect-pdf"
    | "/unlock-pdf"
    | "/page-numbers-pdf"
    | "/sign-pdf"
    | "/extract-pages"
    | "/pdf-to-markdown"
    | "/repair-pdf";
};

export const CATEGORY_LABEL: Record<ToolCategory, string> = {
  convert: "Konversi",
  organize: "Atur & Edit",
  optimize: "Optimasi",
  security: "Keamanan",
};

export const TOOLS: ToolDef[] = [
  {
    slug: "image-to-pdf",
    title: "Gambar ke PDF",
    short: "JPG, PNG, WebP → PDF",
    description: "Gabungkan beberapa gambar menjadi satu file PDF rapi dengan urutan sesuka kamu.",
    category: "convert",
    icon: ImageIcon,
    to: "/image-to-pdf",
  },
  {
    slug: "pdf-to-image",
    title: "PDF ke Gambar",
    short: "PDF → JPG / PNG",
    description: "Ubah setiap halaman PDF menjadi gambar berkualitas tinggi.",
    category: "convert",
    icon: FileImage,
    to: "/pdf-to-image",
  },
  {
    slug: "pdf-to-word",
    title: "PDF ke Word",
    short: "PDF → DOC (Word)",
    description: "Ekstrak teks dari PDF dan ubah menjadi dokumen Word yang bisa diedit langsung.",
    category: "convert",
    icon: FileText,
    to: "/pdf-to-word",
  },
  {
    slug: "pdf-to-markdown",
    title: "PDF ke Markdown",
    short: "PDF → Markdown (.md)",
    description: "Ubah isi teks PDF menjadi dokumen berformat Markdown (.md) terstruktur.",
    category: "convert",
    icon: FileCode,
    to: "/pdf-to-markdown",
  },
  {
    slug: "convert-image",
    title: "Konversi Gambar",
    short: "JPG ↔ PNG ↔ WebP",
    description: "Ubah format gambar antara JPG, PNG, dan WebP secara instan tanpa menurunkan kualitas.",
    category: "convert",
    icon: RefreshCw,
    to: "/convert-image",
  },
  {
    slug: "heic-to-jpg",
    title: "HEIC ke JPG",
    short: "HEIC → JPG / PNG",
    description: "Konversi foto format HEIC/HEIF dari perangkat Apple menjadi JPG atau PNG secara instan.",
    category: "convert",
    icon: ImageIcon,
    to: "/heic-to-jpg",
  },
  {
    slug: "merge-pdf",
    title: "Gabung PDF",
    short: "Satukan banyak PDF",
    description: "Gabungkan beberapa file PDF menjadi satu dokumen dengan urutan custom.",
    category: "organize",
    icon: Combine,
    to: "/merge-pdf",
  },
  {
    slug: "split-pdf",
    title: "Pisah PDF",
    short: "Pisah berdasarkan halaman",
    description: "Pisah PDF berdasarkan rentang halaman atau ekstrak setiap halaman jadi file sendiri.",
    category: "organize",
    icon: Scissors,
    to: "/split-pdf",
  },
  {
    slug: "extract-pages",
    title: "Ekstrak Halaman PDF",
    short: "Pilih & ambil halaman",
    description: "Pilih halaman-halaman tertentu dari dokumen PDF untuk diekstrak menjadi PDF baru.",
    category: "organize",
    icon: FileDigit,
    to: "/extract-pages",
  },
  {
    slug: "rotate-pdf",
    title: "Putar PDF",
    short: "Putar orientasi halaman",
    description: "Putar orientasi halaman PDF (90°, 180°, atau 270°) sesuai kebutuhan kamu.",
    category: "organize",
    icon: RotateCw,
    to: "/rotate-pdf",
  },
  {
    slug: "organize-pdf",
    title: "Susun & Edit PDF",
    short: "Geser, hapus & tambah halaman",
    description: "Susun ulang urutan halaman PDF, hapus yang tidak terpakai, atau tambahkan halaman baru.",
    category: "organize",
    icon: Layers,
    to: "/organize-pdf",
  },
  {
    slug: "page-numbers-pdf",
    title: "Tambah Nomor Halaman",
    short: "Nomor halaman otomatis",
    description: "Bubuhi nomor halaman otomatis pada PDF dengan posisi dan format posisi pilihan.",
    category: "organize",
    icon: Hash,
    to: "/page-numbers-pdf",
  },
  {
    slug: "protect-pdf",
    title: "Kunci PDF (Password)",
    short: "Enkripsi kata sandi PDF",
    description: "Amankan dokumen PDF kamu dengan memberikan kata sandi enkripsi rahasia.",
    category: "security",
    icon: Lock,
    to: "/protect-pdf",
  },
  {
    slug: "unlock-pdf",
    title: "Buka Kata Sandi PDF",
    short: "Hapus enkripsi PDF",
    description: "Hapus kata sandi proteksi pada file PDF sehingga dapat dibuka langsung.",
    category: "security",
    icon: Unlock,
    to: "/unlock-pdf",
  },
  {
    slug: "sign-pdf",
    title: "Tanda Tangan PDF",
    short: "Lukis / upload TTD",
    description: "Bubuhkan tanda tangan digital pada halaman PDF kamu secara langsung.",
    category: "security",
    icon: PenTool,
    to: "/sign-pdf",
  },
  {
    slug: "watermark-pdf",
    title: "Watermark PDF",
    short: "Tambah stempel / watermark",
    description: "Bubuhi teks watermark kustom (seperti RAHASIA/DRAFT) di atas halaman PDF.",
    category: "security",
    icon: Stamp,
    to: "/watermark-pdf",
  },
  {
    slug: "compress-pdf",
    title: "Kompres PDF",
    short: "Perkecil ukuran PDF",
    description: "Kurangi ukuran file PDF dengan menurunkan resolusi gambar di dalamnya.",
    category: "optimize",
    icon: Minimize2,
    to: "/compress-pdf",
  },
  {
    slug: "repair-pdf",
    title: "Perbaiki PDF",
    short: "Fix PDF rusak",
    description: "Perbaiki file PDF yang terindikasi rusak atau mengalami kesalahan struktur.",
    category: "optimize",
    icon: Wrench,
    to: "/repair-pdf",
  },
  {
    slug: "compress-image",
    title: "Kompres Gambar",
    short: "JPG, PNG, WebP",
    description: "Perkecil ukuran gambar dengan kontrol kualitas dan dimensi maksimum.",
    category: "optimize",
    icon: ImageDown,
    to: "/compress-image",
  },
  {
    slug: "upscale-image",
    title: "Perbesar Resolusi Gambar",
    short: "Upscale HD / 4K",
    description: "Tingkatkan resolusi gambar Anda hingga 4x lipat menggunakan filter penajaman Lanczos.",
    category: "optimize",
    icon: Sparkles,
    to: "/upscale-image",
  },
  {
    slug: "remove-background",
    title: "Hapus Background",
    short: "Hapus warna latar belakang",
    description: "Hapus warna latar belakang solid secara instan secara privat di browser.",
    category: "optimize",
    icon: Eraser,
    to: "/remove-background",
  },
  {
    slug: "video-downloader",
    title: "Pengunduh Video Sosial",
    short: "YouTube, Instagram, TikTok",
    description: "Unduh video HD tanpa watermark dari YouTube, Instagram Reels, dan TikTok secara langsung.",
    category: "convert",
    icon: Download,
    to: "/video-downloader",
  },
];


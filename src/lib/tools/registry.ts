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
    | "/upscale-image";
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
    slug: "convert-image",
    title: "Konversi Gambar",
    short: "JPG ↔ PNG ↔ WebP",
    description: "Ubah format gambar antara JPG, PNG, dan WebP secara instan tanpa menurunkan kualitas.",
    category: "convert",
    icon: RefreshCw,
    to: "/convert-image",
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
    title: "Susun & Hapus Halaman",
    short: "Hapus & urutkan halaman",
    description: "Hapus halaman yang tidak terpakai atau susun ulang urutan halaman PDF.",
    category: "organize",
    icon: Layers,
    to: "/organize-pdf",
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
];


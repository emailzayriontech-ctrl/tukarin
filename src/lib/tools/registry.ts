import {
  Image as ImageIcon,
  FileImage,
  Combine,
  Scissors,
  Minimize2,
  ImageDown,
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
    | "/compress-image";
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
];

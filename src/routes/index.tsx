import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Zap, Lock, Sparkles } from "lucide-react";
import { TOOLS, CATEGORY_LABEL, type ToolCategory } from "@/lib/tools/registry";
import { ToolCard } from "@/components/tools/ToolCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tukar.in — Konversi & Olah File PDF dan Gambar Gratis" },
      {
        name: "description",
        content:
          "Tools PDF dan gambar gratis: gambar ke PDF, gabung & pisah PDF, kompres file. Diproses di browser, tanpa perlu daftar.",
      },
      { property: "og:title", content: "Tukar.in — Tools PDF & Gambar Gratis" },
      {
        property: "og:description",
        content:
          "Konversi dan olah file PDF & gambar langsung di browser. Cepat, gratis, privat.",
      },
    ],
  }),
  component: Index,
});

const CATEGORIES: ToolCategory[] = ["convert", "organize", "security", "optimize"];

function Index() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 text-center md:pb-16 md:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            13 tools siap pakai — 100% gratis &amp; privat
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Olah file PDF &amp; gambar,{" "}
            <span className="bg-gradient-to-r from-primary to-[color:var(--color-cat-security)] bg-clip-text text-transparent">
              langsung di browser
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Konversi JPG, PNG, WebP ke PDF, PDF ke Word, perbesar resolusi, hapus latar belakang, gabung, pisah, putar, kompres, dan watermark. Tanpa daftar, tanpa upload.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Badge icon={<ShieldCheck className="h-3.5 w-3.5" />} text="File tidak diunggah" />
            <Badge icon={<Zap className="h-3.5 w-3.5" />} text="Proses instan" />
            <Badge icon={<Lock className="h-3.5 w-3.5" />} text="Tanpa daftar akun" />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/image-to-pdf"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Mulai Konversi Sekarang
            </Link>
            <a
              href="#tools"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold transition hover:bg-accent"
            >
              Lihat 13 Tools
            </a>
          </div>

          {/* QUICK POPULAR CONVERSIONS */}
          <div className="mt-10 rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paling Sering Dicari (Pintas Konversi)
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <QuickTag to="/image-to-pdf" label="JPG ke PDF" />
              <QuickTag to="/image-to-pdf" label="PNG ke PDF" />
              <QuickTag to="/convert-image" label="JPG ke PNG / WebP" />
              <QuickTag to="/convert-image" label="PNG ke JPG / WebP" />
              <QuickTag to="/pdf-to-word" label="PDF ke Word (DOC)" />
              <QuickTag to="/upscale-image" label="Perbesar Foto HD / 4K" />
              <QuickTag to="/remove-background" label="Hapus Latar Foto (Magic Wand)" />
              <QuickTag to="/pdf-to-image" label="PDF ke Gambar (JPG/PNG)" />
              <QuickTag to="/merge-pdf" label="Gabung Beberapa PDF" />
              <QuickTag to="/split-pdf" label="Pisah / Hapus Halaman PDF" />
              <QuickTag to="/rotate-pdf" label="Putar Orientasi PDF" />
              <QuickTag to="/watermark-pdf" label="Tambah Watermark PDF" />
              <QuickTag to="/compress-image" label="Kompres Gambar (<1MB)" />
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16">
        {CATEGORIES.map((cat) => {
          const items = TOOLS.filter((t) => t.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} className="mt-10 first:mt-0">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  {CATEGORY_LABEL[cat]}
                </h2>
                <span className="text-xs text-muted-foreground">{items.length} tools</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* WHY */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
          <WhyCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Privat sepenuhnya"
            text="File kamu tidak pernah meninggalkan browser. Tidak ada server, tidak ada penyimpanan."
          />
          <WhyCard
            icon={<Zap className="h-6 w-6" />}
            title="Cepat tanpa antrean"
            text="Tidak perlu menunggu antrean upload/download — proses berjalan instan di perangkat kamu."
          />
          <WhyCard
            icon={<Lock className="h-6 w-6" />}
            title="Tanpa daftar, tanpa watermark"
            text="Gunakan semua tools sepuasnya tanpa perlu membuat akun atau membayar."
          />
        </div>
      </section>
    </>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground/80 shadow-sm">
      <span className="text-primary">{icon}</span>
      {text}
    </span>
  );
}

function WhyCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function QuickTag({ to, label }: { to: any; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground/90 shadow-2xs transition hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <span className="text-primary">⚡</span> {label}
    </Link>
  );
}


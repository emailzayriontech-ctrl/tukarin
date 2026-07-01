import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Cpu, Lock } from "lucide-react";

export const Route = createFileRoute("/tentang")({
  head: () => ({
    meta: [
      { title: "Tentang Tukar.in — Tools PDF & Gambar Privat" },
      { name: "description", content: "Tukar.in adalah kumpulan tools konversi & manipulasi file yang berjalan 100% di browser. Tidak ada server, tidak ada upload, tidak ada akun." },
      { property: "og:title", content: "Tentang Tukar.in" },
      { property: "og:description", content: "Tools PDF & gambar yang menghormati privasi kamu." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Tentang Tukar.in</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Tukar.in adalah kumpulan tools sederhana untuk mengonversi dan mengolah file PDF & gambar.
        Dibuat dengan satu prinsip utama: <strong>file kamu adalah file kamu.</strong>
      </p>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Card icon={<ShieldCheck />} title="Privasi total">
          Semua proses berjalan di browser kamu. File tidak pernah dikirim ke server kami — tidak
          ada upload, tidak ada penyimpanan, tidak ada log.
        </Card>
        <Card icon={<Cpu />} title="Cepat & offline-friendly">
          Karena diproses lokal, hasil muncul instan tanpa antrean. Bahkan bisa jalan saat koneksi
          internet kamu lemot.
        </Card>
        <Card icon={<Lock />} title="Gratis & tanpa daftar">
          Pakai sepuasnya tanpa perlu membuat akun atau berlangganan. Tidak ada watermark.
        </Card>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Bagaimana cara kerjanya?</h2>
        <p className="mt-3 text-muted-foreground">
          Browser modern sudah cukup canggih untuk menjalankan library konversi file seperti{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pdf-lib</code> dan{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pdf.js</code> langsung di
          perangkat kamu. Saat kamu memilih file, file tersebut dimuat ke memori browser, diproses,
          lalu dikembalikan ke kamu sebagai unduhan — tanpa pernah menyentuh server.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Coba toolsnya
        </Link>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="mt-3 text-base font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

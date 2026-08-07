import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { TOOLS } from "@/lib/tools/registry";
import { TukarLogo } from "@/components/ui/tukar-logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2" aria-label="Tukar.in">
            <TukarLogo />
          </Link>
          <p className="mt-2 text-xs font-medium text-[color:var(--color-cat-security)]">
            Tukar. Mudah. Aman.
          </p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Tools PDF dan gambar yang sederhana, gratis, dan privat. Semua proses berjalan di
            browser kamu — file tidak pernah diunggah ke server.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--color-cat-optimize)]" />
            File diproses lokal di perangkat kamu
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold">Tools</div>
          <ul className="mt-3 space-y-2 text-sm">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <Link to={t.to} className="text-muted-foreground hover:text-foreground">
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold">Tukar.in</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/tentang" className="text-muted-foreground hover:text-foreground">
                Tentang
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tukar.in by{" "}
        <a href="https://zayriontech.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
          zayriontech.com
        </a>.
      </div>
    </footer>
  );
}

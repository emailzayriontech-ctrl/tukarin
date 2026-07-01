import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { TukarLogo } from "@/components/ui/tukar-logo";
import { TOOLS } from "@/lib/tools/registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="Tukar.in">
          <TukarLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground bg-accent" }}
          >
            Beranda
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">
              Semua Tools
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {TOOLS.map((t) => (
                <DropdownMenuItem key={t.slug} asChild>
                  <Link to={t.to} className="flex items-center gap-2">
                    <t.icon className="h-4 w-4" />
                    <span>{t.title}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/tentang"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            activeProps={{ className: "text-foreground bg-accent" }}
          >
            Tentang
          </Link>
        </nav>

        <button
          aria-label="Buka menu"
          className="grid h-10 w-10 place-items-center rounded-md hover:bg-accent md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
            >
              Beranda
            </Link>
            <div className="my-1 border-t border-border/60" />
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tools
            </div>
            {TOOLS.map((t) => (
              <Link
                key={t.slug}
                to={t.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                <t.icon className="h-4 w-4" />
                {t.title}
              </Link>
            ))}
            <div className="my-1 border-t border-border/60" />
            <Link
              to="/tentang"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent"
            >
              Tentang
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

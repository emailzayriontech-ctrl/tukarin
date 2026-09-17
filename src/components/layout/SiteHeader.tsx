import { Link } from "@tanstack/react-router";
import { Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { useState } from "react";
import { TukarLogo } from "@/components/ui/tukar-logo";
import {
  TOOLS,
  TOOL_CATEGORIES,
  CATEGORY_INFO,
  type ToolCategory,
} from "@/lib/tools/registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<ToolCategory>(TOOL_CATEGORIES[0]);
  const [expandedCat, setExpandedCat] = useState<ToolCategory | null>(null);

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

          <DropdownMenu open={desktopMenuOpen} onOpenChange={setDesktopMenuOpen}>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors cursor-pointer outline-none data-[state=open]:bg-accent data-[state=open]:text-foreground">
              <span>Semua Tools</span>
              <ChevronDown className="h-4 w-4 opacity-70 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[600px] p-0 shadow-2xl border border-border/80 bg-popover/98 backdrop-blur rounded-2xl overflow-hidden"
            >
              <div className="flex h-[400px]">
                {/* Kolom Kiri: Daftar Kategori */}
                <div className="w-[210px] border-r border-border/60 bg-muted/30 p-2 flex flex-col justify-between shrink-0">
                  <div className="space-y-1">
                    <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Kategori Tools ({TOOLS.length})
                    </div>
                    {TOOL_CATEGORIES.map((catKey) => {
                      const cat = CATEGORY_INFO[catKey];
                      const itemsCount = TOOLS.filter((t) => t.category === catKey).length;
                      const CatIcon = cat.icon;
                      const isSelected = activeCat === catKey;

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onMouseEnter={() => setActiveCat(catKey)}
                          onClick={() => setActiveCat(catKey)}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-xs font-medium transition cursor-pointer text-left ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-foreground hover:bg-accent/80"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              <CatIcon className="h-3.5 w-3.5" />
                            </div>
                            <span className="truncate">{cat.label}</span>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                              isSelected
                                ? "bg-primary-foreground/25 text-primary-foreground font-semibold"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {itemsCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-1 border-t border-border/50">
                    <Link
                      to="/"
                      onClick={() => setDesktopMenuOpen(false)}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-accent transition"
                    >
                      <span>Lihat Semua ({TOOLS.length} alat)</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Kolom Kanan: Daftar Alat dalam Kategori Terpilih */}
                <div className="flex-1 p-3 flex flex-col min-w-0 overflow-hidden bg-popover">
                  <div className="pb-2.5 mb-2 border-b border-border/50 flex items-center justify-between shrink-0">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <span>{CATEGORY_INFO[activeCat].label}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {TOOLS.filter((t) => t.category === activeCat).length} alat
                        </span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {CATEGORY_INFO[activeCat].description}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                    {TOOLS.filter((t) => t.category === activeCat).map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <Link
                          key={tool.slug}
                          to={tool.to}
                          onClick={() => setDesktopMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/80 group transition cursor-pointer"
                        >
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <ToolIcon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {tool.title}
                              </span>
                              {tool.badge && (
                                <span className="text-[10px] shrink-0 font-medium px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {tool.short}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
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
        <div className="border-t border-border/60 bg-background md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-3 space-y-3">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Beranda
            </Link>

            <div className="border-t border-border/60 pt-2">
              <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kategori Tools ({TOOLS.length})
              </div>
              <div className="space-y-1.5">
                {TOOL_CATEGORIES.map((catKey) => {
                  const cat = CATEGORY_INFO[catKey];
                  const items = TOOLS.filter((t) => t.category === catKey);
                  const CatIcon = cat.icon;
                  const isExpanded = expandedCat === catKey;

                  return (
                    <div
                      key={catKey}
                      className="rounded-xl border border-border/60 overflow-hidden bg-card/40"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedCat(isExpanded ? null : catKey)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-accent transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                            <CatIcon className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-foreground">
                            {cat.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({items.length})
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/40 bg-background/80 px-2 py-1.5 space-y-0.5">
                          {items.map((tool) => {
                            const ToolIcon = tool.icon;
                            return (
                              <Link
                                key={tool.slug}
                                to={tool.to}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition"
                              >
                                <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-muted">
                                  <ToolIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-foreground">
                                    {tool.title}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {tool.short}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border/60 pt-2">
              <Link
                to="/tentang"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent block"
              >
                Tentang
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

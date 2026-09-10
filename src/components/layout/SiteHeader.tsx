import { Link } from "@tanstack/react-router";
import { Menu, X, ChevronDown } from "lucide-react";
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
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
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

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors cursor-pointer outline-none">
              <span>Semua Tools</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 p-1.5 shadow-lg border border-border/80 bg-popover/95 backdrop-blur"
            >
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                Kategori Alat ({TOOLS.length})
              </div>
              {TOOL_CATEGORIES.map((catKey) => {
                const cat = CATEGORY_INFO[catKey];
                const items = TOOLS.filter((t) => t.category === catKey);
                const CatIcon = cat.icon;

                return (
                  <DropdownMenuSub key={catKey}>
                    <DropdownMenuSubTrigger className="flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md cursor-pointer hover:bg-accent focus:bg-accent">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                        <CatIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col text-left flex-1 min-w-0">
                        <span className="text-foreground">{cat.label}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground mr-1">
                        ({items.length})
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72 p-1.5 shadow-xl max-h-[80vh] overflow-y-auto border border-border/80 bg-popover/95 backdrop-blur">
                      <div className="px-2.5 py-1.5 border-b border-border/40 mb-1">
                        <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>{cat.label}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {items.length} alat
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        {items.map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <DropdownMenuItem key={tool.slug} asChild>
                              <Link
                                to={tool.to}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-accent group transition-colors"
                              >
                                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                  <ToolIcon className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    {tool.title}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {tool.short}
                                  </span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })}
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

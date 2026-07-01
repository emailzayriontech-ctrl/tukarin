import type { ReactNode } from "react";
import type { ToolDef } from "@/lib/tools/registry";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

const CAT_CLASSES: Record<ToolDef["category"], { bg: string; text: string }> = {
  convert: { bg: "bg-[color:var(--color-cat-convert-soft)]", text: "text-[color:var(--color-cat-convert)]" },
  organize: { bg: "bg-[color:var(--color-cat-organize-soft)]", text: "text-[color:var(--color-cat-organize)]" },
  optimize: { bg: "bg-[color:var(--color-cat-optimize-soft)]", text: "text-[color:var(--color-cat-optimize)]" },
  security: { bg: "bg-[color:var(--color-cat-security-soft)]", text: "text-[color:var(--color-cat-security)]" },
};

export function ToolPageShell({ tool, children }: { tool: ToolDef; children: ReactNode }) {
  const cls = CAT_CLASSES[tool.category];
  const Icon = tool.icon;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Semua tools
      </Link>
      <header className="mb-8 flex flex-col items-center text-center md:mb-10">
        <div className={`grid h-16 w-16 place-items-center rounded-2xl ${cls.bg} ${cls.text}`}>
          <Icon className="h-8 w-8" strokeWidth={2.25} />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{tool.title}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{tool.description}</p>
      </header>
      {children}
    </div>
  );
}

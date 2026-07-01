import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ToolDef } from "@/lib/tools/registry";

const CAT_CLASSES: Record<ToolDef["category"], { bg: string; text: string }> = {
  convert: { bg: "bg-[color:var(--color-cat-convert-soft)]", text: "text-[color:var(--color-cat-convert)]" },
  organize: { bg: "bg-[color:var(--color-cat-organize-soft)]", text: "text-[color:var(--color-cat-organize)]" },
  optimize: { bg: "bg-[color:var(--color-cat-optimize-soft)]", text: "text-[color:var(--color-cat-optimize)]" },
  security: { bg: "bg-[color:var(--color-cat-security-soft)]", text: "text-[color:var(--color-cat-security)]" },
};

export function ToolCard({ tool }: { tool: ToolDef }) {
  const cls = CAT_CLASSES[tool.category];
  const Icon = tool.icon;

  return (
    <Link
      to={tool.to}
      className="group relative flex flex-col rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md"
    >
      <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${cls.bg} ${cls.text}`}>
        <Icon className="h-6 w-6" strokeWidth={2.25} />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{tool.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/80 group-hover:text-foreground">
        Mulai
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

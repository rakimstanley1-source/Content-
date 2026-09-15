import { cn } from "@/lib/utils";
import { AlertTriangle, PlugZap } from "lucide-react";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-card border border-hairline bg-canvas-raised p-5", className)}>{children}</div>;
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "accent" }) {
  const toneClass = {
    neutral: "border-hairline text-ink-dim",
    good: "border-good/30 text-good",
    bad: "border-bad/30 text-bad",
    accent: "border-accent/30 text-accent",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide", toneClass)}>{children}</span>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const variantClass = {
    primary: "bg-accent text-canvas hover:bg-accent/90 disabled:opacity-50",
    ghost: "text-ink-dim hover:text-ink",
    outline: "border border-hairline text-ink hover:border-ink-dim",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ease-editorial", variantClass, className)}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-hairline px-6 py-12 text-center">
      <PlugZap className="h-5 w-5 text-ink-faint" />
      <p className="font-serif text-base text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-dim">{description}</p>
      {action}
    </div>
  );
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-card border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Renders a failed SourceResult as either a soft "connect this" prompt
 * (not_connected / config_missing — expected, not a bug) or a real
 * ErrorCard (action_failed / rate_limited — something Composio rejected). */
export function SourceMessage({
  label,
  reason,
  error,
}: {
  label: string;
  reason: "not_connected" | "action_failed" | "rate_limited" | "config_missing";
  error: string;
}) {
  if (reason === "not_connected" || reason === "config_missing") {
    return (
      <div className="flex items-center justify-between rounded-card border border-dashed border-hairline px-4 py-3 text-sm">
        <span className="text-ink-dim">{label} isn&apos;t connected yet.</span>
        <a href="/integrations" className="text-accent underline">
          Connect →
        </a>
      </div>
    );
  }
  return <ErrorCard message={`${label}: ${error}`} />;
}

export function Kpi({
  label,
  value,
  delta,
  direction,
}: {
  label: string;
  value: string;
  delta?: string | null;
  direction?: "up" | "down" | "flat";
}) {
  const deltaColor = direction === "up" ? "text-good" : direction === "down" ? "text-bad" : "text-ink-faint";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-ink-dim">{label}</p>
      <p className="tabular mt-2 font-serif text-3xl text-ink">{value}</p>
      {delta && (
        <p className={cn("mt-1 text-xs tabular", deltaColor)}>
          {arrow} {delta}
        </p>
      )}
    </Card>
  );
}

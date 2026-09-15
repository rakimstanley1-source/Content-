import { formatNumber, formatPercent, safeDiv } from "@/lib/utils";

export function FunnelStrip({ steps }: { steps: Array<{ label: string; value: number | null }> }) {
  const max = Math.max(...steps.map((s) => s.value ?? 0), 1);
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const conversion = i > 0 ? safeDiv(step.value, prev) : null;
        const widthPct = step.value !== null ? Math.max((step.value / max) * 100, 4) : 0;
        return (
          <div key={step.label} className="flex items-center gap-4">
            <div className="w-32 shrink-0 text-xs uppercase tracking-wide text-ink-dim">{step.label}</div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-hairline">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${widthPct}%` }} />
              </div>
            </div>
            <div className="w-20 shrink-0 text-right font-serif text-lg tabular text-ink">{formatNumber(step.value)}</div>
            <div className="w-16 shrink-0 text-right text-xs tabular text-ink-faint">{conversion !== null ? formatPercent(conversion) : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

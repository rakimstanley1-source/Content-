"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

const PRESETS: Array<{ value: string; label: string }> = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];

export function RangeControls({ syncedAt }: { syncedAt?: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

  const currentRange = searchParams.get("range") ?? "30d";
  const compare = searchParams.get("compare") === "1";

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function refresh() {
    setRefreshing(true);
    await fetch("/api/composio/refresh", { method: "POST" });
    router.refresh();
    setRefreshing(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-full border border-hairline p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => updateParam("range", p.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              currentRange === p.value ? "bg-accent-soft text-accent" : "text-ink-dim hover:text-ink"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => updateParam("compare", compare ? null : "1")}
        className={cn(
          "rounded-full border px-3 py-1 text-xs transition-colors",
          compare ? "border-accent/30 text-accent" : "border-hairline text-ink-dim hover:text-ink"
        )}
      >
        Compare to previous period
      </button>

      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <span className="tabular">{syncedAt ? `Synced ${new Date(syncedAt).toLocaleTimeString()}` : "Not synced yet"}</span>
        <Button variant="outline" onClick={refresh} disabled={refreshing || isPending} className="!px-2 !py-1">
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}

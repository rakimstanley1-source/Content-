import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Formats a count with tabular grouping. Returns "—" for null/undefined so
 * missing data never gets confused with a real zero (see product rule: no
 * fabricated zeros). */
export function formatNumber(value: number | null | undefined, opts?: { decimals?: number }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const decimals = opts?.decimals ?? 0;
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function formatPercent(value: number | null | undefined, opts?: { decimals?: number }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const decimals = opts?.decimals ?? 1;
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDelta(current: number | null | undefined, previous: number | null | undefined): { pct: number | null; direction: "up" | "down" | "flat" } {
  if (current === null || current === undefined || previous === null || previous === undefined || previous === 0) {
    return { pct: null, direction: "flat" };
  }
  const pct = (current - previous) / Math.abs(previous);
  return { pct, direction: pct > 0.001 ? "up" : pct < -0.001 ? "down" : "flat" };
}

export function safeDiv(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator === null || numerator === undefined) return null;
  if (denominator === null || denominator === undefined || denominator === 0) return null;
  return numerator / denominator;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function firstLine(caption: string): string {
  return caption.split("\n")[0]?.trim() || "(no caption)";
}

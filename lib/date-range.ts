export type DateRange = { start: Date; end: Date };
export type RangePreset = "7d" | "30d" | "90d" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reads range/compare state from URL search params so views stay shareable. */
export function parseRangeFromSearchParams(sp: Record<string, string | string[] | undefined>): {
  preset: RangePreset;
  range: DateRange;
  compare: boolean;
} {
  const preset = (typeof sp.range === "string" ? sp.range : "30d") as RangePreset;
  const compare = sp.compare === "1" || sp.compare === "true";
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === "custom" && typeof sp.from === "string" && typeof sp.to === "string") {
    const start = new Date(`${sp.from}T00:00:00.000Z`);
    const end = new Date(`${sp.to}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { preset, range: { start, end }, compare };
    }
  }

  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const start = new Date(endOfToday.getTime() - (days - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);
  return { preset: preset === "custom" ? "30d" : preset, range: { start, end: endOfToday }, compare };
}

/** Previous equivalent period, immediately preceding `range`, same length. */
export function previousPeriod(range: DateRange): DateRange {
  const lengthMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - lengthMs - DAY_MS),
    end: new Date(range.start.getTime() - DAY_MS),
  };
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function eachDay(range: DateRange): Date[] {
  const days: Date[] = [];
  let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return days;
}

export function rangeToUnixSeconds(range: DateRange): { since: number; until: number } {
  return { since: Math.floor(range.start.getTime() / 1000), until: Math.floor(range.end.getTime() / 1000) };
}

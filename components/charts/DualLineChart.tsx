"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DailyPoint } from "@/lib/composio/types";

export function DualLineChart({
  seriesA,
  seriesB,
  labelA,
  labelB,
}: {
  seriesA: DailyPoint[];
  seriesB: DailyPoint[];
  labelA: string;
  labelB: string;
}) {
  const dates = Array.from(new Set([...seriesA.map((p) => p.date), ...seriesB.map((p) => p.date)])).sort();
  const aMap = new Map(seriesA.map((p) => [p.date, p.value]));
  const bMap = new Map(seriesB.map((p) => [p.date, p.value]));
  const data = dates.map((date) => ({ date: date.slice(5), a: aMap.get(date) ?? null, b: bMap.get(date) ?? null }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--color-canvas-raised)", border: "1px solid var(--color-hairline)", borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Line type="monotone" dataKey="a" name={labelA} stroke="#d97b4f" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="b" name={labelB} stroke="var(--color-ink-dim)" strokeWidth={1.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

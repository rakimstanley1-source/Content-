"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrand } from "@/components/providers/BrandProvider";
import { Button, Card, EmptyState, SectionHeading } from "@/components/ui/primitives";
import type { Goal } from "@prisma/client";

export function GoalsManager() {
  const { activeBrand, activeBrandId } = useBrand();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState({ label: "", metric: "posts_published", target: 4, period: "weekly" });

  const load = useCallback(async () => {
    if (!activeBrandId) return;
    const res = await fetch(`/api/goals?brandId=${activeBrandId}`);
    const json = await res.json();
    setGoals(json.goals ?? []);
  }, [activeBrandId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addGoal() {
    if (!activeBrandId || !form.label) return;
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId: activeBrandId, ...form }) });
    setForm({ label: "", metric: "posts_published", target: 4, period: "weekly" });
    load();
  }

  if (!activeBrand) return <EmptyState title="Pick a brand" description="Goals are set per brand." />;

  return (
    <Card>
      <SectionHeading title="Content goals" subtitle={`For ${activeBrand.name}`} />
      <ul className="mb-4 flex flex-col gap-2">
        {goals.map((g) => (
          <li key={g.id} className="flex justify-between text-sm text-ink">
            <span>{g.label}</span>
            <span className="tabular text-ink-dim">
              {g.target} / {g.period}
            </span>
          </li>
        ))}
        {goals.length === 0 && <p className="text-sm text-ink-dim">No goals yet.</p>}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <input
          placeholder="Goal label"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className="rounded-card border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
        <input
          type="number"
          value={form.target}
          onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))}
          className="w-20 rounded-card border border-hairline bg-transparent px-3 py-2 text-sm text-ink"
        />
        <select value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} className="rounded-card border border-hairline bg-transparent px-3 py-2 text-sm text-ink">
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <Button onClick={addGoal}>Add goal</Button>
      </div>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrand } from "@/components/providers/BrandProvider";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { Play } from "lucide-react";

type AutomationRun = { id: string; status: string; startedAt: string; finishedAt: string | null; log: string };
type Automation = { id: string; name: string; description: string; trigger: string; steps: string; enabled: boolean; lastRunAt: string | null; runs: AutomationRun[] };

const TEMPLATES: Array<{ name: string; description: string; trigger: { type: string }; steps: Array<{ type: string }> }> = [
  {
    name: "Idea → brief → draft → approval",
    description: "When run against a content item, generates a brief and a draft caption, then queues it for your approval.",
    trigger: { type: "manual" },
    steps: [{ type: "generate_brief" }, { type: "generate_caption" }, { type: "notify_approval" }],
  },
  {
    name: "After publish → analyze",
    description: "Fires automatically whenever a piece of content is published: syncs its live metrics from Composio.",
    trigger: { type: "content_published" },
    steps: [{ type: "collect_performance" }],
  },
  {
    name: "Weekly report + next week's plan",
    description: "Summarizes the last 7 days and recommends what to post next week, grounded in real performance.",
    trigger: { type: "weekly_schedule" },
    steps: [{ type: "weekly_report" }, { type: "recommend_next_week" }],
  },
];

export default function AutomationsPage() {
  const { activeBrand, activeBrandId } = useBrand();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeBrandId) return;
    const res = await fetch(`/api/automations?brandId=${activeBrandId}`);
    const json = await res.json();
    setAutomations(json.automations ?? []);
  }, [activeBrandId]);

  useEffect(() => {
    load();
  }, [load]);

  async function useTemplate(template: (typeof TEMPLATES)[number]) {
    if (!activeBrandId) return;
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: activeBrandId, ...template }),
    });
    load();
  }

  async function run(id: string) {
    setRunning(id);
    await fetch(`/api/automations/${id}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId: activeBrandId }) });
    setRunning(null);
    load();
  }

  async function toggle(automation: Automation) {
    await fetch(`/api/automations/${automation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !automation.enabled }) });
    load();
  }

  if (!activeBrand) {
    return <EmptyState title="Pick a brand" description="Automations run against a specific brand's content." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-ink-dim">{activeBrand.name}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Automations</h1>
      </div>

      <Card>
        <SectionHeading title="Templates" subtitle="Every step here performs a real generation or Composio sync — nothing simulated." />
        <div className="grid gap-3 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="rounded-card border border-hairline p-3">
              <p className="text-sm text-ink">{t.name}</p>
              <p className="mt-1 text-xs text-ink-dim">{t.description}</p>
              <Button variant="outline" onClick={() => useTemplate(t)} className="mt-3">
                Add
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {automations.length === 0 ? (
          <p className="text-sm text-ink-dim">No automations yet — add one from a template above.</p>
        ) : (
          automations.map((automation) => {
            const trigger = JSON.parse(automation.trigger) as { type: string };
            const steps = JSON.parse(automation.steps) as Array<{ type: string }>;
            return (
              <Card key={automation.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg text-ink">{automation.name}</h3>
                    <p className="text-sm text-ink-dim">{automation.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={automation.enabled ? "good" : "neutral"}>{automation.enabled ? "Enabled" : "Disabled"}</Badge>
                    <Button variant="outline" onClick={() => toggle(automation)}>
                      {automation.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button onClick={() => run(automation.id)} disabled={running === automation.id}>
                      <Play className="h-3.5 w-3.5" /> {running === automation.id ? "Running…" : "Run now"}
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-wide text-ink-faint">
                  Trigger: {trigger.type} → {steps.map((s) => s.type).join(" → ")}
                </p>
                {automation.runs.length > 0 && (
                  <div className="mt-3 hairline-t pt-3">
                    <p className="text-xs uppercase tracking-wide text-ink-dim">Recent runs</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {automation.runs.map((run) => (
                        <li key={run.id} className="text-xs text-ink-dim">
                          <Badge tone={run.status === "success" ? "good" : run.status === "failed" ? "bad" : "neutral"}>{run.status}</Badge>{" "}
                          {new Date(run.startedAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBrand } from "@/components/providers/BrandProvider";
import { Card, SectionHeading, Badge, EmptyState, Kpi } from "@/components/ui/primitives";
import { formatNumber, firstLine, truncate } from "@/lib/utils";
import type { ContentItem, Campaign, Goal, TaskItem } from "@prisma/client";
import { CheckCircle2, Circle, Clock } from "lucide-react";

type OverviewBundle = {
  instagram: { ok: boolean; data?: { reach: number | null; followerDelta: number | null } };
  email: { ok: boolean; data?: { newSubscribers: number | null; totalListSize: number | null } };
};

function useBrandData<T>(path: string | null, fallback: T): { data: T; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    fetch(path)
      .then((r) => r.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, [path, tick]);

  return { data, loading, refresh: () => setTick((t) => t + 1) };
}

export default function DashboardPage() {
  const { activeBrand, activeBrandId, loading: brandLoading } = useBrand();

  const { data: contentData } = useBrandData<{ items: ContentItem[] }>(activeBrandId ? `/api/content?brandId=${activeBrandId}` : null, { items: [] });
  const { data: campaignData } = useBrandData<{ campaigns: Campaign[] }>(activeBrandId ? `/api/campaigns?brandId=${activeBrandId}` : null, { campaigns: [] });
  const { data: goalData } = useBrandData<{ goals: Goal[] }>(activeBrandId ? `/api/goals?brandId=${activeBrandId}` : null, { goals: [] });
  const { data: taskData } = useBrandData<{ tasks: TaskItem[] }>(activeBrandId ? `/api/tasks?brandId=${activeBrandId}` : null, { tasks: [] });
  const { data: overview } = useBrandData<OverviewBundle>("/api/composio/overview?range=30d", { instagram: { ok: false }, email: { ok: false } });

  if (brandLoading) return null;

  if (!activeBrand) {
    return (
      <EmptyState
        title="Create your first brand"
        description="Content OS plans, creates and tracks content per brand. Add a brand to start filling in today's queue."
        action={
          <Link href="/brands" className="text-sm text-accent underline">
            Go to Brands →
          </Link>
        }
      />
    );
  }

  const items = contentData.items ?? [];
  const today = new Date().toDateString();
  const todaysContent = items.filter((i) => i.scheduledAt && new Date(i.scheduledAt).toDateString() === today);
  const needsCreation = items.filter((i) => i.status === "IDEA" || i.status === "BRIEF");
  const inReview = items.filter((i) => i.status === "REVIEW");
  const scheduled = items.filter((i) => i.status === "SCHEDULED").slice(0, 6);
  const published = items.filter((i) => i.status === "PUBLISHED" || i.status === "ANALYZED").slice(0, 6);
  const upcomingCampaigns = (campaignData.campaigns ?? []).filter((c) => !c.endDate || new Date(c.endDate) >= new Date()).slice(0, 4);
  const openTasks = (taskData.tasks ?? []).filter((t) => !t.done).slice(0, 6);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="text-sm text-ink-dim">{activeBrand.name}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Command center</h1>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Reach (30d)" value={overview.instagram.ok ? formatNumber(overview.instagram.data?.reach) : "—"} />
        <Kpi label="Follower delta (30d)" value={overview.instagram.ok ? formatNumber(overview.instagram.data?.followerDelta) : "—"} />
        <Kpi label="New subscribers (30d)" value={overview.email.ok ? formatNumber(overview.email.data?.newSubscribers) : "—"} />
        <Kpi label="List size" value={overview.email.ok ? formatNumber(overview.email.data?.totalListSize) : "—"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <QueueCard title="Today" items={todaysContent} empty="Nothing scheduled today." />
        <QueueCard title="Needs creation" items={needsCreation} empty="Queue is clear." />
        <QueueCard title="Waiting for approval" items={inReview} empty="Nothing pending review." />
        <QueueCard title="Scheduled" items={scheduled} empty="Nothing scheduled ahead." />
        <QueueCard title="Recently published" items={published} empty="Nothing published yet." />
        <Card>
          <SectionHeading title="Tasks & deadlines" />
          {openTasks.length === 0 ? (
            <p className="text-sm text-ink-dim">No open tasks.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {openTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm text-ink">
                  <Circle className="h-3 w-3 text-ink-faint" />
                  <span className="flex-1">{task.title}</span>
                  {task.dueAt && <span className="text-xs text-ink-faint">{new Date(task.dueAt).toLocaleDateString()}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeading title="Content goals" subtitle="Weekly / monthly targets" />
          {(goalData.goals ?? []).length === 0 ? (
            <p className="text-sm text-ink-dim">No goals set yet. Add one in Settings.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {goalData.goals.map((goal) => {
                const actual = goal.metric === "posts_published" ? published.length : null;
                const pct = actual !== null ? Math.min((actual / goal.target) * 100, 100) : null;
                return (
                  <li key={goal.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink">{goal.label}</span>
                      <span className="tabular text-ink-dim">{actual !== null ? `${actual} / ${goal.target}` : `target ${goal.target}`}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-hairline">
                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${pct ?? 0}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title="Upcoming campaigns" />
          {upcomingCampaigns.length === 0 ? (
            <p className="text-sm text-ink-dim">No campaigns scheduled.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcomingCampaigns.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{c.name}</span>
                  <Badge tone="accent">{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function QueueCard({ title, items, empty }: { title: string; items: ContentItem[]; empty: string }) {
  return (
    <Card>
      <SectionHeading title={title} action={<span className="tabular text-xs text-ink-faint">{items.length}</span>} />
      {items.length === 0 ? (
        <p className="text-sm text-ink-dim">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-ink">
              {item.status === "PUBLISHED" || item.status === "ANALYZED" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-good" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-ink-faint" />
              )}
              <span className="flex-1 truncate">{truncate(firstLine(item.caption || item.hook || "Untitled"), 42)}</span>
              <span className="text-xs text-ink-faint">{item.platform.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

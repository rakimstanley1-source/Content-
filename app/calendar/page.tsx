"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrand } from "@/components/providers/BrandProvider";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { ContentComposer } from "@/components/content/ContentComposer";
import { EmptyState } from "@/components/ui/primitives";
import type { ContentItem, Campaign } from "@prisma/client";

export default function CalendarPage() {
  const { activeBrand, activeBrandId } = useBrand();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [composer, setComposer] = useState<{ item?: ContentItem; date?: Date } | null>(null);

  const load = useCallback(async () => {
    if (!activeBrandId) return;
    const [contentRes, campaignRes] = await Promise.all([
      fetch(`/api/content?brandId=${activeBrandId}`).then((r) => r.json()),
      fetch(`/api/campaigns?brandId=${activeBrandId}`).then((r) => r.json()),
    ]);
    setItems(contentRes.items ?? []);
    setCampaigns(campaignRes.campaigns ?? []);
  }, [activeBrandId]);

  useEffect(() => {
    load();
  }, [load]);

  async function reschedule(id: string, date: Date) {
    const existing = items.find((i) => i.id === id);
    const time = existing?.scheduledAt ? new Date(existing.scheduledAt) : new Date(date.setHours(10, 0, 0, 0));
    const scheduledAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, scheduledAt } : i)));
    await fetch(`/api/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt, status: existing?.status === "IDEA" ? "SCHEDULED" : existing?.status }) });
    load();
  }

  async function duplicate(item: ContentItem) {
    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId: item.brandId,
        campaignId: item.campaignId,
        platform: item.platform,
        format: item.format,
        caption: item.caption,
        hook: item.hook,
        cta: item.cta,
        hashtags: JSON.parse(item.hashtags),
        mediaUrl: item.mediaUrl,
        status: "IDEA",
        scheduledAt: item.scheduledAt,
      }),
    });
    load();
  }

  if (!activeBrand) {
    return <EmptyState title="Pick a brand" description="Select or create a brand to see its content calendar." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-ink-dim">{activeBrand.name}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Content calendar</h1>
      </div>

      <CalendarBoard
        items={items}
        onReschedule={reschedule}
        onDuplicate={duplicate}
        onCreate={(date) => setComposer({ date })}
        onOpen={(item) => setComposer({ item })}
      />

      {composer && activeBrandId && (
        <ContentComposer
          brandId={activeBrandId}
          campaigns={campaigns}
          initial={composer.item ?? (composer.date ? { scheduledAt: composer.date, status: "SCHEDULED" } : undefined)}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
            load();
          }}
        />
      )}
    </div>
  );
}

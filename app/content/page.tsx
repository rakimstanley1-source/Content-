"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useBrand } from "@/components/providers/BrandProvider";
import { PipelineBoard } from "@/components/content/PipelineBoard";
import { ContentComposer } from "@/components/content/ContentComposer";
import { RepurposeModal } from "@/components/content/RepurposeModal";
import { Button, EmptyState } from "@/components/ui/primitives";
import type { ContentItem, Campaign } from "@prisma/client";
import { Plus } from "lucide-react";

export default function ContentPage() {
  const { activeBrand, activeBrandId } = useBrand();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [composer, setComposer] = useState<{ item?: ContentItem } | null>(null);
  const [repurposing, setRepurposing] = useState<ContentItem | null>(null);

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

  async function changeStatus(id: string, status: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: status as ContentItem["status"] } : i)));
    await fetch(`/api/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  }

  async function publish(item: ContentItem) {
    const res = await fetch(`/api/content/${item.id}/publish`, { method: "POST" });
    if (!res.ok) {
      const { error } = await res.json();
      window.alert(`Couldn't publish: ${error}`);
    }
    load();
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Pick a brand"
        description="Select or create a brand to see its content pipeline."
        action={
          <Link href="/brands" className="text-sm text-accent underline">
            Go to Brands →
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-dim">{activeBrand.name}</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Content pipeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/analytics/content" className="text-sm text-ink-dim underline hover:text-ink">
            View performance →
          </Link>
          <Button onClick={() => setComposer({})}>
            <Plus className="h-4 w-4" /> New content
          </Button>
        </div>
      </div>

      <PipelineBoard
        items={items}
        onStatusChange={changeStatus}
        onOpen={(item) => setComposer({ item })}
        onPublish={publish}
        onRepurpose={(item) => setRepurposing(item)}
      />

      {composer && activeBrandId && (
        <ContentComposer
          brandId={activeBrandId}
          campaigns={campaigns}
          initial={composer.item}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
            load();
          }}
        />
      )}

      {repurposing && (
        <RepurposeModal
          item={repurposing}
          onClose={() => setRepurposing(null)}
          onDone={() => {
            setRepurposing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

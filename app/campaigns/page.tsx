"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrand } from "@/components/providers/BrandProvider";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { Plus, X } from "lucide-react";
import type { Campaign, ContentItem } from "@prisma/client";

export default function CampaignsPage() {
  const { activeBrand, activeBrandId } = useBrand();
  const [campaigns, setCampaigns] = useState<Array<Campaign & { contentItems: ContentItem[] }>>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!activeBrandId) return;
    const res = await fetch(`/api/campaigns?brandId=${activeBrandId}`);
    const json = await res.json();
    setCampaigns(json.campaigns ?? []);
  }, [activeBrandId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!activeBrand) {
    return <EmptyState title="Pick a brand" description="Campaigns organize content per brand." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-dim">{activeBrand.name}</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Campaigns</h1>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-ink">{c.name}</h3>
              <Badge tone="accent">{c.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-ink-dim">{c.description || c.goal}</p>
            <p className="mt-3 text-xs text-ink-faint">
              {c.contentItems.length} piece{c.contentItems.length === 1 ? "" : "s"} of content
            </p>
            {(c.startDate || c.endDate) && (
              <p className="mt-1 text-xs text-ink-faint">
                {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"} → {c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}
              </p>
            )}
          </Card>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-ink-dim">No campaigns yet.</p>}
      </div>

      {creating && activeBrandId && (
        <CampaignForm
          brandId={activeBrandId}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CampaignForm({ brandId, onClose, onSaved }: { brandId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", goal: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId, ...form }) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-card border border-hairline bg-canvas-raised p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-ink">New campaign</h3>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-ink-dim" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-16 rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
          <input placeholder="Goal" value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} className="rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
          </div>
          <Button onClick={save} disabled={saving || !form.name}>
            {saving ? "Saving…" : "Create campaign"}
          </Button>
        </div>
      </div>
    </div>
  );
}

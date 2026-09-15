"use client";

import { useState } from "react";
import { useBrand } from "@/components/providers/BrandProvider";
import { Button, Card, SectionHeading } from "@/components/ui/primitives";
import { Plus, X } from "lucide-react";
import type { Brand } from "@prisma/client";

export default function BrandsPage() {
  const { brands, activeBrandId, setActiveBrandId, refresh } = useBrand();
  const [editing, setEditing] = useState<Brand | "new" | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Brands</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> New brand
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Card key={brand.id} className={brand.id === activeBrandId ? "border-accent/40" : undefined}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-ink">{brand.name}</h3>
              {brand.id === activeBrandId && <span className="text-xs text-accent">Active</span>}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-ink-dim">{brand.identity || "No identity notes yet."}</p>
            <div className="mt-4 flex gap-3 text-sm">
              <button onClick={() => setActiveBrandId(brand.id)} className="text-ink-dim hover:text-ink">
                Switch to
              </button>
              <button onClick={() => setEditing(brand)} className="text-accent">
                Edit
              </button>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <BrandForm
          brand={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (id) => {
            await refresh();
            setActiveBrandId(id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function BrandForm({ brand, onClose, onSaved }: { brand: Brand | null; onClose: () => void; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({
    name: brand?.name ?? "",
    identity: brand?.identity ?? "",
    audience: brand?.audience ?? "",
    voice: brand?.voice ?? "",
    products: brand?.products ?? "",
    visualAesthetic: brand?.visualAesthetic ?? "",
    contentPillars: brand ? JSON.parse(brand.contentPillars).join(", ") : "",
    platforms: brand ? JSON.parse(brand.platforms).join(", ") : "",
    aiInstructions: brand?.aiInstructions ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      contentPillars: form.contentPillars.split(",").map((s: string) => s.trim()).filter(Boolean),
      platforms: form.platforms.split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    const res = await fetch(brand ? `/api/brands/${brand.id}` : "/api/brands", {
      method: brand ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);
    onSaved(json.brand.id);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-canvas-raised p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-ink">{brand ? "Edit brand" : "New brand"}</h3>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-4 text-sm">
          <LabeledInput label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <LabeledTextarea label="Identity" value={form.identity} onChange={(v) => setForm((f) => ({ ...f, identity: v }))} />
          <LabeledTextarea label="Audience" value={form.audience} onChange={(v) => setForm((f) => ({ ...f, audience: v }))} />
          <LabeledTextarea label="Voice" value={form.voice} onChange={(v) => setForm((f) => ({ ...f, voice: v }))} />
          <LabeledTextarea label="Products" value={form.products} onChange={(v) => setForm((f) => ({ ...f, products: v }))} />
          <LabeledTextarea label="Visual aesthetic" value={form.visualAesthetic} onChange={(v) => setForm((f) => ({ ...f, visualAesthetic: v }))} />
          <LabeledInput label="Content pillars (comma separated)" value={form.contentPillars} onChange={(v) => setForm((f) => ({ ...f, contentPillars: v }))} />
          <LabeledInput label="Platforms (comma separated)" value={form.platforms} onChange={(v) => setForm((f) => ({ ...f, platforms: v }))} />
          <LabeledTextarea label="AI instructions" value={form.aiInstructions} onChange={(v) => setForm((f) => ({ ...f, aiInstructions: v }))} />
          <Button onClick={save} disabled={saving || !form.name}>
            {saving ? "Saving…" : "Save brand"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-ink-dim">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
    </label>
  );
}

function LabeledTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-ink-dim">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-16 rounded-card border border-hairline bg-transparent px-3 py-2 text-ink" />
    </label>
  );
}

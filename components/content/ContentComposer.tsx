"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import type { ContentItem } from "@prisma/client";

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "PINTEREST", "X"];
const FORMATS = ["REEL", "CAROUSEL", "STATIC", "STORY", "SHORT", "VIDEO", "ARTICLE", "PIN", "TWEET", "OTHER"];
const STATUSES = ["IDEA", "BRIEF", "CREATED", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ANALYZED", "REPURPOSED"];

export function ContentComposer({
  brandId,
  campaigns,
  initial,
  onClose,
  onSaved,
}: {
  brandId: string;
  campaigns: Array<{ id: string; name: string }>;
  initial?: Partial<ContentItem>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    platform: initial?.platform ?? "INSTAGRAM",
    format: initial?.format ?? "REEL",
    caption: initial?.caption ?? "",
    hook: initial?.hook ?? "",
    cta: initial?.cta ?? "",
    hashtags: initial?.hashtags ? JSON.parse(initial.hashtags) : [],
    mediaUrl: initial?.mediaUrl ?? "",
    status: initial?.status ?? "IDEA",
    scheduledAt: initial?.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : "",
    campaignId: initial?.campaignId ?? "",
  });
  const [hashtagsInput, setHashtagsInput] = useState((initial?.hashtags ? JSON.parse(initial.hashtags) : []).join(" "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      brandId,
      ...form,
      campaignId: form.campaignId || null,
      hashtags: hashtagsInput.split(/\s+/).filter(Boolean),
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    };
    const url = initial?.id ? `/api/content/${initial.id}` : "/api/content";
    const method = initial?.id ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-canvas-raised p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-ink">{initial?.id ? "Edit content" : "New content"}</h3>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <Select value={form.platform} options={PLATFORMS} onChange={(v) => setForm((f) => ({ ...f, platform: v }))} />
            </Field>
            <Field label="Format">
              <Select value={form.format} options={FORMATS} onChange={(v) => setForm((f) => ({ ...f, format: v }))} />
            </Field>
          </div>

          <Field label="Hook">
            <input value={form.hook} onChange={(e) => setForm((f) => ({ ...f, hook: e.target.value }))} className="input" />
          </Field>

          <Field label="Caption">
            <textarea value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} className="input min-h-24" />
          </Field>

          <Field label="CTA">
            <input value={form.cta} onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))} className="input" />
          </Field>

          <Field label="Hashtags (space separated)">
            <input value={hashtagsInput} onChange={(e) => setHashtagsInput(e.target.value)} className="input" />
          </Field>

          <Field label="Media URL">
            <input value={form.mediaUrl} onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))} className="input" placeholder="https://…" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} options={STATUSES} onChange={(v) => setForm((f) => ({ ...f, status: v }))} />
            </Field>
            <Field label="Scheduled">
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} className="input" />
            </Field>
          </div>

          <Field label="Campaign">
            <Select value={form.campaignId} options={["", ...campaigns.map((c) => c.id)]} labels={{ "": "None", ...Object.fromEntries(campaigns.map((c) => [c.id, c.name])) }} onChange={(v) => setForm((f) => ({ ...f, campaignId: v }))} />
          </Field>

          <Button onClick={save} disabled={saving} className="mt-2 justify-center">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(243, 241, 236, 0.09);
          background: transparent;
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: inherit;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, options, labels, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels?.[opt] ?? opt}
        </option>
      ))}
    </select>
  );
}

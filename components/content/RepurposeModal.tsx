"use client";

import { useState } from "react";
import type { ContentItem } from "@prisma/client";
import { Button } from "@/components/ui/primitives";

const TARGETS: Array<{ platform: string; format: string; label: string }> = [
  { platform: "TIKTOK", format: "VIDEO", label: "TikTok" },
  { platform: "YOUTUBE", format: "SHORT", label: "YouTube Short" },
  { platform: "PINTEREST", format: "PIN", label: "Pinterest" },
  { platform: "X", format: "TWEET", label: "X post" },
  { platform: "INSTAGRAM", format: "STORY", label: "Instagram Story" },
];

export function RepurposeModal({ item, onClose, onDone }: { item: ContentItem; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function repurpose(target: (typeof TARGETS)[number]) {
    setBusy(target.platform);
    await fetch("/api/ai/repurpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentItemId: item.id, targetPlatform: target.platform, targetFormat: target.format }),
    });
    setBusy(null);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-card border border-hairline bg-canvas-raised p-5">
        <h3 className="font-serif text-lg text-ink">Repurpose natively for…</h3>
        <p className="mt-1 text-sm text-ink-dim">Builds a platform-native variation, not a copy.</p>
        <div className="mt-4 flex flex-col gap-2">
          {TARGETS.filter((t) => t.platform !== item.platform).map((t) => (
            <Button key={t.platform} variant="outline" onClick={() => repurpose(t)} disabled={busy !== null} className="justify-between">
              {t.label} {busy === t.platform && "…"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

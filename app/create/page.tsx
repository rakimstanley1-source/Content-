"use client";

import { useState } from "react";
import Link from "next/link";
import { useBrand } from "@/components/providers/BrandProvider";
import { Button, Card, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { Sparkles, Save } from "lucide-react";

const KINDS: Array<{ value: string; label: string }> = [
  { value: "hooks", label: "Hooks" },
  { value: "captions", label: "Captions" },
  { value: "video_script", label: "Video script" },
  { value: "reel_concept", label: "Reel concepts" },
  { value: "tiktok_concept", label: "TikTok concepts" },
  { value: "carousel_concept", label: "Carousel concept" },
  { value: "story_ideas", label: "Story ideas" },
  { value: "cta", label: "CTAs" },
  { value: "hashtags", label: "Hashtags" },
  { value: "content_angles", label: "Content angles" },
  { value: "creative_brief", label: "Creative brief" },
  { value: "image_prompt", label: "Image prompts" },
  { value: "video_prompt", label: "Video prompts" },
];

export default function CreatePage() {
  const { activeBrand, activeBrandId } = useBrand();
  const [idea, setIdea] = useState("");
  const [kind, setKind] = useState("hooks");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recs, setRecs] = useState<{ recommendations: Array<{ type: string; title: string; reasoning: string }>; basedOnPosts: number } | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  async function generate() {
    if (!activeBrandId || !idea.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: activeBrandId, kind, idea }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error);
    else setResult(json.result);
    setLoading(false);
  }

  async function loadRecommendations() {
    if (!activeBrandId) return;
    setRecsLoading(true);
    const res = await fetch(`/api/ai/recommendations?brandId=${activeBrandId}`);
    const json = await res.json();
    if (res.ok) setRecs(json);
    setRecsLoading(false);
  }

  async function saveAsIdea(text: string) {
    if (!activeBrandId) return;
    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: activeBrandId, platform: "INSTAGRAM", format: "REEL", hook: text, caption: text, status: "IDEA" }),
    });
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Pick a brand"
        description="Create speaks in your brand's voice — set one up first."
        action={
          <Link href="/brands" className="text-sm text-accent underline">
            Go to Brands →
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-ink-dim">{activeBrand.name}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Create</h1>
      </div>

      <Card>
        <SectionHeading title="AI workspace" subtitle="Grounded in this brand's identity, voice and audience." />
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe the idea…"
          className="min-h-24 w-full rounded-card border border-hairline bg-transparent p-3 text-sm text-ink outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                kind === k.value ? "border-accent/40 bg-accent-soft text-accent" : "border-hairline text-ink-dim hover:text-ink"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <Button onClick={generate} disabled={loading || !idea.trim()} className="mt-4">
          <Sparkles className="h-4 w-4" /> {loading ? "Generating…" : "Generate"}
        </Button>

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        {result !== null && (
          <div className="mt-5 hairline-t pt-5">
            <ResultRenderer result={result} onSave={saveAsIdea} />
          </div>
        )}
      </Card>

      <Card>
        <SectionHeading
          title="What should I post next?"
          subtitle="Grounded in this brand's real content history — not generic advice."
          action={
            <Button variant="outline" onClick={loadRecommendations} disabled={recsLoading}>
              {recsLoading ? "Analyzing…" : "Analyze"}
            </Button>
          }
        />
        {recs && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-ink-faint">Based on {recs.basedOnPosts} posts from connected platforms.</p>
            {recs.recommendations.map((rec, i) => (
              <div key={i} className="rounded-card border border-hairline p-3">
                <p className="text-xs uppercase tracking-wide text-accent">{rec.type}</p>
                <p className="mt-1 text-sm text-ink">{rec.title}</p>
                <p className="mt-1 text-xs text-ink-dim">{rec.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ResultRenderer({ result, onSave }: { result: unknown; onSave: (text: string) => void }) {
  const obj = result as Record<string, unknown>;
  const listKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));

  if (listKey && typeof (obj[listKey] as unknown[])[0] === "string") {
    return (
      <ul className="flex flex-col gap-2">
        {(obj[listKey] as string[]).map((line, i) => (
          <li key={i} className="flex items-start justify-between gap-3 rounded-card border border-hairline p-3 text-sm text-ink">
            <span>{line}</span>
            <button onClick={() => onSave(line)} className="shrink-0 text-ink-faint hover:text-accent">
              <Save className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return <pre className="scrollbar-thin overflow-auto whitespace-pre-wrap rounded-card border border-hairline p-4 text-xs text-ink-dim">{JSON.stringify(result, null, 2)}</pre>;
}

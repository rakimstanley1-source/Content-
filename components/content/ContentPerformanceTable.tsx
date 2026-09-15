"use client";

import { useMemo, useState } from "react";
import type { Post, Platform } from "@/lib/composio/types";
import { Badge, ErrorCard } from "@/components/ui/primitives";
import { cn, firstLine, formatNumber, formatPercent, truncate } from "@/lib/utils";
import { X } from "lucide-react";

type SortKey = "reach" | "saveRate" | "shareRate" | "externalLinkTaps" | "publishedAt";

const FORMATS = ["reel", "carousel", "static", "story", "video", "short", "pin", "tweet", "other"] as const;

export function ContentPerformanceTable({ posts, errors }: { posts: Post[]; errors: Array<{ platform: Platform; error: string }> }) {
  const [sortKey, setSortKey] = useState<SortKey>("saveRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Post | null>(null);

  const filtered = useMemo(() => (formatFilter === "all" ? posts : posts.filter((p) => p.format === formatFilter)), [posts, formatFilter]);

  function sortValue(post: Post, key: SortKey): number | null {
    switch (key) {
      case "publishedAt":
        return post.publishedAt ? new Date(post.publishedAt).getTime() : null;
      case "reach":
        return post.metrics.reach;
      case "externalLinkTaps":
        return post.metrics.externalLinkTaps;
      case "saveRate":
        return post.saveRate;
      case "shareRate":
        return post.shareRate;
    }
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aNum = sortValue(a, sortKey) ?? -Infinity;
      const bNum = sortValue(b, sortKey) ?? -Infinity;
      return sortDir === "desc" ? bNum - aNum : aNum - bNum;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {errors.map((e) => (
        <ErrorCard key={e.platform} message={`${e.platform}: ${e.error}`} />
      ))}

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-dim">Format</span>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="rounded-full border border-hairline bg-transparent px-3 py-1 text-xs text-ink"
        >
          <option value="all">All</option>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-ink-dim">No posts in range.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="hairline-b text-left text-xs uppercase tracking-wide text-ink-dim">
                  <th className="py-2 pr-3">Post</th>
                  <th className="py-2 pr-3">Format</th>
                  <SortableTh label="Date" active={sortKey === "publishedAt"} dir={sortDir} onClick={() => toggleSort("publishedAt")} />
                  <SortableTh label="Reach" active={sortKey === "reach"} dir={sortDir} onClick={() => toggleSort("reach")} />
                  <SortableTh label="Save rate" active={sortKey === "saveRate"} dir={sortDir} onClick={() => toggleSort("saveRate")} />
                  <SortableTh label="Share rate" active={sortKey === "shareRate"} dir={sortDir} onClick={() => toggleSort("shareRate")} />
                  <SortableTh label="Link taps" active={sortKey === "externalLinkTaps"} dir={sortDir} onClick={() => toggleSort("externalLinkTaps")} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((post) => (
                  <tr key={`${post.platform}-${post.id}`} onClick={() => setSelected(post)} className="hairline-b cursor-pointer hover:bg-accent-soft/40">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        {post.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.thumbnailUrl} alt="" className="h-9 w-9 rounded object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded bg-hairline" />
                        )}
                        <span className="max-w-[220px] truncate text-ink">{truncate(firstLine(post.caption ?? ""), 50)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-dim">
                      <Badge>{post.platform}/{post.format}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 tabular text-ink-dim">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "—"}</td>
                    <td className="py-2.5 pr-3 tabular text-ink">{formatNumber(post.metrics.reach)}</td>
                    <td className="py-2.5 pr-3 tabular text-accent">{formatPercent(post.saveRate)}</td>
                    <td className="py-2.5 pr-3 tabular text-ink">{formatPercent(post.shareRate)}</td>
                    <td className="py-2.5 pr-3 tabular text-ink">{formatNumber(post.metrics.externalLinkTaps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {sorted.map((post) => (
              <button key={`${post.platform}-${post.id}`} onClick={() => setSelected(post)} className="rounded-card border border-hairline p-3 text-left">
                <div className="flex items-center justify-between">
                  <Badge>{post.platform}/{post.format}</Badge>
                  <span className="text-xs text-ink-faint">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "—"}</span>
                </div>
                <p className="mt-2 truncate text-sm text-ink">{truncate(firstLine(post.caption ?? ""), 60)}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-ink-dim">
                  <span>Reach {formatNumber(post.metrics.reach)}</span>
                  <span className="text-accent">Save {formatPercent(post.saveRate)}</span>
                  <span>Share {formatPercent(post.shareRate)}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selected && <ContentDetailPanel post={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function SortableTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="cursor-pointer select-none py-2 pr-3" onClick={onClick}>
      <span className={cn(active && "text-accent")}>
        {label} {active && (dir === "desc" ? "↓" : "↑")}
      </span>
    </th>
  );
}

function ContentDetailPanel({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-canvas-raised p-6">
        <div className="flex items-center justify-between">
          <Badge tone="accent">{post.platform}/{post.format}</Badge>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        {post.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt="" className="mt-4 w-full rounded-card object-cover" />
        )}
        <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{post.caption ?? "(no caption)"}</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Metric label="Reach" value={formatNumber(post.metrics.reach)} />
          <Metric label="Saves" value={formatNumber(post.metrics.saves)} />
          <Metric label="Shares" value={formatNumber(post.metrics.shares)} />
          <Metric label="Comments" value={formatNumber(post.metrics.comments)} />
          <Metric label="Likes" value={formatNumber(post.metrics.likes)} />
          <Metric label="Link taps" value={formatNumber(post.metrics.externalLinkTaps)} />
          <Metric label="Save rate" value={formatPercent(post.saveRate)} accent />
          <Metric label="Share rate" value={formatPercent(post.shareRate)} />
        </div>
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm text-accent underline">
            View on platform →
          </a>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-dim">{label}</p>
      <p className={cn("tabular font-serif text-xl", accent ? "text-accent" : "text-ink")}>{value}</p>
    </div>
  );
}

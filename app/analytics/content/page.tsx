import { Suspense } from "react";
import { getContentBundle } from "@/lib/composio/aggregate";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { RangeControls } from "@/components/controls/RangeControls";
import { ContentPerformanceTable } from "@/components/content/ContentPerformanceTable";
import type { Platform, Post } from "@/lib/composio/types";

export default async function AnalyticsContentPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { range } = parseRangeFromSearchParams(searchParams);
  const bundle = await getContentBundle(range);

  const posts: Post[] = [];
  const errors: Array<{ platform: Platform; error: string }> = [];
  let syncedAt: number | null = null;

  for (const [platform, result] of Object.entries(bundle) as Array<[Platform, (typeof bundle)[Platform]]>) {
    if (result.ok) {
      posts.push(...result.data);
      syncedAt = Math.max(syncedAt ?? 0, result.syncedAt);
    } else if (result.reason !== "not_connected") {
      errors.push({ platform, error: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <RangeControls syncedAt={syncedAt} />
      </Suspense>
      <ContentPerformanceTable posts={posts} errors={errors} />
    </div>
  );
}

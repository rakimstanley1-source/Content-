import { Suspense } from "react";
import { getOverviewBundle } from "@/lib/composio/aggregate";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { RangeControls } from "@/components/controls/RangeControls";
import { Card, Kpi, SectionHeading, SourceMessage } from "@/components/ui/primitives";
import { DualLineChart } from "@/components/charts/DualLineChart";
import { FunnelStrip } from "@/components/charts/FunnelStrip";
import { formatDelta, formatNumber, formatPercent } from "@/lib/utils";

export default async function AnalyticsOverviewPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { range } = parseRangeFromSearchParams(searchParams);
  const bundle = await getOverviewBundle(range);

  const syncedAt = [bundle.instagram, bundle.email].reduce<number | null>((acc, r) => (r.ok && r.syncedAt ? Math.max(acc ?? 0, r.syncedAt) : acc), null);

  const igDelta = bundle.instagram.ok && bundle.instagramPrevious.ok ? formatDelta(bundle.instagram.data.reach, bundle.instagramPrevious.data.reach) : null;
  const followerDelta = bundle.instagram.ok && bundle.instagramPrevious.ok ? formatDelta(bundle.instagram.data.followerDelta, bundle.instagramPrevious.data.followerDelta) : null;
  const subsDelta = bundle.email.ok && bundle.emailPrevious.ok ? formatDelta(bundle.email.data.newSubscribers, bundle.emailPrevious.data.newSubscribers) : null;
  const listDelta = bundle.email.ok && bundle.emailPrevious.ok ? formatDelta(bundle.email.data.totalListSize, bundle.emailPrevious.data.totalListSize) : null;
  const openDelta = bundle.email.ok && bundle.emailPrevious.ok ? formatDelta(bundle.email.data.openRate, bundle.emailPrevious.data.openRate) : null;
  const visitsDelta = bundle.instagram.ok && bundle.instagramPrevious.ok ? formatDelta(bundle.instagram.data.profileVisits, bundle.instagramPrevious.data.profileVisits) : null;

  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <RangeControls syncedAt={syncedAt} />
      </Suspense>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Reach" value={bundle.instagram.ok ? formatNumber(bundle.instagram.data.reach) : "—"} delta={igDelta?.pct ? formatPercent(Math.abs(igDelta.pct)) : undefined} direction={igDelta?.direction} />
        <Kpi label="Profile visits" value={bundle.instagram.ok ? formatNumber(bundle.instagram.data.profileVisits) : "—"} delta={visitsDelta?.pct ? formatPercent(Math.abs(visitsDelta.pct)) : undefined} direction={visitsDelta?.direction} />
        <Kpi label="Follower delta" value={bundle.instagram.ok ? formatNumber(bundle.instagram.data.followerDelta) : "—"} delta={followerDelta?.pct ? formatPercent(Math.abs(followerDelta.pct)) : undefined} direction={followerDelta?.direction} />
        <Kpi label="New subscribers" value={bundle.email.ok ? formatNumber(bundle.email.data.newSubscribers) : "—"} delta={subsDelta?.pct ? formatPercent(Math.abs(subsDelta.pct)) : undefined} direction={subsDelta?.direction} />
        <Kpi label="List size" value={bundle.email.ok ? formatNumber(bundle.email.data.totalListSize) : "—"} delta={listDelta?.pct ? formatPercent(Math.abs(listDelta.pct)) : undefined} direction={listDelta?.direction} />
        <Kpi label="Open rate" value={bundle.email.ok ? formatPercent(bundle.email.data.openRate) : "—"} delta={openDelta?.pct ? formatPercent(Math.abs(openDelta.pct)) : undefined} direction={openDelta?.direction} />
      </section>

      {!bundle.instagram.ok && <SourceMessage label="Instagram" reason={bundle.instagram.reason} error={bundle.instagram.error} />}
      {!bundle.email.ok && <SourceMessage label={bundle.email.source} reason={bundle.email.reason} error={bundle.email.error} />}

      <Card>
        <SectionHeading title="Follower vs. subscriber growth" subtitle="Daily net change, same axis" />
        {bundle.followerGrowth.ok || bundle.subscriberGrowth.ok ? (
          <DualLineChart
            seriesA={bundle.followerGrowth.ok ? bundle.followerGrowth.data : []}
            seriesB={bundle.subscriberGrowth.ok ? bundle.subscriberGrowth.data : []}
            labelA="Followers"
            labelB="Subscribers"
          />
        ) : (
          <p className="text-sm text-ink-dim">Neither follower nor subscriber growth could be loaded for this range.</p>
        )}
      </Card>

      <Card>
        <SectionHeading title="Reach → subscribers funnel" />
        <FunnelStrip
          steps={[
            { label: "Reach", value: bundle.instagram.ok ? bundle.instagram.data.reach : null },
            { label: "Profile visits", value: bundle.instagram.ok ? bundle.instagram.data.profileVisits : null },
            { label: "Link taps", value: bundle.instagram.ok ? bundle.instagram.data.externalLinkTaps : null },
            { label: "Subscribers", value: bundle.email.ok ? bundle.email.data.newSubscribers : null },
          ]}
        />
      </Card>
    </div>
  );
}

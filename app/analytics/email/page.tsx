import { Suspense } from "react";
import { getEmailBundle } from "@/lib/composio/aggregate";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import { RangeControls } from "@/components/controls/RangeControls";
import { Card, Kpi, SectionHeading, SourceMessage } from "@/components/ui/primitives";
import { DualLineChart } from "@/components/charts/DualLineChart";
import { formatDelta, formatNumber, formatPercent } from "@/lib/utils";

export default async function AnalyticsEmailPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { range } = parseRangeFromSearchParams(searchParams);
  const { stats, growth, previousStats, providerId } = await getEmailBundle(range);

  const subsDelta = stats.ok && previousStats.ok ? formatDelta(stats.data.newSubscribers, previousStats.data.newSubscribers) : null;
  const listDelta = stats.ok && previousStats.ok ? formatDelta(stats.data.totalListSize, previousStats.data.totalListSize) : null;
  const openDelta = stats.ok && previousStats.ok ? formatDelta(stats.data.openRate, previousStats.data.openRate) : null;
  const clickDelta = stats.ok && previousStats.ok ? formatDelta(stats.data.clickRate, previousStats.data.clickRate) : null;

  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <RangeControls syncedAt={stats.ok ? stats.syncedAt : null} />
      </Suspense>

      {!stats.ok && <SourceMessage label={providerId} reason={stats.reason} error={stats.error} />}

      {stats.ok && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Kpi label="New subscribers" value={formatNumber(stats.data.newSubscribers)} delta={subsDelta?.pct ? formatPercent(Math.abs(subsDelta.pct)) : undefined} direction={subsDelta?.direction} />
          <Kpi label="List size" value={formatNumber(stats.data.totalListSize)} delta={listDelta?.pct ? formatPercent(Math.abs(listDelta.pct)) : undefined} direction={listDelta?.direction} />
          <Kpi label="Open rate" value={formatPercent(stats.data.openRate)} delta={openDelta?.pct ? formatPercent(Math.abs(openDelta.pct)) : undefined} direction={openDelta?.direction} />
          <Kpi label="Click rate" value={formatPercent(stats.data.clickRate)} delta={clickDelta?.pct ? formatPercent(Math.abs(clickDelta.pct)) : undefined} direction={clickDelta?.direction} />
          <Kpi label="Unsubscribes" value={formatNumber(stats.data.unsubscribes)} />
        </section>
      )}

      <Card>
        <SectionHeading title="Subscriber growth" subtitle="Net daily change" />
        {growth.ok ? <DualLineChart seriesA={growth.data} seriesB={[]} labelA="Subscribers" labelB="" /> : <SourceMessage label={providerId} reason={growth.reason} error={growth.error} />}
      </Card>

      <Card>
        <SectionHeading title="Recent sends" />
        {!stats.ok ? (
          <SourceMessage label={providerId} reason={stats.reason} error={stats.error} />
        ) : stats.data.recentSends.length === 0 ? (
          <p className="text-sm text-ink-dim">No campaigns sent in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="hairline-b text-left text-xs uppercase tracking-wide text-ink-dim">
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Sent</th>
                <th className="py-2 pr-3">Recipients</th>
                <th className="py-2 pr-3">Open rate</th>
                <th className="py-2 pr-3">Click rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.data.recentSends.map((send) => (
                <tr key={send.id} className="hairline-b">
                  <td className="py-2.5 pr-3 text-ink">{send.subject}</td>
                  <td className="py-2.5 pr-3 tabular text-ink-dim">{send.sentAt ? new Date(send.sentAt).toLocaleDateString() : "—"}</td>
                  <td className="py-2.5 pr-3 tabular text-ink">{formatNumber(send.recipients)}</td>
                  <td className="py-2.5 pr-3 tabular text-accent">{formatPercent(send.openRate)}</td>
                  <td className="py-2.5 pr-3 tabular text-ink">{formatPercent(send.clickRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <SectionHeading title="Subscribers by source" />
        {stats.ok && stats.data.sourceBreakdownAvailable ? (
          <ul className="flex flex-col gap-2">
            {stats.data.subscribersBySource.map((s) => (
              <li key={s.source} className="flex justify-between text-sm text-ink">
                <span>{s.source}</span>
                <span className="tabular">{formatNumber(s.count)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-dim">{providerId} doesn&apos;t expose a signup-source breakdown through Composio&apos;s current actions.</p>
        )}
      </Card>
    </div>
  );
}

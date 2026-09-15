import { executeComposioAction, getToolkitConnections } from "@/lib/composio/client";
import { ComposioSourceError } from "@/lib/composio/errors";
import type { AccountMetrics, ContentFormat, DailyPoint, Post, SocialProvider } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { rangeToUnixSeconds, toISODate } from "@/lib/date-range";
import { safeDiv } from "@/lib/utils";

const TOOLKIT = "instagram";

async function resolveAccountId(): Promise<string> {
  const explicit = process.env.COMPOSIO_INSTAGRAM_ACCOUNT_ID;
  if (explicit) return explicit;
  const accounts = await getToolkitConnections(TOOLKIT);
  const active = accounts.filter((a) => a.status === "ACTIVE");
  if (active.length === 0) {
    throw new ComposioSourceError("No active Instagram connection in Composio.", { toolkit: TOOLKIT, kind: "not_connected" });
  }
  // Composio requires an explicit connected-account id once more than one is
  // linked ("account_selection": "required"); prefer the default, else first.
  return (active.find((a) => a.isDefault) ?? active[0]).id;
}

function mapFormat(mediaType: unknown, mediaProductType: unknown): ContentFormat {
  if (mediaProductType === "REELS") return "reel";
  if (mediaType === "CAROUSEL_ALBUM") return "carousel";
  if (mediaType === "VIDEO") return "video";
  return "static";
}

/** Sums an Instagram Graph API insights time series by metric name.
 * Returns null (not 0) when the metric wasn't returned at all — Meta's API
 * omits metrics with no data, which is a valid empty result, not a failure,
 * but we must not present "no data" as a fabricated zero. */
function sumMetric(insightsData: unknown, metricName: string): number | null {
  const list = (insightsData as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> })?.data;
  const entry = list?.find((m) => m.name === metricName);
  if (!entry || !entry.values || entry.values.length === 0) return null;
  return entry.values.reduce((sum, v) => sum + (typeof v.value === "number" ? v.value : 0), 0);
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const instagramProvider: SocialProvider = {
  platform: "instagram",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    try {
      await resolveAccountId();
      return true;
    } catch {
      return false;
    }
  },

  async getPosts(range: DateRange): Promise<Post[]> {
    const connectedAccountId = await resolveAccountId();
    const { since, until } = rangeToUnixSeconds(range);

    const mediaPage = await executeComposioAction<{ data?: Array<Record<string, unknown>> }>({
      toolkit: TOOLKIT,
      actionName: "INSTAGRAM_GET_IG_USER_MEDIA",
      connectedAccountId,
      params: { ig_user_id: "me", since, until, limit: 50 },
    });

    const items = mediaPage.data ?? [];

    // Per-post reach/saves/shares/comments require a separate Insights call.
    // Capped concurrency to stay under Instagram's per-app rate limits.
    return mapConcurrent(items, 5, async (media): Promise<Post> => {
      const mediaId = String(media.id);
      let insights: unknown = null;
      try {
        insights = await executeComposioAction({
          toolkit: TOOLKIT,
          actionName: "INSTAGRAM_GET_IG_MEDIA_INSIGHTS",
          connectedAccountId,
          params: { ig_media_id: mediaId, metric: ["reach", "saved", "shares", "comments", "likes"] },
        });
      } catch {
        // Insights can 400 on media under the 1,000-follower insights floor
        // or media older than 2 years — leave metrics null for this post
        // rather than failing the whole table.
        insights = null;
      }

      const reach = sumMetric(insights, "reach");
      const saves = sumMetric(insights, "saved");
      const shares = sumMetric(insights, "shares");

      return {
        id: mediaId,
        platform: "instagram",
        permalink: typeof media.permalink === "string" ? media.permalink : null,
        thumbnailUrl: typeof media.thumbnail_url === "string" ? media.thumbnail_url : typeof media.media_url === "string" ? media.media_url : null,
        caption: typeof media.caption === "string" ? media.caption : null,
        format: mapFormat(media.media_type, media.media_product_type),
        publishedAt: typeof media.timestamp === "string" ? media.timestamp : null,
        metrics: {
          reach,
          saves,
          shares,
          comments: sumMetric(insights, "comments") ?? (typeof media.comments_count === "number" ? media.comments_count : null),
          likes: sumMetric(insights, "likes") ?? (typeof media.like_count === "number" ? media.like_count : null),
          // Instagram's Graph API only exposes profile-visit / link-tap
          // metrics at the account level, not per feed/reel post.
          profileVisits: null,
          externalLinkTaps: null,
        },
        saveRate: safeDiv(saves, reach),
        shareRate: safeDiv(shares, reach),
      };
    });
  },

  async getAccountMetrics(range: DateRange): Promise<AccountMetrics> {
    const connectedAccountId = await resolveAccountId();
    const { since, until } = rangeToUnixSeconds(range);

    const [insights, profile] = await Promise.all([
      executeComposioAction({
        toolkit: TOOLKIT,
        actionName: "INSTAGRAM_GET_USER_INSIGHTS",
        connectedAccountId,
        params: {
          ig_user_id: "me",
          since,
          until,
          period: "day",
          metric: ["reach", "profile_views", "profile_links_taps", "follower_count"],
        },
      }),
      executeComposioAction<{ followers_count?: number }>({
        toolkit: TOOLKIT,
        actionName: "INSTAGRAM_GET_USER_INFO",
        connectedAccountId,
        params: { ig_user_id: "me", fields: "followers_count" },
      }),
    ]);

    return {
      platform: "instagram",
      followerCount: typeof profile.followers_count === "number" ? profile.followers_count : null,
      // follower_count is Meta's daily net-change series, so summing across
      // the range gives the delta for the period (not a cumulative total).
      followerDelta: sumMetric(insights, "follower_count"),
      reach: sumMetric(insights, "reach"),
      profileVisits: sumMetric(insights, "profile_views"),
      externalLinkTaps: sumMetric(insights, "profile_links_taps"),
    };
  },
};

/** Daily net follower change for the overview's follower-vs-subscriber
 * growth chart. Not part of the SocialProvider interface (only Instagram
 * exposes a clean daily series today) but exported for the aggregator. */
export async function getInstagramFollowerGrowth(range: DateRange): Promise<DailyPoint[]> {
  const connectedAccountId = await resolveAccountId();
  const { since, until } = rangeToUnixSeconds(range);

  const insights = await executeComposioAction<{ data?: Array<{ name?: string; values?: Array<{ value?: number; end_time?: string }> }> }>({
    toolkit: TOOLKIT,
    actionName: "INSTAGRAM_GET_USER_INSIGHTS",
    connectedAccountId,
    params: { ig_user_id: "me", since, until, period: "day", metric: ["follower_count"] },
  });

  const series = insights.data?.find((m) => m.name === "follower_count")?.values ?? [];
  return series.map((point) => ({
    date: point.end_time ? toISODate(new Date(point.end_time)) : "",
    value: typeof point.value === "number" ? point.value : 0,
  })).filter((p) => p.date !== "");
}

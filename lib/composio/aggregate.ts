import { cached, cacheKey } from "./cache";
import { ComposioSourceError } from "./errors";
import { getActiveEmailProvider, socialProviders } from "./registry";
import { getInstagramFollowerGrowth } from "./providers/social/instagram";
import type { AccountMetrics, DailyPoint, EmailStats, Platform, Post, SourceResult } from "./types";
import type { DateRange } from "@/lib/date-range";
import { previousPeriod, toISODate } from "@/lib/date-range";

async function toSourceResult<T>(source: string, key: string, fn: () => Promise<T>): Promise<SourceResult<T>> {
  try {
    const { value, syncedAt } = await cached(key, fn);
    return { ok: true, data: value, source, syncedAt };
  } catch (err) {
    if (err instanceof ComposioSourceError) {
      return { ok: false, error: err.message, source, reason: err.kind };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error", source, reason: "action_failed" };
  }
}

function rangeKey(range: DateRange): string {
  return `${toISODate(range.start)}_${toISODate(range.end)}`;
}

export type OverviewBundle = {
  instagram: SourceResult<AccountMetrics>;
  instagramPrevious: SourceResult<AccountMetrics>;
  email: SourceResult<EmailStats>;
  emailPrevious: SourceResult<EmailStats>;
  followerGrowth: SourceResult<DailyPoint[]>;
  subscriberGrowth: SourceResult<DailyPoint[]>;
};

export async function getOverviewBundle(range: DateRange): Promise<OverviewBundle> {
  const prev = previousPeriod(range);
  const email = getActiveEmailProvider();

  const [instagram, instagramPrevious, emailStats, emailPrevious, followerGrowth, subscriberGrowth] = await Promise.all([
    toSourceResult("instagram", cacheKey("overview", "instagram", "account", rangeKey(range)), () => socialProviders.instagram.getAccountMetrics(range)),
    toSourceResult("instagram", cacheKey("overview", "instagram", "account", rangeKey(prev)), () => socialProviders.instagram.getAccountMetrics(prev)),
    toSourceResult(email.providerId, cacheKey("overview", email.providerId, "stats", rangeKey(range)), () => email.getEmailStats(range)),
    toSourceResult(email.providerId, cacheKey("overview", email.providerId, "stats", rangeKey(prev)), () => email.getEmailStats(prev)),
    toSourceResult("instagram", cacheKey("overview", "instagram", "follower-growth", rangeKey(range)), () => getInstagramFollowerGrowth(range)),
    toSourceResult(email.providerId, cacheKey("overview", email.providerId, "growth", rangeKey(range)), () => email.getSubscriberGrowth(range)),
  ]);

  return { instagram, instagramPrevious, email: emailStats, emailPrevious, followerGrowth, subscriberGrowth };
}

export type ContentBundle = Record<Platform, SourceResult<Post[]>>;

export async function getContentBundle(range: DateRange): Promise<ContentBundle> {
  const platforms = Object.keys(socialProviders) as Platform[];
  const entries = await Promise.all(
    platforms.map(async (platform) => {
      const provider = socialProviders[platform];
      const connected = await provider.isConnected().catch(() => false);
      if (!connected) {
        return [platform, { ok: false, error: `${platform} isn't connected in Composio yet.`, source: platform, reason: "not_connected" as const }] as const;
      }
      const result = await toSourceResult(platform, cacheKey("content", platform, rangeKey(range)), () => provider.getPosts(range));
      return [platform, result] as const;
    })
  );
  return Object.fromEntries(entries) as ContentBundle;
}

export async function getEmailBundle(range: DateRange) {
  const prev = previousPeriod(range);
  const email = getActiveEmailProvider();
  const [stats, growth] = await Promise.all([
    toSourceResult(email.providerId, cacheKey("email", email.providerId, "stats", rangeKey(range)), () => email.getEmailStats(range)),
    toSourceResult(email.providerId, cacheKey("email", email.providerId, "growth", rangeKey(range)), () => email.getSubscriberGrowth(range)),
  ]);
  const previousStats = await toSourceResult(email.providerId, cacheKey("email", email.providerId, "stats", rangeKey(prev)), () => email.getEmailStats(prev));
  return { stats, growth, previousStats, providerId: email.providerId };
}

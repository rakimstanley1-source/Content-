import type { DateRange } from "@/lib/date-range";

export type Platform = "instagram" | "tiktok" | "youtube" | "pinterest" | "twitter";
export type ContentFormat = "reel" | "carousel" | "static" | "story" | "video" | "short" | "pin" | "tweet" | "other";

export type Post = {
  id: string;
  platform: Platform;
  permalink: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  format: ContentFormat;
  publishedAt: string | null; // ISO
  metrics: {
    reach: number | null;
    saves: number | null;
    shares: number | null;
    comments: number | null;
    likes: number | null;
    profileVisits: number | null;
    externalLinkTaps: number | null;
  };
  saveRate: number | null; // saves / reach
  shareRate: number | null; // shares / reach
};

export type AccountMetrics = {
  platform: Platform;
  followerCount: number | null;
  followerDelta: number | null;
  reach: number | null;
  profileVisits: number | null;
  externalLinkTaps: number | null;
};

export type EmailStats = {
  provider: string;
  newSubscribers: number | null;
  totalListSize: number | null;
  openRate: number | null;
  clickRate: number | null;
  unsubscribes: number | null;
  subscribersBySource: Array<{ source: string; count: number }>;
  sourceBreakdownAvailable: boolean;
  recentSends: Array<{
    id: string;
    subject: string;
    sentAt: string | null;
    recipients: number | null;
    openRate: number | null;
    clickRate: number | null;
  }>;
};

export type DailyPoint = { date: string; value: number };

/** Every provider call returns this instead of throwing across the API
 * boundary, so one dead source never blanks the rest of the dashboard. */
export type SourceResult<T> =
  | { ok: true; data: T; source: string; syncedAt: number }
  | { ok: false; error: string; source: string; reason: "not_connected" | "action_failed" | "rate_limited" | "config_missing" };

export interface SocialProvider {
  readonly platform: Platform;
  readonly toolkitSlug: string;
  isConnected(): Promise<boolean>;
  getPosts(range: DateRange): Promise<Post[]>;
  getAccountMetrics(range: DateRange): Promise<AccountMetrics>;
}

export interface EmailProvider {
  readonly providerId: string;
  readonly toolkitSlug: string;
  isConnected(): Promise<boolean>;
  getEmailStats(range: DateRange): Promise<EmailStats>;
  getSubscriberGrowth(range: DateRange): Promise<DailyPoint[]>;
}

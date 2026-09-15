import { executeComposioAction } from "@/lib/composio/client";
import type { AccountMetrics, ContentFormat, Post, SocialProvider } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { isToolkitConnected } from "./not-connected";

const TOOLKIT = "youtube";

function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const [, h, m, s] = match;
  return (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
}

function mapFormat(durationSeconds: number | null): ContentFormat {
  if (durationSeconds !== null && durationSeconds <= 180) return "short";
  return "video";
}

export const youtubeProvider: SocialProvider = {
  platform: "youtube",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    return isToolkitConnected(TOOLKIT);
  },

  async getPosts(range: DateRange): Promise<Post[]> {
    const list = await executeComposioAction<{ items?: Array<{ snippet?: { resourceId?: { videoId?: string }; publishedAt?: string } }> }>({
      toolkit: TOOLKIT,
      actionName: "YOUTUBE_LIST_CHANNEL_VIDEOS",
      params: { mine: true, maxResults: 50, part: "snippet" },
    });

    const inRange = (list.items ?? []).filter((item) => {
      const publishedAt = item.snippet?.publishedAt;
      if (!publishedAt) return false;
      const t = new Date(publishedAt).getTime();
      return t >= range.start.getTime() && t <= range.end.getTime();
    });

    const ids = inRange.map((item) => item.snippet?.resourceId?.videoId).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];

    const details = await executeComposioAction<{
      items?: Array<{
        id?: string;
        snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string } }; publishedAt?: string };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails?: { duration?: string };
      }>;
    }>({
      toolkit: TOOLKIT,
      actionName: "YOUTUBE_GET_VIDEO_DETAILS_BATCH",
      params: { id: ids, parts: ["snippet", "statistics", "contentDetails"] },
    });

    return (details.items ?? []).map((video): Post => {
      const durationSeconds = parseIsoDuration(video.contentDetails?.duration);
      return {
        id: video.id ?? "",
        platform: "youtube",
        permalink: video.id ? `https://www.youtube.com/watch?v=${video.id}` : null,
        thumbnailUrl: video.snippet?.thumbnails?.high?.url ?? null,
        caption: video.snippet?.title ?? video.snippet?.description ?? null,
        format: mapFormat(durationSeconds),
        publishedAt: video.snippet?.publishedAt ?? null,
        metrics: {
          // The YouTube Data API exposes views/likes/comments but not
          // reach, saves or shares — those live in the separate YouTube
          // Analytics API, which Composio's youtube toolkit doesn't
          // currently expose as an action.
          reach: null,
          saves: null,
          shares: null,
          comments: video.statistics?.commentCount ? Number(video.statistics.commentCount) : null,
          likes: video.statistics?.likeCount ? Number(video.statistics.likeCount) : null,
          profileVisits: null,
          externalLinkTaps: null,
        },
        saveRate: null,
        shareRate: null,
      };
    });
  },

  async getAccountMetrics(_range: DateRange): Promise<AccountMetrics> {
    const stats = await executeComposioAction<{ items?: Array<{ statistics?: { subscriberCount?: string; viewCount?: string } }> }>({
      toolkit: TOOLKIT,
      actionName: "YOUTUBE_GET_CHANNEL_STATISTICS",
      params: { mine: true, part: "statistics" },
    });
    const subscriberCount = stats.items?.[0]?.statistics?.subscriberCount;

    return {
      platform: "youtube",
      followerCount: subscriberCount ? Number(subscriberCount) : null,
      // The Data API returns a point-in-time subscriber total, not a
      // range delta; tracking growth requires storing our own daily
      // snapshots (see AccountMetrics cache) rather than a single call.
      followerDelta: null,
      reach: null,
      profileVisits: null,
      externalLinkTaps: null,
    };
  },
};

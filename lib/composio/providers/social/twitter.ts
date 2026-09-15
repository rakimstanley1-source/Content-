import { executeComposioAction } from "@/lib/composio/client";
import { ComposioSourceError } from "@/lib/composio/errors";
import type { AccountMetrics, Post, SocialProvider } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { isToolkitConnected } from "./not-connected";

const TOOLKIT = "twitter";

export const twitterProvider: SocialProvider = {
  platform: "twitter",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    return isToolkitConnected(TOOLKIT);
  },

  async getPosts(_range: DateRange): Promise<Post[]> {
    // Composio's twitter toolkit currently exposes tweet creation and the
    // authenticated user's home timeline, but no "list my own posts in a
    // date range" action — X's v2 API gates that behind a paid tier. Fail
    // loudly so the Content screen shows an explicit per-card error
    // instead of a silently empty table.
    throw new ComposioSourceError("Composio's X/Twitter toolkit doesn't yet expose an action to list your own posts.", {
      toolkit: TOOLKIT,
      kind: "action_failed",
    });
  },

  async getAccountMetrics(_range: DateRange): Promise<AccountMetrics> {
    const me = await executeComposioAction<{ data?: { public_metrics?: { followers_count?: number } } }>({
      toolkit: TOOLKIT,
      actionName: "TWITTER_USER_LOOKUP_ME",
      params: { user_fields: ["public_metrics"] },
    });

    return {
      platform: "twitter",
      followerCount: me.data?.public_metrics?.followers_count ?? null,
      // X's public API has no range-scoped follower-delta or reach action
      // without elevated (paid) access.
      followerDelta: null,
      reach: null,
      profileVisits: null,
      externalLinkTaps: null,
    };
  },
};

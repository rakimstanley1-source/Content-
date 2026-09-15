import { ComposioSourceError } from "@/lib/composio/errors";
import type { AccountMetrics, Post, SocialProvider } from "@/lib/composio/types";
import type { DateRange } from "@/lib/date-range";
import { isToolkitConnected } from "./not-connected";

const TOOLKIT = "tiktok";

export const tiktokProvider: SocialProvider = {
  platform: "tiktok",
  toolkitSlug: TOOLKIT,

  async isConnected() {
    return isToolkitConnected(TOOLKIT);
  },

  async getPosts(_range: DateRange): Promise<Post[]> {
    throw new ComposioSourceError("Composio's tiktok toolkit only exposes the Content Posting (upload/publish) API — no analytics or list-posts action yet.", {
      toolkit: TOOLKIT,
      kind: "action_failed",
    });
  },

  async getAccountMetrics(_range: DateRange): Promise<AccountMetrics> {
    throw new ComposioSourceError("Composio's tiktok toolkit doesn't yet expose account analytics.", {
      toolkit: TOOLKIT,
      kind: "action_failed",
    });
  },
};

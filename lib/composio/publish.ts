import { executeComposioAction } from "@/lib/composio/client";
import { ComposioSourceError } from "@/lib/composio/errors";
import { resolveAccountId } from "@/lib/composio/providers/social/not-connected";
import type { Platform } from "@/lib/composio/types";

export type PublishInput = {
  platform: Platform;
  format: string;
  caption: string;
  mediaUrl: string | null;
};

export type PublishOutput = { externalPostId: string; externalPermalink: string | null };

async function publishInstagram(input: PublishInput): Promise<PublishOutput> {
  if (!input.mediaUrl) {
    throw new ComposioSourceError("Instagram posts require a media URL.", { toolkit: "instagram", kind: "action_failed" });
  }
  const connectedAccountId = await resolveAccountId("instagram", process.env.COMPOSIO_INSTAGRAM_ACCOUNT_ID);
  const isVideo = input.format === "reel" || input.format === "video";

  const container = await executeComposioAction<{ id?: string }>({
    toolkit: "instagram",
    actionName: "INSTAGRAM_POST_IG_USER_MEDIA",
    connectedAccountId,
    params: {
      ig_user_id: "me",
      caption: input.caption,
      ...(isVideo ? { video_url: input.mediaUrl, media_type: "REELS" } : { image_url: input.mediaUrl }),
    },
  });
  if (!container.id) {
    throw new ComposioSourceError("Instagram did not return a media container id.", { toolkit: "instagram", kind: "action_failed" });
  }

  const published = await executeComposioAction<{ id?: string; permalink?: string }>({
    toolkit: "instagram",
    actionName: "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH",
    connectedAccountId,
    params: { ig_user_id: "me", creation_id: container.id, max_wait_seconds: isVideo ? 180 : 30 },
  });

  return { externalPostId: published.id ?? container.id, externalPermalink: published.permalink ?? null };
}

async function publishTiktok(input: PublishInput): Promise<PublishOutput> {
  if (!input.mediaUrl) {
    throw new ComposioSourceError("TikTok posts require a video URL.", { toolkit: "tiktok", kind: "action_failed" });
  }
  const connectedAccountId = await resolveAccountId("tiktok", process.env.COMPOSIO_TIKTOK_ACCOUNT_ID);
  const result = await executeComposioAction<{ publish_id?: string }>({
    toolkit: "tiktok",
    actionName: "TIKTOK_PUBLISH_VIDEO",
    connectedAccountId,
    params: { video_url: input.mediaUrl, caption: input.caption, privacy_level: "SELF_ONLY" },
  });
  if (!result.publish_id) {
    throw new ComposioSourceError("TikTok did not return a publish id.", { toolkit: "tiktok", kind: "action_failed" });
  }
  // Publishing is async; TIKTOK_FETCH_PUBLISH_STATUS should be polled by a
  // follow-up sync job rather than blocking this request.
  return { externalPostId: result.publish_id, externalPermalink: null };
}

async function publishPinterest(input: PublishInput): Promise<PublishOutput> {
  if (!input.mediaUrl) {
    throw new ComposioSourceError("Pinterest pins require an image URL.", { toolkit: "pinterest", kind: "action_failed" });
  }
  const boardId = process.env.COMPOSIO_PINTEREST_DEFAULT_BOARD_ID;
  if (!boardId) {
    throw new ComposioSourceError("Set COMPOSIO_PINTEREST_DEFAULT_BOARD_ID to publish pins.", { toolkit: "pinterest", kind: "config_missing" });
  }
  const connectedAccountId = await resolveAccountId("pinterest", process.env.COMPOSIO_PINTEREST_ACCOUNT_ID);
  const result = await executeComposioAction<{ id?: string }>({
    toolkit: "pinterest",
    actionName: "PINTEREST_CREATE_PIN",
    connectedAccountId,
    params: { board_id: boardId, description: input.caption, media_source: { source_type: "image_url", url: input.mediaUrl } },
  });
  if (!result.id) {
    throw new ComposioSourceError("Pinterest did not return a pin id.", { toolkit: "pinterest", kind: "action_failed" });
  }
  return { externalPostId: result.id, externalPermalink: `https://www.pinterest.com/pin/${result.id}/` };
}

async function publishTwitter(input: PublishInput): Promise<PublishOutput> {
  const connectedAccountId = await resolveAccountId("twitter", process.env.COMPOSIO_TWITTER_ACCOUNT_ID);
  // Media tweets need a prior TWITTER_UPLOAD_MEDIA call against an
  // already-hosted file (Composio's S3 key, not an arbitrary URL) — until
  // that upload step is wired in, only text posts publish here.
  const result = await executeComposioAction<{ data?: { id?: string } }>({
    toolkit: "twitter",
    actionName: "TWITTER_CREATION_OF_A_POST",
    connectedAccountId,
    params: { text: input.caption },
  });
  const id = result.data?.id;
  if (!id) {
    throw new ComposioSourceError("X did not return a post id.", { toolkit: "twitter", kind: "action_failed" });
  }
  return { externalPostId: id, externalPermalink: `https://x.com/i/web/status/${id}` };
}

export async function publishContent(input: PublishInput): Promise<PublishOutput> {
  switch (input.platform) {
    case "instagram":
      return publishInstagram(input);
    case "tiktok":
      return publishTiktok(input);
    case "pinterest":
      return publishPinterest(input);
    case "twitter":
      return publishTwitter(input);
    case "youtube":
      throw new ComposioSourceError("YouTube uploads need a Composio file upload (not just a URL) — wire a storage provider before publishing here.", {
        toolkit: "youtube",
        kind: "action_failed",
      });
  }
}

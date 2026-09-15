import { instagramProvider } from "./providers/social/instagram";
import { pinterestProvider } from "./providers/social/pinterest";
import { tiktokProvider } from "./providers/social/tiktok";
import { twitterProvider } from "./providers/social/twitter";
import { youtubeProvider } from "./providers/social/youtube";
import { mailchimpProvider } from "./providers/email/mailchimp";
import { mailerliteProvider } from "./providers/email/mailerlite";
import type { EmailProvider, Platform, SocialProvider } from "./types";

/**
 * The whole modular-integrations promise comes down to this map: adding a
 * new platform means writing one provider file and adding one line here —
 * nothing upstream (routes, screens) needs to change.
 */
export const socialProviders: Record<Platform, SocialProvider> = {
  instagram: instagramProvider,
  tiktok: tiktokProvider,
  youtube: youtubeProvider,
  pinterest: pinterestProvider,
  twitter: twitterProvider,
};

export const emailProviders: Record<string, EmailProvider> = {
  mailchimp: mailchimpProvider,
  mailerlite: mailerliteProvider,
};

export function getActiveEmailProvider(): EmailProvider {
  const id = process.env.COMPOSIO_EMAIL_PROVIDER ?? "mailchimp";
  return emailProviders[id] ?? mailchimpProvider;
}

export const TOOLKIT_CATALOG: Array<{
  toolkit: string;
  label: string;
  category: "content" | "email";
  platform?: Platform;
}> = [
  { toolkit: "instagram", label: "Instagram", category: "content", platform: "instagram" },
  { toolkit: "tiktok", label: "TikTok", category: "content", platform: "tiktok" },
  { toolkit: "youtube", label: "YouTube", category: "content", platform: "youtube" },
  { toolkit: "pinterest", label: "Pinterest", category: "content", platform: "pinterest" },
  { toolkit: "twitter", label: "X (Twitter)", category: "content", platform: "twitter" },
  { toolkit: "mailchimp", label: "Mailchimp", category: "email" },
  { toolkit: "mailerlite", label: "MailerLite", category: "email" },
  { toolkit: "hubspot", label: "HubSpot", category: "email" },
];

/** SQLite has no native enum support in Prisma, so ContentItem's platform,
 * format and status columns are plain strings. These unions are the
 * app-level contract for what's valid — enforce them at API boundaries. */
export type PlatformValue = "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "PINTEREST" | "X";
export type ContentFormatValue = "REEL" | "CAROUSEL" | "STATIC" | "STORY" | "SHORT" | "VIDEO" | "ARTICLE" | "PIN" | "TWEET" | "OTHER";
export type PipelineStatusValue = "IDEA" | "BRIEF" | "CREATED" | "REVIEW" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ANALYZED" | "REPURPOSED";

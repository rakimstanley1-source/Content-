import { getAnthropicClient, AI_MODEL } from "./anthropic";
import type { Brand } from "@prisma/client";

export type GenerateKind =
  | "hooks"
  | "captions"
  | "video_script"
  | "reel_concept"
  | "tiktok_concept"
  | "carousel_concept"
  | "story_ideas"
  | "cta"
  | "hashtags"
  | "content_angles"
  | "creative_brief"
  | "image_prompt"
  | "video_prompt";

const KIND_INSTRUCTIONS: Record<GenerateKind, string> = {
  hooks: `Write 8 scroll-stopping opening hooks (first line / first 3 seconds) for this idea. Each under 15 words. Return JSON: {"hooks": string[]}`,
  captions: `Write 3 full captions for this idea, in the brand's voice, each 2-4 short paragraphs with line breaks, ending in a call to action. Return JSON: {"captions": string[]}`,
  video_script: `Write a short-form video script (30-60s) with timestamped beats. Return JSON: {"script": [{"time": string, "beat": string, "line": string}]}`,
  reel_concept: `Write 4 distinct Instagram Reel concepts for this idea: a visual premise, the hook, and the core beats. Return JSON: {"concepts": [{"title": string, "hook": string, "beats": string[]}]}`,
  tiktok_concept: `Write 4 distinct TikTok concepts for this idea, native to TikTok's pacing/format (not a repost of an Instagram idea). Return JSON: {"concepts": [{"title": string, "hook": string, "beats": string[]}]}`,
  carousel_concept: `Design a carousel concept for this idea: 6-8 slides. Slide 1 is the hook/cover. Return JSON: {"slides": [{"number": number, "headline": string, "body": string}]}`,
  story_ideas: `Write a 4-6 frame Instagram/TikTok Story sequence for this idea (polls, questions, behind-the-scenes beats welcome). Return JSON: {"frames": [{"number": number, "type": string, "content": string}]}`,
  cta: `Write 6 calls-to-action for this idea, varied in intent (follow, save, comment, click link, subscribe, buy). Return JSON: {"ctas": string[]}`,
  hashtags: `Suggest 20 hashtags for this idea: mix of broad-reach, niche, and branded. Return JSON: {"hashtags": string[]}`,
  content_angles: `Suggest 6 distinct content angles this idea could be told from (contrarian take, tutorial, story, data-backed, behind-the-scenes, myth-busting, etc). Return JSON: {"angles": [{"angle": string, "why": string}]}`,
  creative_brief: `Write a one-page creative brief for this idea: objective, audience, key message, tone, format recommendation, deliverables, success metric. Return JSON: {"objective": string, "audience": string, "keyMessage": string, "tone": string, "formatRecommendation": string, "deliverables": string[], "successMetric": string}`,
  image_prompt: `Write 3 detailed image-generation prompts for this idea, matching the brand's visual aesthetic. Return JSON: {"prompts": string[]}`,
  video_prompt: `Write 3 detailed video-generation prompts (camera, motion, pacing, mood) for this idea, matching the brand's visual aesthetic. Return JSON: {"prompts": string[]}`,
};

function brandContext(brand: Brand): string {
  const pillars = safeParseArray(brand.contentPillars);
  const platforms = safeParseArray(brand.platforms);
  return [
    `Brand: ${brand.name}`,
    brand.identity && `Identity: ${brand.identity}`,
    brand.audience && `Audience: ${brand.audience}`,
    brand.voice && `Voice/tone: ${brand.voice}`,
    brand.products && `Products: ${brand.products}`,
    brand.visualAesthetic && `Visual aesthetic: ${brand.visualAesthetic}`,
    pillars.length > 0 && `Content pillars: ${pillars.join(", ")}`,
    platforms.length > 0 && `Platforms: ${platforms.join(", ")}`,
    brand.aiInstructions && `Additional instructions from the operator: ${brand.aiInstructions}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function safeParseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

export async function generateForBrand(brand: Brand, kind: GenerateKind, idea: string): Promise<unknown> {
  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: `You are the in-house content strategist for a single-operator digital products brand. You write in the brand's real voice, never generic marketing copy. Always respond with ONLY valid JSON matching the requested shape — no markdown fences, no commentary.\n\n${brandContext(brand)}`,
    messages: [{ role: "user", content: `Idea: ${idea}\n\n${KIND_INSTRUCTIONS[kind]}` }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model returned no text content.");
  }
  return extractJson(textBlock.text);
}

/** Platform-native repurposing: takes a published piece of content and asks
 * for a variation built for a different platform's format and pacing,
 * rather than a copy-paste of the original. */
export async function repurposeForPlatform(
  brand: Brand,
  source: { platform: string; format: string; caption: string; hook: string },
  targetPlatform: string
): Promise<{ hook: string; caption: string; cta: string; hashtags: string[]; formatNotes: string }> {
  const anthropic = getAnthropicClient();
  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: `You are the in-house content strategist for a single-operator digital products brand. When repurposing content across platforms you never copy-paste — you rebuild the idea natively for the target platform's pacing, format and audience expectations. Respond with ONLY valid JSON, no markdown fences.\n\n${brandContext(brand)}`,
    messages: [
      {
        role: "user",
        content: `Source content published on ${source.platform} (${source.format}):\nHook: ${source.hook}\nCaption: ${source.caption}\n\nRebuild this natively for ${targetPlatform}. Return JSON: {"hook": string, "caption": string, "cta": string, "hashtags": string[], "formatNotes": string}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model returned no text content.");
  }
  return extractJson(textBlock.text) as { hook: string; caption: string; cta: string; hashtags: string[]; formatNotes: string };
}

export type ContentHistoryPoint = {
  platform: string;
  format: string;
  caption: string;
  hook: string;
  publishedAt: string | null;
  reach: number | null;
  saveRate: number | null;
  shareRate: number | null;
};

/** "What should I post next" — grounded strictly in the brand's own recent
 * content and its real performance, never generic advice. */
export async function generateRecommendations(brand: Brand, history: ContentHistoryPoint[]): Promise<{
  recommendations: Array<{ type: string; title: string; reasoning: string }>;
}> {
  const anthropic = getAnthropicClient();
  const historyBlock = history
    .slice(0, 40)
    .map((p) => `- [${p.platform}/${p.format}] "${p.hook || p.caption.slice(0, 60)}" — reach ${p.reach ?? "n/a"}, save rate ${p.saveRate !== null ? (p.saveRate * 100).toFixed(1) + "%" : "n/a"}, share rate ${p.shareRate !== null ? (p.shareRate * 100).toFixed(1) + "%" : "n/a"} (${p.publishedAt ?? "unscheduled"})`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: `You are the in-house content strategist for a single-operator digital products brand. Base every recommendation strictly on the content history provided — cite the specific post, format or pattern that justifies it. If the history is empty, say there isn't enough data yet rather than inventing advice. Respond with ONLY valid JSON, no markdown fences.\n\n${brandContext(brand)}`,
    messages: [
      {
        role: "user",
        content: `Recent content performance (most recent first):\n${historyBlock || "(no content history yet)"}\n\nRecommend what to create next. Cover: what to create next, which topics to repeat, which formats need more testing, which hooks performed well and should be reused, what should be repurposed, what content gaps exist, what hasn't been posted recently. Return JSON: {"recommendations": [{"type": string, "title": string, "reasoning": string}]}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model returned no text content.");
  }
  return extractJson(textBlock.text) as { recommendations: Array<{ type: string; title: string; reasoning: string }> };
}

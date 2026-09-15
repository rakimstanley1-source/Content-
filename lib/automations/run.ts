import { db } from "@/lib/db";
import { generateForBrand, generateRecommendations } from "@/lib/ai/generate";
import { getOverviewBundle, getContentBundle } from "@/lib/composio/aggregate";
import { parseRangeFromSearchParams } from "@/lib/date-range";
import type { Automation } from "@prisma/client";

export type AutomationStep = { type: string; config?: Record<string, unknown> };
export type AutomationTrigger = { type: "manual" | "content_idea_added" | "content_published" | "weekly_schedule"; config?: Record<string, unknown> };

function log(lines: string[], line: string) {
  lines.push(`[${new Date().toISOString()}] ${line}`);
}

/**
 * A small, real (non-simulated) step interpreter: every step here performs
 * an actual DB write or an actual Composio/Anthropic call. There's no
 * background worker in this deployment, so multi-day schedules run via the
 * "Run now" button or a trigger event, not a cron daemon — wire Vercel Cron
 * or a Composio trigger to POST /api/automations/[id]/run for that.
 */
export async function executeAutomation(automation: Automation, context: { contentItemId?: string; brandId?: string } = {}): Promise<{ status: "success" | "failed"; log: string }> {
  const lines: string[] = [];
  const steps: AutomationStep[] = JSON.parse(automation.steps || "[]");
  const brandId = context.brandId ?? automation.brandId;

  try {
    if (!brandId) throw new Error("Automation has no brand to run against.");
    const brand = await db.brand.findUniqueOrThrow({ where: { id: brandId } });
    let contentItem = context.contentItemId ? await db.contentItem.findUnique({ where: { id: context.contentItemId } }) : null;

    for (const step of steps) {
      switch (step.type) {
        case "generate_brief": {
          if (!contentItem) throw new Error("generate_brief needs a content item in context.");
          const idea = (step.config?.idea as string) ?? contentItem.caption ?? contentItem.hook;
          const brief = await generateForBrand(brand, "creative_brief", idea);
          contentItem = await db.contentItem.update({ where: { id: contentItem.id }, data: { notes: JSON.stringify(brief), status: "BRIEF" } });
          log(lines, `Generated creative brief for "${idea.slice(0, 60)}".`);
          break;
        }
        case "generate_caption": {
          if (!contentItem) throw new Error("generate_caption needs a content item in context.");
          const idea = contentItem.hook || contentItem.caption || (step.config?.idea as string) || "";
          const result = (await generateForBrand(brand, "captions", idea)) as { captions: string[] };
          contentItem = await db.contentItem.update({
            where: { id: contentItem.id },
            data: { caption: result.captions?.[0] ?? contentItem.caption, status: "CREATED" },
          });
          log(lines, `Drafted caption for content item ${contentItem.id}.`);
          break;
        }
        case "notify_approval": {
          if (!contentItem) throw new Error("notify_approval needs a content item in context.");
          await db.taskItem.create({
            data: {
              brandId: brand.id,
              contentItemId: contentItem.id,
              title: `Review needed: ${(contentItem.caption || contentItem.hook || "untitled").slice(0, 80)}`,
              dueAt: new Date(),
            },
          });
          contentItem = await db.contentItem.update({ where: { id: contentItem.id }, data: { status: "REVIEW" } });
          log(lines, `Queued approval task for content item ${contentItem.id}.`);
          break;
        }
        case "collect_performance": {
          if (!contentItem) throw new Error("collect_performance needs a content item in context.");
          const range = parseRangeFromSearchParams({ range: "30d" }).range;
          const bundle = await getContentBundle(range);
          const platformKey = contentItem.platform.toLowerCase() as keyof typeof bundle;
          const result = bundle[platformKey];
          if (result.ok) {
            const match = result.data.find((p) => p.id === contentItem!.externalPostId);
            log(lines, match ? `Synced live metrics for ${contentItem.platform}: reach ${match.metrics.reach ?? "n/a"}, saves ${match.metrics.saves ?? "n/a"}.` : `No matching live post found yet for ${contentItem.platform}.`);
          } else {
            log(lines, `Could not sync ${contentItem.platform} metrics: ${result.error}`);
          }
          contentItem = await db.contentItem.update({ where: { id: contentItem.id }, data: { status: "ANALYZED" } });
          break;
        }
        case "weekly_report": {
          const range = parseRangeFromSearchParams({ range: "7d" }).range;
          const overview = await getOverviewBundle(range);
          const reach = overview.instagram.ok ? overview.instagram.data.reach : null;
          const newSubs = overview.email.ok ? overview.email.data.newSubscribers : null;
          log(lines, `Weekly report — Instagram reach: ${reach ?? "unavailable"}; new subscribers: ${newSubs ?? "unavailable"}.`);
          break;
        }
        case "recommend_next_week": {
          const range = parseRangeFromSearchParams({ range: "90d" }).range;
          const contentBundle = await getContentBundle(range);
          const history = Object.values(contentBundle)
            .filter((r) => r.ok)
            .flatMap((r) => (r.ok ? r.data : []))
            .map((p) => ({ platform: p.platform, format: p.format, caption: p.caption ?? "", hook: (p.caption ?? "").split("\n")[0] ?? "", publishedAt: p.publishedAt, reach: p.metrics.reach, saveRate: p.saveRate, shareRate: p.shareRate }));
          const recs = await generateRecommendations(brand, history);
          log(lines, `Generated ${recs.recommendations.length} recommendations from ${history.length} posts.`);
          break;
        }
        default:
          log(lines, `Unknown step type "${step.type}" — skipped.`);
      }
    }

    return { status: "success", log: lines.join("\n") };
  } catch (err) {
    log(lines, `FAILED: ${err instanceof Error ? err.message : String(err)}`);
    return { status: "failed", log: lines.join("\n") };
  }
}

export async function runAutomation(automationId: string, context: { contentItemId?: string; brandId?: string } = {}) {
  const automation = await db.automation.findUniqueOrThrow({ where: { id: automationId } });
  const run = await db.automationRun.create({ data: { automationId, status: "running" } });
  const result = await executeAutomation(automation, context);
  await db.automationRun.update({ where: { id: run.id }, data: { status: result.status, finishedAt: new Date(), log: result.log } });
  await db.automation.update({ where: { id: automationId }, data: { lastRunAt: new Date() } });
  return result;
}

/** Fires every enabled automation whose trigger matches — called from the
 * content-published side effect so "after publish, analyze + consider
 * repurposing" is a real event, not just a manual button. */
export async function runAutomationsForTrigger(triggerType: AutomationTrigger["type"], context: { brandId: string; contentItemId?: string }) {
  const automations = await db.automation.findMany({ where: { brandId: context.brandId, enabled: true } });
  const matching = automations.filter((a) => {
    try {
      return (JSON.parse(a.trigger) as AutomationTrigger).type === triggerType;
    } catch {
      return false;
    }
  });
  for (const automation of matching) {
    await runAutomation(automation.id, context);
  }
}

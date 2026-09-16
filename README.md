# Content OS

An AI-powered content command center for a single-operator brand (or several): plan, create, schedule, publish, analyze and repurpose content across Instagram, TikTok, YouTube, Pinterest and X, with email growth tracked alongside it. Every external integration goes through [Composio](https://composio.dev) — there are no other bespoke API clients.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind, Prisma/Postgres for the operator's own data (brands, content pipeline, campaigns, goals, tasks, automations), the `composio-core` SDK for every external app, and the Anthropic SDK for content generation.

## Local setup

```bash
cp .env.example .env   # fill in the keys below, including a Postgres DATABASE_URL
npm install
npm run db:push
npm run dev
```

Required environment variables (server-side only, never exposed to the client):

- `COMPOSIO_API_KEY` — Composio API key. Without it, every analytics/publish call fails closed with an explicit "not connected" state; nothing fabricates data.
- `ANTHROPIC_API_KEY` — powers the Create workspace and recommendations.
- `DATABASE_URL` — a Postgres connection string (see `.env.example`). Any Postgres works locally; a free Neon or Supabase database works in production.

Optional: `COMPOSIO_ENTITY_ID`, `COMPOSIO_EMAIL_PROVIDER` (`mailchimp` or `mailerlite`), and per-toolkit `COMPOSIO_*_ACCOUNT_ID` overrides for when more than one account of a toolkit is connected (Composio requires an explicit account id in that case).

## Deploying to Vercel

The app is deployed as ordinary Next.js serverless functions, which have no persistent local disk — that's why the database is Postgres rather than the SQLite file used in early local prototyping (a SQLite file would get wiped between requests). Steps:

1. **Database**: In the Vercel dashboard, add the **Neon** or **Supabase** Postgres integration (Storage tab) to the project — it provisions a free Postgres database and injects `DATABASE_URL` automatically. (Or create one yourself at neon.tech/supabase.com and paste the connection string in as an env var.)
2. **Import the repo**: vercel.com → Add New → Project → import this GitHub repo. Vercel auto-detects Next.js; no build-command changes needed (`prisma generate` already runs via `postinstall` and the `build` script).
3. **Environment variables**: in the project's Settings → Environment Variables, add `COMPOSIO_API_KEY` and `ANTHROPIC_API_KEY` (and any optional ones you need). `DATABASE_URL` is already set if you used step 1's integration.
4. **Push the schema**: after the first deploy (or before it, pointing at the same `DATABASE_URL` from your machine), run `npx prisma db push` once to create the tables in the production database. There's no separate migrations folder to run — `db push` is the whole step.
5. **Deploy**. Open the resulting `*.vercel.app` URL on your phone — it's the real app, not a preview.

Composio's connect flow opens an OAuth URL in a new tab (see `/integrations`), which works the same on mobile Safari/Chrome as on desktop.

## Architecture

- `lib/composio/types.ts` — the provider-agnostic contracts: `SocialProvider` (`getPosts`, `getAccountMetrics`) and `EmailProvider` (`getEmailStats`, `getSubscriberGrowth`).
- `lib/composio/providers/social/*` and `lib/composio/providers/email/*` — one file per platform, each implementing the shared interface against **real, verified Composio action slugs** (queried live from Composio's own catalog while building this, not invented). Swapping the email platform, or adding a new social platform, touches exactly one file plus one line in `lib/composio/registry.ts`.
- `lib/composio/cache.ts` — 15-minute server-side cache, `lib/composio/backoff.ts` — exponential backoff on rate limits, `lib/composio/aggregate.ts` — turns provider calls into per-source `SourceResult`s so one dead integration never blanks the rest of a screen.
- `lib/ai/generate.ts` — every AI Content Generator output and the "what should I post next" recommendations are grounded in the active brand's real profile (voice, audience, pillars) and, for recommendations, its actual Composio content history — never generic copy.
- `lib/automations/run.ts` — a small real step-interpreter (no simulated steps): each step performs an actual DB write or Composio/Anthropic call. There's no background worker in this deployment, so scheduled steps run via "Run now" or the `content_published` event; wire Vercel Cron or a Composio trigger at `/api/automations/[id]/run` for unattended weekly runs.

## What's real vs. what's scoped out

This was built by first querying Composio's live tool catalog (`COMPOSIO_SEARCH_TOOLS` / `COMPOSIO_GET_TOOL_SCHEMAS`) and using only the action slugs and parameters it actually returned:

- **Instagram** is fully wired: posts, per-post insights (reach/saves/shares/comments), account insights (reach/profile visits/link taps/follower delta), and publishing (image/video/reel).
- **Mailchimp** (default) and **MailerLite** are fully wired for stats, recent sends and growth, within what each toolkit's actions expose — see the inline comments in `lib/composio/providers/email/*.ts` for the specific gaps (e.g. neither platform's connected actions expose a signup-source breakdown, so that card shows an honest "not available" instead of a guess).
- **TikTok**, **YouTube**, **Pinterest** and **X/Twitter** are wired for whatever Composio's current toolkits support (YouTube stats/videos, Pinterest pin analytics, X profile lookup, publishing for Instagram/TikTok/Pinterest/X) and fail loudly and specifically where an action doesn't exist yet (e.g. TikTok and X currently have no "list my own posts" action in Composio's catalog — connecting them still works, but the Content table will say so rather than showing an empty table with no explanation).
- **YouTube publishing** needs a Composio-hosted file (not a bare URL), which means wiring a storage provider first — left as a documented next step rather than faked.

Per the product rules this was built to: no seeded/mock data anywhere, a missing metric renders as "—" (never a fabricated zero), and a failed source degrades its own card/section instead of the page.

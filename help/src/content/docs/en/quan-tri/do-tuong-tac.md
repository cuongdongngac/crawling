---
title: "Engagement tracking (Social Fetch)"
---

**Apify finds the post links; irrelevant posts are filtered out; Social Fetch re-measures likes, comments, shares, views and saves of each post on a schedule, to paint a picture of engagement over time.** The **Engagement tracking** page (administrators only) shows which posts are due for measurement, lets you measure now, and shows past measurement runs.

## Measurement schedule per post

| When | What is measured |
|---|---|
| Day 0 (when Apify finds the post) | The metrics Apify returns — no Social Fetch credits used |
| 3, 7, 14, 30 days after discovery | One measurement at each milestone |
| Post discovered when already older than 60 days | Only the 30-day milestone is measured |
| After 30 days, a post **still hot** (engagement up 5% between the two most recent measurements) | Re-measured about once every 30 days |
| The previous measurement **didn't find the post** | Re-measured after at least 24 hours. Still not found → record the disappearance date, stop measuring |
| **Full inventory** (run manually, before each analysis round or after a policy milestone) | Every relevant post still alive that hasn't been measured in 7 days |

**Never sent for measurement:** posts concluded to be *irrelevant*, posts that have disappeared, and fake posts (UI test data).

## What each measurement stores

Just one row of metrics: measurement time, likes, comments, shares, views, saves (TikTok). No names, account images, video download links, or anything else Social Fetch returns are stored.

## Automatic runs

- **Default: Vercel Cron**, every day at 3 a.m. (Vietnam time). Vercel only orchestrates; Social Fetch does the actual data fetching. Each run: the AI first screens new posts (if enabled on the Settings page), then measures the due posts.
- **You can also run it on another machine** (NAS, server): schedule a call to `/api/cron/daily` with the secret, or run the command inside the web directory: `npx tsx scripts/measure-run.mts` (add `--dry` to only see the number of due posts).
- The **"Measure now"** button on the page for manual measurement, for example when you want to run a full inventory.

## Cost

- Each attempt to measure a post costs 1 Social Fetch credit, even if the post isn't found. Errors on Social Fetch's side don't count as credits.
- On the **Settings** page: declare the Social Fetch key, **monthly measurement spend cap** (default 40 USD) and the **price per credit** for your current plan (Starter 0.014; Growth 0.00236 USD/credit). When the cap is reached, measurement stops until the next month.
- Out of credits on the Social Fetch account: the measurement stops immediately and reports an error.

## Initial setup (technical administration)

1. Run `docs/migrations/2026-11-04_do-tuong-tac.sql` on Supabase.
2. **Settings** page → paste the Social Fetch key → **Check** (see the balance, no credits used) → Save.
3. On Vercel: add the environment variable `CRON_SECRET` (a long random string). The `vercel.json` file already declares the run schedule.

---
title: "Choosing scan tools"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, approach, and **limitations** during the build phase, so the team can review and comment. This section will be trimmed or removed once the system is stable. Send feedback directly to the IT team lead (CuongPV).
:::

The system does not write its own data collection part but uses **actors** — ready-made scan tools on the Apify platform, paid by usage. Each actor has its own pros and cons, may stop working or change price, so it must be evaluated and always have a fallback.

## Evaluation criteria

1. Input is a hashtag/keyword (the project only scans by hashtag, not by page/person).
2. Each post has enough: link, posting date, content, author code, likes, comments, shares (TikTok adds views).
3. Can limit the number of posts per run (cost cap).
4. Can limit by posting time (if not available, filter afterwards).
5. Returns **Vietnamese** posts.
6. Has an actor that **re-measures by post link** for the Engagement flow.

## Current choice (31/10/2026)

| Role | TikTok | Facebook |
|---|---|---|
| Discovery (hashtag scan) | clockworks/tiktok-hashtag-scraper | scraper_one/facebook-posts-search |
| Engagement measurement by link | **Social Fetch** (waiting to run the 100 free calls) | **Social Fetch** (waiting to run the trial) |
| Fallback for finding posts | api-ninja/tiktok-hashtag-scraper | scrapeforge/facebook-search-posts |
| Fallback for measurement | Bright Data; clockworks/tiktok-scraper; insiteco/social-insight-scraper | Bright Data; clappi/facebook-posts-reels-scraper |

Excluded: actors that only measure hashtag popularity (do not collect posts), Instagram actors (out of scope), actors under maintenance, actors returning no results, actors that scan by page (against the rule of scanning by hashtag only).

## Why measure engagement with Social Fetch, not with an Apify actor?

- **Separation of duties:** Apify is good at finding posts by hashtag; re-measuring by link is a different job, use a service specialized for it.
- **Simple:** self-service signup, 100 free calls without a card; one call returns results right away (about 3 seconds), one post per call.
- **Cost:** one-time credit packs, no expiry (about 1.6–2.4 USD/1,000 calls depending on the pack); failed calls are not charged. Expected measurement volume ~4,900 calls/month → about 12 USD/month.
- **Can also measure TikTok keyword trends:** find videos by keyword filtered by Vietnam region and posting date — used as a weekly "thermometer" (see below).

**Risk:** Social Fetch is a small, new company (2024) — may change prices or shut down. Mitigation: buy small packs gradually; the measurement part is written provider-separately; when needed, switch to Bright Data (evaluated: ~1.5 USD/1,000 records, has a free monthly pack, but signup is more complicated) or a fallback Apify actor. The project needs trends, not absolute accuracy; provider-change dates are marked on the chart.

Seen and not chosen: Data365 (subscription, over budget), Oxylabs (no ready reader for TikTok/Facebook).

## Keyword trend "thermometer" (TikTok, trial)

Each week, for each keyword in the catalog, ask TikTok "how many new videos in the week, in Vietnam" (fetch a few pages of results, sum views). This is an index **independent of the collected post sample**, very cheap (about a few hundred calls/month, under 2 USD), complementing question 1.
Limitations: search results are capped and ordered by TikTok, so it is a **relative index** (up/down), not a true total. Facebook has no keyword post search so there is no such thermometer.

## Stopping points — when to change direction

| Check | If not met |
|---|---|
| Vietnamese hashtag scan returns at least 30% Vietnamese posts | Keyword set is not right → redo the slang catalog with contributors before discussing technical details |
| The re-measurement actor accepts all link types and reports deleted posts | Normalize links before sending; if it cannot report deleted posts, record it as a limitation |
| The re-measurement actor's numbers match the scan actor (deviation under 10%) | Do not chain the two actors |
| Real cost no more than 1.5× the estimate | Space out the schedule, reduce posts per scan |
| No stable actor for one platform | Focus on the remaining platform, note it clearly in the report |

## Current state of trials

The trial runs to date use English keywords, **no Vietnamese posts yet** → criterion 5 cannot be checked yet. The next step is to trial with real Vietnamese hashtags.

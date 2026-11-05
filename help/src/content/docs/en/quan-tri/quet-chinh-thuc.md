---
title: "Official scans (in development)"
---

:::caution[In development]
The scheduled background part of official scanning is still being finished. This article describes how the system will work. Detailed design: [Two scan flows](../thiet-ke/hai-luong-quet), [Post screening](../thiet-ke/sang-loc-ai).
:::

- An administrator sets up the **scan schedule**: tool, hashtag groups, number of posts per keyword, frequency.
- The system **runs itself in the background** on time using the system Apify token — no one has to wait.
- Each post is stored **once**; each scan adds one row of engagement metrics (without overwriting) to draw trends.
- Posts already discovered are **re-measured by post link** at the 3/7/14/30-day milestones and then inventoried periodically, using a separate re-measurement tool (no re-scanning of hashtags).
- **Irrelevant** posts (matching the hashtag but not about e-cigarettes) are screened out by the AI and researchers, and are not re-measured.
- If the AI is enabled, new posts get **suggested labels** (purpose, entity type, text and transaction criteria); a verifier makes the final decision.

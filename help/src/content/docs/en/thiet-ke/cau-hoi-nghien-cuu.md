---
title: "Research questions and charts"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, approach, and **limitations** during the build phase, so the team can review and comment. This section will be trimmed or removed once the system is stable. Send feedback directly to the IT team lead (CuongPV).
:::

Each chart on the dashboard answers **one question**, uses real measurements, and comes with limitations. The system **describes**, it does not assert causation.

| # | Question | Measured by | Chart |
|---|---|---|---|
| 1 | How does the market adapt before and after each policy milestone? | Number of new posts (screened) each **week** by 4 fixed hashtag groups | Weekly line, vertical lines at policy milestones |
| 2 | How do forms change (renaming, slang)? | Hashtags proposed → approved → number of posts over time | Hashtag lifecycle: old hashtags decline, replacement hashtags appear |
| 3 | Which posts are engaging most strongly? | Engagement curve by post age | Top fast-rising posts + referral list (verified) |
| 4 | How long do posts survive, do they disappear after policy milestones? | Detection date → disappearance date | Post survival rate curve |
| 5 | How trustworthy is Vietnamese AI? | AI labels vs human labels | Accuracy, kappa by month |
| 6 | How do the two provinces differ? | Hashtag proposal source by province | Number of approved votes, new hashtags by province |

## Why 4 fixed hashtag groups?

The hashtag list changes constantly (new slang, dropped hashtags). If we compare hashtag by hashtag, measurement rounds cannot be compared. The unit of analysis is the **group** (direct marketing, lifestyle, law-evading slang, quitting and warnings) — new hashtags are assigned to a group, and the group stays fixed for 18 months.

## Keeping scan effort stable

A rise or fall in new posts may be only because **the scan method changed** (added hashtags, changed tools). So the system records scan effort each time and also uses a **new-post ratio** metric (new posts / posts downloaded). Tool-change dates are marked on the chart.

## Extended analyses for the report

From the same data, the analysis team can additionally do (no extra collection needed):

| Analysis | Confidence level |
|---|---|
| Interrupted time series (level and slope changes around policy milestones) | Good |
| Post survival analysis (how long until disappearance; before/after milestones; sellers vs users) | Good — "disappearance" does not distinguish self-deletion from removal |
| Network of co-occurring hashtags | Good — general hashtags must be filtered out first |
| Seller concentration (what % of accounts create most posts), clusters of posts with duplicate content | Good — on hash codes only, no identification |
| AI vs human reliability | Good |
| Engagement curve, law-evading post ratio before/after milestones | Medium — descriptive only |
| Comparing TikTok with Facebook | Compare trends, not absolute numbers |
| Comparing the two provinces | Weak — data has no geography |

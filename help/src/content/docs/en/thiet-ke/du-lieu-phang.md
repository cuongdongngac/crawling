---
title: "Flat data for analysis"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, approach, and **limitations** during the build phase, so the team can review and comment. This section will be trimmed or removed once the system is stable. Send feedback directly to the IT team lead (CuongPV).
:::

## Division of roles between systems

| This system | Analysis system (external) |
|---|---|
| Collection, deduplication, screening, storing metric series, source traceability | Deep statistical analysis (R, Stata, SPSS, REDCap…) |
| Dashboard: an overview for the 6 questions | Models, tests, writing scientific reports |
| **Exporting flat, clean data with a data dictionary** | Receives flat data as input |

The dashboard is enough to monitor and make daily decisions; deep analysis is the job of the analysis system.

## Export tool (draft)

Exports flat tables (one CSV/Excel file per table), with a **data dictionary** and **version information** (export date, label code table version, scan tools used):

| Table | Each row is | Used for |
|---|---|---|
| Posts | One post: platform, hashtag group, posting date, detection date, phase relative to the policy milestone, relevant label (verified or not), disappearance date, numbers from the latest measurement | Description, survival analysis |
| Measurements | One measurement of one post: timestamp, post age, likes, comments, shares, views | Engagement curve, growth rate |
| Weekly series | One week × one hashtag group × one platform: new posts (screened), scan effort, new-post ratio | Interrupted time series |
| Post hashtags | One post – hashtag pair | Hashtag network |
| Labels | One AI or human label for one post | AI vs human reliability |
| Adjudication sample | One post in the random sample: masked text, blank cells for each rater | Research team's adjudication session, human-human kappa |

## Principles

- **Do not export** account names, post links (unless separately authorized), images, comments. Authors only have hash codes.
- By default only **relevant** posts are exported; there is an option to export excluded posts to check screening.
- Each export is logged (who, when, which table).

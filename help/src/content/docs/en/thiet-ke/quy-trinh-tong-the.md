---
title: "Overall workflow: which tools, and why"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, methods, and **limitations** during the build phase, so the team can review and give feedback. This section will be trimmed or removed once the system stabilizes. Send feedback directly to the IT lead (CuongPV).
:::

This page is for anyone who needs the **big picture**: what stages the system has, which tool each stage uses, what it records, and **why it is done this way**.

<a href="/help/images/thiet-ke/quy-trinh-tong-the.svg" target="_blank" title="Open the full-size image"><img src="/images/thiet-ke/quy-trinh-tong-the.svg" alt="Overall workflow diagram"></a>
<p class="img-caption">Figure 1: Seven stages, split into three parts — keyword inventory, posts and figures, side-by-side views. Click the image to see it full size.</p>

## Principle: keep each job in its lane

- **Each stage has one responsibility, one tool, one log, one cost line.** A glance tells you which stage is the bottleneck and which stage costs money.
- **Any stage can be replaced.** External tools can break or change price; then only that stage is swapped, the others stay as they are.
- **Filter first, measure later.** Only relevant posts get measured further — both accurate and cheap (in the simulation, measurement cost fell about 30%).
- **Humans decide at the key points:** keyword approval, the conclusion on questionable posts, the referral list.

## Seven stages

| Stage | Who / tool | What it does | What it records | Why this way |
|---|---|---|---|---|
| **1. Keyword scouting** | Contributor · Apify (personal key) · Trial scan page | Try keywords, find slang, new hashtags | Proposal form; trial-scan log (posts not stored) | The market changes its words constantly; locals hear it first |
| **2. Keyword approval** | Researcher | Review the evidence posts and the **relevant-post rate** of the sample, approve or reject, file into 1 of 4 fixed groups | Keyword inventory | Noisy keywords corrupt every figure downstream; fixed groups keep comparisons valid for 18 months |
| **3. Post discovery** | System · **Apify** · daily | Scan by approved keywords, find new posts | Posts + **first measurement** · run type **DISCOVERY** | Apify is strong at finding posts by hashtag; scan effort is kept stable so new-post counts are comparable |
| **4. Screening** | Rules → AI → researcher · within 24 hours | Decide whether a post is really about e-cigarettes | The post's screening status; history of AI and human labels | Many posts match the hashtag but are irrelevant; AI does the heavy lifting, humans control |
| **5. Measuring change** | System · **Social Fetch** · on schedule | Re-measure likes, comments, shares, views, and saves of **relevant** posts by link | One data row per measurement · run type **MEASURE**; the date a post disappears | A service that measures by link: simple, cheap, available on demand; no need to re-scan hashtags |
| **6. Keyword thermometer** | System · **Social Fetch** · weekly (TikTok) | Measure how hot each keyword is in Vietnam | Thermometer table · run type **TREND** | A view **independent** of the post sample, placed side by side for cross-check |
| **7. Synthesis** | Dashboard · flat data · researcher | 6-question charts; export data for the analysis team; the referral list | — | The dashboard is for monitoring; deep analysis is done in another system |

## The system's three run types

Each time the system calls an external tool it is recorded as a **run**, with a clear type, time, count, and **actual cost**:

| Type | Stage | Tool | Frequency |
|---|---|---|---|
| **DISCOVERY** — Discovery | 3 | Apify | Daily, once per keyword |
| **MEASURE** — Measuring change | 5 | Social Fetch (fallback: Bright Data, then Apify actor) | Daily, groups posts due for measurement |
| **TREND** — Thermometer | 6 | Social Fetch | Weekly |

A contributor's **trial scan** (stage 1) is **not** a system run: it uses a personal key, does not store posts, and only records an activity log.

## Life of a post (example)

1. **Day 0, 2 a.m.:** a DISCOVERY run scans an approved keyword, finds a new post → stores the post and the first measurement (the like count at that moment).
2. **Within 24 hours:** AI reads the content (with phone numbers, links, and account names masked) and concludes *relevant* / *not relevant* / *unclear*. *Unclear* posts go to the researcher's queue.
3. **Irrelevant posts:** kept for verification, **not measured further**, and excluded from analysis.
4. **Days 3, 7, 14, 30:** a MEASURE run re-measures relevant posts by link → adds a new data row (no overwrite).
5. **After 30 days:** posts still rising → measured monthly; cooled posts → measured only before analysis rounds and after policy milestones.
6. **If a post disappears:** two consecutive measurements miss it → record the disappearance date, stop measuring.
7. **If a post surges unusually:** it goes on the referral proposal list → **researchers review 100%** before referral.

## Cost by stage (estimate, ~800 new posts/month)

| Stage | Estimate |
|---|---|
| Discovery (Apify) | depends on the number of keywords and posts per scan — being measured during trial runs |
| Screening (AI) | under 1 USD/month |
| Measuring change (Social Fetch) | about 12–15 USD/month |
| Thermometer (Social Fetch) | under 2 USD/month |

Each run records its actual cost, so each stage's cost will be tracked on the admin dashboard instead of the estimate.

## Read each stage in detail

- Stages 1–2: [Trial scan](../cong-tac-vien/quet-thu), [Submitting a proposal](../cong-tac-vien/de-xuat-hashtag), [Approving proposals](../nghien-cuu/duyet-de-xuat)
- Stages 3, 5: [Two scan flows](./hai-luong-quet), [Choosing a scan tool](./chon-cong-cu-quet)
- Stage 4: [Screening posts: AI and humans](./sang-loc-ai)
- Stage 6: [Keyword thermometer](./chon-cong-cu-quet) (the "Thermometer" section)
- Stage 7: [Research questions and charts](./cau-hoi-nghien-cuu), [Flat data](./du-lieu-phang)
- Limits of the whole workflow: [System limitations](./han-che)

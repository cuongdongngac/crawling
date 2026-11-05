---
title: "Mock data and dashboard"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, approach, and **limitations** during the build phase, so the team can review and comment. This section will be trimmed or removed once the system is stable. Send feedback directly to the IT team lead (CuongPV).
:::

:::danger[Mock data — for testing the interface only]
Every number on the dashboard during this phase is **simulated data**, not real figures. **Do not cite, do not include in reports.**
:::

## Why use mock data

The dashboard needs 18 months of data to be testable, but the project has not run yet. Mock data allows the interface to be built and reviewed right away, so that when real data arrives the dashboard runs immediately.

## How mock data is generated

Not random numbers, but a simulation of the exact measurement design, to test all 6 charts:

- 18 months, about 800 new posts per month (60% TikTok, 40% Facebook), 4 fixed hashtag groups.
- There is a **hypothetical policy milestone**: after the milestone, the direct marketing group declines then gradually recovers, the law-evading slang group rises sharply, the quitting – warning group spikes then falls; some new law-evading hashtags appear gradually.
- The measurement schedule follows a step ladder (days 0/3/7/14/30, periodic inventory); about 1/4 of posts disappear, more right after the milestone.
- Sellers post repeatedly, there are clusters of posts with duplicate content, a few posts have a late engagement spike (to test detecting abnormal post growth).

The trends above are **assumptions for testing charts**, not predictions of research results.

## Identifying and deleting

Mock data has its own label (the account in the link starts with `mock_`) and is fully deleted with one command before going live.

## What the Overview page has (31/10/2026)

![Overview page with mock data](/images/thiet-ke/du-lieu-gia-va-dashboard-01-tong-quan.png)
<p class="img-caption">Figure 1: Overview page — mock-data warning banner, four key numbers, relevant new posts per week by group (mock data)</p>

- **Platform filter** (All / TikTok / Facebook) — applies to every section below.
- **Four key numbers:** posts detected, relevant posts (and ratio over screened posts), irrelevant, awaiting screening / unclear.
- **Question 1 — Relevant new posts per week by 4 hashtag groups**, with policy milestone lines; can switch to "all posts" (pre-screening) to see how many screening removes; hover to see each week's numbers; a **Table** button to view the data as a table. The last week with fewer than 7 days is drawn with a dashed line so it isn't read as a "decline".
- **Operations by stage:** runs, volume, errors, cost of Post discovery / Variation measurement / Thermometer.
- **Question 3 — Posts with the strongest engagement growth** in the last 7 days (relevant or unclear posts only, still alive). **Only researchers** see this list because it has post links. This is a *review suggestion* list, not a referral list.
- Each section states the question it answers and its **limitations**.

Not yet available (next work): hashtag lifecycle (question 2), post survival rate curve (question 4), AI vs human (question 5), the two provinces (question 6), keyword thermometer side by side.

## Feedback for the dashboard

When viewing the dashboard, please comment: does the chart answer the right question, is it easy to read, what information is missing to make decisions.

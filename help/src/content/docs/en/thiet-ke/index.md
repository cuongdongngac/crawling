---
title: "Read first: status & how to give feedback"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, methods, and **limitations** during the build phase, so the team can review and give feedback. This section will be trimmed or removed once the system stabilizes. Send feedback directly to the IT lead (CuongPV).
:::

The system is being built while the project awaits approval. Instead of many meetings, every design decision is recorded here: **why we do it this way, how, and what we haven't managed yet**. Read the part relevant to you, and where something doesn't make sense, give feedback — early feedback is cheaper than late fixes.

## Read by role

| You are | Should read |
|---|---|
| Leadership, someone who needs the big picture | [Overall workflow: which tools, and why](./quy-trinh-tong-the) |
| Contributor | [Screening with AI and humans](./sang-loc-ai) (role section), [System limitations](./han-che) |
| Researcher / administrator | Everything, especially [Two scan flows](./hai-luong-quet), [Screening](./sang-loc-ai), and [Coding guide](./huong-dan-ma-hoa) |
| Data analysis team | [Research questions and charts](./cau-hoi-nghien-cuu), [Flat data for analysis](./du-lieu-phang), [Limitations](./han-che) |

## Section status (updated 02/11/2026)

| Section | Status |
|---|---|
| Trial scan for contributors, proposal form, form approval, activity log | ✅ Done, in trial use |
| Evaluation and selection of scan tools (Apify actor) | 🟡 Preliminary selection made, awaiting a trial run with Vietnamese keywords — [see](./chon-cong-cu-quet) |
| Chain: Apify finds posts → screening → Social Fetch measures interaction | 🟡 Measurement part exists: 3/7/14/30-day schedule, still-hot posts, disappearance confirmation, cost cap; runs via Vercel Cron, the "Measure now" button, or a script — [see](../quan-tri/do-tuong-tac). Social Fetch tested with real links (TikTok, Facebook); still to test deleted posts. Not yet wired to a background Apify scan schedule — [see](./quy-trinh-tong-the) |
| Screening of irrelevant posts (rules + AI + humans) | 🟡 A **Labeling** page exists: batch AI runs, a verification queue (with a blind-rating row), a table of AI reliability against the 85% threshold. AI not yet wired into the official scan schedule; researchers verify — [see](./sang-loc-ai) |
| Coding guide (codebook v1): labeling process + rationale, evidence base | 🟡 Draft, awaiting a decision from the Research team — [process](../nghien-cuu/huong-dan-gan-nhan), [why we do it this way](./huong-dan-ma-hoa) |
| 18 months of fake data to build the dashboard | ✅ Available — [see](./du-lieu-gia-va-dashboard) |
| Dashboard (Overview page) | 🟡 Available: question 1 (new relevant posts/week by group, milestone lines), operations by stage, question 3 (posts surging — researchers only). Remaining: questions 2, 4, 5, 6, thermometer — [see](./du-lieu-gia-va-dashboard) |
| Tool to export flat data for analysis | ⏳ Drafted — [see](./du-lieu-phang) |

## General design principles

- **Provide evidence, don't enforce.** The system describes, does not conclude causation, does not handle violations.
- **Each chart answers one research question** and always comes with its limitations.
- **Better few indicators with an unbroken 18-month data chain than many indicators that break midway.**
- **AI suggests, humans decide.**

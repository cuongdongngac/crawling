---
title: "Screening posts: AI and humans"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, methods, and **limitations** during the build phase, so the team can review and give feedback. This section will be trimmed or removed once the system stabilizes. Send feedback directly to the IT lead (CuongPV).
:::

## The problem

Hashtag scans return many posts that match the hashtag but have **nothing to do with e-cigarettes** (for example, the same word but a podcast, foreign news, or an ad for something else). If not filtered, every figure downstream is wrong.

## Three screening layers

1. **Rules (free, automatic):** drop posts that are not in Vietnamese, and posts with only a generic hashtag and no related text.
2. **AI labels** *relevant / not relevant / unclear*, running right after each official scan. Only text with phone numbers, links, emails, and account names masked is sent; **no images**.
3. **A researcher verifies** via the queue (below).

- Each post has a **current screening status**: *not screened*, *relevant*, *unclear*, *not relevant*, plus who concluded it (rule, AI, or human) and when. **A human conclusion beats AI, AI beats rules.** The history of all labels is kept in full to measure accuracy.
- Irrelevant posts are **not deleted**, only flagged — to verify and measure AI accuracy. Analysis counts only relevant posts.
- Irrelevant posts are **not re-measured** → saves cost. That is why AI runs before the day-3 measurement point.
- Posts that are almost entirely images with little text: AI marks them "unclear," a human reviews.

## Who does what

| Role | Task |
|---|---|
| **Contributor** | Trial scan, **propose new hashtags** with evidence posts; take the 50-simulated-post test (at the start and periodically). **Not** verifying system posts. |
| **System** | Official scan, rule-based filtering, AI labeling, re-measuring relevant posts, computing each hashtag's relevant rate |
| **Researcher (including admin)** | Approve hashtags, verify AI labels, finalize the referral list |

Why contributors don't verify posts: fewer people seeing raw data means better personal-data safety; fewer labellers, well trained, means more stable labels; and contributors are recognized for **proposal quality**, not by the number of posts viewed.

:::note[Basis for rating]
Humans and AI rate against the same codebook: [Guidelines for labeling posts (codebook v1)](../nghien-cuu/huong-dan-gan-nhan). Why it is written this way: [rationale and evidence base](./huong-dan-ma-hoa).
:::

## Screens available (02/11/2026)

The **Labeling (AI)** page — guide: [Labeling posts (AI-assisted)](../nghien-cuu/gan-nhan). It differs from the original design in two points:

- The two random samples (~10% of posts AI keeps, ~10% of posts AI drops) are **merged into one "blind-rating sample" row**, shuffled, and both the AI's suggestion and conclusion are hidden until saved. Reason: if the row were named "posts AI dropped," the rater would already know what AI concluded, and the measurement would no longer be objective.
- A separate **researcher role** now exists (02/11/2026), separate from the administrator — see [Roles and permissions](../bat-dau/vai-tro).

Not yet done: a "posts about to enter the referral list" row (there is no referral list yet); ~50 posts/month labeled independently by two people (human vs human); a monthly reliability table.

## Researcher verification queue (priority order)

1. **Posts about to enter the referral list — review 100%.** No post is referred without a human passing it.
2. Posts AI marked "unclear".
3. A random sample of ~10% of posts AI **dropped** — to know how many genuine posts AI missed.
4. A random sample of ~10% of posts AI **kept**.
5. ~50 posts/month labeled independently by 2 researchers to compute human-to-human agreement.

Estimating with ~800 new posts/month: ~250 reviews/month (~60 posts/week), split across 2–4 researchers. Once AI's accuracy stays at 85% for 2 months, cut the random sample to 5%.

## Hashtag relevant rate

Each hashtag has a **relevant-post rate**. Used to:
- **Approve new hashtags:** when trial-approving a proposal, the system scans a small sample (~50 posts), AI labels it, and the proposal shows the relevant rate → an objective basis for approving or rejecting.
- **Turn off "noisy" hashtags** with a persistently low relevant rate.
- **Recognize contributors:** the "cleaner" a hashtag you proposed (high, durable relevant rate), the more valuable the proposal.

## Keeping figures consistent when AI changes

Every label records the codebook version, the prompt, and the model. When the model or prompt changes, **re-label all old data** with the new version, so the 18-month "relevant posts" line doesn't jump just because AI changed.

## Measuring AI reliability

Every month, compare AI labels with human labels: accuracy, the number of posts AI wrongly dropped, the kappa coefficient. This table is published in the report — AI does the heavy lifting, humans control quality, and reliability is measured rather than taken on faith.

---
title: "System limitations"
---

:::tip[Temporary section — design discussion channel]
The **Design in progress** section explains the system's ideas, methods, and **limitations** during the build phase, so the team can review and give feedback. This section will be trimmed or removed once the system stabilizes. Send feedback directly to the IT lead (CuongPV).
:::

Being explicit about limitations is part of scientific honesty. When reading figures or writing reports, always include the notes below.

## About data scope

- **Only what is public via hashtags is visible.** The figures describe "the market visible through public hashtags," **not the entire market**. The sample is not random.
- **Real transactions usually move to closed groups and private messages** — the project does not track this part.
- **No images or videos are read.** Only text (content, hashtags) is read. Posts with only images are hard to screen.
- **No geography.** We don't know which province a post came from; comparing two provinces relies only on the source that proposed the hashtag.
- **Detailed comments, images, and account names are not stored** (personal data protection) — authors have only a hashed ID.
- **Old posts:** a hashtag scan also returns old posts; interaction in the first hours after posting cannot be measured.

## About measurement

- **Dependent on platform algorithms:** hashtag search results are decided by TikTok/Facebook and can change at any time.
- **Two data sources:** the first measurement comes from the post-finding tool (Apify), later ones from the measuring tool (Social Fetch) — the two may count slightly differently. Each measurement records its source; a comparison test decides whether to join the two sources.
- **Dependent on external scan tools:** an actor can break, change format, or change price → the data chain can break. There is a fallback, and the tool-change date is flagged.
- **"Disappeared" is not "removed":** a post may be gone because the author deleted it, made it private, or the platform removed it — the system cannot tell them apart.
- **Likes, comments, and shares are counts at the time of measurement**, not final numbers; views exist only on videos.
- **TikTok and Facebook count differently** → compare trends only, not absolute numbers.
- **AI can be wrong** → a human always verifies and accuracy is measured periodically; the referral list is 100% human-reviewed.

## About inference

- The system **describes trends**, it does not prove causation. A market that shifts around a policy milestone may do so for many other reasons.
- Policy milestones that are close together are hard to separate in their individual effects.

## About the current phase

- The system is under development; some parts are only design (see [status](./index)).
- The dashboard is using **fake data** to test the interface — [read carefully](./du-lieu-gia-va-dashboard).

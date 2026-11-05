---
title: "What the system does and does not do"
---

VPHA's M&E monitoring system tracks the **hashtags and keywords** related to e-cigarettes and heated tobacco on social media after the ban (Resolution 173/2024/QH15).

## What the system does

- **Counts hashtags** that appear often and **posts with high engagement** (likes, comments, shares, views).
- **Re-measures engagement** of the same post across multiple scans to reveal trends — each scan's figures are stored separately, never overwritten.
- Compiles a list of posts with links so the Research team can verify and forward them to the authorities.

Every figure the system provides is an input to a human activity outside the system (keyword approval, case conference, calibration, referral, analysis) — see [What the system provides — what happens outside it](./he-thong-cung-cap-gi).

## What the system does not do

- **Does not enforce**: it neither reports nor handles violations. Inspection and handling belong to the competent authorities.
- **Does not build personal profiles**: it stores no account names (only hashes), no images, no detailed comments.
- **Does not scan by person**: it scans only by approved hashtags/keywords, never a specific personal page or fan page.

## Two ways to scan

| | Trial scan | Official scan |
|---|---|---|
| Who uses it | Contributor | Administrator schedules it |
| API key | **Personal** Apify key, pasted in yourself | **System** key on the Config page |
| Saves posts to the data store | **No** (view and export Excel only) | **Yes** |
| Purpose | Find new slang, submit suggestions | Research data, track trends |

## The roles

- **Contributor** (aged 18+, at Medical Colleges): listens for slang, runs trial scans, submits hashtag suggestion forms.
- **Provincial coordinator**: reminds about schedules, checks the quality of suggestions.
- **Researcher** (Research team): approves suggestion forms and the hashtag catalog, verifies AI labels, views the list of posts with links, finalizes the referral list, analyzes and draws conclusions.
- **Administrator**: operates the system — accounts, service keys, configuration, scan tools, costs, run schedules.

One person can hold both the researcher and administrator roles. See [Roles and permissions](./vai-tro).

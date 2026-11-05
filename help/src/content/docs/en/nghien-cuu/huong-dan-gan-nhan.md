---
title: "Post labeling guide (codebook v1)"
---

This is the shared measure so that **humans and AI label a post in the same way**, such that two independent scorers reach the same result, and AI correctness can be measured as a number. The screen uses this guide: [Label posts (AI-assisted)](./gan-nhan). Why it is done this way (philosophy, scientific basis, points still awaiting confirmation): [Coding guide — philosophy and scientific basis](../thiet-ke/huong-dan-ma-hoa).

:::caution[Version v1 — draft]
The rules marked **[awaiting confirmation]** are pending confirmation by the Research team. Once confirmed, the rules are added to the AI prompt and displayed on the verification screen.
:::

:::note[What gets scored in the system]
In the system, only what decides "which posts to measure" and "which posts to report" is scored: **relevant or not**, **3 eyes** (image, text, transaction → suspected case), and **behaviour group 1–4** (P2M framework). The detailed description fields in section 3.4 and the subject type are used in **panel sessions** outside the system, on the exported post sample — see [What the system provides](../bat-dau/he-thong-cung-cap-gi). The verification screen still shows all the fields for now; it will be trimmed following this principle.
:::

## 1. Scoring unit and general principles

**The scoring unit is one public post, at the moment the system detects it.** It includes the post's text, hashtags in the post, and — for humans only — the images/video of that post itself. Do not score comments, personal profiles, or other posts by the poster.

1. **Only score what is in the post.** Do not use outside knowledge about the poster. If information is missing, choose "Undetermined" or leave it blank.
2. **A search hashtag does not by itself make a post relevant.** The post was collected because it has that hashtag; counting it as evidence is circular reasoning. There must be another sign in the text or image.
3. **Blank is different from "No".** "—" means not yet scored or not enough basis; "No" means you have looked and affirm it is absent. When computing figures, blank cells are skipped.
4. **One post, one purpose**, chosen in the order of the decision tree (section 2).
5. **Do not adjust labels according to the desired result** — do not score differently because a post has a lot of engagement or because you need more suspected cases.
6. **If unsure, say you are unsure.** Tick "I'm not sure" and write a one-line reason. The post keeps the "unclear" status and is not used as a benchmark for measuring AI.
7. **If torn between "relevant" and "not relevant", choose "unclear".** A dropped post is never measured again; a wrongly kept post can still be found by a human later.

## 2. Decision tree: determine the purpose

**Ask four questions in this exact order, and stop at the first question answered "yes".** The order is precisely the priority rule when a post has multiple layers of meaning: transaction beats buying request, buying request beats warning, and "lifestyle" is the remainder.

<a href="/help/images/thiet-ke/cay-quyet-dinh-ma-hoa.svg" target="_blank" title="Open the large diagram"><img src="/images/thiet-ke/cay-quyet-dinh-ma-hoa.svg" alt="Content purpose decision tree: 4 questions, 6 outcomes"></a>

Question 1 is the screening question: "no" → the post is not relevant, stop measuring; "not enough basis" → unclear, wait for a human. Every branch after question 1 is a relevant post. Humans and AI answer the same four questions; only humans may use images.

## 3. Definition of each label

The examples are simulated sentences, not real posts.

### 3.1 Content purpose (required, choose one)

| Label | Definition | Sufficient sign | Simulated example |
|---|---|---|---|
| Direct marketing | The poster invites viewers to buy, exchange, or receive a product | One of: price; contact method to buy; delivery; stock notices ("stock arrived", "clearance", "reselling") | "Clearing out scented pens, city delivery, DM me" |
| Disguised lifestyle marketing | Showing off, reviewing, tying a product to a lifestyle, entertainment, or trend — without inviting a transaction | The product appears in a positive or normalizing light | "The cold mango flavour is absolutely my soulmate everyone" |
| Buying request | The poster wants to buy, asking for a place to buy | A question or a request to find a source | "Does anyone know where to buy pods in Hung Yen" |
| Warning – prevention | States harms, quitting stories, ban policies, news about enforcement | A stance of opposition or enforcement information | "My 3-month journey quitting vape" |
| Not relevant | Does not talk about e-cigarettes, heated tobacco, e-liquid, or accessories for these devices | Only overlaps on a word (pod, smoke, essential oil…) while the content is about something else | "Review of AirPods Pro headphones, bass is solid" |

### 3.2 Type of posting subject

| Label | Choose when |
|---|---|
| Seller | Signs of regular business: many models, price list, shop name, delivery commitments |
| Trend creator | Posts that produce content for an audience: staged reviews, challenges, calls to follow |
| User | An individual talking about their own experience, including reselling used items once |
| Organization / press / agency | Newspapers, state agencies, hospitals, schools, social organizations |
| Undetermined | Too little text to distinguish |

### 3.3 Three criteria (Yes / No / —)

| Criterion | "Yes" when | Who scores |
|---|---|---|
| Image | An image/video shows the product, device, e-liquid box, or a person exhaling smoke from the device | Humans only (open original post) |
| Text | Text or hashtag (beyond the search hashtag) names the product, whether directly or via slang, euphemisms | Humans and AI |
| Transaction | Price, contact method to buy, or delivery | Humans and AI |

**Suspected case = at least 2/3 criteria "Yes".** AI does not look at images, so it only flags a suspected case when both text and transaction are present; a post AI scores 1/3 can still become a suspected case after a human looks at the image. See also [The three-criteria rule](../cong-tac-vien/ba-tieu-chi).

### 3.4 Other description fields

| Field | Rule |
|---|---|
| Mentions price | Has a price number, including abbreviations ("2xx", "1tr2", "99k"). "Good price", "cheap" with no number → No |
| Contact channel (multi-select) | Zalo / Telegram / Phone number / Message, inbox / External link, shop / Other. [PHONE] and [LINK] masked by the system still count. No channel at all → "None" |
| Mentions delivery | Ship, deliver, COD, express, "send by bus" |
| Targets youth | Explicitly says students, pupils, teen, gen Z, "student price", school context. People in a video only looking young → not enough |
| Evasion tactics (multi-select) | Renaming the product · Abbreviations, teencode, spelling variants · Emoji symbols replacing the product name (a lone smoke icon is not enough) · Disguising the purpose ("clearance", "passing on items") · Pulling to another platform ("join the closed group", "talk over Zalo") |
| Sentiment toward the product | Positive / Neutral / Negative — the post's attitude toward the product, not the post's overall emotion |
| Slang appearing | Copy the exact spelling in the post, up to 10 words |

## 4. Hard cases and adjudication rules

| Case | Rule | Reason |
|---|---|---|
| Flavour review + "DM if you need" | Direct marketing | If there is an invitation to transact, the transaction wins |
| Individual "passing on a pod used once" | Direct marketing; subject = User; evasion = Disguising the purpose | Describes behaviour, does not judge scale. Scale lives in the subject field |
| Only hashtags and emoji, no text | AI: Unclear. Human: look at the image then score; if the image is also unclear → "I'm not sure" | A search hashtag is not evidence |
| "Stock's in everyone", "DM" standing alone | Direct marketing if there is also a product hashtag beyond the search hashtag; otherwise Unclear | A stock notice is a transaction sign, but you need to know what the goods are |
| Police news about seized goods, penalty news | Warning – prevention; subject = Organization if it is a paper/agency | Enforcement information belongs to the prevention environment |
| Neutral news about a new product abroad | **[awaiting confirmation]** Disguised lifestyle if it introduces features or flavours; Warning if it states harms or policy | Consider the promotional effect too, not just intent |
| Memes, funny videos with a vaping scene | Disguised lifestyle | Normalizing the behaviour is indirect promotion |
| Videos mocking vape users | Warning if the attitude is clearly opposition; if unclear → "I'm not sure" | Satire is easy to read backwards |
| "Room scent oil", "scented candles", "diffusers" | Not relevant, unless there is a vaping device, pod head, "puff count", or accompanying slang | "Room scent" can be a disguise; a second sign is needed |
| Cigarettes, cigars, shisha, pipe tobacco | **[awaiting confirmation]** Not relevant, note the product type | The project scope is e-cigarettes and heated tobacco |
| Posts in a foreign language | Score by content if you understand it; if not → "I'm not sure" | Belongs to the language filtering stage |
| Both selling and "advising not to smoke much" | Direct marketing | Transaction is considered before warning |
| Posts by the project itself or a media partner | Warning + note "project post" | Excluded from impact-measurement metrics |

New cases that arise: write them in the note field when verifying. The Research team reviews monthly and adds them to this table in a later version.

## 5. Scoring workflow

**AI scores every post, humans score three groups of posts, and only posts that pass through a human move down the pipeline.**

1. **AI scores** the contact-info-masked text, returning all fields (except the image criterion), with a confidence (0–1) and a one-line reason.
2. **Temporary screening conclusion:** "Not relevant" with confidence from 60% → not relevant (stop measuring); another purpose with confidence from 50% → relevant; otherwise → unclear. **[awaiting confirmation]** the thresholds after blind-scoring data is available.
3. **Humans verify in order:**
    1. Posts about to enter the pipeline list — 100%, viewing images too.
    2. Posts AI ranked "unclear" — with the AI suggestion shown, human decides.
    3. A blind-scoring sample of ~10% of posts AI has concluded — the AI suggestion and conclusion hidden until saved.
    4. ~50 posts/month scored independently by two people — measures human-to-human agreement.
4. **Human labels replace the AI conclusion.** AI labels are still kept for comparison.
5. **Move down the pipeline** only when: a human has verified; the purpose is Direct marketing, Disguised lifestyle, or Buying request; at least 2/3 criteria are met; the keyword meets the threshold for the number of posts sharing it.

:::tip["Relevant" is different from "suspected violation"]
A warning post is still a relevant post (on-topic, counted in the Warning group) but is never a suspected case. Screening answers "should this post be measured"; the three criteria answer "should this post be reported".
:::

## 6. Quality thresholds

| Subject | Metric | Threshold | Measured on | When |
|---|---|---|---|---|
| Labeler, contributor | Sensitivity / specificity | ≥ 0.85 / ≥ 0.80 | Set of 50 simulated posts | Week 0, repeated every 8–12 weeks |
| The whole labeling team | Fleiss' kappa | ≥ 0.61 to begin | Set of 50 simulated posts | Week 0 |
| Gold set (two independent people) | Cohen's kappa | ≥ 0.70 | ~50 real posts/month double-scored | Monthly |
| AI | Accuracy relevant / not relevant | ≥ 85% to use AI results | Blind-scoring sample | Monthly, and whenever the model/prompt changes |
| AI | Sensitivity; kappa with humans | **[awaiting confirmation]** ≥ 0.90; ≥ 0.70 | Blind-scoring sample | Monthly |

- Do not conclude "pass" below 50 posts. "Definite pass" when the 95% confidence interval lower bound also exceeds the threshold.
- If AI meets the threshold for 2 consecutive months, reduce the blind-scoring sample from 10% to 5%; if it drops below the threshold, return to 10%.
- A scorer who fails the standard: re-score the set of 50 posts after a re-briefing; if still failing, pause verification.

## 7. Versioning

**A codebook already in use is not edited, only a new version is issued.**

| Change | What to do |
|---|---|
| Add/remove labels, change definitions | New codebook (v2), re-calibrate humans, re-run AI on the entire history |
| Add rules for hard cases, without changing labels | New guide version (v1.1); the AI prompt goes to a new version |
| Change the AI model | Run the set of 50 posts first, then re-label the entire history |

Each label records its own codebook version, prompt, and model. Each report states clearly which version the figures were computed under.

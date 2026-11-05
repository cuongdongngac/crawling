---
title: "Label posts (AI-assisted)"
---

The **Labeling (AI)** page (for **researchers** only) has three tabs: **Verify**, **Run AI**, **AI reliability**.

The basis for scoring: [Post labeling guide (codebook v1)](./huong-dan-gan-nhan).

Principle: **AI suggests, the human decides.** AI only reads the text of a post, with phone numbers, links, emails, and account names already masked; it does not look at images. AI labels and human labels are stored separately and do not overwrite each other. A human's conclusion always beats the AI's conclusion.

## 1. Run AI

- **Model**: takes the default from the Configuration page; you can type another model to try.
- **Posts detected since date**: only labels new posts from that date onward (for quick, cheap tests).
- **Number of posts this run** → **Label**. The system runs in batches of 20 posts, showing progress and cost; click **Stop after this batch** to stop.
- Each post is labeled only **once per set (codebook + prompt + model)**: re-running costs nothing for posts that already have a label. Changing the model re-labels the post with the new model (for comparison), while the old label is kept.
- When the **monthly AI cost ceiling** (Configuration page) is reached, it stops automatically.
- After AI labels, the post's screening conclusion is updated: *relevant*, *not relevant*, or *unclear* when AI is not confident enough (below 60% for a "not relevant" conclusion, below 50% for a "relevant" conclusion).

**The set of 50 simulated posts with answers**: run it whenever you change the model or prompt to compare fairly on the same test.

## 2. Verify

Three queues:

| Queue | Which posts it contains | AI suggestion |
|---|---|---|
| **AI unclear** (priority) | AI is not confident enough | Shown — human decides |
| **Blind scoring sample (~10%)** | One tenth of posts AI has concluded, **mixing posts AI keeps and posts AI drops**, chosen fixed by post ID | **Hidden until saved**, including the current conclusion |
| **Custom** | Every post AI has labeled, filtered by purpose | Shown |

- Choose **Content purpose** (required). **Per-codebook details** are optional; leaving "—" means *not scored* (different from "No").
- AI suggestions are pre-filled; anywhere you change away from AI is marked "edited vs AI".
- If unsure, tick **I'm not sure**: the post keeps the *unclear* status and is not used as a benchmark for measuring AI.
- Real posts have an **Open original post** button to see images/video too (the image criterion is for humans only).
- Shortcuts: **1–5** choose the purpose, **Ctrl+Enter** saves, **N** skips, **Enter** moves to the next post after viewing the comparison.

**Why blind scoring?** Someone who sees the AI suggestion tends to "nod along", making AI accuracy look higher than it really is. The sample queue mixes posts AI keeps and posts AI drops so the scorer can't guess what AI concluded. After saving, the screen shows the comparison with AI.

## 3. AI reliability

Each tab is a comparison method, with a model:

- **Blind scorer**: the primary measure.
- **Verifier who sees the AI suggestion**: usually higher than reality — for reference only.
- **Mock data answers (GOLD)**: only present when using mock data.
- **Simulated post set**: compares models/prompts against each other.

Metrics (treating "relevant" as positive):

- **Accuracy**: the share of posts where AI correctly concluded relevant / not relevant, with a 95% confidence interval **lower bound**.
- **Sensitivity**: what % of truly relevant posts AI keeps. **A low value means AI wrongly drops real posts** — these posts are never measured again and don't enter the analysis, so this is the most worrying metric.
- **Specificity**: what % of not-relevant posts AI correctly drops.
- **Kappa**: the level of agreement after subtracting the part that matches by chance (≥ 0.6 fair; ≥ 0.8 very good).

Against the threshold in the dossier (**use AI when accuracy is 85% or higher**), the tab shows: *Pass* (even accounting for sampling error), *Pass but sample still small*, *Not yet passing*, or *Not enough sample* (under 50 posts).

The **Cases where AI and the scorer disagree** table is used to fix the prompt or add new slang.

## Mock data (system build phase)

Mock posts carry the label **MOCK POST**; measurements on mock posts only test the system and are not included in reports. A technical administrator prepares the data with a script in the `scripts/mock` folder (see the README there).

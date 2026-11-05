---
title: "Coding guide: rationale and evidence base"
---

:::tip[Temporary section — design discussion channel]
This page explains **why** the labeling guide is written the way it is, and lists the points still awaiting a decision from the Research team. The long-term procedural part is in [Guidelines for labeling posts (codebook v1)](../nghien-cuu/huong-dan-gan-nhan). Send feedback to the IT lead (CuongPV).
:::

Labeling is **measurement**, not judgment. Each label is a measurement of a post's content; therefore it must be repeatable, verifiable, and must report its own error. This document is the "Appendix A – Variable coding scheme" promised in the project dossier, plus a section on decision rules.

## Rationale: seven principles

1. **Provide evidence, not conclusions of violation.** A label describes what a post says and what it aims to do. A label does not conclude that the poster broke the law, and does not guess identity or private motive. Handling violations is the job of the competent authority.
2. **Score the visible first, infer later and by rule.** A price, a contact number, the word "ship" are explicit content anyone can see. "Purpose" is hidden content that must be inferred — so infer only by the decision tree, never by feeling.
3. **One yardstick for both humans and machines.** AI is just another "rater": it gets the same definitions and the same rules, and is measured by the same metrics as humans. There are no separate rules for the machine.
4. **AI suggests, humans decide.** A human label always beats an AI label. No post is referred to authorities without a human passing it.
5. **Reliability before validity.** If two people label the same post and produce two different labels, the aggregate figure measures "who rated it," not the market. Agreement must reach a threshold before the data can be used.
6. **Asymmetric caution.** Wrongly dropping a genuine post is worse than wrongly keeping an unrelated one: a dropped post is not re-measured and disappears from the analysis. When in doubt, choose "unclear".
7. **Minimum data, transparent versions.** AI reads only text with phone numbers, links, emails, and accounts masked. Every label records the codebook version, the prompt, and the model.

## Evidence base

The root method is **systematic content analysis**: turning text into countable data via a public codebook, trained raters, and reported reliability.

| Pillar | Content | Where it is used |
|---|---|---|
| Content analysis (Krippendorff; Neuendorf) | A clear unit of analysis, mutually exclusive and exhaustive labels, pre-written coding rules, reported agreement | Rating unit, decision tree, quality control |
| WHO FCTC Article 13's definition of tobacco advertising and promotion | Any form of commercial communication with the purpose, effect, or likely effect of promoting a product, including indirect forms | Label "Disguised lifestyle marketing": not selling is still promotion |
| The project dossier's "three criteria" rule | Look at image – look at text – look at transaction; 2 of 3 makes a suspected case | Suspected case, referral condition |
| Morphed-language linguistics | Spelling distortion, metaphorical semantic shift, emoji symbols; four forms of surface change | "Evasion tactics", "Slang" |

**Measuring reliability with the kappa coefficient.** Two raters agreeing 90% of the time is not necessarily good: if 90% of posts are "relevant," random rating would agree almost as much. Cohen's kappa subtracts the agreement due to chance:

<p style="text-align:center;font-size:1.25em"><b>κ = (p₀ − pₑ) / (1 − pₑ)</b></p>

where p₀ is the observed agreement rate and pₑ is the expected agreement rate if two raters rated randomly according to their own label frequencies. For many raters at once, use Fleiss's kappa. The usual reading (Landis & Koch): 0.41–0.60 moderate; 0.61–0.80 substantial; above 0.80 almost perfect.

**Measuring AI validity with the language of diagnostic testing.** Treat "relevant post" as positive and the human label as the reference standard: sensitivity = what percentage of genuine posts AI keeps; specificity = what percentage of irrelevant posts AI correctly drops. This is language familiar to public health staff, and it is exactly the targets the dossier committed to. Accuracy is always reported with a 95% confidence interval (Wilson), because 85% on 40 posts and 85% on 400 posts are not equally certain.

**Why blind rating.** A rater who has seen a suggestion tends to "anchor" to it. If AI is measured against the labels of raters who already saw the AI, AI will look better than it really is. So the main yardstick comes from a fixed random sample, rated without seeing either the AI's suggestion or its conclusion.

**Why AI does not need to be better than humans.** A reasonable standard is that AI agrees with humans at the level two humans agree with each other. Demanding more is demanding that AI be more correct than the yardstick itself.

## Limitations and ethics

- AI reads text only; posts that are mostly images tend to be marked "unclear" or missed. The dossier states that AI reads "even text in images" — this is not yet done because the project does not store images.
- "Purpose" is inferred from content, not the poster's actual intent.
- The sample comes from public hashtags and does not represent the market inside closed groups.
- Confidence scores are self-reported by the model and not yet calibrated; the 60%/50% thresholds need rechecking against blind-rating data.
- We only observe public posts and do not interact during verification. Author names are one-way hashed; labels and notes contain no guesses about the poster (Decree 13/2023).
- To publish a paper from this label set: apply for research ethics approval as soon as the project is approved.

## What the Research team needs to decide

- [ ] Align the codebook with the P2M framework of the "3 eyes" calibration set: add **behaviour groups 1–4** and the **Lab exception** (production signals flagged immediately regardless of score); agree on how to name "3 eyes"; keep only relevant + 3 eyes + behaviour group in the system, and move the rest to the case-review session ([rationale](../bat-dau/he-thong-cung-cap-gi))
- [ ] Replace the machine-generated set of 50 posts in the system with a 50-post set from the instructors (load only the questions; keep the answer key in an Excel file)

- [ ] Product scope: do cigarettes, cigars, shisha, and pipe tobacco count as "not relevant"
- [ ] Which label neutral news about new products falls under
- [ ] The 60%/50% confidence thresholds for AI screening conclusions
- [ ] Add thresholds of sensitivity ≥ 0.90 and kappa ≥ 0.70 for AI
- [ ] The "number of shared-keyword contents" threshold for referral
- [ ] The dossier says "4 purpose labels," the codebook has 5 (adds "Not relevant" for screening): fix the dossier wording to match
- [ ] The sentence "AI reads even text in images" in the dossier: fix the wording or leave it for a later phase
- [ ] The [Three-criteria rule](../cong-tac-vien/ba-tieu-chi) page says "look at transaction" in both public comments, whereas the rating unit here excludes comments (the system does not collect comments): settle on one approach
- [ ] Who holds the answer key for the 50 simulated posts; the answers are currently machine-generated and need instructors to re-approve each post
- [ ] Who the verifying researchers are, and how many posts per week

## References

Classic works, cited from the drafting team's knowledge; page numbers and publication years need review before being put in the dossier.

1. Krippendorff K. *Content Analysis: An Introduction to Its Methodology*. Sage, 4th ed., 2018.
2. Neuendorf KA. *The Content Analysis Guidebook*. Sage, 2nd ed., 2017.
3. Cohen J. A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 1960;20:37–46.
4. Fleiss JL. Measuring nominal scale agreement among many raters. *Psychological Bulletin*, 1971;76:378–382.
5. Landis JR, Koch GG. The measurement of observer agreement for categorical data. *Biometrics*, 1977;33:159–174.
6. Wilson EB. Probable inference, the law of succession, and statistical inference. *JASA*, 1927;22:209–212.
7. WHO. *Framework Convention on Tobacco Control*, Article 13, and the guidelines for implementation of Article 13 (2008).
8. Law on Tobacco Harm Prevention No. 09/2012/QH13; Resolution 173/2024/QH15; Decree 13/2023/NĐ-CP.
9. VPHA 2027–2028 project dossier: the "three criteria" rule, the 50 simulated posts, Appendix F.

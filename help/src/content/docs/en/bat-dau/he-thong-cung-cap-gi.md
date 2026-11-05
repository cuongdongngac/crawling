---
title: "What the system provides — what happens outside it"
---

**The system only does work that has clear rules, is repeatable and measurable. Work that needs professional judgment is done by people outside the system, using the data the system provides as input.** Every output of the system is the input to an activity with a person responsible for it.

## System outputs and the activities that receive them

| The system provides | Activity outside the system | Who does it | Result returned to the system |
|---|---|---|---|
| Hashtag catalog, post counts and the **share of relevant posts** for each hashtag | Keyword approval meeting; reconnaissance for new slang | Researcher, contributor | Hashtags approved, hashtags switched off |
| Posts already **screened**: relevant / not relevant / unclear | Not needed — this is data hygiene, done inside the system | AI reads preliminarily, researcher finalizes | — |
| **Suspected cases** (3 eyes, from 2/3) with links and the engagement growth curve | Alert bulletin, referral | Research team signs off; provincial coordinator forwards | — (handling belongs to the competent authorities) |
| **Sample of de-identified posts** (Excel export) | Periodic **case conference**: detailed labeling, measuring person-to-person agreement (kappa) | Research team | New rules for the codebook; new slang becomes a suggestion form |
| Set of 50 simulated posts + **the AI's result row** | **Calibration session** for trainees with the "3 eyes" Excel file | Instructor | Threshold confirmed; list of trainees who meet the standard |
| **Flat data** + data dictionary ([see](../thiet-ke/du-lieu-phang)) | Statistical analysis, reports, papers | Analysis group (R, Stata…) | — |
| **Overview dashboard** | Briefings, donor reports, workshops | Project leadership | — |
| **Activity logs** of contributors | Consideration of allowances based on suggestion quality | Provincial coordinator, Research team | — |

## Why this split

1. **Technology does not replace judgment.** "Does this post talk about e-cigarettes" has clear rules. "Is this post aimed at youth", "what is the tone" remain ambiguous and need professionals to discuss. Hand an ambiguous task to a machine and it will answer very confidently, and the numbers will look more precise than they really are.
2. **The measuring tool must be independent of what it measures.** Trainees and the AI are both scored with the instructor's Excel file, not by the system grading itself. Anyone can open the formula and check.
3. **A case conference is a human task.** Like a case conference for a patient: several people look together, draw conclusions independently, measure agreement with kappa, discuss divergent cases, then derive rules. The system only prepares the "medical record" (sample of de-identified posts) and stores the final conclusions.
4. **Scale with data, not with features.** To add an analysis, a province or a partner, you only need to add an output or an export table. The system's core does not need to be rebuilt.

## In the labeling stage: what is inside, what is outside

| Inside the system (deciding "which post to measure", "which post to flag") | Outside the system (case conference) |
|---|---|
| Relevant / not relevant / unclear | Detailed purpose, type of subject |
| 3 eyes: image, text, transaction → suspected case | Tone, targeting youth |
| Behavior groups 1–4 (sale, storage, transport, production – Lab), exception: Lab reports immediately | Evasion tactics, new slang |
| | Measure person-to-person agreement |

## Before putting a new task into the system

Ask three questions:

1. Are the rules clear enough that two people working independently reach the same result?
2. Can the result's accuracy be measured?
3. Is the task needed for a routine decision?

If it is not three "yes" answers, do it outside the system using exported data. Once the task is mature — clear rules, measurable, used routinely — then bring it into the system.

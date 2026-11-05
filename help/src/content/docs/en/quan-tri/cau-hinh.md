---
title: "System keys & AI settings"
---

The **Settings** page (administrators only) declares the keys used for **official scans**. Contributor trial scans do **not** use these keys.

## Apify — scan tool

- Paste the project account's **Apify token** → **Check** to see the account, plan, amount used and monthly quota.
- The official scan schedule uses this token to run and write posts into the data store.

## Social Fetch — engagement tracking

- Paste the **Social Fetch key** (format `sfk_…`) → **Check** to see the credit balance (no credits used).
- **Monthly measurement spend cap** (default 40 USD) and the **price per credit** for your current plan. When the cap is reached, measurement stops until the next month.
- See [Engagement tracking](./do-tuong-tac).

## OpenRouter — AI

- Paste the **OpenRouter key** (format `sk-or-…`) → **Check** to see usage, quota and remaining balance.
- **You should set a spend limit for the key** on openrouter.ai; the page will warn you if the key has no limit.
- **Default model**: choose from the list (search, filter *Free*, *Reads images*, *Returns JSON*; sort by price, context…). Prices are shown in USD / 1 million tokens (input / output). Click **Test model** to ask one question and see speed and cost.
- **Auto-label new posts** after each official scan: **off** by default. The AI only suggests; labels are stored separately and do not change the post data.
- **Monthly AI spend cap**: when the cap is reached, the AI stops automatically.

## Notes

- A key field **left blank = keep the old key**. A new key is checked with the service before saving; an invalid key is not saved.
- Keys are only shown masked (`sk-or-v1…abcd`); no one can read the full value again in the interface.
- Click **Save settings** once for all changes.

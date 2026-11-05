---
title: "Get your personal Apify API key"
---

Trial scan uses your own **Apify** account. Apify is a service that runs tools to collect public posts on TikTok, Facebook…; the cost of each scan is charged to your account.

## Steps

1. Go to [console.apify.com](https://console.apify.com) and sign up for an account (you can sign in with Google).
2. Open **Settings → API & Integrations** ([direct link](https://console.apify.com/settings/integrations)).
3. Under **Personal API tokens**, click the copy icon to get your key (in the form `apify_api_…`).
4. Open the system's **Trial scan** page and paste it into the **Your Apify API key** field.

:::tip[Remember the key on this machine]
Tick **“Remember the key on this machine”** so you don't have to paste it again next time. The key is stored only in that machine's browser, not sent to the database. **Don't tick it on a shared machine.**
:::

## Cost

- Apify's free plan has a monthly usage limit; check how much you've used in Apify Console → **Billing**.
- Before scanning, the system shows a **maximum cost estimate** based on the free-plan price.
- With the Facebook tool, a free account can only retrieve up to about 100 posts per keyword.

:::danger[Keep the key secret]
Anyone with your key can use up the quota on your account. Don't send the key via messages, don't paste it into group chats. If it leaks: go back to the page above, create a new key and delete the old one.
:::

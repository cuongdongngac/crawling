---
title: "Trial keyword scan"
---

The **Trial scan** page helps you quickly see which posts a keyword/hashtag has, which posts have high engagement, and **which hashtags often co-occur** — the main source for spotting new slang.

:::note[Data doesn't enter the data store]
Results appear only on your screen and in the Excel file you export. Posts are not saved to the official data store.
:::

## 1. Enter scan details

| Field | How to fill |
|---|---|
| **Platform / tool** | *TikTok – scan by hashtag* or *Facebook – find posts by keyword/hashtag* |
| **Your Apify API key** | See [Get your personal Apify API key](./api-key-apify) |
| **Keyword / hashtag** | One per line, or separated by commas. Up to 20 words; each word is a separate scan. TikTok: write it without spaces (`vapegiare`), with or without `#`. |
| **Max posts per keyword** | Keep it moderate (a few dozen) to stay cheap and fast. |
| **Sort order, From date, To date** | Facebook only: *Top* or *Latest*, filter by date range. |

![Scan details form](/images/cong-tac-vien/quet-thu-01-form-nhap-mobile.png)
<p class="img-caption">Figure 1: Input form: tool, your API key, keywords, max posts</p>

Click **Start scan**. The text beside it shows the **maximum cost estimate** on your Apify account.

:::tip[Use Vietnamese words]
English keywords (like “vape”) mostly return foreign content. Use Vietnamese slang and hashtags that young people are using.
:::

## 2. Track progress

- Each keyword shows a status: *Scanning*, *Done*, *Stopped*…
- You **can turn off the screen or switch apps**; open it again to keep tracking.
- To stop early: click **Stop** — posts already retrieved are kept.
- When all keywords are done, the results **download automatically** once.

![Scan progress](/images/cong-tac-vien/quet-thu-02-tien-do-mobile.png)
<p class="img-caption">Figure 2: Progress per keyword, cost per run, Stop button</p>

<details>
<summary>Already ran the tool directly on Apify?</summary>

Open the **“Already ran on Apify? Paste the run code to see results here”** section, select the right tool above, paste the run code (or the `console.apify.com/.../runs/...` link) and click **Add**.

</details>

## 3. Read the results

**Summary figures**: total posts, number of Vietnamese posts, total views/engagement…

![Summary figures](/images/cong-tac-vien/quet-thu-03-so-lieu-tong-mobile.png)
<p class="img-caption">Figure 3: Summary figures for the current set of posts</p>

**Filters and sorting**
- Language: *Vietnamese only*, *Vietnamese + unknown language*, *All languages*.
- Keyword: view each word separately or *All keywords*.
- Sort: *Highest engagement (like + comment + share)*, *Most likes / comments / shares / views*, *Newest*.
- Search box within post content.

![Filters and sorting](/images/cong-tac-vien/quet-thu-04-bo-loc-sap-xep-mobile.png)
<p class="img-caption">Figure 4: Language filter, keyword, sorting and post list</p>

**Co-occurring hashtags tab** — hashtags that appear together in the current set of posts, with labels:
- **New**: not yet in the project's list → *a candidate to suggest*.
- **Already in the list**, **Scanning**: the project already knows it.

![Co-occurring hashtags tab](/images/cong-tac-vien/quet-thu-05-tab-hashtag-di-kem-mobile.png)
<p class="img-caption">Figure 5: Co-occurring hashtags tab: New / Scanning / Already in the list labels</p>

See a **New** hashtag worth noting → click **Suggest** (see [Submit a hashtag suggestion](./de-xuat-hashtag)).

## 4. Export Excel

Click **Export Excel** to download a file with 3 sheets: **Posts**, **Co-occurring hashtags**, **Info** (filters at export time, export time). The exported file is **exactly the current set of posts** and **has no account names** of posters — only the hashed author ID.

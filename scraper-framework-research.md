# VPHA M&E — Bộ khung thu thập dữ liệu định hướng (Scraper Framework Research)

> Tập tin nghiên cứu / bản phác thảo — KHÔNG PHẢI production code.
> Mục đích: Thiết kế bộ điều phối (Adapter Pattern) để mỗi Apify Actor có cấu hình JSON (trong `apify_actors.default_config`) được dịch thành lệnh gọi Apify API phù hợp; đồng thời thiết kế schema dữ liệu để **like & comment được cập nhật NHƯNG KHÔNG GHI ĐÈ** (lưu lịch sử snapshot).

---

## 1. Actor hiện có (Seed từ seed.js)

| actor_id                       | platform | default_config seed    | Mục đích                                                                                  |
| ------------------------------ | -------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `clockwork/tiktok-scraper`     | Tiktok   | `{ maxItems: 100 }`    | Scrape video (feed hashtag): hashtag → video metadata + metrics (like/comment/share/view) |
| `apify/facebook-pages-scraper` | Facebook | `{ resultsLimit: 50 }` | Scrape page feed: page-id/page-url → bài viết page, ảnh, video, engagement                |
| `streamer/youtube-scraper`     | YouTube  | `{ maxComments: 200 }` | Scrape comments theo từ khóa / video URL → metadata video + comments                      |

---

## 2. Chi tiết cách mỗi Actor quét Hashtag / Comment / Like

Lượt thích / Chấm điểm 2.1 `clockwork/tiktok-scraper\*\*Hashtag → Video feed (CÁCH NHẤT ĐỊNH TRONG seed)

- Scraper phổ biến (dựa trên tài liệu Apify Store & review community):
  - Input field: `hashtags[]` (mảng các hashtag, bỏ dấu # hoặc giữ # được, nên giữ nguyên # để nhất quán UI)
  - Input field: `maxItems` (tổng số video, seed mặc định 100)
  - Input field: `shouldDownloadVideos` (luôn false — không lưu video bin, chỉ lưu text + metrics)
  - Input field: `shouldDownloadCovers` (false — không lưu ảnh bin, giữ URL đến cover thôi)
  - Input field: `proxy` (object Apify proxy, auto-use residential)

Kết quả (dataset item, field phổ biến):

```ts
interface TikTokVideoItem {
  id: string;                 // TikTok video id -> post_native_id (luôn duy nhất)
  webVideoUrl: string;        // https://www.tiktok.com/@user/video/XXXX -> scraped_posts.post_url
  desc: string;               // caption -> content_text
  createTimeISO: string;        // ISO string -> published_at
  diggCount: number;         // like count
  shareCount: number;        // share count
  playCount: number;         // view count
  commentCount: number;      // comment count
  collectCount: number;    // save count (optional)
  authorMeta: {
    id: string;              // author_username, avatar, name, signature ... -> author_username, author_display_name, author_avatar
    name: string;
  };
  hashtags: Array<{ name: string; }>;   // hashtags đã được Apify parse ra từ caption
  musicMeta?: { ... };         // tên nhạc (thường bỏ qua cho mục đích M&E)
}
```

👉 **Ví dụ payload gửi lên Apify khi run `clockwork/tiktok-scraper`:**

```json
{
  "hashtags": ["#vape", "#pod", "#thuocladientu"],
  "maxItems": 150,
  "shouldDownloadVideos": false,
  "shouldDownloadCovers": false,
  "maxConcurrency": 5,
  "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
}
```

---

### 2.2 `apify/facebook-pages-scraper`

⚠️ **Lưu ý quan trọng của Actor này**: Nó scrape **Page feed** (các trang page FB), KHÔNG scrape hashtag theo hashtag keyword (Facebook không public API hashtag công khai ổn định). Để dùng hợp lý trong dự án M&E thuốc lá điện tử (quét định hướng):

- Admin KHÔNG chỉ định hashtag cho FB actor này, mà admin nhập vào trường `startUrls` hoặc `pageUrls` **bên trong `default_config` của từng dòng actor record** (bỏ qua bước hashtags pick).
- Hoặc: sửa một tý UI: nếu platform="Facebook" thì field hashtag trở thành "Danh sách Page URLs (mỗi dòng 1 URL)". **Nhưng để tránh sinh thêm quy trình — ưu tiên để admin edit `default_config` JSON thủ công cho các actor FB page riêng, và trong adapter sẽ merge hashtags (từ UI) vào field `searchWords` hoặc như fallback.**

Phổ biến input của `apify/facebook-pages-scraper`:

```ts
interface FBPageScraperInput {
  startUrls?: string[]; // page URLs (https://www.facebook.com/ABC)
  pageLimit?: number; // resultsLimit -> tổng số page / post
  resultsLimit?: number; // seed đang dùng: 50 (giới hạn số BÀI VIẾT trên mỗi page)
  maxComments?: number; // nếu muốn kéo comments mỗi post (thường bỏ, actor riêng comments chuyên hơn)
  onlyPostsNewerThan?: string; // ISO date (từ khi ra -> filter cũ bỏ qua)
  proxy: { useApifyProxy: true; apifyProxyGroups?: ["RESIDENTIAL"] };
}
```

Output item phổ biến (post):

```ts
interface FBPostItem {
  url: string;                                // -> post_url (LUÔN UNIQUE, dedupe key chính)
  facebookId?: string;                        // native post id -> post_native_id
  pageName: string;                           // page owner
  pageUrl?: string;                           // page url
  text: string;                               // content_text
  time: string;                               // ISO published_at
  likes: number | null;                       // like_count (có thể null nếu private)
  comments: number | null;                    // comment_count
  shares: number | null;                      // share_count
  reactions?: { like?: number; love?: number; haha?: number; ... }; // (thường merge -> like_count tổng)
}
```

👉 **Facebook case: Merge Hashtag UI** — Khi user chọn hashtag thì adapter FB đưa vào field `searchWords` (actor này hỗ trợ keyword filter trên page feed):

```json
{
  "startUrls": [<< từ default_config admin đã điền các page URLs >>],
  "searchWords": ["#vape", "#pod", "thuốc lá điện tử"],
  "resultsLimit": 50,
  "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
}
```

---

### 2.3 `streamer/youtube-scraper`

⚠️ Actor comments chuyên dụng: Scrape comments trên **một list video URLs** (hoặc một channel, hoặc search YouTube search term + keyword trên trang kết quả). Để hợp lý với hashtag UI:

- Actor **KHÔNG dùng trực tiếp "hashtag YouTube" (YouTube hashtags kém phổ biến trên trang có #).** → **cách chuẩn**: adapter map selectedHashtags[] → `searchTerms` actor, field `maxVideos`, lấy top videos, sau đó kéo comments mỗi video theo `maxComments` seed 200.

Input phổ biến:

```ts
interface YTScraperInput {
  searchTerms?: string[]; // keywords / hashtag -> #vape pod ...
  videoUrls?: string[]; // url -> https://www.youtube.com/watch?v=XX
  channelUrls?: string[];
  maxVideos?: number; // số video lấy ra
  maxComments?: number; // seed 200
  sortVideosBy?: string; // "RELEVANCE" / "NEWEST" (luôn "NEWEST" trong M&E)
  sortCommentsBy?: string; // "TOP_COMMENTS" or "NEWEST_FIRST" (nên "NEWEST_FIRST" để lấy mới trước)
  proxy: { useApifyProxy: true; apifyProxyGroups: ["RESIDENTIAL"] };
}
```

Output 2 dạng item (2 dataset chung cùng 1 run - cần phân biệt khi parse):

```ts
// Kiểu 1: metadata Video
interface YTVideoItem {
  id: string; // native YT id -> post_native_id
  url: string; // -> post_url
  title: string; // -> content_text (nếu muốn gộp, hoặc để riêng title + description)
  text: string; // description
  channelName: string; // author_display_name
  channelUrl?: string; // author profile link
  viewCount?: number; // view_count
  likeCount?: number; // like_count
  dislikeCount?: number; // (ít dùng)
  commentCount?: number; // comment_count
  publishedAt?: string; // published_at
  tags?: string[]; // hashtags / tags
  duration?: string; // thời lượng (không quan trọng M&E)
  thumbnails?: any;
}

// Kiểu 2: Comment (nằm dataset cùng dataset, cần filter ra bảng scraped_posts_comments hoặc nếu muốn lưu)
interface YTCommentItem {
  id: string; // native comment id
  videoId: string; // FK đến YT video
  url?: string; // url đến comment
  text: string; // content comment
  authorName: string; // comment author
  authorChannelUrl?: string;
  likeCount?: number; // comment like (thường ít, nhưng có thể lưu)
  publishedAt?: string; // published_at
  replyCount?: number; // số reply
}
```

👉 **Ví dụ run payload `streamer/youtube-scraper` khi user chọn hashtag UI:**

```json
{
  "searchTerms": ["#vape", "pod vape", "thuốc lá điện tử review"],
  "maxVideos": 20,
  "maxComments": 200,
  "sortVideosBy": "NEWEST",
  "sortCommentsBy": "NEWEST_FIRST",
  "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
}
```

---

## 3. Bộ điều phối chung — Scraper Adapter Pattern (Hàm khung)

Tổ chức code: Tạo thư mục `src/lib/scrapers/` (tương lai):

```
src/
  lib/
    scrapers/
      types.ts              // Interface ScraperAdapter
      registry.ts          // Map actor_id => Adapter instance (register)
      index.ts                // dispatcher: buildRunInput(), parseResults()
      adapters/
        tiktok.adapter.ts
        facebook-pages.adapter.ts
        youtube-comments.adapter.ts
```

### 3.1 Interface chung (types.ts):

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

// Input runtime từ UI / DB collection_runs
export interface RuntimeScrapeRunConfig {
  run_id: string; // collection_runs.run_id
  apify_run_id?: string; // set sau khi gọi Apify
  apify_dataset_id?: string; // set sau khi Apify trả về
  researcher_email: string; // collection_runs.researcher_code
  actor_id: string;
  platform: string;
  hashtags: string[]; // query_parameters.hashtags (từ UI)
  maxItems_runtime?: number; // maxItems user điền (override max config)
  group_id?: string; // hashtag group
  default_config: Record<string, any>; // từ apify_actors.default_config
}

// Output chuẩn (platform-agnostic) được ghi vào DB scraped_posts
export interface NormalizedPost {
  platform: "Tiktok" | "Facebook" | "YouTube" | string;
  post_native_id: string; // dedupe KEY platform
  post_url: string; // dedupe KEY platform
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  content_text: string;
  media_urls: string[]; // (không download file)
  hashtags: string[]; // normalized to lowercase + keep " #"
  published_at: string | null;
  // metrics lấy LẦN đầu -> scraped_posts.like_count ... những lần sau KHÔNG UPDATE vào đây
  _raw_item: unknown; // record jsonb gốc để tra cứu
}

// Interface mỗi Adapter cần implement
export interface ScraperAdapter {
  /**
   * Gộp default_config (JSON từ apify_actors) + runtime (hashtags, maxItems user chọn)
   * -> trả về payload GỬI LÊN Apify API (POST /v2/acts/{actorId}/runs)
   */
  buildActorInput(cfg: RuntimeScrapeRunConfig): Record<string, any>;

  /**
   * Parse dataset Apify trả về (dataset.items) -> NormalizedPost[]
   * Đồng thời phân biệt (FB/TikTok/YT và skip / comment riêng)
   */
  normalizeDatasetItems(items: unknown[]): NormalizedPost[];

  /**
   * (Tùy chọn) Extra validate trước khi chạy: ví dụ FB cần pageUrls phải có thì mới chạy, không thì báo lỗi
   */
  validateConfig?(cfg: RuntimeScrapeRunConfig): string[]; // trả về mảng lỗi (rỗng -> OK)
}
```

### 3.2 Dispatcher chung (index.ts dispatcher):

```ts
// import tiktokAdapter from "./adapters/tiktok.adapter";
// import fbAdapter from "./adapters/facebook-pages.adapter";
// import ytAdapter from "./adapters/youtube-comments.adapter";
import type { RuntimeScrapeRunConfig, ScraperAdapter } from "./types";

const REGISTRY: Record<string, ScraperAdapter> = {
  "clockwork/tiktok-scraper": tiktokAdapter,
  "apify/facebook-pages-scraper": fbAdapter,
  "streamer/youtube-scraper": ytAdapter,
};

export function getAdapter(actorId: string): ScraperAdapter | null {
  return REGISTRY[actorId] ?? null;
}

/**
 * Build payload gửi Apify start run
 */
export function buildApifyActorInput(
  cfg: RuntimeScrapeRunConfig,
): Record<string, any> {
  const adapter = getAdapter(cfg.actor_id);
  if (!adapter) {
    throw new Error(
      `No scraper adapter registered for actor_id: ${cfg.actor_id}`,
    );
  }
  if (adapter.validateConfig) {
    const errs = adapter.validateConfig(cfg);
    if (errs.length > 0) {
      throw new Error(`Adapter config invalid: ${errs.join(" | ")}`);
    }
  }
  return adapter.buildActorInput(cfg);
}

/**
 * Sau khi Apify trả dataset items -> parse chuẩn
 */
export function normalizeScrapedItems(actorId: string, items: unknown[]) {
  const adapter = getAdapter(actorId);
  if (!adapter) throw new Error(`No adapter: ${actorId}`);
  return adapter.normalizeDatasetItems(items);
}
```

### 3.3 Adapter mẫu 1: tiktok.adapter.ts (hàm khung):

```ts
import type { NormalizedPost, RuntimeScrapeRunConfig, ScraperAdapter } from "../types";

const tiktokAdapter: ScraperAdapter = {
  buildActorInput(cfg) {
    const defaults = cfg.default_config ?? {};
    const maxItems = cfg.maxItems_runtime ?? defaults.maxItems ?? 100;
    const hashtags = cfg.hashtags.length > 0 ? cfg.hashtags : (defaults.hashtags ?? []);
    return {
      hashtags,
      maxItems,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      maxConcurrency: defaults.maxConcurrency ?? 5,
      enableCoversOutput: false,
      enableWatermarkVideo: false,
      proxy: defaults.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(defaults.extra || {}),
    };
  },

  normalizeDatasetItems(items) {
    const out: NormalizedPost[] = [];
    for (const raw of items as any[]) {
      if (!raw || typeof raw !== "object") continue;
      if (!raw.id || !raw.webVideoUrl) continue;
      out.push({
        platform: "Tiktok",
        post_native_id: String(raw.id),
        post_url: raw.webVideoUrl,
        author_username: raw.authorMeta?.name ?? "",
        author_display_name: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? "",
        author_avatar_url: raw.authorMeta?.avatar ?? null,
        content_text: String(raw.desc ?? ""),
        media_urls: raw.musicMeta?.coverMediumUrl ? [raw.musicMeta.coverMediumUrl] : [],
        hashtags: Array.isArray(raw.hashtags)
          ? raw.hashtags.map((h: any) => (h?.name ? `#${h.name}`.toLowerCase() : "").filter(Boolean)
          : [],
        published_at: raw.createTimeISO ?? (raw.createTime ? new Date(raw.createTime * 1000).toISOString() : null),
        _raw_item: raw,
      });
    }
    return out;
  },
};

export default tiktokAdapter;
```

### 3.4 Adapter mẫu 2: facebook-pages.adapter.ts (hàm khung):

```ts
import type {
  NormalizedPost,
  RuntimeScrapeRunConfig,
  ScraperAdapter,
} from "../types";

const fbAdapter: ScraperAdapter = {
  validateConfig(cfg) {
    const errs: string[] = [];
    const defaults = cfg.default_config ?? {};
    const urls: string[] = defaults.startUrls ?? defaults.pageUrls ?? [];
    if (urls.length === 0 && !defaults.searchPages?.length) {
      errs.push(
        "Actor Facebook phải có startUrls[] trong default_config (danh sách page URLs)",
      );
    }
    return errs;
  },

  buildActorInput(cfg) {
    const defaults = cfg.default_config ?? {};
    const resultsLimit = cfg.maxItems_runtime ?? defaults.resultsLimit ?? 50;
    return {
      startUrls: defaults.startUrls ?? defaults.pageUrls ?? [],
      searchWords:
        cfg.hashtags.length > 0
          ? [...cfg.hashtags]
          : (defaults.searchWords ?? []),
      resultsLimit,
      maxComments: defaults.maxComments ?? 0, // default 0 để không kéo comments (tiết kiệm cost)
      onlyPostsNewerThan: defaults.onlyPostsNewerThan,
      proxy: defaults.proxy ?? {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
      ...(defaults.extra || {}),
    };
  },

  normalizeDatasetItems(items) {
    const out: NormalizedPost[] = [];
    for (const raw of items as any[]) {
      if (!raw?.url) continue;
      out.push({
        platform: "Facebook",
        post_native_id: String(raw.facebookId ?? raw.url),
        post_url: raw.url,
        author_username: raw.pageName ?? "",
        author_display_name: raw.pageName ?? "",
        author_avatar_url: null,
        content_text: String(raw.text ?? ""),
        media_urls: Array.isArray(raw.images) ? raw.images.slice(0, 10) : [],
        hashtags: extractFbHashtags(raw.text ?? ""),
        published_at: raw.time ?? null,
        _raw_item: raw,
      });
    }
    return out;
  },
};

function extractFbHashtags(text: string): string[] {
  const re = /#([a-z0-9_]+)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ""))) !== null) {
    out.push(m[0].toLowerCase());
  }
  return [...new Set(out)];
}

export default fbAdapter;
```

### 3.5 Adapter mẫu 3: youtube-comments.adapter.ts (hàm khung):

```ts
import type { NormalizedPost, RuntimeScrapeRunConfig, ScraperAdapter } from "../types";

const ytAdapter: ScraperAdapter = {
  buildActorInput(cfg) {
    const defaults = cfg.default_config ?? {};
    const maxVideos = Math.min(cfg.maxItems_runtime ?? defaults.maxVideos ?? 20, 100);
    const maxComments = defaults.maxComments ?? 200;
    const videoUrls = defaults.videoUrls ?? [];
    const channelUrls = defaults.channelUrls ?? [];
    return {
      searchTerms: cfg.hashtags.length > 0 ? [...cfg.hashtags] : (defaults.searchTerms ?? []),
      videoUrls,
      channelUrls,
      maxVideos,
      maxComments,
      sortVideosBy: defaults.sortVideosBy ?? "NEWEST",
      sortCommentsBy: defaults.sortCommentsBy ?? "NEWEST_FIRST",
      proxy: defaults.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(defaults.extra || {}),
    };
  },

  normalizeDatasetItems(items) {
    // LƯU Ý: chỉ lấy item kiểu VIDEO (bỏ kiểu comment riêng trong dataset)
    const out: NormalizedPost[] = [];
    for (const raw of items as any[]) {
      if (!raw || !raw.url) continue;
      // Heuristic: comment item luôn có field "videoId" và không có "sortVideosBy"...
      // dùng cách đơn giản: nếu có field "videoId" -> item comment, bỏ qua
      const isCommentItem = typeof raw.videoId === "string" && typeof raw.authorName === "string";
      if (isCommentItem) continue;
      // Nếu có title + viewCount / channelName -> VIDEO metadata
      const looksLikeVideo = typeof raw.title === "string" || typeof raw.channelName === "string";
      if (!looksLikeVideo && !raw.publishedAt) continue;
        out.push({
          platform: "YouTube",
          post_native_id: String(raw.id),
          post_url: raw.url,
          author_username: raw.channelUrl?.split("/").filter(Boolean).pop() ?? "",
          author_display_name: raw.channelName ?? "",
          author_avatar_url: null,
          content_text: [String(raw.title ?? ""), String(raw.text ?? "")].filter(Boolean).join("\n\n"),
          media_urls: raw.thumbnails?.medium?.url ? [raw.thumbnails.medium.url] : [],
          hashtags: normalizeTags(raw.tags ?? []),
          published_at: raw.publishedAt ?? null,
          _raw_item: raw,
        });
      }
      // NOTE: comments items (có videoId) -> bỏ qua bảng scraped_posts_comments nếu cần, hiện tại cho vào bảng riêng (chưa cần)
    }
    return out;
  },
};

function normalizeTags(tags: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => {
    const s = String(t).trim().toLowerCase();
    return s.startsWith("#") ? s : `#${s}`;
  })];
}

export default ytAdapter;
```

---

## 4. Schema Bảo đảm "Like & Comment được cập nhật NHƯNG KHÔNG GHI ĐÈ — Metrics Snapshot

Đây là bảng cốt lõi yêu cầu: \*\*cùng một post (post_url), nhiều lần quét / follow up không được làm mất dữ liệu lịch sử.

### 4.1 Bảng `scraped_posts` (bản gốc — cache "chỉ INSERT 1 lần mỗi post mới, nếu đã tồn tại -> KHÔNG UPDATE metrics):

```sql
CREATE TABLE IF NOT EXISTS public.scraped_posts (
    post_id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL,
    post_native_id TEXT,
    post_url TEXT NOT NULL,
    author_username TEXT,
    author_display_name TEXT,
    author_avatar_url TEXT,
    content_text TEXT,
    media_urls TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    hashtags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    published_at TIMESTAMPTZ,
    matched_group_id TEXT,             -- (từ hashtags group (COMMERCIAL/YOUTH...)
    source_run_id TEXT NOT NULL REFERENCES public.collection_runs(run_id) ON DELETE SET NULL,
    researcher_code TEXT,
    raw_item JSONB,                -- Apify item gốc lần đầu lấy (có thể NULL lần sau parse khác nhẹ)
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scraped_posts_uq UNIQUE (platform, post_url)   -- dedupe KEY (2 platform)
);
CREATE INDEX IF NOT EXISTS idx_scraped_posts_platform_hashtags ON public.scraped_posts USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_scraped_posts_group ON public.scraped_posts(matched_group_id);
```

👉 **QUY TẮC KHÔNG UPDATE metrics vào scraped_posts** khi re-scrape cùng post_url:

- `first_seen_at`, `content_text`, `author_*` → nếu đã có thì KHÔNG ĐỘNG (nếu muốn update content mới hơn thì để decision sau.)

### 4.2 Bảng `post_metrics_snapshot` (LƯU TẤT CẢ các lần đo — KHÔNG BAO GIỜ GHI ĐÈ, luôn INSERT):

```sql
CREATE TABLE IF NOT EXISTS public.post_metrics_snapshot (
    snapshot_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.scraped_posts(post_id) ON DELETE CASCADE,
    source_run_id TEXT REFERENCES public.collection_runs(run_id) ON DELETE SET NULL,
    snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    like_count BIGINT,
    comment_count BIGINT,
    share_count BIGINT,
    view_count BIGINT,
    collect_count BIGINT,              -- TikTok bookmark/save

    engagement_score NUMERIC(18,4) GENERATED ALWAYS AS (
        COALESCE(like_count, 0)
      + COALESCE(comment_count, 0) * 5
      + COALESCE(share_count, 0) * 3
      + COALESCE(view_count, 0) * 0.01
    ) STORED,

    extra JSONB DEFAULT '{}'::JSONB        // reactions break-down
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_post_time
  ON public.post_metrics_snapshot(post_id, snapshotted_at DESC NULLS LAST;
CREATE INDEX IF NOT EXISTS idx_post_metrics_run
  ON public.post_metrics_snapshot(source_run_id);
```

### 4.3 (Tùy chọn tiện ích) View `scraped_posts_with_latest_metrics`:

Để lấy metrics mới nhất join nhanh (lọc dashboard):

```sql
CREATE OR REPLACE VIEW public.scraped_posts_latest AS
SELECT
    p.*,
    m.like_count AS latest_likes,
    m.comment_count AS latest_comments,
    m.share_count AS latest_shares,
    m.view_count AS latest_views,
    m.collect_count AS latest_collects,
    m.engagement_score AS latest_engagement,
    m.snapshotted_at AS metrics_updated_at
FROM public.scraped_posts p
LEFT JOIN LATERAL (
  SELECT * FROM public.post_metrics_snapshot m2
    WHERE m2.post_id = p.post_id
    ORDER BY m2.snapshotted_at DESC
    LIMIT 1
) m ON TRUE;
```

### 4.4 Quy tắc Upsert khi ingest dữ liệu mới về:

Pseudo code khi có 1 lô NormalizedPost[] + raw metrics:

```ts
for (const post of normalizedPosts) {
  // 1) scraped_posts: INSERT nếu post_url+platform chưa có; nếu có thì BỎ QUA (KHÔNG UPDATE)
  const { data: existing, error: selErr } = await supabase
    .from("scraped_posts")
    .select("post_id")
    .eq("platform", post.platform)
    .eq("post_url", post.post_url)
    .maybeSingle();

  let post_id: number;
  if (!existing) {
    const { data: ins, error: iErr } = await supabase.from("scraped_posts").insert({
      platform: post.platform,
      post_native_id: post.post_native_id,
      post_url: post.post_url,
      author_username: post.author_username,
      author_display_name: post.author_display_name,
      author_avatar_url: post.author_avatar_url,
      content_text: post.content_text,
      media_urls: post.media_urls,
      hashtags: post.hashtags,
      published_at: post.published_at,
      matched_group_id: groupId,
      source_run_id: runId,
      researcher_code: researcher_email,
      raw_item: post._raw_item
    }).select("post_id").single();
    post_id = ins!.post_id;
  } else {
    post_id = existing.post_id;
    // ❌ KHÔNG UPDATE scraped_posts
  }

  // 2) post_metrics_snapshot: LUÔN INSERT (dù post cũ hay mới) — KHÔNG GHI ĐÈ
  await supabase.from("post_metrics_snapshot").insert({
    post_id,
    source_run_id: runId,
    // snapshotted_at default now()
    like_count: extractRaw.get(post) // từ _raw_item -> từ TikTok: diggCount / FB: likes / YT: likeCount
    // (tương tự comment_count, share_count, view_count, collect_count,
    extra: rawBreakdown
  });
}
```

---

## 5. Flow hoàn chỉnh từ collection_runs lifecycle (8 bước)

```
  User tạo plan (UI ScrapingStudio)
       │
       ▼
1. [INSERT collection_runs.status=RUNNING or QUEUED (P0 vừa làm)
       │
       ▼
2. Worker / Cron / onClick "Run": gọi dispatcher.buildApifyActorInput(cfg)
      👉 đọc apify_actors.default_config + run.query_parameters hashtags/maxItems
       │
       ▼
3. POST https://api.apify.com/v2/acts/<actorId>/runs?token=<APIFY_API_TOKEN>
       Header: Content-Type: application/json
       Body: payload từ bước 2
       Response.id -> lưu vào collection_runs.apify_run_id
       Response.defaultDatasetId -> lưu collection_runs.apify_dataset_id
       │
       ▼
4. UPDATE collection_runs.status=RUNNING, started_at=now
       │
       ▼
5. Poll GET /v2/actor-runs/<apify_run_id> mỗi 10s (retry backoff)
       SUCCEEDED / FAILED / TIMED-OUT
       │
       ▼
6 (nếu FAILED):
       UPDATE status=FAILED, error_message=...
       (nếu SUCCEEDED):
       ▼
7. GET /v2/datasets/<datasetId>/items?offset=0&limit=1000 (loop tất cả page)
       items[] -> dispatcher.normalizeScrapedItems(actor_id, items)
       -> batch INSERT/ignore scraped_posts (dedup)
       -> INSERT ALL vào post_metrics_snapshot (KHÔNG GHI ĐÈ)
       │
       ▼
8. UPDATE collection_runs.status=SUCCESS,
       completed_at=now(),
       items_count=số post NORMALIZED lưu thành công
```

Lưu ý Apify: có thể dùng `waitForFinish` query param ?=60 trên request start run để đợi kết quả 1 lần, thay vì poll vòng lặp thủ công.

---

## 6. ALTER collection_runs bổ sung (append SQL) — cần chạy migration trước khi tích hợp Apify thật

```sql
ALTER TABLE public.collection_runs
  ADD COLUMN IF NOT EXISTS apify_run_id TEXT,           -- id của lệnh chạy trên Apify
  ADD COLUMN IF NOT EXISTS apify_dataset_id TEXT,       -- dataset id kết quả
  ADD COLUMN IF NOT EXISTS apify_build TEXT,              -- (optional) log url Apify (link xem log)
  ADD COLUMN IF NOT EXISTS error_message TEXT,            -- nếu FAILED -> lý do
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;   -- lúc Apify trả SUCCEEDED/FAILED
```

---

## 7. Những lưu ý cần xác nhận (sau này code thật)

1. **Facebook** — Actor `apify/facebook-pages-scraper` yêu cầu **page URLs** → Admin phải có trước (quy trình giấy tờ). KHÔNG hỗ trợ hashtag feed ổn định như TikTok/YT. Hiện adapter merge hashtags thành `searchWords` để chỉ lấy bài chứa keyword trên trang.
2. **YouTube** — nếu run có comments (thường nặng/cost cao), bảng `scraped_posts_comments` (chưa design) nên dùng tách riêng comments ra khỏi post (comments nhiều lên đến hàng ngàn). Hiện tại adapter chỉ parse VIDEO (không lưu comments text).
3. **Cost/Proxy**: mặc dù Apify auto proxy RESIDENTIAL group dùng actor nào có cost. KHuyến nghị field `maxItems_runtime` mặc định nhỏ (20 - 50) với user mới test.
4. **Dedupe 2 tầng**:
   - tầng scraped_posts UNIQUE (platform, post_url)
   - tầng post_metrics_snapshot LUÔN INSERT -> không cần unique (mỗi mỗi collection_runs có thể tạo 1 dòng)
5. **Hashtag** parse từ caption / raw, còn matched_group_id scraped_posts: join bảng hashtag_group_mapping sau khi parse hashtags[] không nên cache.

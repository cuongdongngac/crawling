// ==========================================================
// Danh mục actor Apify + adapter dùng chung (bản chuẩn, TypeScript)
// ----------------------------------------------------------
// Mỗi actor khai báo:
//   - buildInput(keyword, max, options): payload gửi lên Apify cho MỘT từ khóa
//   - parseItem(raw): đọc 1 item output -> ScannedPost (null = bỏ qua)
// Trường input/output lấy theo file mẫu chạy thật (docs/Actor/*, 29/10 và 31/10/2026).
//
// Actor "thống kê hashtag" (Instagram/TikTok analytics) trả về 1 bản ghi/hashtag
// chứa danh sách bài con -> dùng expandItem() để bóc bài, relatedHashtags() để lấy
// hashtag liên quan do nền tảng gợi ý.
//
// Dùng cho: màn hình Quét thử (không ghi DB). Worker quét chính thức sẽ
// chuyển sang dùng module này ở bước gộp adapter.
// ==========================================================

export type ScanPlatform = "TIKTOK" | "FACEBOOK" | "INSTAGRAM";

export const PLATFORM_LABEL: Record<ScanPlatform, string> = {
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
};

export interface ScanOptions {
  /** Facebook: "top" (mặc định) hoặc "latest" (bài mới nhất) */
  searchType?: "top" | "latest";
  /** Facebook: lọc theo ngày đăng, dạng YYYY-MM-DD (UTC) */
  startDate?: string;
  endDate?: string;
  /** Actor thống kê: khoảng thời gian tính số liệu (ngày) */
  period?: number;
}

/** Tùy chọn mà actor hỗ trợ -> giao diện chỉ hiện ô tương ứng */
export interface ScanCapabilities {
  /** Chọn thứ tự Nổi bật / Mới nhất */
  sortOrder?: boolean;
  /** Lọc Từ ngày – Đến ngày */
  dateRange?: boolean;
  /** Các khoảng thời gian thống kê được phép (ngày) */
  periods?: number[];
}

/** Hashtag liên quan do actor thống kê gợi ý (không gắn với bài cụ thể) */
export interface RelatedHashtag {
  tag: string; // viết thường, không dấu #
  /** Thông tin kèm theo, ví dụ "28,09 tr bài" */
  info: string | null;
}

export interface ScannedPost {
  platform: ScanPlatform;
  native_post_id: string;
  post_url: string;
  author_native_id: string | null;
  published_at: string | null; // ISO
  text: string;
  /** Ngôn ngữ do nền tảng/actor trả về (TikTok có sẵn), null nếu không có */
  lang_hint: string | null;
  /** Hashtag trong bài, viết thường, không có dấu # */
  hashtags: string[];
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  view_count: number | null;
  /** TikTok: số lượt lưu (collectCount) */
  save_count: number | null;
  is_ad: boolean;
}

export interface ScanActor {
  id: string; // dạng username/actor-name
  label: string;
  platform: ScanPlatform;
  /** Giới hạn số bài cho mỗi từ khóa */
  maxPerKeyword: number;
  defaultPerKeyword: number;
  /** Giá ước tính mỗi bài (USD) ở gói miễn phí của Apify — chỉ để báo trước chi phí */
  estUsdPerItem: number;
  /** Số bài tối thiểu mỗi lần chạy (actor tự áp mức sàn, ví dụ 100) */
  minPerKeyword?: number;
  /** Có giá trị = số bài do actor tự quyết, giao diện hiện dòng chữ này thay cho ô nhập */
  perKeywordFixed?: string;
  note: string;
  capabilities?: ScanCapabilities;
  normalizeKeyword(k: string): string;
  buildInput(keyword: string, max: number, opts: ScanOptions): Record<string, unknown>;
  /** Bóc các bài con trong 1 item (actor thống kê). Không khai báo = item chính là bài. */
  expandItem?(raw: unknown): unknown[];
  /** Hashtag liên quan đọc từ 1 item (actor thống kê) */
  relatedHashtags?(raw: unknown): RelatedHashtag[];
  parseItem(raw: unknown): ScannedPost | null;
}

// ---------------- helpers ----------------
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function toIso(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Lấy hashtag trong văn bản, viết thường, không dấu # */
export function extractHashtags(text: string): string[] {
  const out = new Set<string>();
  const re = /#([\p{L}\p{N}_]+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || "")) !== null) out.add(m[1].toLowerCase());
  return Array.from(out);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function cleanTag(v: unknown): string {
  return str(v).trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
}

/** Hashtag kiểu TikTok/Instagram: bỏ #, bỏ dấu cách, viết thường */
function normalizeHashtag(k: string): string {
  return k.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
}

/** Giây hoặc mili-giây (unix) -> ISO */
function unixToIso(v: unknown): string | null {
  const n = num(v);
  if (n === null) return null;
  return toIso(n < 1e12 ? n * 1000 : n);
}

/** Số lớn -> "2,37 triệu", "24,35 tỷ" */
function compact(n: number | null): string | null {
  if (n === null) return null;
  const f = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  if (n >= 1e9) return f(n / 1e9) + " tỷ";
  if (n >= 1e6) return f(n / 1e6) + " triệu";
  if (n >= 1e3) return f(n / 1e3) + " nghìn";
  return f(n);
}

/** Đọc số viết tắt kiểu "16.19 m", "972.92 k", "2.15 g" -> số */
function parseAbbrev(v: unknown): number | null {
  const m = str(v).trim().toLowerCase().match(/^([\d.,]+)\s*([kmgb]?)$/);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const mult = { "": 1, k: 1e3, m: 1e6, g: 1e9, b: 1e9 }[m[2]] ?? 1;
  return Math.round(base * mult);
}

/** Bỏ trùng hashtag liên quan, giữ thông tin đầu tiên có */
function uniqRelated(list: RelatedHashtag[]): RelatedHashtag[] {
  const m = new Map<string, RelatedHashtag>();
  for (const r of list) {
    if (!r.tag) continue;
    const prev = m.get(r.tag);
    if (!prev) m.set(r.tag, r);
    else if (!prev.info && r.info) prev.info = r.info;
  }
  return Array.from(m.values());
}

/**
 * Bỏ mọi trường ảnh/video/media khỏi JSON gốc trước khi lưu (dự án không lưu ảnh).
 * Dùng khi ghi raw_payload vào DB ở luồng quét chính thức.
 */
const MEDIA_KEY = /(avatar|cover|picture|profilepic|thumbnail|playurl|mediaurls|videourl|imageurl|image|photo|slideshow|subtitle|attachments)/i;
export function stripMedia(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw.map(stripMedia);
  if (!isObj(raw)) return raw;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (MEDIA_KEY.test(k)) continue;
    out[k] = stripMedia(v);
  }
  return out;
}

// Dạng output chung của các actor TikTok do clockworks viết
function parseClockworksTiktok(raw: unknown): ScannedPost | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const author = isObj(raw.authorMeta) ? raw.authorMeta : {};
  const url =
    str(raw.webVideoUrl) ||
    (id && author.name ? `https://www.tiktok.com/@${author.name}/video/${id}` : "");
  if (!id || !url) return null;
  const text = str(raw.text ?? raw.desc);
  const tags = new Set(extractHashtags(text));
  if (Array.isArray(raw.hashtags)) {
    for (const h of raw.hashtags) {
      const name = str(isObj(h) ? h.name : h).trim().replace(/^#+/, "").toLowerCase();
      if (name) tags.add(name);
    }
  }
  const lang = str(raw.textLanguage).toLowerCase();
  return {
    platform: "TIKTOK",
    native_post_id: id,
    post_url: url,
    author_native_id: str(author.id ?? author.secUid ?? author.name) || null,
    published_at: toIso(raw.createTimeISO) ?? (num(raw.createTime) ? toIso(Number(raw.createTime) * 1000) : null),
    text,
    lang_hint: lang && lang !== "un" ? lang : null,
    hashtags: Array.from(tags),
    like_count: num(raw.diggCount),
    comment_count: num(raw.commentCount),
    share_count: num(raw.shareCount),
    view_count: num(raw.playCount),
    save_count: num(raw.collectCount),
    is_ad: raw.isAd === true || raw.isSponsored === true,
  };
}

// ---------------- TikTok: clockworks/tiktok-hashtag-scraper ----------------
const tiktokHashtag: ScanActor = {
  id: "clockworks/tiktok-hashtag-scraper",
  label: "TikTok – quét theo hashtag",
  platform: "TIKTOK",
  maxPerKeyword: 800, // TikTok chỉ cho lấy khoảng 800 bài mỗi hashtag
  defaultPerKeyword: 50,
  estUsdPerItem: 0.005,
  note: "Nhập hashtag không dấu cách (ví dụ: vapegiare). Dấu # có hay không đều được.",
  normalizeKeyword: normalizeHashtag,
  buildInput(keyword, max) {
    return {
      hashtags: [keyword],
      resultsPerPage: max, // tên trường đúng của actor (không phải maxItems)
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      downloadSubtitlesOptions: "NEVER_DOWNLOAD_SUBTITLES",
    };
  },
  parseItem: parseClockworksTiktok,
};

// ---------------- Facebook: scraper_one/facebook-posts-search ----------------
const facebookPostsSearch: ScanActor = {
  id: "scraper_one/facebook-posts-search",
  label: "Facebook – tìm bài theo từ khóa/hashtag",
  platform: "FACEBOOK",
  maxPerKeyword: 1000,
  defaultPerKeyword: 50,
  estUsdPerItem: 0.002,
  note:
    "Nhập từ khóa hoặc hashtag (có thể có dấu cách, ví dụ: kẹo khói, #podgiare). " +
    "Tài khoản Apify miễn phí chỉ lấy tối đa 100 bài mỗi từ khóa.",
  capabilities: { sortOrder: true, dateRange: true },
  normalizeKeyword(k) {
    // Actor không nhận các ký tự { } $ < > ` và tối đa 100 ký tự
    return k.trim().replace(/[{}$<>`]/g, "").replace(/\s+/g, " ").slice(0, 100);
  },
  buildInput(keyword, max, opts) {
    const input: Record<string, unknown> = {
      query: keyword,
      resultsCount: max,
      searchType: opts.searchType === "latest" ? "latest" : "top",
    };
    if (opts.startDate) input.startDate = opts.startDate;
    if (opts.endDate) input.endDate = opts.endDate;
    return input;
  },
  parseItem(raw) {
    if (!isObj(raw)) return null;
    const url = str(raw.url);
    if (!url) return null;
    const text = str(raw.postText ?? raw.text);
    let likes = num(raw.reactionsCount);
    if (likes === null && isObj(raw.reactions)) {
      likes = Object.values(raw.reactions).reduce<number>((a, v) => a + (num(v) ?? 0), 0);
    }
    const author = isObj(raw.author) ? raw.author : {};
    return {
      platform: "FACEBOOK",
      native_post_id: str(raw.postId) || url,
      post_url: url,
      author_native_id: str(author.id) || null,
      published_at: toIso(num(raw.timestamp) ?? raw.timestamp),
      text,
      lang_hint: null,
      hashtags: extractHashtags(text),
      like_count: likes,
      comment_count: num(raw.commentsCount),
      share_count: num(raw.sharesCount),
      view_count: null,
      save_count: null,
      is_ad: false,
    };
  },
};

// ---------------- TikTok: clockworks/tiktok-scraper (bản đầy đủ) ----------------
// Cùng dạng kết quả với clockworks/tiktok-hashtag-scraper; nhận thêm nhiều loại đầu vào,
// ở đây chỉ dùng hashtags (DEC-H1). Mẫu: docs/Actor/clockworkstiktok-scraper.
const tiktokScraper: ScanActor = {
  id: "clockworks/tiktok-scraper",
  label: "TikTok – quét theo hashtag (clockworks, bản đầy đủ)",
  platform: "TIKTOK",
  maxPerKeyword: 800,
  defaultPerKeyword: 50,
  estUsdPerItem: 0.005,
  note:
    "Cùng kết quả với công cụ TikTok hashtag ở trên (có sẵn ngôn ngữ bài, lượt lưu). " +
    "Nhập hashtag không dấu cách. Tắt sẵn tải video/ảnh/bình luận để tiết kiệm chi phí.",
  normalizeKeyword: normalizeHashtag,
  buildInput(keyword, max) {
    return {
      hashtags: [keyword],
      resultsPerPage: max,
      profileScrapeSections: ["videos"],
      excludePinnedPosts: false,
      maxFollowersPerProfile: 0,
      maxFollowingPerProfile: 0,
      scrapeRelatedSearchWords: false,
      scrapeRelatedVideos: false,
      scrapeAdditionalAuthorMeta: false,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
      downloadSubtitlesOptions: "NEVER_DOWNLOAD_SUBTITLES",
      aiVideoDescription: false,
      aiVideoSummary: false,
      commentsPerPost: 0,
      topLevelCommentsPerPost: 0,
      maxRepliesPerComment: 0,
    };
  },
  parseItem: parseClockworksTiktok,
};

// ---------------- TikTok: api-ninja/tiktok-hashtag-scraper ----------------
// Input (OpenAPI 31/10/2026): hashtags[] (không dấu cách/dấu phẩy), maxResults (tối thiểu 100),
// parseAll, region (mã quốc gia), parseSimilarHashtag. Mẫu: docs/Actor/api-ninjatiktok-hashtag-scraper.
const apiNinjaTiktokHashtag: ScanActor = {
  id: "api-ninja/tiktok-hashtag-scraper",
  label: "TikTok – quét theo hashtag (api-ninja, giá rẻ)",
  platform: "TIKTOK",
  maxPerKeyword: 1000,
  minPerKeyword: 100, // actor bắt buộc maxResults >= 100
  defaultPerKeyword: 100,
  estUsdPerItem: 0.0005,
  note:
    "Giá rẻ (~0,5 USD/1.000 bài). Mỗi hashtag lấy tối thiểu 100 bài. Ưu tiên kết quả khu vực Việt Nam " +
    "(vẫn có thể lẫn bài nước khác). Không có sẵn ngôn ngữ bài — hệ thống tự nhận diện.",
  normalizeKeyword(k) {
    return normalizeHashtag(k).replace(/,/g, "");
  },
  buildInput(keyword, max) {
    return {
      hashtags: [keyword],
      maxResults: Math.max(100, max),
      parseAll: false,
      parseSimilarHashtag: false,
      region: "VN",
    };
  },
  parseItem(raw) {
    if (!isObj(raw)) return null;
    const id = str(raw.video_id ?? raw.aweme_id);
    const author = isObj(raw.author) ? raw.author : {};
    const handle = str(author.unique_id);
    const url = id && handle ? `https://www.tiktok.com/@${handle}/video/${id}` : "";
    if (!id || !url) return null;
    const text = str(raw.title);
    return {
      platform: "TIKTOK",
      native_post_id: id,
      post_url: url,
      author_native_id: str(author.id ?? handle) || null,
      published_at: unixToIso(raw.create_time),
      text,
      lang_hint: null,
      hashtags: extractHashtags(text),
      like_count: num(raw.digg_count),
      comment_count: num(raw.comment_count),
      share_count: num(raw.share_count),
      view_count: num(raw.play_count),
      save_count: num(raw.collect_count),
      is_ad: raw.is_ad === true,
    };
  },
};

// ---------------- TikTok: parseforge/tiktok-hashtag-analytics-scraper ----------------
// Số liệu từ TikTok Creative Center: 1 bản ghi/hashtag gồm tổng bài, tổng lượt xem,
// topVideos (bài con), relatedHashtags. Mẫu: docs/Actor/LOAI - parseforge-... (đề xuất loại, xem docs/Actor/_DANH-GIA-ACTOR.md).
const parseforgeTiktokAnalytics: ScanActor = {
  id: "parseforge/tiktok-hashtag-analytics-scraper",
  label: "TikTok – thống kê hashtag (Creative Center, parseforge)",
  platform: "TIKTOK",
  maxPerKeyword: 1,
  defaultPerKeyword: 1,
  perKeywordFixed: "Mỗi hashtag: 1 bản thống kê + các video nổi bật (tối đa ~30, do TikTok quyết định).",
  estUsdPerItem: 0.002,
  note:
    "Đo độ phổ biến hashtag tại Việt Nam (tổng bài, lượt xem) kèm video nổi bật và hashtag liên quan. " +
    "Actor thuê theo tháng (~10 USD/tháng + phí chạy) — phải thuê trên Apify trước khi dùng. " +
    "Hashtag ít phổ biến có thể không có số liệu.",
  capabilities: { periods: [7, 30, 120] },
  normalizeKeyword: normalizeHashtag,
  buildInput(keyword, _max, opts) {
    const period = [7, 30, 120].includes(Number(opts.period)) ? Number(opts.period) : 30;
    return {
      mode: "specificHashtags",
      hashtags: [keyword],
      maxItems: 1,
      period,
      countryCode: "VN",
      maxConcurrency: 1,
      enrichOutput: false,
    };
  },
  expandItem(raw) {
    return isObj(raw) && Array.isArray(raw.topVideos) ? raw.topVideos : [];
  },
  relatedHashtags(raw) {
    if (!isObj(raw)) return [];
    const out: RelatedHashtag[] = [];
    const self = cleanTag(raw.hashtagName);
    if (self) {
      const posts = compact(num(raw.publishCountAllTime));
      const views = compact(num(raw.videoViewsAllTime));
      out.push({
        tag: self,
        info: [posts && posts + " bài", views && views + " lượt xem"].filter(Boolean).join(" · ") || null,
      });
    }
    if (Array.isArray(raw.relatedHashtags)) {
      for (const h of raw.relatedHashtags) {
        const tag = cleanTag(isObj(h) ? h.hashtagName ?? h.name : h);
        if (tag) out.push({ tag, info: null });
      }
    }
    return uniqRelated(out);
  },
  parseItem(raw) {
    if (!isObj(raw)) return null;
    const id = str(raw.videoId);
    const handle = str(raw.authorUniqueId);
    const url = str(raw.url) || (id && handle ? `https://www.tiktok.com/@${handle}/video/${id}` : "");
    if (!id || !url) return null;
    const text = str(raw.description);
    return {
      platform: "TIKTOK",
      native_post_id: id,
      post_url: url,
      author_native_id: handle || null,
      published_at: toIso(raw.createdAt),
      text,
      lang_hint: null,
      hashtags: extractHashtags(text),
      like_count: num(raw.likeCount),
      comment_count: num(raw.commentCount),
      share_count: num(raw.shareCount),
      view_count: num(raw.playCount),
      save_count: null,
      is_ad: false,
    };
  },
};

// ---------------- Facebook: scrapeforge/facebook-search-posts ----------------
// Input: query, search_type ("posts"), max_results, recent_posts (bài mới nhất).
// Mẫu: docs/Actor/scrapeforgefacebook-search-posts.
const scrapeforgeFacebookSearch: ScanActor = {
  id: "scrapeforge/facebook-search-posts",
  label: "Facebook – tìm bài theo từ khóa/hashtag (scrapeforge)",
  platform: "FACEBOOK",
  maxPerKeyword: 500,
  defaultPerKeyword: 50,
  estUsdPerItem: 0.003, // chưa xác nhận giá — ước tính
  note:
    "Phương án dự phòng cho Facebook. Nhập từ khóa hoặc hashtag (có thể có dấu cách). " +
    "Chọn được Nổi bật / Mới nhất, KHÔNG lọc được theo ngày. Chi phí ước tính, xem lại trên Apify sau lần chạy đầu.",
  capabilities: { sortOrder: true },
  normalizeKeyword(k) {
    return k.trim().replace(/[{}$<>`]/g, "").replace(/\s+/g, " ").slice(0, 100);
  },
  buildInput(keyword, max, opts) {
    return {
      query: keyword,
      search_type: "posts",
      max_results: max,
      recent_posts: opts.searchType === "latest",
    };
  },
  parseItem(raw) {
    if (!isObj(raw)) return null;
    const url = str(raw.url);
    if (!url) return null;
    const text = str(raw.message ?? raw.message_rich);
    let likes = num(raw.reactions_count);
    if (likes === null && isObj(raw.reactions)) {
      likes = Object.values(raw.reactions).reduce<number>((a, v) => a + (num(v) ?? 0), 0);
    }
    const author = isObj(raw.author) ? raw.author : {};
    return {
      platform: "FACEBOOK",
      native_post_id: str(raw.post_id) || url,
      post_url: url,
      author_native_id: str(author.id) || null,
      published_at: unixToIso(raw.timestamp),
      text,
      lang_hint: null,
      hashtags: extractHashtags(text),
      like_count: likes,
      comment_count: num(raw.comments_count),
      share_count: num(raw.reshare_count),
      view_count: num(raw.video_view_count),
      save_count: null,
      is_ad: false,
    };
  },
};

// ---------------- Instagram: apify/instagram-hashtag-analytics-scraper ----------------
// 1 bản ghi/hashtag: postsCount + các nhóm hashtag liên quan (related/average/rare/...).
// topPosts / latestPosts chỉ có với tài khoản Apify trả phí. Mẫu: docs/Actor/LOAI - apify-instagram-... (đề xuất loại, xem docs/Actor/_DANH-GIA-ACTOR.md).
const IG_RELATED_KEYS = ["related", "relatedFrequent", "average", "relatedAverage", "rare", "relatedRare"];
const instagramHashtagAnalytics: ScanActor = {
  id: "apify/instagram-hashtag-analytics-scraper",
  label: "Instagram – thống kê hashtag + hashtag liên quan",
  platform: "INSTAGRAM",
  maxPerKeyword: 1,
  defaultPerKeyword: 1,
  perKeywordFixed:
    "Mỗi hashtag: 1 bản thống kê. Bài nổi bật / mới nhất chỉ có khi tài khoản Apify trả phí.",
  estUsdPerItem: 0.003, // chưa xác nhận giá — ước tính
  note:
    "Dùng để trinh sát: tổng số bài của hashtag và danh sách hashtag liên quan (xem ở tab Hashtag đi kèm). " +
    "Nhập hashtag không dấu cách.",
  normalizeKeyword: normalizeHashtag,
  buildInput(keyword) {
    return {
      hashtags: [keyword],
      includeTopPosts: true,
      includeLatestPosts: true,
    };
  },
  expandItem(raw) {
    if (!isObj(raw)) return [];
    const out: unknown[] = [];
    for (const k of ["topPosts", "latestPosts"]) if (Array.isArray(raw[k])) out.push(...(raw[k] as unknown[]));
    return out;
  },
  relatedHashtags(raw) {
    if (!isObj(raw)) return [];
    const out: RelatedHashtag[] = [];
    const self = cleanTag(raw.name ?? raw.id);
    if (self) {
      const c = compact(num(raw.postsCount));
      out.push({ tag: self, info: c ? c + " bài" : str(raw.posts) || null });
    }
    for (const key of IG_RELATED_KEYS) {
      const list = raw[key];
      if (!Array.isArray(list)) continue;
      for (const h of list) {
        if (!isObj(h)) continue;
        const tag = cleanTag(h.hash);
        const c = compact(parseAbbrev(h.info));
        if (tag) out.push({ tag, info: c ? c + " bài" : str(h.info) || null });
      }
    }
    return uniqRelated(out);
  },
  parseItem(raw) {
    // Bài con (topPosts/latestPosts) — cùng dạng output của apify/instagram-scraper
    if (!isObj(raw)) return null;
    const short = str(raw.shortCode ?? raw.shortcode ?? raw.code);
    const url = str(raw.url) || (short ? `https://www.instagram.com/p/${short}/` : "");
    if (!url) return null;
    const text = str(raw.caption ?? raw.text);
    const tags = new Set(extractHashtags(text));
    if (Array.isArray(raw.hashtags)) for (const h of raw.hashtags) if (cleanTag(h)) tags.add(cleanTag(h));
    return {
      platform: "INSTAGRAM",
      native_post_id: str(raw.id) || short || url,
      post_url: url,
      author_native_id: str(raw.ownerId ?? raw.ownerUsername) || null,
      published_at: toIso(raw.timestamp) ?? unixToIso(raw.taken_at_timestamp),
      text,
      lang_hint: null,
      hashtags: Array.from(tags),
      like_count: num(raw.likesCount),
      comment_count: num(raw.commentsCount),
      share_count: null,
      view_count: num(raw.videoViewCount ?? raw.videoPlayCount),
      save_count: null,
      is_ad: raw.isSponsored === true,
    };
  },
};

export const SCAN_ACTORS: ScanActor[] = [
  // TikTok
  tiktokHashtag,
  tiktokScraper,
  apiNinjaTiktokHashtag,
  parseforgeTiktokAnalytics,
  // Facebook
  facebookPostsSearch,
  scrapeforgeFacebookSearch,
  // Instagram
  instagramHashtagAnalytics,
];

export function getScanActor(id: string): ScanActor | null {
  return SCAN_ACTORS.find((a) => a.id === id) ?? null;
}

/** Trạng thái kết thúc của một lần chạy Apify */
export const TERMINAL_STATUSES = ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"];

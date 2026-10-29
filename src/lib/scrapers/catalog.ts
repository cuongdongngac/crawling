// ==========================================================
// Danh mục actor Apify + adapter dùng chung (bản chuẩn, TypeScript)
// ----------------------------------------------------------
// Mỗi actor khai báo:
//   - buildInput(keyword, max, options): payload gửi lên Apify cho MỘT từ khóa
//   - parseItem(raw): đọc 1 item output -> ScannedPost (null = bỏ qua)
// Trường input/output lấy theo file mẫu chạy thật (docs/Actor/*, 29/10/2026).
//
// Dùng cho: màn hình Quét thử (không ghi DB). Worker quét chính thức sẽ
// chuyển sang dùng module này ở bước gộp adapter.
// ==========================================================

export type ScanPlatform = "TIKTOK" | "FACEBOOK";

export interface ScanOptions {
  /** Facebook: "top" (mặc định) hoặc "latest" (bài mới nhất) */
  searchType?: "top" | "latest";
  /** Facebook: lọc theo ngày đăng, dạng YYYY-MM-DD (UTC) */
  startDate?: string;
  endDate?: string;
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
  note: string;
  normalizeKeyword(k: string): string;
  buildInput(keyword: string, max: number, opts: ScanOptions): Record<string, unknown>;
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

// ---------------- TikTok: clockworks/tiktok-hashtag-scraper ----------------
const tiktokHashtag: ScanActor = {
  id: "clockworks/tiktok-hashtag-scraper",
  label: "TikTok – quét theo hashtag",
  platform: "TIKTOK",
  maxPerKeyword: 800, // TikTok chỉ cho lấy khoảng 800 bài mỗi hashtag
  defaultPerKeyword: 50,
  estUsdPerItem: 0.005,
  note: "Nhập hashtag không dấu cách (ví dụ: vapegiare). Dấu # có hay không đều được.",
  normalizeKeyword(k) {
    return k.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
  },
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
  parseItem(raw) {
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
  },
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

export const SCAN_ACTORS: ScanActor[] = [tiktokHashtag, facebookPostsSearch];

export function getScanActor(id: string): ScanActor | null {
  return SCAN_ACTORS.find((a) => a.id === id) ?? null;
}

/** Trạng thái kết thúc của một lần chạy Apify */
export const TERMINAL_STATUSES = ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"];

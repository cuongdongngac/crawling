"use server";

/**
 * Server Actions dùng cho card TEST NHANH ADAPTER CORE (giao diện Scraping Studio)
 * KHÔNG GHI DB, KHÔNG LIÊN QUAN TỚI collection_runs, posts... gì cả.
 * Chỉ test 2 thứ:
 *   A) testBuildInput: adapter.buildInput() => in payload gửi lên Apify
 *   B) testRunApify:  POST actor run thật -> poll -> tải dataset items -> parseOneItem ra NormalizedPost
 */

import { createClient } from "@/utils/supabase/server";
import { createHash } from "node:crypto";

// ========================= Adapter ngắn gọn (copy từ test-adapter-core.js) =========================
type Cfg = {
  default_config: Record<string, any>;
  max_items_runtime?: number;
  hashtags: { hashtag_text: string }[];
};
type BuildOut = { input: Record<string, any>; warnings: string[] };
type Parsed = {
  normalized: null | {
    post_id: string;
    post_url: string;
    platform: string;
    native_post_id: string;
    author_hash: string;
    author_display?: string | null;
    published_at?: string | null;
    metrics: Record<string, number | null>;
    raw_text?: string | null;
  };
  caption_hashtags: string[];
  discovery_order: number;
};
type Adapter = {
  validate?: (c: Cfg) => string[];
  buildInput: (c: Cfg) => BuildOut;
  parseOne: (raw: any, idx: number) => Parsed;
};

const sha256hex = (s: string) => createHash("sha256").update(String(s || ""), "utf8").digest("hex");
const postId = (u: string) => sha256hex(String(u || "").trim());
const authorHash = (p: string, n: string) => sha256hex(String(p || "").toUpperCase() + ":" + String(n || "").trim());
const safeNum = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
};
const extractTags = (text: string) => {
  const out: string[] = [];
  const re = /#([a-z0-9_À-ỹ-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ""))) !== null) out.push(m[0].toLowerCase());
  return Array.from(new Set(out));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const adapters: Record<string, Adapter> = {};

// TikTok (OLD: clockwork/tiktok-scraper - actor đa năng, dùng hashtag là OK)
adapters["clockwork/tiktok-scraper"] = {
  validate: (c) => (c.hashtags?.length ? [] : ["[warn] TikTok cần ít nhất 1 hashtag."]),
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (c.hashtags || []).map((h) => h.hashtag_text),
        maxItems,
        shouldDownloadVideos: d.shouldDownloadVideos ?? false,
        shouldDownloadCovers: d.shouldDownloadCovers ?? false,
        enableCoversOutput: d.enableCoversOutput ?? false,
        enableWatermarkVideo: d.enableWatermarkVideo ?? false,
        maxConcurrency: d.maxConcurrency ?? 5,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings: [],
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id))
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`;
    const authorNative = String(authorId);
    const caption = String(raw.desc || raw.text || "");
    const captionTags = extractTags(caption);
    if (Array.isArray(raw.hashtags)) {
      for (const tagObj of raw.hashtags) {
        const name = String(tagObj?.name ?? tagObj ?? "");
        if (!name) continue;
        const norm = ("#" + name.trim().toLowerCase()).replace(/^##+/, "#");
        if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
      }
    }
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_hash: authorHash("TIKTOK", authorNative),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// ==================== TikTok Hashtag (NEW: clockworks/tiktok-hashtag-scraper) ====================
// Actor CHUYÊN dùng cho hashtag search (xác định qua Apify Console Run ID BIce6jdJ1NnWRt9hk).
// Output gần giống clockwork/tiktok-scraper, có thêm field hay ho: searchHashtag.views (tổng view hashtag).
adapters["clockworks/tiktok-hashtag-scraper"] = {
  validate: (c) => (c.hashtags?.length ? [] : ["[warn] TikTok Hashtag Scraper cần ít nhất 1 hashtag."]),
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (c.hashtags || []).map((h) => String(h.hashtag_text).replace(/^#+/, "")),
        maxItems,
        shouldDownloadVideos: d.shouldDownloadVideos ?? false,
        shouldDownloadCovers: d.shouldDownloadCovers ?? false,
        enableCoversOutput: d.enableCoversOutput ?? false,
        enableWatermarkVideo: d.enableWatermarkVideo ?? false,
        maxConcurrency: d.maxConcurrency ?? 5,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings: [],
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id))
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`;
    const caption = String(raw.text ?? raw.desc ?? "");
    const captionTags = extractTags(caption);
    if (Array.isArray(raw.hashtags)) {
      for (const tagObj of raw.hashtags) {
        const name = String(tagObj?.name ?? tagObj ?? "");
        if (!name) continue;
        const norm = ("#" + name.trim().toLowerCase()).replace(/^##+/, "#");
        if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
      }
    }
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_hash: authorHash("TIKTOK", String(authorId)),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// Facebook Page
adapters["apify/facebook-pages-scraper"] = {
  // (Không dùng hàm validate nữa — gộp lỗi vào buildInput warnings 1 lần để KHÔNG BỊ LẶP 2 cảnh báo giống nhau)
  buildInput: (c) => {
    const d = c.default_config || {};
    const startUrls = d.startUrls || d.pageUrls || [];
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchWords || []), ...userKW]));
    const warnings: string[] = [];
    if (startUrls.length === 0) {
      warnings.push(
        "[info] Không cấu hình startUrls[] → Actor sẽ tìm kiếm TOÀN BỘ FACEBOOK theo searchWords (không giới hạn page).",
        "[info] Tìm kiếm toàn mạng thường ít kết quả hơn & chậm hơn so với trỏ thẳng page URLs.",
        "[tip] Sau này có page cụ thể cần theo dõi: Vào Công cụ Cào → Edit Facebook actor → điền startUrls[] JSON trong default_config."
      );
    }
    return {
      input: {
        startUrls,
        resultsLimit: maxItems,
        maxComments: d.maxComments ?? 0,
        searchWords: mergedSearch,
        onlyPostsNewerThan: d.onlyPostsNewerThan ?? null,
        addViewResults: d.addViewResults ?? true,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object" || !raw.url)
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.text || "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const pageNative = String(raw.pageId ?? raw.pageName ?? raw.url);
    const url = String(raw.url);
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_PAGE",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.url),
        author_hash: authorHash("FACEBOOK_PAGE", pageNative),
        author_display: raw.pageName ?? null,
        published_at: raw.time ? new Date(raw.time).toISOString() : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments),
          share_count: safeNum(raw.shares),
          view_count: safeNum(raw.views ?? raw.postViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG ----------------
// Flow đúng mục đích: hashtag/từ khóa → tìm kiếm toàn FB → trả post URLs
adapters["alexey/facebook-search-scraper"] = {
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...userKW]));
    const warnings: string[] = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    return {
      input: {
        queries,
        resultsLimit: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const authorNative = String(raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? url);
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: authorHash("FACEBOOK_SEARCH", authorNative),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt ? new Date(raw.time || raw.timestamp || raw.createdAt).toISOString() : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG (OFFICIAL Apify maintained) ----------------
// Actor do chính Apify team phát triển → ít bị under maintenance hơn community actor.
// Chia sẻ adapter code giống alexey/facebook-search-scraper (queries[] → toàn mạng → post URLs).
adapters["apify/facebook-search-scraper"] = {
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...(d.searchTerms || []), ...(d.searchWords || []), ...userKW]));
    const warnings: string[] = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH (official) chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    return {
      input: {
        queries,
        resultsLimit: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? raw.link ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? raw.description ?? "");
    let likes = safeNum(raw.likes ?? raw.likesCount);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const authorNative = String(raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? url);
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: authorHash("FACEBOOK_SEARCH", authorNative),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt || raw.date
          ? new Date(raw.time || raw.timestamp || raw.createdAt || raw.date).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentsCount ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.sharesCount ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook HASHTAG SCRAPER (user đề xuất) 💯 CHUẨN NHẤT ----------------
// Flow đúng MỤC ĐÍCH TA TỪ ĐẦU: hashtag → Facebook tìm bất cứ post nào có hashtag đó
//   → trả post URLs + likesCount/sharesCount/commentsCount (fields chuẩn user gửi)
adapters["apify/facebook-hashtag-scraper"] = {
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.maxPostCount ?? d.resultsLimit ?? 50, 1), 5000);
    const userTags = (c.hashtags || []).map((h) => h.hashtag_text);
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    const warnings: string[] = [];
    if (hashtags.length === 0) {
      warnings.push("[warn] FACEBOOK_HASHTAG chưa có hashtag nào => kết quả sẽ rỗng.");
    }
    return {
      input: {
        hashtags,
        maxPostCount: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.postUrl ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const rawUser = raw.user || raw.owner || raw.profile || {};
    const text = String(raw.text ?? raw.message ?? raw.description ?? "");
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? url),
        author_hash: authorHash(
          "FACEBOOK_HASHTAG",
          String(rawUser.id ?? raw.ownerId ?? raw.profileId ?? url)
        ),
        author_display: rawUser.name ?? rawUser.displayName ?? null,
        published_at: raw.date || raw.time || raw.timestamp || raw.createdAt
          ? new Date(raw.date || raw.time || raw.timestamp || raw.createdAt).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(raw.likesCount ?? raw.likes ?? raw.reactionCount),
          comment_count: safeNum(raw.commentsCount ?? raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.sharesCount ?? raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// YouTube
adapters["streamer/youtube-scraper"] = {
  validate: () => [],
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxVideos = Math.min(Math.max(c.max_items_runtime ?? d.maxVideos ?? 20, 1), 500);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchTerms || []), ...userKW]));
    const videoUrls = d.videoUrls || [];
    const channelUrls = d.channelUrls || [];
    const warnings = mergedSearch.length || videoUrls.length || channelUrls.length
      ? []
      : ["[warn] YouTube chưa có searchTerms/videoUrls => có thể rỗng."];
    return {
      input: {
        searchTerms: mergedSearch,
        videoUrls,
        channelUrls,
        maxVideos,
        maxComments: d.maxComments ?? 200,
        sortVideosBy: d.sortVideosBy ?? "NEWEST",
        sortCommentsBy: d.sortCommentsBy ?? "NEWEST_FIRST",
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const isComment = typeof raw.videoId === "string" && typeof raw.authorName === "string";
    if (isComment) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    if (!raw.id) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const title = String(raw.title || "");
    const description = String(raw.text ?? raw.description ?? "");
    const raw_text = [title, description].filter(Boolean).join("\n\n");
    const captionTags = extractTags(raw_text);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    for (const t of tags) {
      const norm = ("#" + String(t).trim().toLowerCase()).replace(/^##+/, "#");
      if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
    }
    const channelNative = (String(raw.channelUrl || "").split("/").filter(Boolean).pop() || String(raw.channelName) || String(raw.id));
    const post_url = String(raw.url ?? `https://www.youtube.com/watch?v=${raw.id}`);
    return {
      normalized: {
        post_id: postId(post_url),
        post_url,
        platform: "YOUTUBE",
        native_post_id: String(raw.id),
        author_hash: authorHash("YOUTUBE", channelNative),
        author_display: String(raw.channelName ?? channelNative),
        published_at: raw.publishedAt ? new Date(String(raw.publishedAt)).toISOString() : null,
        raw_text,
        metrics: {
          view_count: safeNum(raw.viewCount),
          like_count: safeNum(raw.likeCount),
          comment_count: safeNum(raw.commentCount),
          share_count: null,
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// ========================= Helpers Apify call (server-side, không bị CORS) =========================
const APIFY_BASE = "https://api.apify.com";
async function apifyRequest(token: string, method: string, rel: string, body?: any) {
  const url = String(rel || "").startsWith("http") ? String(rel) : APIFY_BASE + String(rel || "");
  const headers: Record<string, string> = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };
  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    const msg = typeof json === "object" && json ? JSON.stringify(json) : String(json || text);
    throw new Error("Apify HTTP " + res.status + " " + method + " " + rel + ": " + msg);
  }
  // Apify v2 API thường trả về dạng { data: {...} }. Auto unwrap envelope nhất quán.
  if (json && typeof json === "object" && "data" in json && json.data !== null && json.data !== undefined) {
    // Trường hợp đặc biệt: dataset /v2/datasets/:id/items trả về data = mảng items
    return json.data;
  }
  return json;
}

// ========================= Public Server Actions =========================

export type BuildInputResult = {
  ok: boolean;
  error?: string;
  actor_id: string;
  platform?: string;
  default_config: Record<string, any>;
  input_payload: Record<string, any>;
  warnings: string[];
};

export async function testAdapterBuildInput(form: FormData): Promise<BuildInputResult> {
  try {
    const actorId = String(form.get("actor_id") || "").trim();
    const hashtagText = String(form.get("hashtag_text") || "").trim();
    const maxItems = Number(form.get("max_items") || 1) || 1;
    if (!actorId) return { ok: false, error: "Vui lòng chọn Actor.", actor_id: actorId, default_config: {}, input_payload: {}, warnings: [] };
    if (!hashtagText) return { ok: false, error: "Vui lòng nhập 1 hashtag (không dấu # ở đầu cũng được).", actor_id: actorId, default_config: {}, input_payload: {}, warnings: [] };

    const supabase = await createClient();
    let platform: string | undefined;
    let default_config: Record<string, any> = {};
    try {
      const { data, error } = await supabase
        .from("apify_actors")
        .select("actor_id, platform, default_config")
        .eq("actor_id", actorId)
        .maybeSingle();
      if (!error && data) {
        platform = data.platform as string;
        default_config = (data.default_config as any) || {};
      }
    } catch {}

    if (Object.keys(default_config).length === 0) {
      // Dùng mẫu nếu DB chưa có
      if (actorId === "clockwork/tiktok-scraper") {
        default_config = { maxItems: 100, proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "clockworks/tiktok-hashtag-scraper") {
        default_config = { maxItems: 100, shouldDownloadVideos: false, shouldDownloadCovers: false, maxConcurrency: 5, proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "apify/facebook-pages-scraper") {
        default_config = { resultsLimit: 50, maxComments: 0, startUrls: [], searchWords: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "alexey/facebook-search-scraper") {
        default_config = { resultsLimit: 50, queries: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "apify/facebook-search-scraper") {
        default_config = { resultsLimit: 50, queries: [], searchTerms: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "apify/facebook-hashtag-scraper") {
        default_config = { maxPostCount: 50, hashtags: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else {
        default_config = { maxVideos: 20, maxComments: 200, sortVideosBy: "NEWEST", searchTerms: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      }
    }

    const adapter = adapters[actorId];
    if (!adapter) return { ok: false, error: "Không có adapter cho actor " + actorId + ". (chỉ hỗ trợ: TikTok / FB Page / FB Search / FB Hashtag / YouTube)", actor_id: actorId, default_config, input_payload: {}, warnings: [] };

    const hashtags: { hashtag_text: string }[] = [{ hashtag_text: hashtagText.replace(/^#+/, "") }];
    const cfg: Cfg = { default_config, max_items_runtime: maxItems, hashtags };
    const built = adapter.buildInput(cfg);
    const warnings = Array.from(new Set(built.warnings || []));
    return { ok: true, actor_id: actorId, platform, default_config, input_payload: built.input, warnings };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), actor_id: String(form.get("actor_id") || ""), default_config: {}, input_payload: {}, warnings: [] };
  }
}

export type RunApifyResult = BuildInputResult & {
  apify_run_id?: string;
  apify_dataset_id?: string;
  final_status?: string;
  raw_items_count?: number;
  parsed_posts?: Parsed[];
  console_apify_link?: string;
};

export async function testAdapterRunApify(form: FormData): Promise<RunApifyResult> {
  const build = await testAdapterBuildInput(form);
  if (!build.ok) return build as RunApifyResult;

  const token = String(form.get("api_key") || "").trim();
  if (token.length < 8) return { ...build, ok: false, error: "API Key Apify quá ngắn hoặc trống (dạng apify_api_...)." };

  try {
    const runResp = await apifyRequest(
      token,
      "POST",
      "/v2/acts/" + encodeURIComponent(build.actor_id) + "/runs?timeout=60",
      build.input_payload,
    );
    const runId: string = runResp.id;
    const datasetId: string | undefined = runResp.defaultDatasetId || (runResp.data && runResp.data.defaultDatasetId);
    const consoleLink = "https://console.apify.com/organization/~/actors/runs/" + runId;

    // Poll 30s, 3s interval
    let finalStatus = String(runResp.status || "UNKNOWN");
    let waited = 0;
    while (!["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(finalStatus) && waited < 30000) {
      await sleep(3000);
      waited += 3000;
      try {
        const s = await apifyRequest(token, "GET", "/v2/actor-runs/" + runId);
        finalStatus = String(s.status || "UNKNOWN");
      } catch { /* ignore */ }
    }

    let rawItems: any[] = [];
    const parsedPosts: Parsed[] = [];
    if (datasetId && ["SUCCEEDED", "PARTIAL_SUCCESS"].includes(finalStatus)) {
      try {
        rawItems = await apifyRequest(token, "GET", "/v2/datasets/" + datasetId + "/items?limit=5");
        if (!Array.isArray(rawItems)) rawItems = [];
      } catch {}
      const adapter = adapters[build.actor_id];
      if (adapter) {
        for (let i = 0; i < Math.min(rawItems.length, 5); i++) {
          parsedPosts.push(adapter.parseOne(rawItems[i], i));
        }
      }
    }

    return {
      ...build,
      apify_run_id: runId,
      apify_dataset_id: datasetId,
      final_status: finalStatus,
      raw_items_count: rawItems.length,
      parsed_posts: parsedPosts,
      console_apify_link: consoleLink,
    };
  } catch (err: any) {
    return { ...build, ok: false, error: "Lỗi gọi Apify: " + (err?.message || String(err)) };
  }
}

#!/usr/bin/env node
/*
 * =============================================================
 *  VPHA M&E SCRAPER WORKER (độc lập 1 file - PM2 friendly)
 * =============================================================
 *  Chạy độc lập, không phụ thuộc Next.js lifecycle.
 *  Cách chạy:
 *   - 1 lần test:     node scripts/worker.js --once
 *   - chạy dưới PM2:   pm2 start scripts/worker.js --name vpha-scrape-worker
 * =============================================================
 */

"use strict";

const path = require("node:path");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[worker] Thiếu ENV NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Thoát.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const APIFY_BASE = "https://api.apify.com";

// ==========================================================
// Helpers
// ==========================================================
function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}
function postId(url) {
  return sha256hex(String(url || "").trim());
}
function authorHash(platform, nativeId) {
  return sha256hex(String(platform || "").toUpperCase() + ":" + String(nativeId || "").trim());
}
// Alias: các adapter Facebook/YouTube bên dưới gọi hashPostId/hashAuthor
const hashPostId = postId;
const hashAuthor = authorHash;
// Pipeline dùng chung: lọc ngôn ngữ + dedupe (giống CLI test-adapter-core.js)
const { runPostPipeline } = require("./lib/post-pipeline.cjs");
// Ngôn ngữ giữ lại mặc định. "other" = caption chỉ toàn hashtag không dấu (vd "#vape #pod"),
// giữ lại để không mất bài Việt gõ không dấu. Ghi đè bằng apify_actors.default_config.allow_langs.
const DEFAULT_ALLOW_LANGS = ["vi", "other"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function safeNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function extractTags(text) {
  const out = [];
  const re = /#([a-z0-9_À-ỹ-]+)/gi;
  let m;
  while ((m = re.exec(String(text || ""))) !== null) out.push(m[0].toLowerCase());
  return Array.from(new Set(out));
}

// ==========================================================
// 3 Adapters (viết JS thuần gọn)
// ==========================================================
const adapters = {};

// ---------------- TikTok ----------------
adapters["clockwork/tiktok-scraper"] = {
  validate(cfg) {
    return cfg.hashtags && cfg.hashtags.length ? [] : ["TikTok cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    const input = {
      hashtags: (cfg.hashtags || []).map((h) => h.hashtag_text),
      maxItems,
      shouldDownloadVideos: d.shouldDownloadVideos ?? false,
      shouldDownloadCovers: d.shouldDownloadCovers ?? false,
      enableCoversOutput: d.enableCoversOutput ?? false,
      enableWatermarkVideo: d.enableWatermarkVideo ?? false,
      maxConcurrency: d.maxConcurrency ?? 5,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings: [] };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    if (!raw.webVideoUrl && !raw.id) return fallback;
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return fallback;
    const caption = String(raw.desc ?? "");
    return {
      normalized: {
        post_url: raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_native_id: String(authorId),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        author_avatar: raw.authorMeta?.avatar ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        raw_payload: raw,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: extractTags(caption),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook Page ----------------
adapters["apify/facebook-pages-scraper"] = {
  // (không dùng hàm validate nữa — gộp cảnh báo vào buildInput 1 lần không lặp)
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const startUrls = d.startUrls || d.pageUrls || [];
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchWords || []), ...userKW]));
    const warnings = [];
    if (startUrls.length === 0) {
      warnings.push(
        "[info] Không cấu hình startUrls[] → Actor sẽ tìm kiếm TOÀN BỘ FACEBOOK theo searchWords (không giới hạn page).",
        "[tip] Tìm kiếm toàn mạng thường ít kết quả hơn & chậm hơn. Sau này có page cụ thể → Vào Công cụ Cào → Edit FB actor điền startUrls[] JSON."
      );
    }
    const input = {
      startUrls,
      resultsLimit: maxItems,
      maxComments: d.maxComments ?? 0,
      searchWords: mergedSearch,
      onlyPostsNewerThan: d.onlyPostsNewerThan ?? null,
      addViewResults: d.addViewResults ?? true,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object" || !raw.url) return fallback;
    const text = String(raw.text ?? "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    return {
      normalized: {
        post_url: String(raw.url),
        platform: "FACEBOOK_PAGE",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.url),
        author_native_id: String(raw.pageId ?? raw.pageName ?? raw.url),
        author_display: raw.pageName ?? null,
        author_avatar: null,
        published_at: raw.time ? new Date(raw.time).toISOString() : null,
        raw_text: text,
        raw_payload: raw,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments),
          share_count: safeNum(raw.shares),
          view_count: safeNum(raw.views ?? raw.postViews),
        },
      },
      caption_hashtags: extractTags(text),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG ----------------
// Flow đúng mục đích: hashtag/từ khóa → tìm kiếm toàn FB → trả post URLs
adapters["alexey/facebook-search-scraper"] = {
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...userKW]));
    const warnings = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    const input = {
      queries,
      resultsLimit: maxItems,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? "");
    if (!url) return fallback;
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
        post_id: hashPostId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: hashAuthor("FACEBOOK_SEARCH", authorNative),
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
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG (OFFICIAL Apify maintained) ----------------
// Actor chính chủ Apify team duy trì → ít bị under maintenance hơn community actor
adapters["apify/facebook-search-scraper"] = {
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...(d.searchTerms || []), ...(d.searchWords || []), ...userKW]));
    const warnings = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH (official) chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    const input = {
      queries,
      resultsLimit: maxItems,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? raw.link ?? "");
    if (!url) return fallback;
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
        post_id: hashPostId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: hashAuthor("FACEBOOK_SEARCH", authorNative),
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
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook HASHTAG SCRAPER (user đề xuất) 💯 CHUẨN NHẤT ----------------
// Flow đúng mục đích ta từ đầu: hashtag -> tìm mọi post Facebook chứa hashtag đó -> trả URLs
adapters["apify/facebook-hashtag-scraper"] = {
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxPostCount ?? d.resultsLimit ?? 50, 1), 5000);
    const userTags = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    const warnings = [];
    if (hashtags.length === 0) {
      warnings.push("[warn] FACEBOOK_HASHTAG chưa có hashtag nào => kết quả sẽ rỗng.");
    }
    const input = {
      hashtags,
      maxPostCount: maxItems,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const url = String(raw.url ?? raw.postUrl ?? "");
    if (!url) return fallback;
    const rawUser = raw.user || raw.owner || raw.profile || {};
    const text = String(raw.text ?? raw.message ?? raw.description ?? "");
    return {
      normalized: {
        post_id: hashPostId(url),
        post_url: url,
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? url),
        author_hash: hashAuthor(
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
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- YouTube ----------------
adapters["streamer/youtube-scraper"] = {
  validate() { return []; },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxVideos = Math.min(Math.max(cfg.max_items_runtime ?? d.maxVideos ?? 20, 1), 500);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchTerms || []), ...userKW]));
    const videoUrls = d.videoUrls || [];
    const channelUrls = d.channelUrls || [];
    const warnings = mergedSearch.length || videoUrls.length || channelUrls.length
      ? []
      : ["Youtube không có searchTerms hay videoUrls, kết quả có thể trống."];
    const input = {
      searchTerms: mergedSearch,
      videoUrls,
      channelUrls,
      maxVideos,
      maxComments: d.maxComments ?? 200,
      sortVideosBy: d.sortVideosBy ?? "NEWEST",
      sortCommentsBy: d.sortCommentsBy ?? "NEWEST_FIRST",
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const isCommentItem = typeof raw.videoId === "string" && typeof raw.authorName === "string";
    if (isCommentItem) return fallback;
    if (!raw.id) return fallback;
    const title = String(raw.title ?? "");
    const description = String(raw.text ?? raw.description ?? "");
    const raw_text = [title, description].filter(Boolean).join("\n\n");
    const captionTags = extractTags(raw_text);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    for (const t of tags) {
      const norm = ("#" + String(t).trim().toLowerCase()).replace(/^##+/, "#");
      if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
    }
    const channelNative = (String(raw.channelUrl || "").split("/").filter(Boolean).pop() || String(raw.channelName) || String(raw.id));
    return {
      normalized: {
        post_url: String(raw.url ?? `https://www.youtube.com/watch?v=${raw.id}`),
        platform: "YOUTUBE",
        native_post_id: String(raw.id),
        author_native_id: String(channelNative),
        author_display: String(raw.channelName ?? channelNative),
        author_avatar: null,
        published_at: raw.publishedAt ? new Date(String(raw.publishedAt)).toISOString() : null,
        raw_text,
        raw_payload: raw,
        metrics: {
          view_count: safeNum(raw.viewCount),
          like_count: safeNum(raw.likeCount),
          comment_count: safeNum(raw.commentCount),
          share_count: null,
        },
      },
      caption_hashtags: captionTags,
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

function getAdapter(actorId) {
  return adapters[String(actorId || "")] || null;
}

// ==========================================================
// Apify token & HTTP helpers
// ==========================================================
async function getSystemApifyToken() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "APIFY_API_TOKEN")
    .maybeSingle();
  if (error) {
    console.error("[worker] đọc APIFY_API_TOKEN lỗi:", error.message);
    return null;
  }
  const token = data?.setting_value;
  if (!token || String(token).length < 8) {
    console.warn("[worker] APIFY_API_TOKEN chưa được admin lưu vào /dashboard/settings. Bỏ qua tick.");
    return null;
  }
  return token;
}

async function apifyRequest(token, method, rel, body) {
  const url = String(rel || "").startsWith("http") ? String(rel) : APIFY_BASE + String(rel || "");
  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    const msg = (typeof json === "object" && json) ? JSON.stringify(json) : String(json || text);
    throw new Error("Apify HTTP " + res.status + " " + method + " " + rel + ": " + msg);
  }
  return json;
}

// ==========================================================
// Hashtag resolver
// ==========================================================
async function fetchHashtagsByText(textList) {
  if (!textList || !textList.length) return [];
  const { data, error } = await supabase
    .from("hashtags")
    .select("hashtag_id,hashtag_text")
    .in("hashtag_text", textList);
  if (error) {
    console.error("[worker] fetch hashtags lỗi:", error.message);
    return [];
  }
  return data || [];
}

// ==========================================================
// Ingest 1 run dataset vào 5 bảng
// ==========================================================
async function ingestRun(run, cfgRuntime, parsedItems) {
  let insertedPosts = 0;
  let insertedSnapshots = 0;
  let insertedFacts = 0;
  let insertedScanEvents = 0;
  let insertedDiscoveries = 0;

  const htTextToId = new Map();
  for (const h of cfgRuntime.hashtags || []) {
    htTextToId.set(String(h.hashtag_text || "").toLowerCase(), Number(h.hashtag_id));
  }

  for (const pitem of parsedItems || []) {
    if (!pitem || !pitem.normalized) continue;
    const n = pitem.normalized;
    if (!n.post_url) continue;
    const pid = postId(n.post_url);
    const ahash = authorHash(n.platform, n.author_native_id);
    const nowPubISO = n.published_at && !Number.isNaN(new Date(n.published_at).getTime())
      ? n.published_at
      : new Date().toISOString();

    // ----- posts -----
    const { error: selErr } = await supabase
      .from("posts")
      .select("post_id")
      .eq("post_id", pid)
      .maybeSingle();
    const exist = (selErr && selErr.code) ? null : null; // select above errors handled via count
    const { count: postCount, error: cntErr } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("post_id", pid);
    if (!cntErr && postCount === 0) {
      const { error: insErr } = await supabase.from("posts").insert({
        post_id: pid,
        platform: n.platform,
        post_url: n.post_url,
        author_hash: ahash,
        published_at: nowPubISO,
        raw_text: n.raw_text,
        raw_payload: n.raw_payload,
        is_flagged: false,
      });
      if (!insErr) {
        insertedPosts += 1;
        const { error: discErr } = await supabase.from("post_discoveries").insert({
          post_id: pid,
          run_id: run.run_id,
          researcher_code: run.researcher_code,
        });
        if (!discErr) insertedDiscoveries += 1;
      }
    }

    // ----- post_snapshots (luôn insert) -----
    const { error: snapErr } = await supabase.from("post_snapshots").insert({
      post_id: pid,
      run_id: run.run_id,
      view_count: n.metrics.view_count,
      like_count: n.metrics.like_count,
      comment_count: n.metrics.comment_count,
      share_count: n.metrics.share_count,
    });
    if (!snapErr) insertedSnapshots += 1;

    // ----- post_hashtag_facts (lần đầu post X hashtag X type) -----
    const factsMap = new Map();
    for (const hid of pitem.search_hashtag_ids || []) {
      const key = hid + "|SEARCH_HIT";
      if (!factsMap.has(key)) factsMap.set(key, { hashtag_id: hid, match_type: "SEARCH_HIT" });
    }
    for (const captionTag of pitem.caption_hashtags || []) {
      const hid = htTextToId.get(String(captionTag || "").toLowerCase());
      if (hid) {
        const key = hid + "|CAPTION";
        if (!factsMap.has(key)) factsMap.set(key, { hashtag_id: hid, match_type: "CAPTION" });
      }
    }
    if (factsMap.size > 0) {
      const rows = Array.from(factsMap.values()).map((r) => ({
        post_id: pid,
        hashtag_id: r.hashtag_id,
        match_type: r.match_type,
        first_seen_run_id: run.run_id,
      }));
      const { error: factErr } = await supabase.from("post_hashtag_facts").insert(rows);
      if (!factErr) insertedFacts += rows.length;
    }

    // ----- hashtag_scan_events (PK 4 trường) -----
    const scanMap = new Map();
    for (const hid of pitem.search_hashtag_ids || []) {
      const k = run.run_id + "|" + pid + "|" + hid + "|SEARCH_HIT";
      if (!scanMap.has(k)) scanMap.set(k, {
        run_id: run.run_id, post_id: pid, hashtag_id: hid, match_type: "SEARCH_HIT",
        discovery_order: pitem.discovery_order, researcher_code: run.researcher_code,
      });
    }
    for (const captionTag of pitem.caption_hashtags || []) {
      const hid = htTextToId.get(String(captionTag || "").toLowerCase());
      if (!hid) continue;
      const k = run.run_id + "|" + pid + "|" + hid + "|CAPTION";
      if (!scanMap.has(k)) scanMap.set(k, {
        run_id: run.run_id, post_id: pid, hashtag_id: hid, match_type: "CAPTION",
        discovery_order: pitem.discovery_order, researcher_code: run.researcher_code,
      });
    }
    if (scanMap.size > 0) {
      const rows = Array.from(scanMap.values());
      const { error: scanErr } = await supabase.from("hashtag_scan_events").insert(rows);
      if (!scanErr) insertedScanEvents += rows.length;
    }
  }

  return { insertedPosts, insertedSnapshots, insertedFacts, insertedScanEvents, insertedDiscoveries };
}

// ==========================================================
// Poll 1 RUNNING -> nếu done -> ingest
// ==========================================================
async function pollAndIngestOne(token, run) {
  if (!run.apify_run_id) return { done: false };
  try {
    const statusResp = await apifyRequest(token, "GET", "/v2/actor-runs/" + run.apify_run_id);
    const apifyStatus = String(statusResp.status || "UNKNOWN");
    const terminal = ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(apifyStatus);
    if (!terminal) return { done: false, apifyStatus };

    let counts = { insertedPosts: 0, insertedSnapshots: 0, insertedFacts: 0, insertedScanEvents: 0, insertedDiscoveries: 0 };
    let finalStatus = apifyStatus === "SUCCEEDED" ? "SUCCESS" : "FAILED";
    let errMsg = statusResp?.errorMessage || null;

    if (apifyStatus === "SUCCEEDED" || (run.apify_dataset_id && apifyStatus === "PARTIAL_SUCCESS")) {
      const adapter = getAdapter(run.actor_id);
      if (!adapter) {
        errMsg = "Không có adapter cho actor_id " + run.actor_id;
        finalStatus = "FAILED";
      } else {
        const qp = run.query_parameters || {};
        const hashtags = await fetchHashtagsByText(qp.hashtags || []);
        const defaultCfg = run.actor_default_config || {};
        const cfgRuntime = {
          run_id: run.run_id,
          researcher_code: run.researcher_code,
          platform: run.platform,
          actor_id: run.actor_id,
          hashtags,
          max_items_runtime: qp.maxItems,
          default_config: defaultCfg,
        };

        const datasetItems = [];
        if (run.apify_dataset_id) {
          let offset = 0;
          while (true) {
            const batch = await apifyRequest(
              token,
              "GET",
              "/v2/datasets/" + run.apify_dataset_id + "/items?offset=" + offset + "&limit=1000",
            );
            if (!Array.isArray(batch) || batch.length === 0) break;
            for (const it of batch) datasetItems.push(it);
            if (batch.length < 1000) break;
            offset += 1000;
            if (offset > 50000) break; // safeguard giai doan thu nghiem
          }
        }

        const parsed = datasetItems.map((it, i) => adapter.parseOne(it, i, cfgRuntime));
        const allowLangs = Array.isArray(defaultCfg.allow_langs) && defaultCfg.allow_langs.length
          ? defaultCfg.allow_langs
          : DEFAULT_ALLOW_LANGS;
        const { finalized, report } = runPostPipeline(parsed, { allowLangs });
        console.log(
          "[worker] run_id=" + run.run_id + " pipeline: raw=" + report.totalRaw +
          " null=" + report.skippedNullNormalized +
          " loại_ngôn_ngữ=" + report.langRemoved.length +
          " gộp_trùng=" + report.dedupeRemoved.reduce((a, d) => a + d.removedCount, 0) +
          " còn=" + report.finalCount + " phân_bố=" + JSON.stringify(report.langDistribution),
        );
        counts = await ingestRun(run, cfgRuntime, finalized);

        if (apifyStatus !== "SUCCEEDED") finalStatus = apifyStatus === "FAILED" ? "FAILED" : "PARTIAL_SUCCESS";
      }
    }

    const { error: runUpdErr } = await supabase
      .from("collection_runs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message: errMsg,
        items_count: counts.insertedPosts || 0,
      })
      .eq("run_id", run.run_id);
    if (runUpdErr) console.error("[worker] update run lỗi:", runUpdErr.message);

    console.log(
      "[worker] run_id=" + run.run_id + " HOÀN TẤT " + finalStatus +
      " posts=" + counts.insertedPosts +
      " snapshots=" + counts.insertedSnapshots +
      " facts=" + counts.insertedFacts +
      " scans=" + counts.insertedScanEvents +
      " disc=" + counts.insertedDiscoveries,
    );
    return { done: true };
  } catch (err) {
    console.error("[worker] run_id=" + run.run_id + " poll lỗi: " + (err.message || err));
    return { done: false };
  }
}

// ==========================================================
// Dispatch QUEUED / PLANNED -> gọi Apify -> update RUNNING
// ==========================================================
async function dispatchQueued(systemToken) {
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("collection_runs")
    .select(
      "run_id, researcher_code, platform, actor_id, status, priority, scheduled_at, query_parameters," +
      " apify_api_token_override, apify_actors!inner(default_config)",
    )
    .in("status", ["QUEUED", "PLANNED"])
    .or("scheduled_at.is.null,scheduled_at.lte." + nowIso)
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("run_id", { ascending: true })
    .limit(5);
  if (error) {
    console.error("[worker] lấy queue lỗi:", error.message);
    return;
  }
  for (const r of rows || []) {
    // Ưu tiên: dùng token override trên dòng kế hoạch test; nếu không có mới dùng system token
    const token = (r.apify_api_token_override && String(r.apify_api_token_override).length > 8)
      ? String(r.apify_api_token_override)
      : systemToken;
    if (!token) continue;
    try {
      const adapter = getAdapter(r.actor_id);
      if (!adapter) {
        console.warn("[worker] run_id=" + r.run_id + " bỏ qua, không có adapter " + r.actor_id);
        continue;
      }
      const qp = r.query_parameters || {};
      const hashtags = await fetchHashtagsByText(qp.hashtags || []);
      const defaultCfg = (r.apify_actors && r.apify_actors.default_config) || {};
      const cfgRuntime = {
        run_id: r.run_id,
        researcher_code: r.researcher_code,
        platform: r.platform,
        actor_id: r.actor_id,
        hashtags,
        max_items_runtime: qp.maxItems,
        default_config: defaultCfg,
      };
      const built = adapter.buildInput(cfgRuntime);
      const warnings = Array.from(new Set(built.warnings || []));

      const apifyResp = await apifyRequest(
        token,
        "POST",
        "/v2/acts/" + encodeURIComponent(r.actor_id) + "/runs?timeout=60",
        built.input,
      );
      const apifyRunId = apifyResp.id;
      const datasetId = apifyResp.defaultDatasetId || (apifyResp.data && apifyResp.data.defaultDatasetId) || null;
      if (!apifyRunId) throw new Error("Apify không trả về run_id");
      const { error: updErr } = await supabase
        .from("collection_runs")
        .update({
          status: "RUNNING",
          started_at: new Date().toISOString(),
          apify_run_id: apifyRunId,
          apify_dataset_id: datasetId,
          error_message: warnings.length ? warnings.join(" | ") : null,
        })
        .eq("run_id", r.run_id);
      if (updErr) throw updErr;
      console.log(
        "[worker] run_id=" + r.run_id + " DISPATCH actor=" + r.actor_id + " apify=" + apifyRunId,
      );
    } catch (err) {
      console.error("[worker] run_id=" + r.run_id + " dispatch lỗi: " + (err.message || err));
      await supabase
        .from("collection_runs")
        .update({
          status: "FAILED",
          completed_at: new Date().toISOString(),
          error_message: String(err.message || err).slice(0, 500),
        })
        .eq("run_id", r.run_id);
    }
  }
}

async function pollRunning(systemToken) {
  const { data, error } = await supabase
    .from("collection_runs")
    .select("run_id, researcher_code, platform, actor_id, apify_run_id, apify_dataset_id, query_parameters, apify_api_token_override, apify_actors(default_config)")
    .eq("status", "RUNNING")
    .not("apify_run_id", "is", null)
    .order("run_id", { ascending: true })
    .limit(20);
  if (error) {
    console.error("[worker] poll running lỗi:", error.message);
    return;
  }
  for (const r of data || []) {
    const token = (r.apify_api_token_override && String(r.apify_api_token_override).length > 8)
      ? String(r.apify_api_token_override)
      : systemToken;
    if (!token) continue;
    r.actor_default_config = (r.apify_actors && r.apify_actors.default_config) || {};
    await pollAndIngestOne(token, r);
  }
}

// ==========================================================
// MAIN
// ==========================================================
async function tick() {
  const systemToken = await getSystemApifyToken();
  // Test mode: system token chưa lưu vẫn được chạy (miễn là collection_runs dòng nào có apify_api_token_override)
  await pollRunning(systemToken);
  await dispatchQueued(systemToken);
}

const ONCE = process.env.RUN_ONCE === "1" || process.argv.includes("--once");

(async function main() {
  console.log("[worker] Khởi động. ONCE=" + ONCE);
  if (ONCE) {
    await tick();
    console.log("[worker] Chạy 1 lần xong. Thoát.");
    process.exit(0);
  }
  await tick();
  setInterval(tick, 15 * 1000);
})().catch((e) => {
  console.error("[worker] Lỗi main loop nghiêm trọng:", e);
  process.exit(1);
});

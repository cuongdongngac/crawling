#!/usr/bin/env node
/*
 * =============================================================
 *  test-adapter-core.js
 * =============================================================
 *  Test nhanh HÀM CỐT LÕI (không liên quan collection_runs / posts DB):
 *   1. Đọc apify_actors.default_config JSON từ Supabase (hoặc inline sample)
 *   2. Dùng adapter (3 loại TikTok / Facebook Page / Youtube) buildInput()
 *      => KIỂM TRA cấu hình gửi lên Apify đã ĐÚNG CHUẨN chưa
 *   3. POST lên Apify thật (apify_api_...) => start run
 *   4. Poll đến khi SUCCEEDED / FAILED => lấy dataset items (1-2 item thôi
 *   5. parseOneItem() => NormalizedPost => in MÀN HÌNH (không ghi DB)
 *
 *  Lưu ý: KHÔNG INSERT BẢNG NÀO CẢ. Hoàn toàn độc lập collection.
 *
 *  Cách chạy (chọn 1 trong 3 actor test):
 *  cd d:\vpha-social-listening-mne\web
 *  $env:APIFY_TOKEN="apify_api_XXXXXXXXXXXXXXXX"
 *
 *  node scripts/test-adapter-core.js --tiktok          # hashtag #pod 1 item
 *  node scripts/test-adapter-core.js --facebook        # cần startUrls trong default_config
 *  node scripts/test-adapter-core.js --youtube         # searchTerms hashtag 1 video
 *
 *  Hoặc: chỉ test BUILD INPUT (KHÔNG GỌI API Apify, tiết kiệm cost):
 *  node scripts/test-adapter-core.js --tiktok --dry-run
 *
 * =============================================================
 */

"use strict";

const path = require("node:path");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

// ---------------- Args ----------------
const ARGV_RAW = process.argv.slice(2);
const argv = ARGV_RAW.join(" ");
const DRY_RUN = argv.includes("--dry-run");
const SKIP_LANG_FILTER = argv.includes("--keep-all-langs") || argv.includes("--no-lang-filter");
const SKIP_DEDUPE = argv.includes("--no-dedupe");
// --langs vi,en  hoặc  --langs vi
let ALLOW_LANGS = ["vi"];
const m = ARGV_RAW.findIndex((x) => x === "--langs");
if (m >= 0 && ARGV_RAW[m + 1]) {
  ALLOW_LANGS = String(ARGV_RAW[m + 1]).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}
// --max-items N
let ACTOR_ID = null;
let PLATFORM = null;
let DEFAULT_TEST_HASHTAGS = [];
let DEFAULT_MAX_ITEMS = 1;
const maxIdx = ARGV_RAW.findIndex((x) => x === "--max-items");
if (maxIdx >= 0 && ARGV_RAW[maxIdx + 1] && isFinite(Number(ARGV_RAW[maxIdx + 1]))) {
  DEFAULT_MAX_ITEMS = Number(ARGV_RAW[maxIdx + 1]);
}
if (argv.includes("--tiktok-hashtag") || argv.includes("--tiktok-new")) {
  // 💯 Actor CHUYÊN dùng cho hashtag search trên TikTok (user vừa dùng trên Apify Console)
  ACTOR_ID = "clockworks/tiktok-hashtag-scraper";
  PLATFORM = "TIKTOK";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--tiktok")) {
  ACTOR_ID = "clockwork/tiktok-scraper";
  PLATFORM = "TIKTOK";
  DEFAULT_TEST_HASHTAGS = ["pod"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--facebook-hashtag")) {
  ACTOR_ID = "apify/facebook-hashtag-scraper";
  PLATFORM = "FACEBOOK_HASHTAG";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--facebook")) {
  ACTOR_ID = "apify/facebook-pages-scraper";
  PLATFORM = "FACEBOOK_PAGE";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--youtube")) {
  ACTOR_ID = "streamer/youtube-scraper";
  PLATFORM = "YOUTUBE";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else {
  console.error(
    "LỖI: Chọn 1 trong các loại:\n" +
      "  --tiktok-hashtag  💯 Test clockworks/tiktok-hashtag-scraper (CHUYÊN hashtag, mới, user dùng gần đây)\n" +
      "  --tiktok          Test clockwork/tiktok-scraper (OLD, đa năng)\n" +
      "  --facebook-hashtag💯 Test apify/facebook-hashtag-scraper (chuẩn hashtag FB)\n" +
      "  --facebook        Test apify/facebook-pages-scraper (cần startUrls trong default_config)\n" +
      "  --youtube         Test streamer/youtube-scraper\n" +
      "\nThêm --dry-run nếu chỉ test build input (không gọi API Apify, tiết kiệm cost).",
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_OK = SUPABASE_URL && SUPABASE_SERVICE_KEY;
const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || process.env.APIFY_PERSONAL_TOKEN;

if (!DRY_RUN && (!APIFY_TOKEN || String(APIFY_TOKEN).length < 8)) {
  console.error(
    "LỖI: Thiếu APIFY_TOKEN (hoặc APIFY_API_TOKEN) trong ENV.\n" +
      "PowerShell cmd: $env:APIFY_TOKEN=\"apify_api_XXXXXXXXXXXX\"\n" +
      "Hoặc chạy --dry-run để test build cấu hình thôi (không gọi Apify).",
  );
  process.exit(1);
}

const supabase = SUPABASE_OK
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const APIFY_BASE = "https://api.apify.com";

// ---------------- Helpers ----------------
function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}
function postId(url) {
  return sha256hex(String(url || "").trim());
}
function authorHash(platform, nativeId) {
  return sha256hex(String(platform || "").toUpperCase() + ":" + String(nativeId || "").trim());
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
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function sep(title) {
  console.log("\n" + "=".repeat(70));
  console.log("  " + title);
  console.log("=".repeat(70));
}
function prettyJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

// ---------------- Language detection HEURISTIC (zero dep) ----------------
const VI_STOP = new Set(["và","hoặc","nhưng","mà","vì","của","trong","từ","trên","dưới","với","bằng","là","đã","sẽ","đang","không","cũng","chỉ","rất","thì","nên","một","nhiều","các","đây","đó","khi","nếu","tôi","bạn","anh","em","chúng","ta","họ","này","kia","được","ở","ngay","luôn","quá","thôi","cho","như","vào","ra","lại","hơn","khoa","nghien","cuu","tam","vat","ly","chat","luong","hap"]);
const EN_STOP = new Set(["the","and","for","are","but","not","you","all","any","can","had","her","was","one","our","out","day","get","has","him","his","how","man","new","now","old","see","two","way","who","boy","did","its","let","put","say","she","too","use","this","that","with","from","they","been","have","were","will","your","just","like","very","make","over","such","know","take","than","want","come","life","vape","vaping","smoke","tobacco","e-cig","ecigarette","ejuice","juul","nord","suorin","pod","cigarette","smoking","puff","flavor"]);
const RE_HANGUL = /[\uAC00-\uD7AF]/;
const RE_KANA   = /[\u3040-\u309F\u30A0-\u30FF]/;
const RE_HANZI  = /[\u4E00-\u9FFF]/;
const RE_CYRILLIC = /[\u0400-\u04FF]/;
const RE_THAI   = /[\u0E00-\u0E7F]/;
const RE_ARABIC = /[\u0600-\u06FF]/;
const RE_VI_DIAC = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]/;
const RE_LATIN  = /[A-Za-z]/;

function detectLang(rawText) {
  const text = String(rawText || "").normalize("NFKC");
  const lowerNoPunct = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = lowerNoPunct.split(/\s+/).filter(Boolean);
  const letterOnly = Array.from(text).filter((c) => /\p{L}/u.test(c));
  const total = letterOnly.length;
  const cnt = (re) => letterOnly.filter((c) => re.test(c)).length;
  const viDia = cnt(RE_VI_DIAC), han = cnt(RE_HANZI), hangul = cnt(RE_HANGUL),
    kana = cnt(RE_KANA), cyr = cnt(RE_CYRILLIC), latin = cnt(RE_LATIN),
    thai = cnt(RE_THAI), arab = cnt(RE_ARABIC);
  const pct = (n) => total === 0 ? 0 : (n / total) * 100;
  if (total === 0 || tokens.length === 0) return { lang: "other", score: 0, detail: { total: 0 } };
  if (pct(hangul) >= 15) return { lang: "ko", score: Math.round(Math.min(99, pct(hangul) * 2 + 30)), detail: { hangul: pct(hangul) } };
  if (pct(kana) >= 10)   return { lang: "ja", score: Math.round(Math.min(99, pct(kana) * 2 + 30)), detail: { kana: pct(kana) } };
  if (pct(cyr) >= 30)    return { lang: "ru", score: Math.round(Math.min(99, pct(cyr) * 2)), detail: { cyr: pct(cyr) } };
  if (pct(thai) >= 20)   return { lang: "thai", score: Math.round(Math.min(99, pct(thai) * 2 + 10)), detail: { thai: pct(thai) } };
  if (pct(arab) >= 20)   return { lang: "ar", score: Math.round(Math.min(99, pct(arab) * 2 + 10)), detail: { arab: pct(arab) } };
  if (pct(han) >= 40)    return { lang: "zh", score: Math.round(Math.min(99, pct(han) * 1.5)), detail: { han: pct(han) } };
  let viS = 0, enS = 0;
  viS += Math.min(35, pct(viDia) * 2.2);
  enS += Math.max(0, pct(latin) - pct(viDia) - 5);
  let viH = 0, enH = 0;
  for (const t of tokens) {
    const tn = t.trim();
    if (tn.length < 2) continue;
    if (VI_STOP.has(tn)) viH++;
    if (EN_STOP.has(tn)) enH++;
  }
  // Heuristic "pure hashtags": caption chỉ toàn hashtag ngắn → người Việt gõ không dấu
  const allTokensStartWithHash = (tokens.length >= 2) && tokens.every((t) => {
    const raw = text.toLowerCase().split(/\s+/).find((x) => x.replace(/^#+/, "") === t);
    return raw && raw.startsWith("#");
  });
  const hashtagOnly = text.startsWith("#") || (tokens.every((t) => t.length <= 8) && viDia === 0 && total < 30);
  const pureHashtags = allTokensStartWithHash || hashtagOnly;
  const hw = tokens.length >= 4 ? Math.min(100, tokens.length * 6) : 15;
  viS += (viH / Math.max(1, tokens.length)) * hw;
  enS += (enH / Math.max(1, tokens.length)) * hw;
  // Rule đặc biệt: pure hashtags + không dấu VI + chủ yếu Latin → classify "other" (tránh EN loại nhầm)
  if (pureHashtags && viDia === 0 && pct(latin) >= 70) {
    return { lang: "other", score: Math.round(Math.min(40, Math.max(5, 30 - tokens.length))), detail: { viScore: Math.round(viS), enScore: Math.round(enS), viDiaPct: Math.round(pct(viDia)), tokens: tokens.length, viH, enH, pureHashtagsFlag: 1 } };
  }
  const detail = { viScore: Math.round(viS), enScore: Math.round(enS), viDiaPct: Math.round(pct(viDia)), hanPct: Math.round(pct(han)), tokens: tokens.length, viH, enH, hashOnly: hashtagOnly ? 1 : 0 };
  if (viS >= enS && viS >= 8) return { lang: "vi", score: Math.min(99, Math.round(viS + (viDia > 0 ? 15 : 0))), detail };
  if (enS >= 10) return { lang: "en", score: Math.min(99, Math.round(enS)), detail };
  if (pct(han) >= 10) return { lang: "zh", score: Math.min(99, Math.round(pct(han) * 1.5)), detail };
  if (hashtagOnly) return { lang: "other", score: 10, detail };
  return { lang: "other", score: Math.max(5, Math.round(enS)), detail };
}

// ---------------- Post Pipeline CLI (enrich + lang filter + dedupe + report) ----------------
function runCliPipeline(parsedItems, { allowLangs, skipLang, skipDedupe }) {
  const allowSet = new Set((allowLangs || ["vi"]).map((l) => l.toLowerCase()));
  const report = {
    totalRaw: parsedItems.length, skippedNullNormalized: 0, langRemoved: [],
    dedupeRemoved: [], finalCount: 0, langDistribution: {},
  };
  // Bỏ normalized null
  const valid = [];
  for (const it of parsedItems) {
    if (!it.normalized) { report.skippedNullNormalized++; continue; }
    const n = it.normalized;
    const post_id = postId(n.post_url);
    const author_hash = authorHash(n.platform, n.author_native_id);
    valid.push({ ...it, post_id, author_hash, _lang: null });
  }
  // Lọc ngôn ngữ
  let afterLang = valid;
  if (!skipLang) {
    const kept = [];
    for (let i = 0; i < valid.length; i++) {
      const p = valid[i];
      const det = detectLang(p.normalized.raw_text || "");
      p._lang = det;
      report.langDistribution[det.lang] = (report.langDistribution[det.lang] || 0) + 1;
      if (allowSet.has(det.lang)) kept.push(p);
      else report.langRemoved.push({ idx: i, native_post_id: p.normalized.native_post_id || null, lang: det.lang, score: det.score, url: (p.normalized.post_url || "").slice(0, 80) });
    }
    afterLang = kept;
  } else {
    for (const p of afterLang) {
      const det = detectLang(p.normalized.raw_text || "");
      p._lang = det;
      report.langDistribution[det.lang] = (report.langDistribution[det.lang] || 0) + 1;
    }
  }
  // Dedupe theo (platform, native_post_id)
  let finalList = afterLang;
  if (!skipDedupe) {
    const byKey = new Map();
    for (const p of afterLang) {
      const key = `${p.normalized.platform}::${p.normalized.native_post_id || p.post_id}`;
      const arr = byKey.get(key) || [];
      arr.push(p);
      byKey.set(key, arr);
    }
    finalList = [];
    for (const [key, group] of byKey.entries()) {
      if (group.length === 1) { finalList.push(group[0]); continue; }
      const kept = { ...group[0] };
      kept.search_hashtag_ids = Array.from(new Set(group.flatMap((g) => g.search_hashtag_ids || [])));
      kept.caption_hashtags   = Array.from(new Set(group.flatMap((g) => g.caption_hashtags || [])));
      kept.discovery_order    = Math.min(...group.map((g) => g.discovery_order || 0));
      finalList.push(kept);
      report.dedupeRemoved.push({
        keptPostId: (kept.post_id || key).slice(0, 14) + "...",
        removedCount: group.length - 1,
        mergedHashtags: kept.caption_hashtags.slice(0, 8),
      });
    }
  }
  report.finalCount = finalList.length;
  return { finalized: finalList, report };
}
function printPipelineReport(pipeline, platform) {
  const R = pipeline.report;
  sep("POST PIPELINE REPORT (" + platform + ") - enrich / filter ngôn ngữ / dedupe trùng");
  console.log(`  Tổng item raw vào pipeline          : ${R.totalRaw}`);
  console.log(`  Bỏ normalized=null (không hợp lệ)    : ${R.skippedNullNormalized}`);
  console.log(`  Phân bổ ngôn ngữ detection (tất cả) : ${JSON.stringify(R.langDistribution, null, 0)}`);
  console.log(`  Whitelist ngôn ngữ được phép        : ${ALLOW_LANGS.join(", ")}  (dùng --langs vi,en || --keep-all-langs)`);
  console.log(`  => Loại do không đúng ngôn ngữ      : ${R.langRemoved.length}`);
  for (const lr of R.langRemoved) {
    console.log(`       ❌ [${lr.lang} score=${lr.score}] ${lr.url}   (native_id=${lr.native_post_id})`);
  }
  const dupRemovedSum = R.dedupeRemoved.reduce((s, d) => s + d.removedCount, 0);
  console.log(`  => Loại do TRÙNG LẶP (dedupe)       : ${dupRemovedSum} record trong ${R.dedupeRemoved.length} nhóm bài viết giống nhau`);
  for (const d of R.dedupeRemoved.slice(0, 5)) {
    console.log(`       🔁 giữ ${d.keptPostId} bỏ ${d.removedCount} bản giống, caption_hashtags=[${d.mergedHashtags.join(",") || ""}]`);
  }
  console.log(`  => Số bài viết FINAL (sẵn sàng ingest vào posts DB nếu cần) = ${R.finalCount}\n`);
  // In chi tiết mấy item đầu tiên sau khi đã dedupe + lọc ngôn ngữ
  const N = Math.min(3, pipeline.finalized.length);
  if (N > 0) {
    console.log(`  ${N} bài đầu tiên trong finalized[]:`);
    for (let i = 0; i < N; i++) {
      const p = pipeline.finalized[i];
      const n = p.normalized;
      const tags = p.caption_hashtags.length ? p.caption_hashtags.join(",") : "(không hashtag inline)";
      console.log(`    #${i+1} [${p._lang?.lang ?? "?"} score=${p._lang?.score ?? "?"}] ${n.post_url.slice(0, 85)}  view=${n.metrics.view_count}  ${tags.slice(0, 140)}`);
    }
  }
}

// ---------------- Adapters (copy ngắn gọn từ worker) ----------------
const adapters = {};

// ----- TikTok -----
adapters["clockwork/tiktok-scraper"] = {
  validate(cfg) {
    return (cfg.hashtags || []).length ? [] : ["[warn] TikTok cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (cfg.hashtags || []).map((h) => h.hashtag_text || String(h)),
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
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id)) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const caption = String(raw.desc || "");
    return {
      normalized: {
        post_url: raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        post_id: postId(raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`),
        author_hash: authorHash("TIKTOK", authorId),
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
      caption_hashtags: extractTags(caption),
      discovery_order: idx + 1,
    };
  },
};

// ----- TikTok Hashtag (NEW: clockworks/tiktok-hashtag-scraper) -----
// Actor CHUYÊN dùng cho hashtag search - user đã dùng trên Apify Console (Run ID BIce6jdJ1NnWRt9hk)
adapters["clockworks/tiktok-hashtag-scraper"] = {
  validate(cfg) {
    return (cfg.hashtags || []).length ? [] : ["[warn] TikTok Hashtag Scraper cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (cfg.hashtags || []).map((h) => String(h.hashtag_text || h).replace(/^#+/, "")),
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
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id)) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const caption = String(raw.text || raw.desc || "");
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
        post_url: raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        post_id: postId(raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`),
        author_hash: authorHash("TIKTOK", authorId),
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

// ----- Facebook Hashtag (apify/facebook-hashtag-scraper) -----
adapters["apify/facebook-hashtag-scraper"] = {
  validate(cfg) {
    const d = cfg.default_config || {};
    const userTags = (cfg.hashtags || []).map((h) => String(h.hashtag_text || h));
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    return hashtags.length ? [] : ["[warn] FB Hashtag Scraper cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxPostCount ?? d.resultsLimit ?? 50, 1), 5000);
    const userTags = (cfg.hashtags || []).map((h) => String(h.hashtag_text || h));
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    const warnings = hashtags.length ? [] : ["[warn] FB Hashtag chưa có hashtag nào => trả rỗng."];
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
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object") return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.postUrl ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const rawUser = raw.user || raw.owner || raw.profile || {};
    const text = String(raw.text ?? raw.message ?? raw.description ?? "");
    let likes = safeNum(raw.likesCount ?? raw.likes ?? raw.reactionCount);
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
        post_url: url,
        post_id: postId(url),
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? url),
        author_hash: authorHash("FACEBOOK_HASHTAG", String(rawUser.id ?? raw.ownerId ?? raw.profileId ?? url)),
        author_display: rawUser.name ?? rawUser.displayName ?? null,
        published_at: raw.date || raw.time || raw.timestamp || raw.createdAt
          ? new Date(raw.date || raw.time || raw.timestamp || raw.createdAt).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: likes,
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

// ----- Facebook Page -----
adapters["apify/facebook-pages-scraper"] = {
  validate(cfg) {
    const d = cfg.default_config || {};
    const urls = d.startUrls || d.pageUrls || [];
    return urls.length ? [] : ["[warn] FACEBOOK_PAGE chưa có startUrls[], kết quả có thể trống. Admin hãy cấu hình default_config."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const startUrls = d.startUrls || d.pageUrls || [];
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text || String(h));
    const mergedSearch = Array.from(new Set([...(d.searchWords || []), ...userKW]));
    const warnings = startUrls.length ? [] : ["[warn] Facebook chưa có startUrls => có thể trả về rỗng."];
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
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object" || !raw.url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
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
    return {
      normalized: {
        post_url: String(raw.url),
        post_id: postId(String(raw.url)),
        platform: "FACEBOOK_PAGE",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.url),
        author_hash: authorHash("FACEBOOK_PAGE", String(raw.pageId ?? raw.pageName ?? raw.url)),
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

// ----- YouTube -----
adapters["streamer/youtube-scraper"] = {
  validate() { return []; },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxVideos = Math.min(Math.max(cfg.max_items_runtime ?? d.maxVideos ?? 20, 1), 500);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text || String(h));
    const mergedSearch = Array.from(new Set([...(d.searchTerms || []), ...userKW]));
    const videoUrls = d.videoUrls || [];
    const channelUrls = d.channelUrls || [];
    const warnings = mergedSearch.length || videoUrls.length || channelUrls.length
      ? []
      : ["[warn] Youtube chưa có searchTerms/videoUrls => có thể rỗng."];
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
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object") return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
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
        post_url,
        post_id: postId(post_url),
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

// ---------------- Apify helper ----------------
async function apify(method, rel, body) {
  const url = String(rel || "").startsWith("http") ? String(rel) : APIFY_BASE + String(rel || "");
  const headers = { Authorization: "Bearer " + APIFY_TOKEN, "Content-Type": "application/json" };
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    throw new Error("Apify HTTP " + res.status + " " + method + " " + rel + ": " + (typeof json === "object" ? JSON.stringify(json) : String(json || text)));
  }
  // Apify v2 API thường trả về dạng { data: { ... } }. Auto unwrap để tránh undefined.
  if (json && typeof json === "object" && "data" in json && json.data !== null && json.data !== undefined) {
    return json.data;
  }
  return json;
}

// ---------------- MAIN ----------------
(async function main() {
  sep("1. Tải default_config của actor ID = " + ACTOR_ID);
  let defaultCfg = {};
  if (supabase) {
    const { data, error } = await supabase
      .from("apify_actors")
      .select("actor_id, platform, actor_name, default_config")
      .eq("actor_id", ACTOR_ID)
      .maybeSingle();
    if (error) {
      console.log("[warn] không đọc được apify_actors DB, dùng default hardcode mẫu: " + error.message);
    } else if (data) {
      console.log("  ✅ Đọc default_config từ bảng apify_actors (cấu hình thật của admin):");
      defaultCfg = data.default_config || {};
    } else {
      console.log("  [warn] actor " + ACTOR_ID + " chưa có trong DB, dùng default mẫu (chạy seed.js trước)");
    }
  } else {
    console.log("  [warn] Supabase ENV chưa cấu hình (NEXT_PUBLIC_SUPABASE_URL + service key), dùng default hardcode mẫu");
  }

  // Dùng hardcode mẫu nếu DB không đọc được hoặc cấu hình rỗng (để test luôn cấu hình đúng chuẩn):
  if (!defaultCfg || Object.keys(defaultCfg).length === 0) {
    console.log("  => Dùng cấu hình mặc định mẫu cho actor " + PLATFORM);
    if (PLATFORM === "TIKTOK") {
      defaultCfg = {
        maxItems: 100,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        maxConcurrency: 5,
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    } else if (PLATFORM === "FACEBOOK_PAGE") {
      defaultCfg = {
        resultsLimit: 50,
        maxComments: 0,
        startUrls: [],
        searchWords: [],
        onlyPostsNewerThan: null,
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    } else if (PLATFORM === "FACEBOOK_HASHTAG") {
      defaultCfg = {
        maxPostCount: 50,
        hashtags: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    } else {
      defaultCfg = {
        maxVideos: 20, maxComments: 200, sortVideosBy: "NEWEST", sortCommentsBy: "NEWEST_FIRST",
        videoUrls: [], channelUrls: [], searchTerms: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    }
  }
  console.log("  default_config (đã tải từ DB/sample):\n" + prettyJson(defaultCfg));

  sep("2. [TEST BUILD INPUT] adapter.buildInput() => payload gửi lên Apify");
  const adapter = adapters[ACTOR_ID];
  if (!adapter) {
    console.error("LỖI: không có adapter cho actor " + ACTOR_ID);
    process.exit(1);
  }
  const cfgRuntime = {
    run_id: 0, researcher_code: "test-user@example.com",
    platform: PLATFORM, actor_id: ACTOR_ID,
    hashtags: DEFAULT_TEST_HASHTAGS.map((t) => ({ hashtag_text: t })),
    max_items_runtime: DEFAULT_MAX_ITEMS,
    default_config: defaultCfg,
  };
  const validation = adapter.validate ? adapter.validate(cfgRuntime) || [] : [];
  const built = adapter.buildInput(cfgRuntime);
  const warnings = Array.from(new Set([...validation, ...(built.warnings || [])]));
  if (warnings.length) {
    console.log("  ⚠️  WARNING (chưa crash, test được tiếp tục nhưng lưu ý sau):");
    for (const w of warnings) console.log("    - " + w);
  }
  console.log("  => Actor Input Payload (send lên Apify /v2/acts/<id>/runs POST):\n" + prettyJson(built.input));

  if (DRY_RUN) {
    sep("[DRY-RUN] KẾT THÚC TEST XÂY DỰNG CẤU HÌNH (không gọi API Apify)");
    console.log(
      "\n✅ OK: Nếu cấu hình payload ở trên trông đúng =>" +
      "\n   Giờ bỏ --dry-run và chạy thật để test POST + Poll + Parse dataset:" +
      "\n   $env:APIFY_TOKEN=\"apify_api_XXXX\"" +
      "\n   node scripts/test-adapter-core.js --tiktok-hashtag --max-items 5    # mới, chuyên hashtag" +
      "\n   node scripts/test-adapter-core.js --facebook-hashtag --max-items 3" +
      "\n" +
      "\n   Options lọc & khử trùng (mặc định on, có thể tắt khi test ngôn ngữ khác):" +
      "\n     --langs vi,en              Whitelist ngôn ngữ (mặc định chỉ VI)" +
      "\n     --keep-all-langs           TẮT bộ lọc ngôn ngữ (giữ toàn bộ bài)" +
      "\n     --no-dedupe                TẮT loại bỏ bài viết trùng (native_post_id + platform)" +
      "\n     --max-items N              Số item scrape (actor input.maxItems)",
    );
    process.exit(0);
  }

  sep("3. POST actor_run (bắt đầu chạy actor trên Apify cloud với maxItems=" + DEFAULT_MAX_ITEMS + ")");
  let apifyRun;
  try {
    apifyRun = await apify("POST", "/v2/acts/" + encodeURIComponent(ACTOR_ID) + "/runs?timeout=60", built.input);
  } catch (err) {
    console.error("LỖI khi POST run (bạn đã subscribe actor trên Apify Console chưa?):");
    console.error("   -> https://console.apify.com/actors -> tìm actor -> click Try actor lần đầu là subscribe OK.");
    console.error("   -> Chi tiết lỗi: " + (err.message || err));
    process.exit(2);
  }
  const runId = apifyRun.id;
  const datasetId = apifyRun.defaultDatasetId || (apifyRun.data && apifyRun.data.defaultDatasetId) || null;
  console.log("  ✅ Apify run_id = " + runId);
  console.log("  ✅ Dataset ID   = " + datasetId);
  console.log("  Link xem trên Apify Console: https://console.apify.com/organization/~/actors/runs/" + runId);

  sep("4. POLL tiến trình run (chờ max 60 giây, interval 3s)");
  let finalStatus = apifyRun.status || "UNKNOWN";
  let waited = 0;
  while (!["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(finalStatus) && waited < 60000) {
    await sleep(3000);
    waited += 3000;
    try {
      const s = await apify("GET", "/v2/actor-runs/" + runId);
      finalStatus = String(s.status || "UNKNOWN");
      console.log("  [t+" + (waited / 1000).toFixed(0) + "s] status = " + finalStatus);
    } catch (e) {
      console.log("  [t+" + (waited / 1000).toFixed(0) + "s] poll lỗi (tạm thời) -> thử lại: " + (e.message || e));
    }
  }
  if (!["SUCCEEDED", "PARTIAL_SUCCESS"].includes(finalStatus)) {
    console.error("  ❌ Kết thúc sớm. Final status = " + finalStatus + ". Xem chi tiết lỗi trên Apify Console: https://console.apify.com/organization/~/actors/runs/" + runId);
    process.exit(3);
  }
  console.log("  ✅ Run xong (" + finalStatus + "), bắt đầu tải dataset.");

  sep("5. TẢI dataset items về (limit tối đa 5 để test parse nhẹ)");
  let items = [];
  if (datasetId) {
    try {
      items = await apify("GET", "/v2/datasets/" + datasetId + "/items?limit=5");
    } catch (e) {
      console.error("  [warn] tải dataset lỗi: " + (e.message || e));
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.log("  ⚠️  Dataset RỖNG (hashtag không phổ biến? maxItems=1? startUrls trống?).");
    console.log("  -> Gợi ý: test lại với hashtag phổ biến hơn / tăng maxItems = 5.");
    process.exit(0);
  }
  console.log("  ✅ Tải được " + items.length + " items từ dataset Apify:");

  sep("6. PARSE TẤT CẢ items => NormalizedPost (sau đó chạy pipeline LỌC NGÔN NGỮ + DEDUPE)");
  const parsedAll = [];
  for (let i = 0; i < items.length; i++) {
    parsedAll.push(adapter.parseOne(items[i], i));
  }
  const parsedList = parsedAll.slice(0, 3); // giữ in 3 đầu để debug như cũ
  for (let i = 0; i < parsedList.length; i++) {
    const p = parsedList[i];
    const raw = items[i];
    console.log("\n--- Item #" + (i + 1) + " / discovery_order = " + p.discovery_order + " ---");
    if (!p.normalized) {
      console.log("  [SKIP] Item này không parse ra post (VD: comment riêng / không url). raw.type = " + (raw && raw.itemType ? raw.itemType : typeof raw));
      continue;
    }
    const n = p.normalized;
    console.log("  post_id (SHA256 URL)     = " + n.post_id);
    console.log("  post_url                  = " + n.post_url);
    console.log("  platform                  = " + n.platform);
    console.log("  native_post_id            = " + n.native_post_id);
    console.log("  author_hash (ẩn danh)     = " + n.author_hash);
    console.log("  author_display (chỉ debug)= " + n.author_display);
    console.log("  published_at              = " + (n.published_at || "null"));
    console.log("  Metrics (diễn tiến theo thời gian):");
    console.log("     like_count    = " + (n.metrics.like_count ?? "null"));
    console.log("     comment_count = " + (n.metrics.comment_count ?? "null"));
    console.log("     view_count    = " + (n.metrics.view_count ?? "null"));
    console.log("     share_count   = " + (n.metrics.share_count ?? "null"));
    console.log("  raw_text (120 ký tự đầu)  = " + (n.raw_text || "").slice(0, 120).replace(/\n/g, " ") + ((n.raw_text || "").length > 120 ? "..." : ""));
    console.log("  hashtags trong Caption    = " + (p.caption_hashtags.length ? p.caption_hashtags.join(", ") : "(không tìm thấy hashtag inline nào trong caption)"));
  }

  sep("7. CHẠY POST PIPELINE (KHÔNG GHI DB) - enrich ids -> filter ngôn ngữ -> dedupe trùng lặp");
  console.log(`  Config pipeline: allowLangs=[${ALLOW_LANGS.join(",")}]  SKIP_LANG_FILTER=${SKIP_LANG_FILTER}  SKIP_DEDUPE=${SKIP_DEDUPE}`);
  const pipeline = runCliPipeline(parsedAll, { allowLangs: ALLOW_LANGS, skipLang: SKIP_LANG_FILTER, skipDedupe: SKIP_DEDUPE });
  printPipelineReport(pipeline, PLATFORM);

  sep("KẾT LUẬN TEST CORE ADAPTER + PIPELINE");
  const ok = parsedList.some((p) => p.normalized) ? "✅ PASS" : "⚠️  CHƯA CÓ POST PARSE ĐƯỢC (dataset item loại khác)";
  console.log("  " + ok);
  console.log("  Tổng items tải về         = " + items.length);
  console.log("  Parse được post (not null)= " + parsedList.filter((p) => p.normalized).length);
  console.log("  -> NẾU OK: HẠNH TRẢ TỚI BƯỚC TÍCH HỢP collection_runs + ingest (sau test này xong, code core chuẩn rồi).");
})().catch((e) => {
  console.error("\n❌ LỖI NGUYÊM TRỌNG TEST SCRIPT:\n", e && e.stack ? e.stack : e);
  process.exit(99);
});

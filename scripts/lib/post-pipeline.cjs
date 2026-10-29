"use strict";
/*
 * Post pipeline dùng chung (CommonJS) cho scripts/worker.js và scripts/test-adapter-core.js.
 *  - detectLang(): heuristic nhận diện ngôn ngữ, không phụ thuộc thư viện ngoài (DEC-H2)
 *  - runPostPipeline(): enrich post_id/author_hash -> lọc ngôn ngữ -> dedupe (platform, native_post_id)
 * Bản TypeScript tương ứng: src/lib/scrapers/languageFilter.ts + postPipeline.ts
 */
const crypto = require("node:crypto");

function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}
function postId(url) {
  return sha256hex(String(url || "").trim());
}
function authorHash(platform, nativeId) {
  return sha256hex(String(platform || "").toUpperCase() + ":" + String(nativeId || "").trim());
}

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
  // Dấu tiếng Việt (ơ, ư, đ, ă, dấu thanh) gần như không xuất hiện trong tiếng Anh:
  // >= 2 ký tự và >= 5% chữ cái là đủ chắc chắn tiếng Việt (tránh câu ngắn bị nhận nhầm EN).
  if (viDia >= 2 && pct(viDia) >= 5) return { lang: "vi", score: Math.min(99, Math.round(50 + pct(viDia))), detail: { viDiaPct: Math.round(pct(viDia)), rule: "vi-diacritics" } };
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

module.exports = {
  sha256hex,
  postId,
  authorHash,
  detectLang,
  runPostPipeline: runCliPipeline,
  runCliPipeline,
};

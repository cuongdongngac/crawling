// ==========================================================
// Language Detection & Filter (HEURISTIC, ZERO dependency)
// ==========================================================
// Mục đích: Loại bỏ bài viết không thuộc ngôn ngữ quan tâm của dự án
// M&E Social Listening Việt Nam (thuốc lá điện tử / e-cig).
//
// Thiết kế theo triết lý TỐI GIẢN - KHÔNG thêm thư viện, KHÔNG gọi LLM
// cho mỗi bài viết (chậm + tốn cost). Dùng Heuristic rule dựa trên:
//   1. Tần suất chữ cái đặc trưng theo từng ngôn ngữ (có weight)
//   2. Các ký tự Unicode block (Hangul = KO, Hanzi/CJK = ZH,
//      Cyrillic = RU, Latin + tonal marks = VI)
//   3. Từ điển stopwords siêu nhỏ cho VI, EN (không bao hàm toàn
//      bộ từ, chỉ đủ để phân biệt nhanh các bài text nhiều chữ).
//
// Output:   { lang: "vi"|"en"|"zh"|"ko"|"ja"|"ru"|"other", score }
// Usage:    filterLangs(items, ["vi"]) -> chỉ giữ tiếng Việt
//           filterLangs(items, ["vi","en"]) -> giữ tiếng Việt + Anh
// ==========================================================

import type { ParsedDatasetItem } from "./types";

// ---------------- Unicode block helpers ----------------
const RE_HANGUL = /[\uAC00-\uD7AF]/;        // Korean Hangul
const RE_KANA = /[\u3040-\u309F\u30A0-\u30FF]/;  // Japanese Hiragana + Katakana
const RE_HANZI = /[\u4E00-\u9FFF]/;         // CJK Unified Ideographs (ZH/JA shared)
const RE_CYRILLIC = /[\u0400-\u04FF]/;      // Russian / Cyrillic
const RE_THAI = /[\u0E00-\u0E7F]/;          // Thai
const RE_ARABIC = /[\u0600-\u06FF]/;        // Arabic
// Tiếng Việt (Latin với dấu sắc huyền hỏi ngã nặng + đ)
const RE_VI_DIACRITIC = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]/;
const RE_LATIN_LETTER = /[A-Za-z]/;

// ---------------- Tiny VI stopwords (top 50, lowercase không dấu + có dấu) ----------------
const VI_STOPWORDS = new Set([
  "và", "hoặc", "nhưng", "mà", "vì", "của", "trong", "từ", "trên", "dưới",
  "với", "bằng", "là", "đã", "sẽ", "đang", "không", "cũng", "chỉ", "rất",
  "thì", "nên", "một", "nhiều", "các", "đây", "đó", "khi", "nếu", "tôi",
  "bạn", "anh", "em", "chúng", "ta", "họ", "này", "kia", "được", "ở",
  "ngay", "luôn", "quá", "thôi", "cho", "như", "vào", "ra", "lại", "hơn",
  "khoa", "nghien", "cuu", "tam", "vat", "ly", "chat", "luong", "hap",
]);

const EN_STOPWORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her","was",
  "one","our","out","day","get","has","him","his","how","man","new","now","old",
  "see","two","way","who","boy","did","its","let","put","say","she","too","use",
  "this","that","with","from","they","been","have","were","will","your","just",
  "like","very","make","over","such","know","take","than","want","come","life",
  "vape","vaping","smoke","tobacco","e-cig","ecig","ecigarette","ejuice","juul",
  "nord","suorin","pod","cigarette","electronic","smoking","puff","flavor",
]);

// ---------------- Scoring ----------------
export interface LangDetection {
  lang: "vi" | "en" | "zh" | "ko" | "ja" | "ru" | "thai" | "ar" | "other";
  score: number;       // 0-100 confidence
  detail: Record<string, number>;
}

export function detectLanguage(rawText: string): LangDetection {
  const text = String(rawText || "").normalize("NFKC");
  const lowerNoPunct = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = lowerNoPunct.split(/\s+/).filter((t) => t.length > 0);

  // Tính theo % ký tự thuộc từng block (dựa trên toàn bộ ký tự letter)
  const letterOnly = Array.from(text).filter((c) => /\p{L}/u.test(c));
  const total = letterOnly.length;

  const count = (re: RegExp) => letterOnly.filter((c) => re.test(c)).length;
  const viDia = count(RE_VI_DIACRITIC);
  const han = count(RE_HANZI);
  const hangul = count(RE_HANGUL);
  const kana = count(RE_KANA);
  const cyr = count(RE_CYRILLIC);
  const latin = count(RE_LATIN_LETTER);
  const thai = count(RE_THAI);
  const arab = count(RE_ARABIC);

  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  // Rule-based mạnh: ngôn ngữ script độc quyền
  if (total === 0 || tokens.length === 0) {
    return { lang: "other", score: 0, detail: { total: 0 } };
  }
  if (pct(hangul) >= 15) return { lang: "ko", score: Math.round(Math.min(99, pct(hangul) * 2 + 30)), detail: { hangul: pct(hangul) } };
  if (pct(kana) >= 10) return { lang: "ja", score: Math.round(Math.min(99, pct(kana) * 2 + 30)), detail: { kana: pct(kana) } };
  if (pct(cyr) >= 30) return { lang: "ru", score: Math.round(Math.min(99, pct(cyr) * 2)), detail: { cyr: pct(cyr) } };
  if (pct(thai) >= 20) return { lang: "thai", score: Math.round(Math.min(99, pct(thai) * 2 + 10)), detail: { thai: pct(thai) } };
  if (pct(arab) >= 20) return { lang: "ar", score: Math.round(Math.min(99, pct(arab) * 2 + 10)), detail: { arab: pct(arab) } };

  // Hanzi chiếm ưu thế => ZH (JA được rule trên bắt nếu có kana)
  if (pct(han) >= 40) {
    return { lang: "zh", score: Math.round(Math.min(99, pct(han) * 1.5)), detail: { han: pct(han) } };
  }

  // Dấu tiếng Việt (ơ, ư, đ, ă, dấu thanh) gần như không xuất hiện trong tiếng Anh:
  // >= 2 ký tự và >= 5% chữ cái là đủ chắc chắn tiếng Việt (tránh câu ngắn bị nhận nhầm EN).
  if (viDia >= 2 && pct(viDia) >= 5) {
    return { lang: "vi", score: Math.min(99, Math.round(50 + pct(viDia))), detail: { viDiaPct: Math.round(pct(viDia)) } };
  }

  // Latin / Việt: tính điểm stopwords + dấu tiếng Việt
  let viScore = 0;
  let enScore = 0;
  viScore += Math.min(35, pct(viDia) * 2.2);     // dấu VI nặng điểm
  enScore += Math.max(0, pct(latin) - pct(viDia) - 5);

  // Token stopword hit
  let viHits = 0, enHits = 0;
  for (const t of tokens) {
    const tn = t.trim();
    if (tn.length < 2) continue;
    if (VI_STOPWORDS.has(tn)) viHits++;
    if (EN_STOPWORDS.has(tn)) enHits++;
  }
  // Heuristic: "chỉ toàn hashtag, không có dấu tiếng Việt" → đáng nghi là other
  const allTokensStartWithHash = (tokens.length >= 2) && tokens.every((t) => {
    const raw = text.toLowerCase().split(/\s+/).find((x) => x.replace(/^#+/, "") === t);
    return raw && raw.startsWith("#");
  });
  const hashtagOnly = text.startsWith("#") || (tokens.every((t) => t.length <= 8) && viDia === 0 && total < 30);
  const pureHashtags = allTokensStartWithHash || hashtagOnly;
  const hitWeight = tokens.length >= 4 ? Math.min(100, tokens.length * 6) : 15;
  viScore += (viHits / Math.max(1, tokens.length)) * hitWeight;
  enScore += (enHits / Math.max(1, tokens.length)) * hitWeight;

  // Rule đặc biệt: pure hashtags (người Việt gõ caption chỉ toàn hashtag không dấu)
  // → classify "other" thay vì EN, tránh loại nhầm.
  if (pureHashtags && viDia === 0 && pct(latin) >= 70) {
    return {
      lang: "other",
      score: Math.round(Math.min(40, Math.max(5, 30 - tokens.length))),
      detail: {
        viScore: round(viScore),
        enScore: round(enScore),
        viDiaPct: round(pct(viDia)),
        latinPct: round(pct(latin)),
        hanPct: round(pct(han)),
        tokens: tokens.length,
        viHits, enHits,
        pureHashtagsFlag: 1,
        hashtagOnlyFlag: hashtagOnly ? 1 : 0,
      },
    };
  }

  const detail = {
    viScore: round(viScore),
    enScore: round(enScore),
    viDiaPct: round(pct(viDia)),
    latinPct: round(pct(latin)),
    hanPct: round(pct(han)),
    tokens: tokens.length,
    viHits, enHits,
    hashtagOnlyFlag: hashtagOnly ? 1 : 0,
  };

  if (viScore >= enScore && viScore >= 8) {
    return { lang: "vi", score: clamp(round(viScore + (viDia > 0 ? 15 : 0))), detail };
  }
  if (enScore >= 10) {
    return { lang: "en", score: clamp(round(enScore)), detail };
  }
  if (pct(han) >= 10) {
    return { lang: "zh", score: clamp(round(pct(han) * 1.5)), detail };
  }
  if (hashtagOnly) {
    // Không đủ dấu + toàn hashtags ngắn: mặc định "other" để user tự quyết định
    return { lang: "other", score: 10, detail };
  }
  return { lang: "other", score: Math.max(5, Math.round(enScore)), detail };
}

function round(n: number) { return Math.round(n * 100) / 100; }
function clamp(n: number) { return Math.min(99, Math.max(1, n)); }

// ---------------- Filter on ParsedDatasetItem ----------------
export type WhitelistLang = LangDetection["lang"][];

export interface LanguageFilterResult {
  item: ParsedDatasetItem;
  detected: LangDetection;
  passed: boolean;            // true = thuộc whitelist
}

export function filterItemsByLanguage(
  items: ParsedDatasetItem[],
  allowLangs: string[] = ["vi"],
): LanguageFilterResult[] {
  const allow = new Set(allowLangs.map((l) => l.toLowerCase()));
  const out: LanguageFilterResult[] = [];
  for (const it of items) {
    const text = it.normalized?.raw_text ?? "";
    const det = detectLanguage(text);
    const passed = allow.has(det.lang);
    out.push({ item: it, detected: det, passed });
  }
  return out;
}

export default { detectLanguage, filterItemsByLanguage };

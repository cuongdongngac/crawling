/**
 * Bộ dịch giao diện gọn (không thư viện ngoài).
 *
 * Cách dùng: viết chữ tiếng Việt như bình thường, bọc bằng t():
 *   t("Quét thử")                       -> "Test scan" khi đang ở tiếng Anh
 *   t("Đã quét {n} bài", { n: 12 })      -> "Scanned 12 posts"
 * Chữ tiếng Việt chính là "khóa"; bản tiếng Anh nằm trong ./en.ts.
 * Chưa có bản dịch thì hiện nguyên tiếng Việt (không bao giờ lỗi).
 *
 * t() cũng nhận chữ đến từ máy chủ (thông báo lỗi, nhãn trong lib/…):
 * nếu khớp đúng một khóa, hoặc khớp một khóa có chỗ trống {…}, sẽ được dịch.
 *
 * Chỉ dịch giao diện. Dữ liệu (hashtag, nội dung bài, ghi chú) giữ nguyên.
 */
import { EN } from "./en";

export type Lang = "vi" | "en";
export const LANGS: Lang[] = ["vi", "en"];
export const DEFAULT_LANG: Lang = "vi";
export const LANG_COOKIE = "lang";

export type TVars = Record<string, string | number | bigint | boolean | null | undefined>;
export type TFn = (text: string | null | undefined, vars?: TVars) => string;

export function normalizeLang(v: string | null | undefined): Lang {
  return v === "en" ? "en" : DEFAULT_LANG;
}

/** Locale cho Intl / toLocaleString theo ngôn ngữ giao diện. */
export function localeOf(lang: Lang): string {
  return lang === "en" ? "en-GB" : "vi-VN";
}

function fill(s: string, vars?: TVars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m));
}

// Khóa có chỗ trống {…}: dựng biểu thức để dịch cả chữ đã ghép sẵn (vd thông báo lỗi từ máy chủ).
type Pattern = { re: RegExp; names: string[]; en: string };
let patterns: Pattern[] | null = null;
function getPatterns(): Pattern[] {
  if (patterns) return patterns;
  patterns = [];
  for (const [vi, en] of Object.entries(EN)) {
    if (!/\{\w+\}/.test(vi)) continue;
    const names: string[] = [];
    const src = vi
      .split(/(\{\w+\})/)
      .map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m) {
          names.push(m[1]);
          return "([\\s\\S]*?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    patterns.push({ re: new RegExp(`^${src}$`), names, en });
  }
  // Khóa dài (nhiều chữ cố định) trước, để khớp đúng nhất.
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
  return patterns;
}

export function translate(lang: Lang, text: string | null | undefined, vars?: TVars): string {
  if (!text) return "";
  if (lang === "vi") return fill(text, vars);
  const hit = EN[text];
  if (hit !== undefined) return fill(hit, vars);
  if (!vars) {
    // Chữ ghép sẵn: thử khớp khóa có chỗ trống.
    for (const p of getPatterns()) {
      const m = p.re.exec(text);
      if (m) {
        const v: TVars = {};
        p.names.forEach((n, i) => (v[n] = m[i + 1]));
        return fill(p.en, v);
      }
    }
  }
  return fill(text, vars);
}

export function makeT(lang: Lang): TFn {
  return (text, vars) => translate(lang, text, vars);
}

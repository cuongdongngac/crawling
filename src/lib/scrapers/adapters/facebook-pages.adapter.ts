import type {
  ScraperAdapter,
  RuntimeRunConfig,
  BuiltActorInput,
  ParsedDatasetItem,
} from "../types";

/**
 * apify/facebook-pages-scraper
 * default_config seed: { resultsLimit, maxComments, startUrls[], searchWords[], onlyPostsNewerThan, proxy }
 */
const adapter: ScraperAdapter = {
  // (validateConfig = null → KHÔNG còn chặn thiếu startUrls nữa, gộp cảnh báo vào buildInput warnings 1 lần.)
  buildInput(cfg): BuiltActorInput {
    const dcfg: any = cfg.default_config || {};
    const startUrls: string[] = dcfg.startUrls ?? dcfg.pageUrls ?? [];
    const maxItems = Math.min(
      Math.max(cfg.max_items_runtime ?? dcfg.resultsLimit ?? 50, 1),
      5000
    );
    const userHashtagsOrKeywords = (cfg.hashtags || []).map((h) => h.hashtag_text);

    const mergedSearchWords = Array.from(
      new Set([...(dcfg.searchWords || []), ...userHashtagsOrKeywords])
    );

    const warnings: string[] = [];
    if (startUrls.length === 0) {
      warnings.push(
        "[info] Không cấu hình startUrls[] → Actor sẽ tìm kiếm TOÀN BỘ FACEBOOK theo searchWords (không giới hạn page).",
        "[tip] Tìm kiếm toàn mạng thường ít kết quả hơn & chậm hơn. Sau này có page cụ thể cần theo dõi → vào Công cụ Cào → Edit Facebook actor → điền startUrls[] JSON trong default_config."
      );
    }

    const input = {
      startUrls,
      resultsLimit: maxItems,
      maxComments: dcfg.maxComments ?? 0,
      searchWords: mergedSearchWords,
      onlyPostsNewerThan: dcfg.onlyPostsNewerThan ?? null,
      addViewResults: dcfg.addViewResults ?? true,
      proxy: dcfg.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(dcfg.extra || {}),
    };
    return { input, warnings };
  },

  parseOneItem(raw, index, cfg): ParsedDatasetItem {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback: ParsedDatasetItem = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: index + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    if (!raw.url) return fallback;
    const text = String(raw.text ?? "");
    const captionTags = extractHashtags(text);

    let likes: number | null = raw.likes;
    if (likes === null || likes === undefined && raw.reactions) {
      const reactions: Record<string, any> = raw.reactions || {};
      let total = 0;
      for (const k of Object.keys(reactions)) {
        const v = Number(reactions[k]);
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
        author_avatar_url: null,
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
      caption_hashtags: captionTags,
      search_hashtag_ids: search_ids,
      discovery_order: index + 1,
    };
  },
};

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function extractHashtags(text: string): string[] {
  const out: string[] = [];
  const re = /#([a-z0-9_À-ỹ-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ""))) !== null) {
    out.push(m[0].toLowerCase());
  }
  return Array.from(new Set(out));
}

export default adapter;

import type {
  ScraperAdapter,
  RuntimeRunConfig,
  BuiltActorInput,
  ParsedDatasetItem,
} from "../types";

/**
 * alexey/facebook-search-scraper
 * =========================================================
 * Flow đúng cho MỤC ĐÍCH CỦA CHÚNG TA:
 *   INPUT : từ khóa / hashtag (queries[])
 *   OUTPUT: list URLs của bài post tìm được TOÀN MẠNG Facebook
 *           (KHÔNG CẦN startUrls trước, không cần biết page nào)
 * default_config seed:
 *   { resultsLimit, proxy }
 *
 * Input schema tham khảo:
 *   queries: string[]              -> hashtag hoặc từ khóa
 *   resultsLimit: number
 *   proxy: ApifyProxyConfiguration
 *
 * Output schema items (dataset):
 *   { url, facebookUrl, postContent/text, reactions, shares, comments, timestamp, pageName/pageId, author... }
 */
const adapter: ScraperAdapter = {
  buildInput(cfg): BuiltActorInput {
    const dcfg: any = cfg.default_config || {};
    const maxItems = Math.min(
      Math.max(cfg.max_items_runtime ?? dcfg.resultsLimit ?? 50, 1),
      5000
    );
    const userHashtagsOrKeywords = (cfg.hashtags || []).map((h) => h.hashtag_text);

    // queries = default_config.queries (nối thêm hashtag user nhập
    const queries = Array.from(
      new Set([...(dcfg.queries || []), ...userHashtagsOrKeywords])
    );

    const warnings: string[] = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH chưa có hashtag/từ khóa nào → Actor sẽ trả rỗng.");
    }

    const input = {
      queries,
      resultsLimit: maxItems,
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

    const post_url = String(
      raw.url ?? raw.facebookUrl ?? raw.postUrl ?? raw.post_url ?? ""
    );
    if (!post_url) return fallback;

    const text = String(
      raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? ""
    );
    const captionTags = extractHashtags(text);

    let likes: number | null = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
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
        post_url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(
          raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? post_url
        ),
        author_native_id: String(
          raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? post_url
        ),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        author_avatar_url: raw.pageAvatar ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt
          ? new Date(raw.time || raw.timestamp || raw.createdAt).toISOString()
          : null,
        raw_text: text,
        raw_payload: raw,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
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

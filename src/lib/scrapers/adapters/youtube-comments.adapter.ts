import type {
  ScraperAdapter,
  RuntimeRunConfig,
  BuiltActorInput,
  ParsedDatasetItem,
} from "../types";

/**
 * streamer/youtube-scraper
 * default_config seed: { maxVideos, maxComments, sortVideosBy, sortCommentsBy, videoUrls, channelUrls, searchTerms, proxy }
 */
const adapter: ScraperAdapter = {
  buildInput(cfg): BuiltActorInput {
    const dcfg: any = cfg.default_config || {};
    const maxVideos = Math.min(
      Math.max(cfg.max_items_runtime ?? dcfg.maxVideos ?? 20, 1),
      500
    );
    const userKeywords = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(
      new Set([...(dcfg.searchTerms || []), ...userKeywords])
    );
    const warnings: string[] = [];
    const videoUrls: string[] = dcfg.videoUrls ?? [];
    const channelUrls: string[] = dcfg.channelUrls ?? [];
    if (
      mergedSearch.length === 0 &&
      videoUrls.length === 0 &&
      channelUrls.length === 0
    ) {
      warnings.push(
        "Youtube actor không có searchTerms, videoUrls hay channelUrls. Kết quả có thể trống."
      );
    }

    const input = {
      searchTerms: mergedSearch,
      videoUrls,
      channelUrls,
      maxVideos,
      maxComments: dcfg.maxComments ?? 200,
      sortVideosBy: dcfg.sortVideosBy ?? "NEWEST",
      sortCommentsBy: dcfg.sortCommentsBy ?? "NEWEST_FIRST",
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

    // Heuristic 1: comment item (có videoId + authorName) -> BỎ QUA (DEC-001 không lưu comments chi tiết)
    const isCommentItem =
      typeof (raw as any).videoId === "string" &&
      typeof (raw as any).authorName === "string";
    if (isCommentItem) return fallback;

    // Heuristic 2: metadata video
    if (!(raw as any).url && !(raw as any).id) return fallback;
    if (!(raw as any).id) return fallback;

    const title = String((raw as any).title ?? "");
    const description = String((raw as any).text ?? (raw as any).description ?? "");
    const raw_text = [title, description].filter(Boolean).join("\n\n");
    const captionTags = extractHashtags(raw_text);
    const tags = Array.isArray((raw as any).tags) ? (raw as any).tags as string[] : [];
    for (const t of tags) {
      const norm = ("#" + String(t).trim().toLowerCase()).replace(/^##+/, "#");
      if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
    }

    const channelUrl: string | undefined = (raw as any).channelUrl;
    const channelNative =
      (channelUrl?.split("/").filter(Boolean).pop() ?? (raw as any).channelName) ||
      String((raw as any).id);

    return {
      normalized: {
        post_url: String((raw as any).url ?? `https://www.youtube.com/watch?v=${(raw as any).id}`),
        platform: "YOUTUBE",
        native_post_id: String((raw as any).id),
        author_native_id: String(channelNative),
        author_display: String((raw as any).channelName ?? channelNative),
        author_avatar_url: null,
        published_at: (raw as any).publishedAt ? new Date(String((raw as any).publishedAt)).toISOString() : null,
        raw_text,
        raw_payload: raw,
        metrics: {
          view_count: safeNum((raw as any).viewCount),
          like_count: safeNum((raw as any).likeCount),
          comment_count: safeNum((raw as any).commentCount),
          share_count: null,
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

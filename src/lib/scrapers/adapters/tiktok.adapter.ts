import type {
  ScraperAdapter,
  RuntimeRunConfig,
  BuiltActorInput,
  ParsedDatasetItem,
} from "../types";

/**
 * clockwork/tiktok-scraper
 * default_config seed: { maxItems, shouldDownloadVideos, shouldDownloadCovers, maxConcurrency, proxy }
 */
const adapter: ScraperAdapter = {
  validateConfig(cfg) {
    const warnings: string[] = [];
    if (!cfg.hashtags || cfg.hashtags.length === 0) {
      warnings.push("TikTok scraper yêu cầu ít nhất 1 hashtag.");
    }
    return warnings;
  },

  buildInput(cfg): BuiltActorInput {
    const dcfg: any = cfg.default_config || {};
    const hashtagTexts = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const warnings: string[] = [];

    // User chọn max items trên UI => override default_config.maxItems
    const maxItems = Math.min(
      Math.max(cfg.max_items_runtime ?? dcfg.maxItems ?? 50, 1),
      1000
    );

    const input = {
      hashtags: hashtagTexts,
      maxItems,
      shouldDownloadVideos: dcfg.shouldDownloadVideos ?? false,
      shouldDownloadCovers: dcfg.shouldDownloadCovers ?? false,
      enableCoversOutput: dcfg.enableCoversOutput ?? false,
      enableWatermarkVideo: dcfg.enableWatermarkVideo ?? false,
      maxConcurrency: dcfg.maxConcurrency ?? 5,
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
    if (!raw.webVideoUrl && !raw.id) return fallback;

    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return fallback;

    const caption = String(raw.desc ?? "");
    const captionTags = extractHashtags(caption);

    return {
      normalized: {
        post_url: raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_native_id: String(authorId),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        author_avatar_url: raw.authorMeta?.avatar ?? null,
        published_at: raw.createTimeISO
          ? raw.createTimeISO
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

import type {
  ScraperAdapter,
  RuntimeRunConfig,
  BuiltActorInput,
  ParsedDatasetItem,
} from "../types";

/**
 * clockworks/tiktok-hashtag-scraper
 * =========================================================
 * 💯 Actor CHUYÊN DÙNG cho HASHTAG search trên TikTok (hỗ trợ tốt
 * mục đích M&E Social Listening).
 *
 * ⚠️ KHÁC với clockwork/tiktok-scraper CŨ:
 *   - actor ID mới = clockworks/tiktok-hashtag-scraper (có 's', và tiktok-hashtag'
 *   - field output gần như giống 100%, nhưng chuyên cho kết quả theo hashtag mạnh hơn
 *   - có field searchHashtag { name, views } → views = TỔNG LƯỢT XEM của HASHTAG
 *     (cực kỳ hữu ích cho báo cáo M&E)
 *
 * Input schema (tested trên Apify Console - Run ID BIce6jdJ1NnWRt9hk):
 *   hashtags: string[]           => ["pod", "vape"] (không cần # ở đầu)
 *   maxItems?: number            => giới hạn số video trả về
 *   shouldDownloadVideos?: bool
 *   shouldDownloadCovers?: bool
 *   enableCoversOutput?: bool
 *   enableWatermarkVideo?: bool
 *   maxConcurrency?: number      => default 5
 *   proxy?: ApifyProxyConfiguration
 *
 * Output sample fields (dataset):
 *   { id, text, createTime, createTimeISO, isAd,
 *     authorMeta { id, name, nickName, avatar, signature, fans, heart, ... },
 *     webVideoUrl, videoMeta { height,width,duration,coverUrl,... },
 *     diggCount, shareCount, playCount, collectCount, commentCount, repostCount,
 *     hashtags: [ {name,id,title,cover} ],
 *     searchHashtag: { name, views },
 *     mediaUrls, input, ... }
 */
const adapter: ScraperAdapter = {
  validateConfig(cfg) {
    const warnings: string[] = [];
    if (!cfg.hashtags || cfg.hashtags.length === 0) {
      warnings.push("TikTok Hashtag Scraper yêu cầu ít nhất 1 hashtag.");
    }
    return warnings;
  },

  buildInput(cfg): BuiltActorInput {
    const dcfg: any = cfg.default_config || {};
    const hashtagTexts = (cfg.hashtags || []).map((h) =>
      String(h.hashtag_text || "").replace(/^#+/, ""));
    const warnings: string[] = [];

    // User chọn max items trên UI => override default_config.maxItems
    // Actor này dùng maxItems như cũ, giới hạn trên dưới
    const maxItems = Math.min(
      Math.max(cfg.max_items_runtime ?? dcfg.maxItems ?? 50, 1), 1000,
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

    const caption = String(raw.text ?? raw.desc ?? "");
    const captionTags = extractHashtags(caption);

    // Ngoài ra còn có field hashtags[] (structured) do Apify parse sẵn (dạng object [{name}], gộp vào
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
        author_native_id: String(authorId),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        author_avatar_url: raw.authorMeta?.avatar ?? raw.authorMeta?.originalAvatarUrl ?? null,
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

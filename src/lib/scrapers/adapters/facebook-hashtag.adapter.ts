import type {
  ScraperAdapter,
  RuntimeRunConfig,
  BuiltActorInput,
  ParsedDatasetItem,
} from "../types";

/**
 * apify/facebook-hashtag-scraper
 * =========================================================
 * 💯 CHUẨN NHẤT cho mục đích CỦA TA:
 *   INPUT : danh sách hashtag (hashtags: ["#pod","#vape"])
 *   OUTPUT: MỌI BÀI VIẾT FACEBOOK (page, group, profile công khai...)
 *           MÀ CHỨA HASHTAG ĐÓ → có ngay post URL, metrics, author, text.
 *
 * Reference sample output (user cung cấp):
 *   { id, postId, url, user{id,name,profileUrl,profilePic}, date, text,
 *     attachments, likesCount, sharesCount, commentsCount }
 *
 * Input schema tham khảo (Actor này thường dùng field):
 *   hashtags: string[]               → #pod hoặc bỏ # cũng được
 *   maxPostCount?: number
 *   proxy?: ApifyProxyConfiguration
 */
const adapter: ScraperAdapter = {
  buildInput(cfg): BuiltActorInput {
    const dcfg: any = cfg.default_config || {};
    const maxItems = Math.min(
      Math.max(
        cfg.max_items_runtime ??
          dcfg.maxPostCount ??
          dcfg.resultsLimit ??
          50,
        1
      ),
      5000
    );
    const userHashtags = (cfg.hashtags || []).map((h) => h.hashtag_text);

    // merge default_config.hashtags + user chọn trong run
    const hashtags = Array.from(
      new Set([...(dcfg.hashtags || []), ...userHashtags])
    );

    const warnings: string[] = [];
    if (hashtags.length === 0) {
      warnings.push(
        "[warn] FACEBOOK_HASHTAG chưa có hashtag nào → Actor sẽ trả rỗng."
      );
    }

    const input = {
      hashtags,
      maxPostCount: maxItems,
      proxy: dcfg.proxy ?? {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
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

    const post_url = String(raw.url ?? raw.postUrl ?? "");
    if (!post_url) return fallback;

    const raw_user: any = raw.user || raw.owner || raw.profile || {};
    const author_native_id = String(
      raw_user.id ?? raw.ownerId ?? raw.profileId ?? post_url
    );
    const author_display = raw_user.name ?? raw_user.displayName ?? null;
    const author_avatar_url = raw_user.profilePic ?? raw_user.picture ?? null;

    const text = String(raw.text ?? raw.message ?? raw.description ?? "");

    return {
      normalized: {
        post_url,
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? post_url),
        author_native_id,
        author_display,
        author_avatar_url,
        published_at: raw.date || raw.time || raw.timestamp || raw.createdAt
          ? new Date(
              raw.date || raw.time || raw.timestamp || raw.createdAt
            ).toISOString()
          : null,
        raw_text: text,
        raw_payload: raw,
        metrics: {
          // 💯 dùng đúng field user cung cấp: likesCount / sharesCount / commentsCount
          like_count: safeNum(raw.likesCount ?? raw.likes ?? raw.reactionCount),
          comment_count: safeNum(raw.commentsCount ?? raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.sharesCount ?? raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractHashtags(text),
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

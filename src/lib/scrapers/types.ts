// ==========================================================
// Scraper Framework - Types (schema.sql chuẩn docs/)
// ==========================================================

export type Platform = "TIKTOK" | "FACEBOOK_PAGE" | "FACEBOOK_GROUP" | "FACEBOOK_SEARCH" | "FACEBOOK_HASHTAG" | "YOUTUBE";

export type RunStatus =
  | "PLANNED"
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export type MatchType = "CAPTION" | "SEARCH_HIT";

// ==========================================================
// Runtime context (đọc từ 2 bảng: collection_runs + apify_actors)
// ==========================================================
export interface RuntimeRunConfig {
  run_id: number;
  researcher_code: string;
  platform: Platform;
  actor_id: string;
  hashtags: { hashtag_id: number; hashtag_text: string }[];
  max_items_runtime?: number;       // maxItems user chọn trên UI
  query_group_id?: string | null;
  default_config: Record<string, any>; // apify_actors.default_config JSON
}

// ==========================================================
// Normalized Post (platform agnostic - insert vào posts)
// Lưu ý: post_id = sha256(post_url), author_hash = sha256(platform:native_id)
// ==========================================================
export interface NormalizedPost {
  post_url: string;
  platform: Platform;
  native_post_id: string;           // TikTok id, facebookId, youtube video id
  author_native_id: string;         // author native id (dùng hash ẩn danh)
  author_display?: string | null;   // không lưu vào DB, chỉ để debug
  author_avatar_url?: string | null;
  published_at: string | null;      // ISO
  raw_text: string;                 // caption / title + description
  raw_payload: any;                 // JSON gốc Apify (KHÔNG parse)
  metrics: {
    view_count?: number | null;
    like_count?: number | null;
    comment_count?: number | null;
    share_count?: number | null;
  };
}

// ==========================================================
// Output 1: Actor payload (gửi lên POST /v2/acts/<actor_id>/runs)
// ==========================================================
export interface BuiltActorInput {
  input: Record<string, any>;
  warnings: string[];               // log những thứ config thiếu (VD FB chưa điền startUrls)
}

// ==========================================================
// Output 2: Item được parse từ dataset
// ==========================================================
export interface ParsedDatasetItem {
  normalized: NormalizedPost | null;      // null = bỏ qua (ví dụ comment item riêng)
  caption_hashtags: string[];             // hashtags parse trong raw_text/caption (có dấu #)
  search_hashtag_ids: number[];           // các hashtag_id user chọn trên UI (SEARCH_HIT)
  discovery_order: number;                // 1-based order trong dataset (vị trí trên trang kết quả)
}

// ==========================================================
// Mỗi adapter (1 cho mỗi actor_id) implement 2 hàm:
//   buildInput   : (config + default_config JSON) => payload gửi Apify
//   parseOneItem : (raw item, thứ tự trong dataset) => ParsedDatasetItem
//   validateConfig: (config) => string[] lỗi (rỗng = OK)
// ==========================================================
export interface ScraperAdapter {
  buildInput(cfg: RuntimeRunConfig): BuiltActorInput;
  parseOneItem(raw: any, index: number, cfg: RuntimeRunConfig): ParsedDatasetItem;
  validateConfig?(cfg: RuntimeRunConfig): string[];
}

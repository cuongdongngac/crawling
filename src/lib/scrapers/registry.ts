// ==========================================================
// Scraper Adapter Registry
// Map actor_id => ScraperAdapter
// ==========================================================

import tiktokAdapter from "./adapters/tiktok.adapter";
import tiktokHashtagAdapter from "./adapters/clockworks-tiktok-hashtag.adapter";
import fbAdapter from "./adapters/facebook-pages.adapter";
import fbSearchAdapter from "./adapters/facebook-search.adapter";
import fbHashtagAdapter from "./adapters/facebook-hashtag.adapter";
import ytAdapter from "./adapters/youtube-comments.adapter";
import type { ScraperAdapter } from "./types";

const REGISTRY: Record<string, ScraperAdapter> = {
  "clockwork/tiktok-scraper": tiktokAdapter,
  "clockworks/tiktok-hashtag-scraper": tiktokHashtagAdapter,
  "apify/facebook-pages-scraper": fbAdapter,
  "alexey/facebook-search-scraper": fbSearchAdapter,
  "apify/facebook-search-scraper": fbSearchAdapter,
  "apify/facebook-hashtag-scraper": fbHashtagAdapter,
  "streamer/youtube-scraper": ytAdapter,
};

export function getAdapter(actorId: string): ScraperAdapter | null {
  return REGISTRY[actorId] ?? null;
}

/**
 * Build Apify actor input payload (được gọi trước khi POST /v2/acts/{actorId}/runs)
 */
export function buildApifyInput(
  cfg: Parameters<NonNullable<ScraperAdapter["buildInput"]>>[0]
) {
  const adapter = getAdapter(cfg.actor_id);
  if (!adapter) {
    throw new Error(
      `[scrapers] Không có adapter nào đăng ký cho actor_id: ${cfg.actor_id}. Vui lòng thêm adapter vào REGISTRY.`
    );
  }
  const built = adapter.buildInput(cfg);
  const validationErrors = adapter.validateConfig ? adapter.validateConfig(cfg) : [];
  return {
    input: built.input,
    warnings: Array.from(new Set([...(built.warnings || []), ...validationErrors])),
  };
}

/**
 * Parse 1 lô raw dataset items của 1 run
 */
export function parseDataset(
  actorId: string,
  rawItems: any[],
  cfg: Parameters<NonNullable<ScraperAdapter["parseOneItem"]>>[2]
) {
  const adapter = getAdapter(actorId);
  if (!adapter) {
    throw new Error(`[scrapers] Không có adapter nào đăng ký cho actor_id: ${actorId}.`);
  }
  const out = [];
  for (let i = 0; i < (rawItems || []).length; i++) {
    out.push(adapter.parseOneItem(rawItems[i], i, cfg));
  }
  return out;
}

// ==========================================================
// Helpers chung (SHA256 post_id / author_hash)
// ==========================================================
import { createHash } from "node:crypto";

export function sha256hex(str: string): string {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

export function hashPostId(post_url: string): string {
  return sha256hex(String(post_url || "").trim());
}

export function hashAuthor(platform: string, native_author_id: string): string {
  return sha256hex(`${String(platform || "").toUpperCase()}:${String(native_author_id || "").trim()}`);
}

export default REGISTRY;

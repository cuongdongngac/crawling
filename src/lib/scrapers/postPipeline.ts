// ==========================================================
// Post Processing Pipeline (không ghi DB - Test + Worker dùng chung)
// ==========================================================
// Pipeline xử lý item đã parse xong, theo đúng thứ tự:
//
//   1. ENRICH (bổ sung post_id & author_hash)
//        post_id      = sha256(post_url)           (UNIQUE trên posts)
//        author_hash  = sha256(platform:native_id) (UNIQUE trên authors)
//
//   2. FILTER NGÔN NGỮ
//        Chỉ giữ item thuộc whitelist (mặc định ["vi"] cho dự án VN M&E).
//        Trả về danh sách "bị loại kèm lý do" để log / báo cáo.
//
//   3. DEDUPLICATION
//        Gộp các item có cùng (platform, native_post_id) thành 1 mục.
//        Lý do: Một bài viết có nhiều hashtag → scrape nhiều lần (theo từng
//        hashtag group) sẽ gây TRÙNG NHAU. Cần merge search_hashtag_ids.
//
// ==========================================================
import { hashAuthor, hashPostId } from "./registry";
import { filterItemsByLanguage, detectLanguage } from "./languageFilter";
import type { ParsedDatasetItem } from "./types";

export interface EnrichedPost extends ParsedDatasetItem {
  post_id: string | null;
  author_hash: string | null;
  _language: ReturnType<typeof detectLanguage> | null;
}

export interface PipelineResult {
  /** Các item đã enrich, đã pass filter ngôn ngữ, đã dedupe (OK để ingest) */
  finalized: EnrichedPost[];
  /** Báo cáo chi tiết từng bước (dùng để in log / debug) */
  report: PipelineReport;
}

export interface PipelineReport {
  totalRaw: number;
  skippedNullNormalized: number;
  /** step 1 enrich: số post_id bị null (url lỗi) */
  enrichmentErrors: number;
  /** step 2 ngôn ngữ */
  languageRemoved: { idx: number; native_post_id: string | null; lang: string; score: number; url: string | null }[];
  /** step 3 dedupe: key = post_id, giá trị = các record bị loại do trùng */
  dedupeRemoved: {
    keptPostId: string;
    removedNativeIds: string[];
    mergedSearchIds: number[];
  }[];
  /** final (sau cả 3 bước) */
  finalCount: number;
  languageDistribution: Record<string, number>;
}

export interface PipelineOptions {
  /** Mảng ngôn ngữ được phép, mặc định ["vi"] */
  allowLangs?: string[];
  /** true = bỏ qua bước lọc ngôn ngữ */
  skipLanguageFilter?: boolean;
  /** true = bỏ qua dedupe */
  skipDedupe?: boolean;
  /** Level log in ra console (bật khi CLI test) */
  verbose?: boolean;
}

export function runPostPipeline(
  rawItems: ParsedDatasetItem[],
  opts: PipelineOptions = {},
): PipelineResult {
  const allow = opts.allowLangs?.length ? opts.allowLangs : ["vi"];
  const report: PipelineReport = {
    totalRaw: rawItems.length,
    skippedNullNormalized: 0,
    enrichmentErrors: 0,
    languageRemoved: [],
    dedupeRemoved: [],
    finalCount: 0,
    languageDistribution: {},
  };

  // Bước 0: bỏ item normalized=null (không hợp lệ)
  const valid: EnrichedPost[] = [];
  for (const it of rawItems) {
    if (!it.normalized) {
      report.skippedNullNormalized++;
      continue;
    }
    // Bước 1: enrich id / hash
    const post_id = it.normalized.post_url ? hashPostId(it.normalized.post_url) : null;
    const author_hash = it.normalized.platform && it.normalized.author_native_id
      ? hashAuthor(it.normalized.platform, it.normalized.author_native_id)
      : null;
    if (!post_id || !author_hash) report.enrichmentErrors++;

    valid.push({ ...it, post_id, author_hash, _language: null });
  }

  // Bước 2: lọc ngôn ngữ (nếu ko skip)
  let afterLang: EnrichedPost[] = valid;
  if (!opts.skipLanguageFilter) {
    const langResults = filterItemsByLanguage(valid.map((v) => v), allow);
    // gắn detection vào từng item
    afterLang = [];
    for (let i = 0; i < langResults.length; i++) {
      const lr = langResults[i];
      const post = valid[i];
      post._language = lr.detected;
      const lng = lr.detected.lang;
      report.languageDistribution[lng] = (report.languageDistribution[lng] || 0) + 1;
      if (lr.passed) {
        afterLang.push(post);
      } else {
        report.languageRemoved.push({
          idx: i,
          native_post_id: post.normalized?.native_post_id ?? null,
          lang: lng,
          score: lr.detected.score,
          url: post.normalized?.post_url ?? null,
        });
      }
    }
  } else {
    // Phân bổ detection cho thống kê thôi
    for (const p of afterLang) {
      const det = detectLanguage(p.normalized?.raw_text ?? "");
      p._language = det;
      report.languageDistribution[det.lang] = (report.languageDistribution[det.lang] || 0) + 1;
    }
  }

  // Bước 3: dedupe theo (platform, native_post_id)
  let finalList: EnrichedPost[] = afterLang;
  if (!opts.skipDedupe) {
    const byKey = new Map<string, EnrichedPost[]>();
    for (const p of afterLang) {
      if (!p.normalized) continue;
      const key = `${p.normalized.platform}::${p.normalized.native_post_id || p.post_id}`;
      const arr = byKey.get(key) || [];
      arr.push(p);
      byKey.set(key, arr);
    }
    finalList = [];
    for (const [key, group] of byKey.entries()) {
      if (group.length === 1) {
        finalList.push(group[0]);
        continue;
      }
      // Group có nhiều hơn 1 → giữ cái đầu, gộp search_hashtag_ids & caption_hashtags
      const kept = { ...group[0] };
      kept.search_hashtag_ids = Array.from(new Set(group.flatMap((g) => g.search_hashtag_ids || [])));
      kept.caption_hashtags = Array.from(new Set(group.flatMap((g) => g.caption_hashtags || [])));
      // Lấy discovery_order sớm nhất
      kept.discovery_order = Math.min(...group.map((g) => g.discovery_order ?? 0));
      finalList.push(kept);
      report.dedupeRemoved.push({
        keptPostId: kept.post_id || key,
        removedNativeIds: group.slice(1).map((g) => g.normalized?.native_post_id ?? "(null)"),
        mergedSearchIds: kept.search_hashtag_ids,
      });
    }
  }

  report.finalCount = finalList.length;
  return { finalized: finalList, report };
}

/**
 * In báo cáo pipeline ra console (cho CLI test thu).
 */
export function printPipelineReport(pipeline: PipelineResult, platform: string): void {
  const R = pipeline.report;
  console.log(`\n==========================================\n  POST PIPELINE REPORT (${platform})\n==========================================`);
  console.log(`Tổng item raw vào pipeline      : ${R.totalRaw}`);
  console.log(`Bỏ normalized = null            : ${R.skippedNullNormalized}`);
  console.log(`Enrich lỗi (không có url/author): ${R.enrichmentErrors}`);
  console.log(`Phân bổ ngôn ngữ detection      : ${JSON.stringify(R.languageDistribution, null, 0)}`);
  console.log(`Bộ lọc ngôn ngữ LOẠI            : ${R.languageRemoved.length}`);
  for (const lr of R.languageRemoved) {
    const urlShort = (lr.url || "").slice(0, 80);
    console.log(`   ↳ [${lr.lang} score=${lr.score}] ${urlShort}`);
  }
  console.log(`Dedupe LOẠI (bài viết trùng)    : ${R.dedupeRemoved.reduce((s, d) => s + d.removedNativeIds.length, 0)} record (${R.dedupeRemoved.length} nhóm)`);
  for (const d of R.dedupeRemoved.slice(0, 5)) {
    console.log(`   ↳ giữ ${d.keptPostId.slice(0, 12)}... bỏ ${d.removedNativeIds.join(", ")}, merge hashtag_ids=[${d.mergedSearchIds}]`);
  }
  console.log(`→ Số bài viết FINAL (sẵn sàng ingest): ${R.finalCount}\n`);
}

export default { runPostPipeline, printPipelineReport };

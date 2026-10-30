This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
docs/
  01_architecture_and_decisions.md
  02_data_dictionary.md
  03_handover.md
  04_gap_analysis.md
  apify_integration_architecture.docx
  schema.sql
  shema.png
public/
  file.svg
  globe.svg
  next.svg
  vercel.svg
  window.svg
scripts/
  lib/
    post-pipeline.cjs
  test-adapter-core.js
  worker.js
src/
  app/
    actions/
      auth.ts
      test-adapter.ts
      user.ts
    auth/
      signout/
        route.ts
    dashboard/
      actors/
        page.tsx
      hashtag-groups/
        page.tsx
      hashtags/
        page.tsx
      profile/
        page.tsx
      researchers/
        [id]/
          page.tsx
        page.tsx
      scraping/
        page.tsx
      settings/
        page.tsx
      users/
        page.tsx
      layout.tsx
      page.tsx
    login/
      page.tsx
    setup/
      page.tsx
    favicon.ico
    globals.css
    layout.tsx
    page.tsx
  components/
    ui/
      button.tsx
    ActorTable.tsx
    AdminUserList.tsx
    DashboardHeader.tsx
    HashtagGroupTable.tsx
    HashtagTable.tsx
    HeaderMenu.tsx
    ProfileForm.tsx
    ScopeConfigForm.tsx
    ScrapingStudio.tsx
    SettingsForm.tsx
  lib/
    scrapers/
      adapters/
        clockworks-tiktok-hashtag.adapter.ts
        facebook-hashtag.adapter.ts
        facebook-pages.adapter.ts
        facebook-search.adapter.ts
        tiktok.adapter.ts
        youtube-comments.adapter.ts
      languageFilter.ts
      postPipeline.ts
      registry.ts
      types.ts
    utils.ts
  utils/
    supabase/
      client.ts
      middleware.ts
      server.ts
  middleware.ts
.gitignore
.repomixignore
AGENTS.md
CLAUDE.md
components.json
create_settings.js
eslint.config.mjs
md.bat
next.config.ts
package.json
postcss.config.mjs
README.md
scraper-framework-research.md
seed.js
setup.mjs
tsconfig.json
````

# Files

## File: scripts/lib/post-pipeline.cjs
````javascript
"use strict";
/*
 * Post pipeline dùng chung (CommonJS) cho scripts/worker.js và scripts/test-adapter-core.js.
 *  - detectLang(): heuristic nhận diện ngôn ngữ, không phụ thuộc thư viện ngoài (DEC-H2)
 *  - runPostPipeline(): enrich post_id/author_hash -> lọc ngôn ngữ -> dedupe (platform, native_post_id)
 * Bản TypeScript tương ứng: src/lib/scrapers/languageFilter.ts + postPipeline.ts
 */
const crypto = require("node:crypto");

function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}
function postId(url) {
  return sha256hex(String(url || "").trim());
}
function authorHash(platform, nativeId) {
  return sha256hex(String(platform || "").toUpperCase() + ":" + String(nativeId || "").trim());
}

const VI_STOP = new Set(["và","hoặc","nhưng","mà","vì","của","trong","từ","trên","dưới","với","bằng","là","đã","sẽ","đang","không","cũng","chỉ","rất","thì","nên","một","nhiều","các","đây","đó","khi","nếu","tôi","bạn","anh","em","chúng","ta","họ","này","kia","được","ở","ngay","luôn","quá","thôi","cho","như","vào","ra","lại","hơn","khoa","nghien","cuu","tam","vat","ly","chat","luong","hap"]);
const EN_STOP = new Set(["the","and","for","are","but","not","you","all","any","can","had","her","was","one","our","out","day","get","has","him","his","how","man","new","now","old","see","two","way","who","boy","did","its","let","put","say","she","too","use","this","that","with","from","they","been","have","were","will","your","just","like","very","make","over","such","know","take","than","want","come","life","vape","vaping","smoke","tobacco","e-cig","ecigarette","ejuice","juul","nord","suorin","pod","cigarette","smoking","puff","flavor"]);
const RE_HANGUL = /[\uAC00-\uD7AF]/;
const RE_KANA   = /[\u3040-\u309F\u30A0-\u30FF]/;
const RE_HANZI  = /[\u4E00-\u9FFF]/;
const RE_CYRILLIC = /[\u0400-\u04FF]/;
const RE_THAI   = /[\u0E00-\u0E7F]/;
const RE_ARABIC = /[\u0600-\u06FF]/;
const RE_VI_DIAC = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]/;
const RE_LATIN  = /[A-Za-z]/;

function detectLang(rawText) {
  const text = String(rawText || "").normalize("NFKC");
  const lowerNoPunct = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = lowerNoPunct.split(/\s+/).filter(Boolean);
  const letterOnly = Array.from(text).filter((c) => /\p{L}/u.test(c));
  const total = letterOnly.length;
  const cnt = (re) => letterOnly.filter((c) => re.test(c)).length;
  const viDia = cnt(RE_VI_DIAC), han = cnt(RE_HANZI), hangul = cnt(RE_HANGUL),
    kana = cnt(RE_KANA), cyr = cnt(RE_CYRILLIC), latin = cnt(RE_LATIN),
    thai = cnt(RE_THAI), arab = cnt(RE_ARABIC);
  const pct = (n) => total === 0 ? 0 : (n / total) * 100;
  if (total === 0 || tokens.length === 0) return { lang: "other", score: 0, detail: { total: 0 } };
  if (pct(hangul) >= 15) return { lang: "ko", score: Math.round(Math.min(99, pct(hangul) * 2 + 30)), detail: { hangul: pct(hangul) } };
  if (pct(kana) >= 10)   return { lang: "ja", score: Math.round(Math.min(99, pct(kana) * 2 + 30)), detail: { kana: pct(kana) } };
  if (pct(cyr) >= 30)    return { lang: "ru", score: Math.round(Math.min(99, pct(cyr) * 2)), detail: { cyr: pct(cyr) } };
  if (pct(thai) >= 20)   return { lang: "thai", score: Math.round(Math.min(99, pct(thai) * 2 + 10)), detail: { thai: pct(thai) } };
  if (pct(arab) >= 20)   return { lang: "ar", score: Math.round(Math.min(99, pct(arab) * 2 + 10)), detail: { arab: pct(arab) } };
  if (pct(han) >= 40)    return { lang: "zh", score: Math.round(Math.min(99, pct(han) * 1.5)), detail: { han: pct(han) } };
  // Dấu tiếng Việt (ơ, ư, đ, ă, dấu thanh) gần như không xuất hiện trong tiếng Anh:
  // >= 2 ký tự và >= 5% chữ cái là đủ chắc chắn tiếng Việt (tránh câu ngắn bị nhận nhầm EN).
  if (viDia >= 2 && pct(viDia) >= 5) return { lang: "vi", score: Math.min(99, Math.round(50 + pct(viDia))), detail: { viDiaPct: Math.round(pct(viDia)), rule: "vi-diacritics" } };
  let viS = 0, enS = 0;
  viS += Math.min(35, pct(viDia) * 2.2);
  enS += Math.max(0, pct(latin) - pct(viDia) - 5);
  let viH = 0, enH = 0;
  for (const t of tokens) {
    const tn = t.trim();
    if (tn.length < 2) continue;
    if (VI_STOP.has(tn)) viH++;
    if (EN_STOP.has(tn)) enH++;
  }
  // Heuristic "pure hashtags": caption chỉ toàn hashtag ngắn → người Việt gõ không dấu
  const allTokensStartWithHash = (tokens.length >= 2) && tokens.every((t) => {
    const raw = text.toLowerCase().split(/\s+/).find((x) => x.replace(/^#+/, "") === t);
    return raw && raw.startsWith("#");
  });
  const hashtagOnly = text.startsWith("#") || (tokens.every((t) => t.length <= 8) && viDia === 0 && total < 30);
  const pureHashtags = allTokensStartWithHash || hashtagOnly;
  const hw = tokens.length >= 4 ? Math.min(100, tokens.length * 6) : 15;
  viS += (viH / Math.max(1, tokens.length)) * hw;
  enS += (enH / Math.max(1, tokens.length)) * hw;
  // Rule đặc biệt: pure hashtags + không dấu VI + chủ yếu Latin → classify "other" (tránh EN loại nhầm)
  if (pureHashtags && viDia === 0 && pct(latin) >= 70) {
    return { lang: "other", score: Math.round(Math.min(40, Math.max(5, 30 - tokens.length))), detail: { viScore: Math.round(viS), enScore: Math.round(enS), viDiaPct: Math.round(pct(viDia)), tokens: tokens.length, viH, enH, pureHashtagsFlag: 1 } };
  }
  const detail = { viScore: Math.round(viS), enScore: Math.round(enS), viDiaPct: Math.round(pct(viDia)), hanPct: Math.round(pct(han)), tokens: tokens.length, viH, enH, hashOnly: hashtagOnly ? 1 : 0 };
  if (viS >= enS && viS >= 8) return { lang: "vi", score: Math.min(99, Math.round(viS + (viDia > 0 ? 15 : 0))), detail };
  if (enS >= 10) return { lang: "en", score: Math.min(99, Math.round(enS)), detail };
  if (pct(han) >= 10) return { lang: "zh", score: Math.min(99, Math.round(pct(han) * 1.5)), detail };
  if (hashtagOnly) return { lang: "other", score: 10, detail };
  return { lang: "other", score: Math.max(5, Math.round(enS)), detail };
}

// ---------------- Post Pipeline CLI (enrich + lang filter + dedupe + report) ----------------
function runCliPipeline(parsedItems, { allowLangs, skipLang, skipDedupe }) {
  const allowSet = new Set((allowLangs || ["vi"]).map((l) => l.toLowerCase()));
  const report = {
    totalRaw: parsedItems.length, skippedNullNormalized: 0, langRemoved: [],
    dedupeRemoved: [], finalCount: 0, langDistribution: {},
  };
  // Bỏ normalized null
  const valid = [];
  for (const it of parsedItems) {
    if (!it.normalized) { report.skippedNullNormalized++; continue; }
    const n = it.normalized;
    const post_id = postId(n.post_url);
    const author_hash = authorHash(n.platform, n.author_native_id);
    valid.push({ ...it, post_id, author_hash, _lang: null });
  }
  // Lọc ngôn ngữ
  let afterLang = valid;
  if (!skipLang) {
    const kept = [];
    for (let i = 0; i < valid.length; i++) {
      const p = valid[i];
      const det = detectLang(p.normalized.raw_text || "");
      p._lang = det;
      report.langDistribution[det.lang] = (report.langDistribution[det.lang] || 0) + 1;
      if (allowSet.has(det.lang)) kept.push(p);
      else report.langRemoved.push({ idx: i, native_post_id: p.normalized.native_post_id || null, lang: det.lang, score: det.score, url: (p.normalized.post_url || "").slice(0, 80) });
    }
    afterLang = kept;
  } else {
    for (const p of afterLang) {
      const det = detectLang(p.normalized.raw_text || "");
      p._lang = det;
      report.langDistribution[det.lang] = (report.langDistribution[det.lang] || 0) + 1;
    }
  }
  // Dedupe theo (platform, native_post_id)
  let finalList = afterLang;
  if (!skipDedupe) {
    const byKey = new Map();
    for (const p of afterLang) {
      const key = `${p.normalized.platform}::${p.normalized.native_post_id || p.post_id}`;
      const arr = byKey.get(key) || [];
      arr.push(p);
      byKey.set(key, arr);
    }
    finalList = [];
    for (const [key, group] of byKey.entries()) {
      if (group.length === 1) { finalList.push(group[0]); continue; }
      const kept = { ...group[0] };
      kept.search_hashtag_ids = Array.from(new Set(group.flatMap((g) => g.search_hashtag_ids || [])));
      kept.caption_hashtags   = Array.from(new Set(group.flatMap((g) => g.caption_hashtags || [])));
      kept.discovery_order    = Math.min(...group.map((g) => g.discovery_order || 0));
      finalList.push(kept);
      report.dedupeRemoved.push({
        keptPostId: (kept.post_id || key).slice(0, 14) + "...",
        removedCount: group.length - 1,
        mergedHashtags: kept.caption_hashtags.slice(0, 8),
      });
    }
  }
  report.finalCount = finalList.length;
  return { finalized: finalList, report };
}

module.exports = {
  sha256hex,
  postId,
  authorHash,
  detectLang,
  runPostPipeline: runCliPipeline,
  runCliPipeline,
};
````

## File: .repomixignore
````
# Next.js
.next/
out/
build/
node_modules/

# C# .NET / WPF
bin/
obj/
TestResults/
*.suo
*.user
````

## File: md.bat
````batch
repomix --style markdown --output codebase.md
````

## File: docs/01_architecture_and_decisions.md
````markdown
# Kiến trúc Hệ thống và Sổ bộ Quyết định Kỹ thuật (ADR)

## 1. Ranh giới hệ thống (Bounded Context)
- **Hệ thống Ingestion & Storage:** Đảm nhận việc thu gom dữ liệu, khử trùng lặp, lưu trữ chuỗi thời gian tương tác, truy vết nguồn gốc thu thập và xuất dataset sạch.
- **Hệ thống Phân tích Downstream:** Tiếp nhận dữ liệu sạch để chạy mô hình AI/NLP, hồi quy thống kê trên R, SPSS, Stata. Không ôm đồm logic phân loại phức tạp vào database thu thập.

## 2. Bảng quyết định thiết kế (Design Decisions)
- **DEC-001 (Bình luận):** Không lưu bảng bình luận chi tiết đại trà nhằm bảo vệ quyền riêng tư vị thành niên (Nghị định 13/2023/NĐ-CP) và tiết kiệm chi phí. Chỉ lưu tổng `comment_count` trong snapshot; nghiên cứu sâu thực hiện qua link gốc.
- **DEC-002 (Chuỗi thời gian tương tác):** Bảng `post_snapshots` chỉ thực hiện `INSERT`, không bao giờ `UPDATE`. Bảo toàn lịch sử đo lường để tính `engagement_growth_rate`.
- **DEC-003 (Phân kỳ nghiên cứu):** `study_phase` và `days_from_intervention` được tính toán tự động qua SQL View dựa trên `published_at` so với `intervention_date`.
- **DEC-004 (Trùng lặp nội dung):** Không xóa các bài có nội dung trùng lặp (`similarity > 0.9`). Gán mã cụm `content_cluster_id` để nhận diện mạng lưới bot/seeding.
- **DEC-005 (Tách tầng Danh mục):** Cố định `hashtag_groups` để bảo đảm tính so sánh dọc qua 18 tháng; `hashtags` là danh mục sống có thể bật/tắt.
- **DEC-006 (Quản lý từ khóa đầu vào):** Bỏ workflow đề xuất online. Hội đồng duyệt giấy bên ngoài; Admin nhập trực tiếp vào hệ thống.
- **DEC-013 (Khóa chính bài viết):** Sử dụng chuỗi băm SHA-256 của URL làm khóa chính `post_id`. Lưu kèm `post_url` để kiểm chứng thực địa. Nếu đổi URL dẫn đến đổi mã băm thì chấp nhận coi là bài đăng mới.
- **DEC-H1 (Hashtag-only Input Scope — Thống nhất 2026-10-08):** Toàn bộ hệ thống **chỉ thu thập theo hashtag/từ khóa đầu vào** (không quét theo author/fanpage/user profile cố định, không cho phép researcher submit list page URL riêng lẻ ngoài `startUrls[]` tối thiểu của FB Pages actor). Đối chiếu 4 nhóm hashtag cố định (DEC-005) làm đơn vị phân tích ITS. Danh sách actor ưu tiên:
  1. `clockworks/tiktok-hashtag-scraper` → input field `hashtags: string[]`
  2. `apify/facebook-hashtag-scraper` → input field `hashtags: string[]`
  3. Các actor FB Search / FB Page / YouTube còn lại dùng searchWords/queries/searchTerms **chứa hashtag** làm keyword fallback.
- **DEC-H2 (Language Filter Zero-Dependency):** Bộ lọc ngôn ngữ dùng **Heuristic rule** (Unicode block + stopwords VI/EN siêu nhỏ + pure-hashtag heuristic), **KHÔNG gọi LLM per-item, KHÔNG thêm thư viện bên thứ ba**. Lý do: chạy được trên PM2 worker, không tạo phụ thuộc network ngoài Apify + Supabase, chi phí 0, tốc độ ổn định cho ~10 000 item/run. Whitelist mặc định = `["vi"]`. Các bài classify=`other` (caption chỉ toàn hashtag không dấu) ở giai đoạn đầu có thể tạm đưa vào whitelist kèm cờ để review định tính.
````

## File: docs/02_data_dictionary.md
````markdown
# Từ điển Dữ liệu (Data Dictionary)

### 1. `project_config`
- `config_id` (VARCHAR(50), PK): Mã định danh cấu hình (Mặc định: 'MAIN_STUDY').
- `project_name` (TEXT): Tên đề tài nghiên cứu.
- `intervention_date` (DATE): Ngày Nghị định cấm có hiệu lực pháp lý (Mốc can thiệp ITS).
- `updated_at` (TIMESTAMPTZ): Thời điểm cập nhật mốc cấu hình.

### 2. `hashtag_groups`
- `group_id` (VARCHAR(30), PK): Mã nhóm cố định (`COMMERCIAL`, `LIFESTYLE`, `EVASION`, `WARNING`).
- `group_name` (VARCHAR(100)): Tên hiển thị tiếng Việt.
- `description` (TEXT): Tiêu chí định tính phân loại nhóm.
- `created_at` (TIMESTAMPTZ): Thời điểm khởi tạo.

### 3. `hashtags`
- `hashtag_id` (BIGSERIAL, PK): Khóa tự tăng.
- `group_id` (VARCHAR(30), FK): Nhóm phân tích quy thuộc.
- `hashtag_text` (VARCHAR(100), UNIQUE): Từ khóa/hashtag chuẩn hóa viết thường.
- `keyword_track` (VARCHAR(20)): `FIXED` (bộ gốc giữ nguyên) hoặc `ADAPTIVE` (bộ thích ứng bổ sung).
- `is_active` (BOOLEAN): Trạng thái kích hoạt cào dữ liệu.
- `created_at` (TIMESTAMPTZ): Thời điểm tạo.

### 4. `collection_runs`
- `run_id` (BIGSERIAL, PK): Mã đợt cào dữ liệu.
- `researcher_code` (VARCHAR(50)): Mã nhân sự/đơn vị phụ trách đợt cào (Audit trail).
- `platform` (VARCHAR(30)): Nền tảng thực hiện (`TIKTOK`, `FACEBOOK_PAGE`, `FACEBOOK_GROUP`, `YOUTUBE`).
- `actor_name` (VARCHAR(100)): Tên công cụ/Actor Apify sử dụng.
- `query_parameters` (JSONB): Tham số từ khóa/bộ lọc nạp vào Actor.
- `started_at` (TIMESTAMPTZ): Thời điểm bắt đầu cào.
- `completed_at` (TIMESTAMPTZ): Thời điểm kết thúc.
- `items_count` (INTEGER): Tổng số bản ghi thô thu về.
- `status` (VARCHAR(20)): Trạng thái (`RUNNING`, `SUCCESS`, `FAILED`).

### 5. `posts`
- `post_id` (VARCHAR(64), PK): SHA-256 băm từ `post_url`.
- `platform` (VARCHAR(30)): Nền tảng mạng xã hội.
- `post_url` (TEXT): URL bài viết gốc.
- `author_hash` (VARCHAR(64)): Mã SHA-256 ẩn danh hóa tác giả.
- `published_at` (TIMESTAMPTZ): Thời điểm xuất bản gốc của bài viết.
- `raw_text` (TEXT): Toàn văn caption/nội dung bài viết.
- `raw_payload` (JSONB): Toàn bộ JSON gốc scraper trả về để đối soát.
- `content_cluster_id` (UUID): Mã cụm nội dung tương đồng (nhận diện bài seeding).
- `is_flagged` (BOOLEAN): Cờ đánh dấu cần xem xét sâu định tính.
- `flag_reason` (VARCHAR(255)): Lý do gắn cờ.
- `created_at` (TIMESTAMPTZ): Thời điểm nạp vào cơ sở dữ liệu.

### 6. `post_snapshots`
- `snapshot_id` (BIGSERIAL, PK): Khóa tự tăng.
- `post_id` (VARCHAR(64), FK): Trỏ về bài viết.
- `run_id` (BIGINT, FK): Trỏ về đợt cào thực hiện đo lường.
- `observed_at` (TIMESTAMPTZ): Thời điểm ghi nhận tương tác.
- `view_count` (BIGINT): Lượt xem tích lũy tại thời điểm đo.
- `like_count` (BIGINT): Lượt like tích lũy tại thời điểm đo.
- `comment_count` (BIGINT): Tổng bình luận tích lũy tại thời điểm đo.
- `share_count` (BIGINT): Lượt chia sẻ tích lũy tại thời điểm đo.

### 7. `post_hashtag_matches`
- `match_id` (BIGSERIAL, PK): Khóa tự tăng.
- `post_id` (VARCHAR(64), FK): Khóa ngoại bài viết.
- `hashtag_id` (BIGINT, FK): Khóa ngoại hashtag.
- `match_type` (VARCHAR(20)): `CAPTION` hoặc `SEARCH_HIT`.
- `matched_at` (TIMESTAMPTZ): Thời điểm khớp dữ liệu.
- Ràng buộc: `UNIQUE(post_id, hashtag_id)`.

### 8. `post_discoveries`
- `discovery_id` (BIGSERIAL, PK): Khóa tự tăng.
- `post_id` (VARCHAR(64), FK): Khóa ngoại bài viết.
- `run_id` (BIGINT, FK): Khóa ngoại đợt thu thập.
- `researcher_code` (VARCHAR(50)): Mã cộng tác viên phát hiện bài viết.
- `discovered_at` (TIMESTAMPTZ): Thời điểm phát hiện.
- Ràng buộc: `UNIQUE(run_id, post_id)`.
````

## File: docs/03_handover.md
````markdown
# Sổ tay Bàn giao (Handover) & Theo dõi Giai đoạn Dự án

> Cập nhật lần cuối: **2026-10-08**
> Chủ sở hữu: CuongPV + team nghiên cứu VPHA
> Mục đích: Dành cho người mới vào dự án, người review phiên tiếp theo, hoặc bàn giao giữa các phiên làm việc trên TRAE.

---

## 1. Tổng quan Dự án

**Tên:** VPHA Social Listening — M&E Thuốc lá điện tử (e-cig / vape / pod)
**Phương pháp nghiên cứu:** Interrupted Time Series (ITS) quanh ngày **Nghị định 13/2023/NĐ-CP** (ngày can thiệp `project_config.intervention_date`).
**Khoảng thời gian thu thập dự kiến:** ~18 tháng (trước + sau can thiệp).
**Nguồn dữ liệu:** Hashtag trên **TikTok, Facebook, YouTube** (thứ tự ưu tiên TikTok > Facebook > YouTube).

---

## 2. Giai đoạn hiện tại (NHẬN ĐỊNH NGÀY 2026-10-08)

### 🏁 **Giai đoạn 3 / 6: TEST THỬ ADAPTER CỐT LÕI (đang diễn ra)**

| Cột mốc | Tình trạng | Ghi chú |
|---|---|---|
| **G1. Kiến trúc & DB schema** | ✅ HOÀN THÀNH | ADR + schema.sql + data dictionary có sẵn |
| **G2. Xây dựng 6 adapters + Registry + Pipeline** | ✅ HOÀN THÀNH | `src/lib/scrapers/adapters/*`, `postPipeline.ts`, `languageFilter.ts` chạy được |
| **G3. TEST THỬ adapter cốt lõi (dry-run + run thật)** | 🟡 ĐANG THỰC HIỆN | `scripts/test-adapter-core.js` hoàn chỉnh; UI card test nhanh hoạt động |
| **G4. Tích hợp end-to-end (Worker + Ingest DB)** | ⚪ CHƯA CHẠY THẬT | Code `worker.js` xong nhưng cần test trên dòng QUEUED thật, cần lưu `APIFY_API_TOKEN` vào `system_settings` |
| **G5. Seed bộ hashtag nghiên cứu 4 nhóm cố định** | ⚪ CHƯA XONG | `seed.js` mới có 3 nhóm (COMMERCIAL/YOUTH/HEALTH), thiếu LIFESTYLE/EVASION/WARNING theo ADR DEC-005 |
| **G6. Thu thập ITS 18 tháng (production)** | ⚪ CHƯA BẮT ĐẦU | Chỉ bắt đầu sau khi G3 PASS + G4 PASS + G5 xong |

> **Kết luận:** Dự án đang ở **giai đoạn "test thử" đúng như bạn nhận định**. Adapter Framework (buildInput + parse + pipeline + dedupe + language filter) đã xong. Cần chạy `--dry-run` rồi chạy thật với 1-2 hashtag phổ biến (ví dụ `vape`, `pod`) để xác nhận payload và parser chuẩn trước khi đi vào giai đoạn 4.

---

## 3. Checklist hoạt động (đã làm / chưa làm)

### 3.1 Đã xong
- [x] Thiết kế DB 8+2 bảng: `project_config`, `hashtag_groups`, `hashtags`, `hashtag_group_mapping`, `apify_actors`, `collection_runs`, `posts`, `post_snapshots`, `post_hashtag_matches`, `post_discoveries`, `system_settings`, `post_hashtag_facts`, `hashtag_scan_events`, `profiles`.
- [x] Đăng ký 6 adapters + fallback default_config cho mỗi actor.
- [x] Heuristic language filter (VI ưu tiên, zero-dependency).
- [x] Post pipeline 3 bước: enrich SHA-256 → filter VI → dedupe (platform, native_post_id).
- [x] CLI `test-adapter-core.js` 7 chế độ actor (TikTok 2 loại, FB 4 loại, YouTube).
- [x] UI Login + Dashboard layout + Scraping Studio.
- [x] UI card "TEST NHANH ADAPTER CỐT LÕI" (không ghi DB).
- [x] UI Lên kế hoạch (create `collection_runs` QUEUED/RUNNING).
- [x] Worker `pollRunning()` + `dispatchQueued()` + `ingestRun()` 5 bảng.
- [x] Seed.js cho 6 actors + 6 hashtags mẫu + 3 groups mẫu.

### 3.2 CHƯA (Gap đã xác định — xem chi tiết [04_gap_analysis.md](file:///D:/vpha-social-listening-mne/web/docs/04_gap_analysis.md))
- [ ] **Chạy thật ít nhất 1 lần** `--tiktok-hashtag --max-items 5` ra NormalizedPost hợp lệ (post_url không null, published_at hợp lệ).
- [ ] **Chạy thật 1 lần worker** ingest: tạo dòng collection_runs QUEUED → `node scripts/worker.js --once` → verify `posts`, `post_snapshots`, `post_hashtag_facts`, `post_discoveries`, `hashtag_scan_events` có dữ liệu.
- [ ] Seed đúng 4 nhóm theo DEC-005 (COMMERCIAL / LIFESTYLE / EVASION / WARNING), seed bộ hashtag nghiên cứu thực tế (hội đồng duyệt giấy xác định).
- [ ] Seed `project_config` 1 dòng `MAIN_STUDY` + `intervention_date` thật của Nghị định 13.
- [ ] Cập nhật Data Dictionary phần collection_runs.platform enum: sửa `FACEBOOK_GROUP` → `FACEBOOK_HASHTAG` hoặc thêm `FACEBOOK_SEARCH` (hiện đang thiếu các platform chuẩn).
- [ ] Data Dictionary thêm 2 bảng `post_hashtag_facts` và `hashtag_scan_events` (chỉ có trong schema.sql, chưa định nghĩa trong `02_data_dictionary.md`).
- [ ] Test RLS policies (hoặc tắt nếu chưa cần) cho `profiles`, `posts` để Worker Service Role hoạt động đúng.
- [ ] Xác nhận Subscribe Apify actors trên console.apify.com (ít nhất 2 actor chuẩn hashtag: `clockworks/tiktok-hashtag-scraper` + `apify/facebook-hashtag-scraper`).
- [ ] Thiết lập PM2 + monitoring cho worker trên server thật.

---

## 4. Các lệnh chạy thường dùng (Quick Commands)

```powershell
# --- Khởi động dự án ---
cd D:\vpha-social-listening-mne\web
npm install        # chỉ cần 1 lần clone mới
npm run dev        # start http://localhost:3000

# --- Seed data ban đầu ---
node seed.js

# --- Test adapter (FREE, không tốn cost) ---
node scripts/test-adapter-core.js --tiktok-hashtag --dry-run
node scripts/test-adapter-core.js --facebook-hashtag --dry-run
node scripts/test-adapter-core.js --youtube --dry-run

# --- Test adapter CHẠY THẬT (tốn cost Apify, khuyến nghị max-items <= 5) ---
$env:APIFY_TOKEN="apify_api_XXXXXXXXXXXX"
node scripts/test-adapter-core.js --tiktok-hashtag --max-items 5
node scripts/test-adapter-core.js --facebook-hashtag --max-items 3

# --- Worker ingest (sau khi test adapter PASS) ---
# Trước tiên: vào /dashboard/settings → lưu APIFY_API_TOKEN, hoặc
#             trên dòng kế hoạch Scraping Studio điền token tạm thời.
node scripts/worker.js --once          # chạy 1 tick (test)

# --- Worker dài hạn ---
npm install -g pm2
pm2 start scripts/worker.js --name vpha-scrape-worker
pm2 logs vpha-scrape-worker --lines 200
pm2 status
pm2 save
```

---

## 5. Mục tiêu phiên làm việc TIẾP THEO (đề xuất)

1. 👉 **Dry-run build config** cho cả 2 actor chuẩn hashtag:
   ```powershell
   node scripts/test-adapter-core.js --tiktok-hashtag --dry-run
   node scripts/test-adapter-core.js --facebook-hashtag --dry-run
   ```
   → Xác nhận `input_payload` đúng field (hashtags: [] không chứa `#` thừa, maxItems đúng clamp).

2. 👉 **Chạy thật lần đầu** với `maxItems=1` và 1 hashtag phổ biến (ví dụ `vape`).

3. 👉 Sau khi parse được post hợp lệ → tạo dòng kế hoạch QUEUED trên UI → chạy `node scripts/worker.js --once` để verify ingest.

4. 👉 Bổ sung seed 4 nhóm cố định + bộ hashtag FIXED theo quyết định nghiên cứu.

---

## 6. Người liên hệ / phụ trách

| Nhiệm vụ | Người / nơi kiểm tra |
|---|---|
| Bộ hashtag nghiên cứu (FIXED + định nghĩa 4 nhóm) | Hội đồng duyệt giấy (ngoài hệ thống) → Admin nhập vào hashtags / hashtag_groups |
| Apify token + proxy Residential | Quản trị hệ thống → lưu vào `/dashboard/settings` |
| Nghệ thuật ITS + SQL VIEW study_phase | Nghiên cứu viên thống kê (khai thác từ bảng posts + post_snapshots sau khi có data) |
| Code adapters + worker | Dev (tiếp tục từ trạng thái hiện tại) |

---

## 7. Lịch sử phiên (Session History tóm tắt)

| Ngày | Mô tả ngắn |
|---|---|
| 2026-10-08 (1) | User xác định thư mục dự án `D:\vpha-social-listening-mne\web`. Bàn về TRAE IDE behavior (mở folder → mất chat). |
| 2026-10-08 (2) | Mở folder thành công, phân tích cấu trúc Next.js + Supabase + 6 adapters. |
| 2026-10-08 (3) | User xác nhận **"chỉ quét hashtag thôi"** → review toàn bộ codebase, bổ sung README, 03_handover, 04_gap_analysis, cập nhật ADR. Hiện tại đang ở giai đoạn TEST THỬ adapter cốt lõi. |
````

## File: docs/04_gap_analysis.md
````markdown
# Danh sách Gap / Rủi ro / Mục cần hoàn thiện

> Mục đích: Liệt kê cụ thể những điểm còn thiếu, không đồng bộ, hoặc cần kiểm chứng trước khi chuyển sang **Giai đoạn 4 (Worker Ingest Thật)** và **Giai đoạn 6 (Production ITS 18 tháng)**.

---

## Cấp độ ưu tiên

| Mức | Ý nghĩa |
|---|---|
| **P0 — Bắt buộc** | Phải làm trước khi Giai đoạn 4 (E2E ingest). Không làm = crash hoặc sai data. |
| **P1 — Quan trọng** | Nên làm trước Giai đoạn 4 hoặc ngay sau khi chạy 1 worker test đầu tiên. |
| **P2 — Tối ưu** | Có thể làm sau, trước production G6. |

---

## 1. Gap về Tài liệu & Schema đồng bộ (P1)

| # | Gap | Vị trí hiện tại | Đề xuất sửa |
|---|---|---|---|
| G-01 | **collection_runs.platform CHECK constraint** trong schema.sql chỉ liệt kê `TIKTOK, FACEBOOK_PAGE, FACEBOOK_GROUP, YOUTUBE` → thiếu `FACEBOOK_SEARCH`, `FACEBOOK_HASHTAG` (hai nền tảng chính của scope hashtag-only). | [schema.sql](file:///D:/vpha-social-listening-mne/web/docs/schema.sql#L47) + [02_data_dictionary.md](file:///D:/vpha-social-listening-mne/web/docs/02_data_dictionary.md#L26) | Cập nhật enum/constraint 2 nơi: `TIKTOK, FACEBOOK_PAGE, FACEBOOK_SEARCH, FACEBOOK_HASHTAG, YOUTUBE`. Xóa `FACEBOOK_GROUP` (không dùng, không có adapter). |
| G-02 | **Data Dictionary 02_data_dictionary.md** thiếu định nghĩa 2 bảng: `post_hashtag_facts`, `hashtag_scan_events` (có trong schema.sql + worker.js `ingestRun()` đang insert). | [02_data_dictionary.md](file:///D:/vpha-social-listening-mne/web/docs/02_data_dictionary.md) | Thêm 2 mục mô tả theo chuẩn `02_data_dictionary.md`: PK (composite), FK, match_type (CAPTION/SEARCH_HIT), first_seen_run_id, discovery_order. |
| G-03 | **Seed groups sai với DEC-005**: DEC-005 nói 4 nhóm cố định `COMMERCIAL / LIFESTYLE / EVASION / WARNING`; nhưng `seed.js` mới seed `COMMERCIAL / YOUTH / HEALTH` (3 nhóm khác tên). | [seed.js L86-90](file:///D:/vpha-social-listening-mne/web/seed.js#L86-L90) + [01_architecture_and_decisions.md DEC-005](file:///D:/vpha-social-listening-mne/web/docs/01_architecture_and_decisions.md#L12) | Đổi tên trong seed.js theo đúng chuẩn DEC-005 + mô tả tiếng Việt rõ ràng cho LIFESTYLE (= hành vi giới trẻ), EVASION (= né luật / lách luật), WARNING (= cảnh báo, y tế). |
| G-04 | **README gốc rỗng** (chứa `# crawling`). | [README.md](file:///D:/vpha-social-listening-mne/web/README.md) | ✅ **ĐÃ SỬA trong phiên ngày 2026-10-08.** |
| G-05 | Thiếu tài liệu bàn giao (handover) theo phiên. | docs/ | ✅ **ĐÃ TẠO `docs/03_handover.md` ngày 2026-10-08.** |
| G-06 | Thiếu danh sách gap/risk tracking file. | docs/ | ✅ **ĐANG SỬA (file này).** |

---

## 2. Gap về Code / Logic (P0 → P1)

| # | Gap | Vị trí | Đề xuất / Kiểm chứng |
|---|---|---|---|
| **G-C01 (P0)** | **worker.js `ingestRun()` gọi `filterItemsByLanguage` KHÔNG** (không chạy pipeline enrich, lang filter, dedupe). Worker parse trực tiếp rồi insert thẳng → **sẽ insert bài viết tiếng Trung, tiếng Anh, tiếng Nga** nếu hashtag phổ biến; và **bị trùng bài viết** nếu 1 hashtag nhóm scrape cùng post. | [worker.js `ingestRun` L534](file:///D:/vpha-social-listening-mne/web/scripts/worker.js#L534) so với [postPipeline.ts](file:///D:/vpha-social-listening-mne/web/src/lib/scrapers/postPipeline.ts) | **Bắt buộc sửa:** worker `parseOne()` xong → gọi `runPostPipeline(parsed, { allowLangs: ["vi"] })` trước khi loop insert. Nếu không sửa = vi phạm scope ngôn ngữ VN của dự án. |
| **G-C02 (P0)** | **worker.js `ingestRun()` đang insert 5 bảng, nhưng schema.sql chỉ có `post_hashtag_matches` (old name). Worker gọi `post_hashtag_facts` (insert facts) và `hashtag_scan_events` (insert scans) → cần verify DB thật đã có 2 bảng này với PK composite đúng.** | [worker.js L601](file:///D:/vpha-social-listening-mne/web/scripts/worker.js#L601) | Chạy lệnh `\d post_hashtag_facts` và `\d hashtag_scan_events` trên Supabase SQL Editor; nếu chưa có bảng → tạo DDL theo [schema.sql](file:///D:/vpha-social-listening-mne/web/docs/schema.sql#L122-L145). |
| **G-C03 (P1)** | **3 nơi có 3 copies riêng của adapters + language filter + helpers:** <br>a) `src/lib/scrapers/adapters/*.ts` (TypeScript chuẩn, dùng cho UI server-action test)<br>b) `scripts/test-adapter-core.js` (JS inline copy cho CLI)<br>c) `scripts/worker.js` (JS inline copy cho PM2 worker)<br>→ Rủi ro: sửa ở 1 nơi quên 2 nơi còn lại (đã xảy ra với `hashPostId/hashAuthor` gọi khác tên). | 3 files trên | **Đề xuất trung-dài hạn:** Viết 1 module chung (ví dụ `scraper-common.cjs` require được cả 3 nơi) + 1 version TS import qua tsx hoặc transpile. **Ngắn hạn:** Note rõ rule sửa gì phải đồng bộ trong 3 file vào CONTRIBUTING section. |
| **G-C04 (P1)** | ScrapingStudio `handleStartRun` set trực tiếp status=`RUNNING` cho chế độ IMMEDIATE, nhưng Worker mới dispatch dòng status `QUEUED/PLANNED`. Dòng IMMEDIATE sẽ **bị worker bỏ qua** (worker filter `in ("QUEUED", "PLANNED")`). | [ScrapingStudio.tsx L175](file:///D:/vpha-social-listening-mne/web/src/components/ScrapingStudio.tsx#L175) vs [worker.js L747](file:///D:/vpha-social-listening-mne/web/scripts/worker.js#L747) | Sửa: chế độ IMMEDIATE = `status = "QUEUED"` + `scheduled_at = now()` (worker sẽ pick ngay tick sau). Hoặc sửa worker lọc `in ("QUEUED", "PLANNED", "RUNNING")` + điều kiện chỉ dispatch những RUNNING chưa có apify_run_id. |
| **G-C05 (P2)** | `RunHistoryTable.handleRunNow` chỉ update status = RUNNING (mock), không gọi Apify thật. Có thể gây hiểu nhầm cho researcher nghĩ "đã gửi lệnh" nhưng worker chưa có token. | [ScrapingStudio.tsx L1004](file:///D:/vpha-social-listening-mne/web/src/components/ScrapingStudio.tsx#L1004) | Thay alert text từ "Đã bắn lệnh thu thập lên hệ thống (Mockup)!" thành thông báo rõ "Đã chuyển sang trạng thái RUNNING — cần worker chạy (và có APIFY token) mới dispatch thực tế." Hoặc xóa nút nếu không dùng. |
| **G-C06 (P2)** | `languageFilter.ts` rule **pureHashtags classified as "other"** sẽ bị loại nếu allowLangs=["vi"] (người Việt gõ caption chỉ toàn hashtag không dấu → bị miss). | [languageFilter.ts L123](file:///D:/vpha-social-listening-mne/web/src/lib/scrapers/languageFilter.ts#L123) | Sửa whitelist mặc định `["vi","other"]` cho stage test thử; sau đó thống nhất rule rõ ràng. |
| **G-C07 (P1)** | `worker.js` `pollAndIngestOne` L663-664: gọi `hashPostId/hashAuthor` **chưa khai báo** 2 hàm này ở đầu file (sai tên helper gọi khác với postId/authorHash). | [worker.js L266-L267](file:///D:/vpha-social-listening-mne/web/scripts/worker.js#L266-L267) | Verify kỹ; nếu worker chạy lỗi `ReferenceError: hashPostId is not defined` → sửa `const hashPostId = postId; const hashAuthor = authorHash;` vào helpers. |

---

## 3. Gap về Dữ liệu Seed / Cấu hình hệ thống (P0 → P1)

| # | Gap | Đề xuất |
|---|---|---|
| **G-D01 (P0)** | **Chưa seed `project_config` MAIN_STUDY** `intervention_date` = ngày Nghị định 13 có hiệu lực (sau nghiên cứu xác định). Bảng này DEC-003 cần để SQL VIEW tính study_phase. | Thêm vào seed.js: 1 dòng `{ config_id:'MAIN_STUDY', project_name:'VPHA M&E ITS Thuốc lá điện tử 18 tháng', intervention_date: 'YYYY-MM-DD' }` (sau khi ngày được hội đồng duyệt). |
| **G-D02 (P1)** | **Chưa seed 1 dòng `system_settings.APIFY_API_TOKEN`** → Worker warning "chưa admin lưu token" = không dispatch QUEUED. | 2 lựa chọn: (a) vào `/dashboard/settings` GUI nhập; hoặc (b) SQL insert trực tiếp. |
| **G-D03 (P1)** | Hashtag seed hiện chỉ 6 cái, chưa phản ánh bộ FIXED nghiên cứu thực tế. | Hội đồng duyệt giấy → cung cấp danh sách → Admin bulk insert. Nhớ tách keyword_track=FIXED (bộ gốc 18 tháng không đổi) và ADAPTIVE (bổ sung theo thời gian). |
| **G-D04 (P1)** | `assigned_scope` mặc định của profiles mới = `{allowed_actors:[], allowed_hashtag_groups:[]}` → researcher không thấy actor & hashtag nào cả. | Sau khi tạo profile, Admin vào Researchers → phân công scope cụ thể. |

---

## 4. Gap về Quy trình / Kiểm chứng (P0 → P2)

| # | Mục tiêu kiểm chứng | Cách chạy | Pass khi? |
|---|---|---|---|
| **G-T01 (P0)** | Dry-run build config OK cho 2 actor chuẩn hashtag. | `node scripts/test-adapter-core.js --tiktok-hashtag --dry-run` + `--facebook-hashtag --dry-run` | payload có `hashtags: [...]` không null, không cảnh báo "chưa có hashtag". |
| **G-T02 (P0)** | Parse NormalizedPost hợp lệ cho TikTok Hashtag với 5 item thật. | `$env:APIFY_TOKEN=...; node scripts/test-adapter-core.js --tiktok-hashtag --max-items 5` | `parsed_posts.filter(normalized)` ≥ 1, `post_url` hợp lệ, `published_at` không null, language filter cho ít nhất 1 qua (vi/other). |
| **G-T03 (P0)** | Parse NormalizedPost hợp lệ cho Facebook Hashtag. | Tương tự, `--facebook-hashtag --max-items 3`. | Tương tự T02. |
| **G-T04 (P0)** | Worker E2E ingest lần đầu (dành riêng 1 dòng QUEUED test). | Tạo QUEUED trên UI với `apify_api_token_override` → `node scripts/worker.js --once` → select 5 bảng trên Supabase SQL Editor, verify bản ghi không null, không lỗi constraint PK. | `posts` ≥ 1, `post_snapshots` ≥ 1, `post_hashtag_facts` ≥ 1, `hashtag_scan_events` ≥ 1, `post_discoveries` ≥ 1. |
| **G-T05 (P1)** | Pipeline dedupe hoạt động cho trường hợp 2 hashtag cùng group scrape cùng 1 bài. | Tạo run 2 hashtag → chạy 2 lần hoặc run 1 hashtag chung bài → verify `ingestRun()` không throw duplicate PK (do dedupe). | Không có `Postgres 23505 duplicate key` trong log worker. |
| **G-T06 (P1)** | RLS không chặn worker (Service Role). | Worker chạy với bảng có RLS bật. | Không log `violates row-level security policy`. Nếu có → tạm thời tắt RLS cho các bảng worker cần, hoặc policy cho service_role. |
| **G-T07 (P2)** | UI Test nhanh → Dry-run build cho 6 actors. | Mở `/dashboard/scraping` → card TEST NHANH → lần lượt 6 actor với 1 hashtag bất kỳ → Build OK. | 6/6 trả input_payload không rỗng. |

---

## 5. Rủi ro Sản xuất (trước G6)

| # | Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|---|
| R-01 | Apify community actor (alexey/facebook-search, easyapi) ngừng bảo trì / bị block = mất nguồn FB Search. | Cao | Ưu tiên dùng 2 actor "chuyên hashtag" chính: `clockworks/tiktok-hashtag-scraper` + `apify/facebook-hashtag-scraper` (Apify official/maintained). Luôn giữ 1 fallback actor cho mỗi platform. |
| R-02 | FB/TT API đổi field → parseOneItem trả `normalized=null` toàn bộ = 0 post. | Trung bình | Trong 3 tháng đầu production, sau mỗi run có `items_count=0` → tự động alert (có thể start với check log thủ công + weekly review). |
| R-03 | Chi phí Residential Proxy cao nếu run maxItems 5000 thường xuyên. | Trung bình | Giới hạn default maxItems trên UI (hiện tại clamp 5000). Khuyến nghị researcher chạy 50-200/hashtag cho phase test. |
| R-04 | SHA-256 post_id từ post_url thay đổi khi FB/TT đổi URL short = coi là bài mới. | Thấp | Đã chấp nhận trong DEC-013. Nếu nghiêm trọng sau này → bổ sung index theo (platform, native_post_id) cho dedupe. |

---

## 6. Tiêu chí PASS Giai đoạn 3 (Test thử Adapter) → Chuyển G4

Cần đạt **TẤT CẢ** sau:
- [ ] G-T01 (dry-run 2 actor chuẩn hashtag) PASS
- [ ] G-T02 (TikTok Hashtag parse 5 item thật) PASS
- [ ] G-T03 (Facebook Hashtag parse 3 item thật) PASS
- [ ] Ít nhất 1 bài viết viết TIẾNG VIỆT được giữ lại (lang=vi, allowLangs=["vi"]) trong kết quả pipeline
- [ ] Report dedupe + loa loại ngôn ngữ in ra màn hình rõ ràng (đã có `printPipelineReport`)
- [ ] Chạy QA code G-C01, G-C02, G-C07 trước khi chuyển G4 (hoặc note rõ sẽ sửa ở G4 bước đầu).

---

> 💡 Quy tắc làm việc: **Sửa 1 adapter/file → đồng bộ 3 nơi**: (a) `src/lib/scrapers/adapters/*.ts` (TS cho UI/server action test) → (b) `scripts/test-adapter-core.js` (adapters inline) → (c) `scripts/worker.js` (adapters inline). Rule này lưu ngay tại đây cho mọi phiên tiếp theo.
````

## File: docs/schema.sql
````sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  is_admin boolean DEFAULT false,
  assigned_scope jsonb DEFAULT '{"allowed_actors": [], "allowed_hashtag_groups": []}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.project_config (
  config_id character varying NOT NULL DEFAULT 'MAIN_STUDY'::character varying,
  project_name text NOT NULL,
  intervention_date date NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_config_pkey PRIMARY KEY (config_id)
);
CREATE TABLE public.hashtag_groups (
  group_id character varying NOT NULL,
  group_name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtag_groups_pkey PRIMARY KEY (group_id)
);
CREATE TABLE public.hashtags (
  hashtag_id bigint NOT NULL DEFAULT nextval('hashtags_hashtag_id_seq'::regclass),
  hashtag_text character varying NOT NULL UNIQUE,
  keyword_track character varying NOT NULL DEFAULT 'ADAPTIVE'::character varying CHECK (keyword_track::text = ANY (ARRAY['FIXED'::character varying, 'ADAPTIVE'::character varying]::text[])),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtags_pkey PRIMARY KEY (hashtag_id)
);
CREATE TABLE public.apify_actors (
  actor_id character varying NOT NULL,
  actor_name character varying NOT NULL,
  platform character varying NOT NULL,
  default_config jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT apify_actors_pkey PRIMARY KEY (actor_id)
);
CREATE TABLE public.collection_runs (
  run_id bigint NOT NULL DEFAULT nextval('collection_runs_run_id_seq'::regclass),
  researcher_code character varying NOT NULL,
  platform character varying NOT NULL,
  actor_id character varying NOT NULL,
  query_parameters jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone,
  items_count integer DEFAULT 0,
  status character varying DEFAULT 'SUCCESS'::character varying CHECK (status::text = ANY (ARRAY['PLANNED'::character varying, 'QUEUED'::character varying, 'RUNNING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'PARTIAL_SUCCESS'::character varying]::text[])),
  priority smallint NOT NULL DEFAULT 1,
  scheduled_at timestamp with time zone,
  apify_run_id text,
  apify_dataset_id text,
  error_message text,
  CONSTRAINT collection_runs_pkey PRIMARY KEY (run_id),
  CONSTRAINT collection_runs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.apify_actors(actor_id)
);
CREATE TABLE public.posts (
  post_id character varying NOT NULL,
  platform character varying NOT NULL,
  post_url text NOT NULL,
  author_hash character varying,
  published_at timestamp with time zone NOT NULL,
  raw_text text,
  raw_payload jsonb,
  content_cluster_id uuid,
  is_flagged boolean DEFAULT false,
  flag_reason character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT posts_pkey PRIMARY KEY (post_id)
);
CREATE TABLE public.post_snapshots (
  snapshot_id bigint NOT NULL DEFAULT nextval('post_snapshots_snapshot_id_seq'::regclass),
  post_id character varying NOT NULL,
  run_id bigint,
  observed_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  CONSTRAINT post_snapshots_pkey PRIMARY KEY (snapshot_id),
  CONSTRAINT post_snapshots_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_snapshots_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.collection_runs(run_id)
);
CREATE TABLE public.post_hashtag_matches (
  match_id bigint NOT NULL DEFAULT nextval('post_hashtag_matches_match_id_seq'::regclass),
  post_id character varying NOT NULL,
  hashtag_id bigint NOT NULL,
  match_type character varying NOT NULL DEFAULT 'SEARCH_HIT'::character varying CHECK (match_type::text = ANY (ARRAY['CAPTION'::character varying, 'SEARCH_HIT'::character varying]::text[])),
  matched_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_hashtag_matches_pkey PRIMARY KEY (match_id),
  CONSTRAINT post_hashtag_matches_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_hashtag_matches_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id)
);
CREATE TABLE public.post_discoveries (
  discovery_id bigint NOT NULL DEFAULT nextval('post_discoveries_discovery_id_seq'::regclass),
  post_id character varying NOT NULL,
  run_id bigint NOT NULL,
  researcher_code character varying NOT NULL,
  discovered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_discoveries_pkey PRIMARY KEY (discovery_id),
  CONSTRAINT post_discoveries_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_discoveries_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.collection_runs(run_id)
);
CREATE TABLE public.hashtag_group_mapping (
  hashtag_id bigint NOT NULL,
  group_id character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtag_group_mapping_pkey PRIMARY KEY (hashtag_id, group_id),
  CONSTRAINT hashtag_group_mapping_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.hashtag_groups(group_id),
  CONSTRAINT hashtag_group_mapping_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id)
);
CREATE TABLE public.system_settings (
  setting_key character varying NOT NULL,
  setting_value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key)
);
CREATE TABLE public.post_hashtag_facts (
  post_id character varying NOT NULL,
  hashtag_id bigint NOT NULL,
  match_type character varying NOT NULL DEFAULT 'SEARCH_HIT'::character varying CHECK (match_type::text = ANY (ARRAY['CAPTION'::character varying::text, 'SEARCH_HIT'::character varying::text])),
  first_seen_run_id bigint,
  first_seen_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_hashtag_facts_pkey PRIMARY KEY (post_id, hashtag_id, match_type),
  CONSTRAINT post_hashtag_facts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT post_hashtag_facts_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id),
  CONSTRAINT post_hashtag_facts_first_seen_run_id_fkey FOREIGN KEY (first_seen_run_id) REFERENCES public.collection_runs(run_id)
);
CREATE TABLE public.hashtag_scan_events (
  run_id bigint NOT NULL,
  post_id character varying NOT NULL,
  hashtag_id bigint NOT NULL,
  match_type character varying NOT NULL DEFAULT 'SEARCH_HIT'::character varying CHECK (match_type::text = ANY (ARRAY['CAPTION'::character varying::text, 'SEARCH_HIT'::character varying::text])),
  discovery_order integer NOT NULL DEFAULT 0,
  researcher_code character varying,
  recorded_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hashtag_scan_events_pkey PRIMARY KEY (run_id, post_id, hashtag_id, match_type),
  CONSTRAINT hashtag_scan_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.collection_runs(run_id),
  CONSTRAINT hashtag_scan_events_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id),
  CONSTRAINT hashtag_scan_events_hashtag_id_fkey FOREIGN KEY (hashtag_id) REFERENCES public.hashtags(hashtag_id)
);
````

## File: public/file.svg
````xml
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
````

## File: public/globe.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
````

## File: public/next.svg
````xml
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
````

## File: public/vercel.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
````

## File: public/window.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
````

## File: scripts/test-adapter-core.js
````javascript
#!/usr/bin/env node
/*
 * =============================================================
 *  test-adapter-core.js
 * =============================================================
 *  Test nhanh HÀM CỐT LÕI (không liên quan collection_runs / posts DB):
 *   1. Đọc apify_actors.default_config JSON từ Supabase (hoặc inline sample)
 *   2. Dùng adapter (3 loại TikTok / Facebook Page / Youtube) buildInput()
 *      => KIỂM TRA cấu hình gửi lên Apify đã ĐÚNG CHUẨN chưa
 *   3. POST lên Apify thật (apify_api_...) => start run
 *   4. Poll đến khi SUCCEEDED / FAILED => lấy dataset items (1-2 item thôi
 *   5. parseOneItem() => NormalizedPost => in MÀN HÌNH (không ghi DB)
 *
 *  Lưu ý: KHÔNG INSERT BẢNG NÀO CẢ. Hoàn toàn độc lập collection.
 *
 *  Cách chạy (chọn 1 trong 3 actor test):
 *  cd d:\vpha-social-listening-mne\web
 *  $env:APIFY_TOKEN="apify_api_XXXXXXXXXXXXXXXX"
 *
 *  node scripts/test-adapter-core.js --tiktok          # hashtag #pod 1 item
 *  node scripts/test-adapter-core.js --facebook        # cần startUrls trong default_config
 *  node scripts/test-adapter-core.js --youtube         # searchTerms hashtag 1 video
 *
 *  Hoặc: chỉ test BUILD INPUT (KHÔNG GỌI API Apify, tiết kiệm cost):
 *  node scripts/test-adapter-core.js --tiktok --dry-run
 *
 * =============================================================
 */

"use strict";

const path = require("node:path");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

// ---------------- Args ----------------
const ARGV_RAW = process.argv.slice(2);
const argv = ARGV_RAW.join(" ");
const DRY_RUN = argv.includes("--dry-run");
const SKIP_LANG_FILTER = argv.includes("--keep-all-langs") || argv.includes("--no-lang-filter");
const SKIP_DEDUPE = argv.includes("--no-dedupe");
// --langs vi,en  hoặc  --langs vi
let ALLOW_LANGS = ["vi"];
const m = ARGV_RAW.findIndex((x) => x === "--langs");
if (m >= 0 && ARGV_RAW[m + 1]) {
  ALLOW_LANGS = String(ARGV_RAW[m + 1]).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}
// --max-items N
let ACTOR_ID = null;
let PLATFORM = null;
let DEFAULT_TEST_HASHTAGS = [];
let DEFAULT_MAX_ITEMS = 1;
const maxIdx = ARGV_RAW.findIndex((x) => x === "--max-items");
if (maxIdx >= 0 && ARGV_RAW[maxIdx + 1] && isFinite(Number(ARGV_RAW[maxIdx + 1]))) {
  DEFAULT_MAX_ITEMS = Number(ARGV_RAW[maxIdx + 1]);
}
if (argv.includes("--tiktok-hashtag") || argv.includes("--tiktok-new")) {
  // 💯 Actor CHUYÊN dùng cho hashtag search trên TikTok (user vừa dùng trên Apify Console)
  ACTOR_ID = "clockworks/tiktok-hashtag-scraper";
  PLATFORM = "TIKTOK";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--tiktok")) {
  ACTOR_ID = "clockwork/tiktok-scraper";
  PLATFORM = "TIKTOK";
  DEFAULT_TEST_HASHTAGS = ["pod"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--facebook-hashtag")) {
  ACTOR_ID = "apify/facebook-hashtag-scraper";
  PLATFORM = "FACEBOOK_HASHTAG";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--facebook")) {
  ACTOR_ID = "apify/facebook-pages-scraper";
  PLATFORM = "FACEBOOK_PAGE";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else if (argv.includes("--youtube")) {
  ACTOR_ID = "streamer/youtube-scraper";
  PLATFORM = "YOUTUBE";
  DEFAULT_TEST_HASHTAGS = ["vape"];
  DEFAULT_MAX_ITEMS = 1;
} else {
  console.error(
    "LỖI: Chọn 1 trong các loại:\n" +
      "  --tiktok-hashtag  💯 Test clockworks/tiktok-hashtag-scraper (CHUYÊN hashtag, mới, user dùng gần đây)\n" +
      "  --tiktok          Test clockwork/tiktok-scraper (OLD, đa năng)\n" +
      "  --facebook-hashtag💯 Test apify/facebook-hashtag-scraper (chuẩn hashtag FB)\n" +
      "  --facebook        Test apify/facebook-pages-scraper (cần startUrls trong default_config)\n" +
      "  --youtube         Test streamer/youtube-scraper\n" +
      "\nThêm --dry-run nếu chỉ test build input (không gọi API Apify, tiết kiệm cost).",
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_OK = SUPABASE_URL && SUPABASE_SERVICE_KEY;
const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || process.env.APIFY_PERSONAL_TOKEN;

if (!DRY_RUN && (!APIFY_TOKEN || String(APIFY_TOKEN).length < 8)) {
  console.error(
    "LỖI: Thiếu APIFY_TOKEN (hoặc APIFY_API_TOKEN) trong ENV.\n" +
      "PowerShell cmd: $env:APIFY_TOKEN=\"apify_api_XXXXXXXXXXXX\"\n" +
      "Hoặc chạy --dry-run để test build cấu hình thôi (không gọi Apify).",
  );
  process.exit(1);
}

const supabase = SUPABASE_OK
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const APIFY_BASE = "https://api.apify.com";

// ---------------- Helpers ----------------
function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}
function postId(url) {
  return sha256hex(String(url || "").trim());
}
function authorHash(platform, nativeId) {
  return sha256hex(String(platform || "").toUpperCase() + ":" + String(nativeId || "").trim());
}
function safeNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function extractTags(text) {
  const out = [];
  const re = /#([a-z0-9_À-ỹ-]+)/gi;
  let m;
  while ((m = re.exec(String(text || ""))) !== null) out.push(m[0].toLowerCase());
  return Array.from(new Set(out));
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function sep(title) {
  console.log("\n" + "=".repeat(70));
  console.log("  " + title);
  console.log("=".repeat(70));
}
function prettyJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

// ---------------- Language detection HEURISTIC (zero dep) ----------------
// detectLang + runCliPipeline: dùng chung với worker (scripts/lib/post-pipeline.cjs)
const { detectLang, runCliPipeline } = require("./lib/post-pipeline.cjs");
function printPipelineReport(pipeline, platform) {
  const R = pipeline.report;
  sep("POST PIPELINE REPORT (" + platform + ") - enrich / filter ngôn ngữ / dedupe trùng");
  console.log(`  Tổng item raw vào pipeline          : ${R.totalRaw}`);
  console.log(`  Bỏ normalized=null (không hợp lệ)    : ${R.skippedNullNormalized}`);
  console.log(`  Phân bổ ngôn ngữ detection (tất cả) : ${JSON.stringify(R.langDistribution, null, 0)}`);
  console.log(`  Whitelist ngôn ngữ được phép        : ${ALLOW_LANGS.join(", ")}  (dùng --langs vi,en || --keep-all-langs)`);
  console.log(`  => Loại do không đúng ngôn ngữ      : ${R.langRemoved.length}`);
  for (const lr of R.langRemoved) {
    console.log(`       ❌ [${lr.lang} score=${lr.score}] ${lr.url}   (native_id=${lr.native_post_id})`);
  }
  const dupRemovedSum = R.dedupeRemoved.reduce((s, d) => s + d.removedCount, 0);
  console.log(`  => Loại do TRÙNG LẶP (dedupe)       : ${dupRemovedSum} record trong ${R.dedupeRemoved.length} nhóm bài viết giống nhau`);
  for (const d of R.dedupeRemoved.slice(0, 5)) {
    console.log(`       🔁 giữ ${d.keptPostId} bỏ ${d.removedCount} bản giống, caption_hashtags=[${d.mergedHashtags.join(",") || ""}]`);
  }
  console.log(`  => Số bài viết FINAL (sẵn sàng ingest vào posts DB nếu cần) = ${R.finalCount}\n`);
  // In chi tiết mấy item đầu tiên sau khi đã dedupe + lọc ngôn ngữ
  const N = Math.min(3, pipeline.finalized.length);
  if (N > 0) {
    console.log(`  ${N} bài đầu tiên trong finalized[]:`);
    for (let i = 0; i < N; i++) {
      const p = pipeline.finalized[i];
      const n = p.normalized;
      const tags = p.caption_hashtags.length ? p.caption_hashtags.join(",") : "(không hashtag inline)";
      console.log(`    #${i+1} [${p._lang?.lang ?? "?"} score=${p._lang?.score ?? "?"}] ${n.post_url.slice(0, 85)}  view=${n.metrics.view_count}  ${tags.slice(0, 140)}`);
    }
  }
}

// ---------------- Adapters (copy ngắn gọn từ worker) ----------------
const adapters = {};

// ----- TikTok -----
adapters["clockwork/tiktok-scraper"] = {
  validate(cfg) {
    return (cfg.hashtags || []).length ? [] : ["[warn] TikTok cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (cfg.hashtags || []).map((h) => h.hashtag_text || String(h)),
        maxItems,
        shouldDownloadVideos: d.shouldDownloadVideos ?? false,
        shouldDownloadCovers: d.shouldDownloadCovers ?? false,
        enableCoversOutput: d.enableCoversOutput ?? false,
        enableWatermarkVideo: d.enableWatermarkVideo ?? false,
        maxConcurrency: d.maxConcurrency ?? 5,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings: [],
    };
  },
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id)) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const caption = String(raw.desc || "");
    return {
      normalized: {
        post_url: raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        post_id: postId(raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`),
        author_hash: authorHash("TIKTOK", authorId),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: extractTags(caption),
      discovery_order: idx + 1,
    };
  },
};

// ----- TikTok Hashtag (NEW: clockworks/tiktok-hashtag-scraper) -----
// Actor CHUYÊN dùng cho hashtag search - user đã dùng trên Apify Console (Run ID BIce6jdJ1NnWRt9hk)
adapters["clockworks/tiktok-hashtag-scraper"] = {
  validate(cfg) {
    return (cfg.hashtags || []).length ? [] : ["[warn] TikTok Hashtag Scraper cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (cfg.hashtags || []).map((h) => String(h.hashtag_text || h).replace(/^#+/, "")),
        maxItems,
        shouldDownloadVideos: d.shouldDownloadVideos ?? false,
        shouldDownloadCovers: d.shouldDownloadCovers ?? false,
        enableCoversOutput: d.enableCoversOutput ?? false,
        enableWatermarkVideo: d.enableWatermarkVideo ?? false,
        maxConcurrency: d.maxConcurrency ?? 5,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings: [],
    };
  },
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id)) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const caption = String(raw.text || raw.desc || "");
    const captionTags = extractTags(caption);
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
        post_id: postId(raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`),
        author_hash: authorHash("TIKTOK", authorId),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// ----- Facebook Hashtag (apify/facebook-hashtag-scraper) -----
adapters["apify/facebook-hashtag-scraper"] = {
  validate(cfg) {
    const d = cfg.default_config || {};
    const userTags = (cfg.hashtags || []).map((h) => String(h.hashtag_text || h));
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    return hashtags.length ? [] : ["[warn] FB Hashtag Scraper cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxPostCount ?? d.resultsLimit ?? 50, 1), 5000);
    const userTags = (cfg.hashtags || []).map((h) => String(h.hashtag_text || h));
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    const warnings = hashtags.length ? [] : ["[warn] FB Hashtag chưa có hashtag nào => trả rỗng."];
    return {
      input: {
        hashtags,
        maxPostCount: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object") return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.postUrl ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const rawUser = raw.user || raw.owner || raw.profile || {};
    const text = String(raw.text ?? raw.message ?? raw.description ?? "");
    let likes = safeNum(raw.likesCount ?? raw.likes ?? raw.reactionCount);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    return {
      normalized: {
        post_url: url,
        post_id: postId(url),
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? url),
        author_hash: authorHash("FACEBOOK_HASHTAG", String(rawUser.id ?? raw.ownerId ?? raw.profileId ?? url)),
        author_display: rawUser.name ?? rawUser.displayName ?? null,
        published_at: raw.date || raw.time || raw.timestamp || raw.createdAt
          ? new Date(raw.date || raw.time || raw.timestamp || raw.createdAt).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: likes,
          comment_count: safeNum(raw.commentsCount ?? raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.sharesCount ?? raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ----- Facebook Page -----
adapters["apify/facebook-pages-scraper"] = {
  validate(cfg) {
    const d = cfg.default_config || {};
    const urls = d.startUrls || d.pageUrls || [];
    return urls.length ? [] : ["[warn] FACEBOOK_PAGE chưa có startUrls[], kết quả có thể trống. Admin hãy cấu hình default_config."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const startUrls = d.startUrls || d.pageUrls || [];
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text || String(h));
    const mergedSearch = Array.from(new Set([...(d.searchWords || []), ...userKW]));
    const warnings = startUrls.length ? [] : ["[warn] Facebook chưa có startUrls => có thể trả về rỗng."];
    return {
      input: {
        startUrls,
        resultsLimit: maxItems,
        maxComments: d.maxComments ?? 0,
        searchWords: mergedSearch,
        onlyPostsNewerThan: d.onlyPostsNewerThan ?? null,
        addViewResults: d.addViewResults ?? true,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object" || !raw.url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.text || "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    return {
      normalized: {
        post_url: String(raw.url),
        post_id: postId(String(raw.url)),
        platform: "FACEBOOK_PAGE",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.url),
        author_hash: authorHash("FACEBOOK_PAGE", String(raw.pageId ?? raw.pageName ?? raw.url)),
        author_display: raw.pageName ?? null,
        published_at: raw.time ? new Date(raw.time).toISOString() : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments),
          share_count: safeNum(raw.shares),
          view_count: safeNum(raw.views ?? raw.postViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ----- YouTube -----
adapters["streamer/youtube-scraper"] = {
  validate() { return []; },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxVideos = Math.min(Math.max(cfg.max_items_runtime ?? d.maxVideos ?? 20, 1), 500);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text || String(h));
    const mergedSearch = Array.from(new Set([...(d.searchTerms || []), ...userKW]));
    const videoUrls = d.videoUrls || [];
    const channelUrls = d.channelUrls || [];
    const warnings = mergedSearch.length || videoUrls.length || channelUrls.length
      ? []
      : ["[warn] Youtube chưa có searchTerms/videoUrls => có thể rỗng."];
    return {
      input: {
        searchTerms: mergedSearch,
        videoUrls,
        channelUrls,
        maxVideos,
        maxComments: d.maxComments ?? 200,
        sortVideosBy: d.sortVideosBy ?? "NEWEST",
        sortCommentsBy: d.sortCommentsBy ?? "NEWEST_FIRST",
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne(raw, idx) {
    if (!raw || typeof raw !== "object") return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const isComment = typeof raw.videoId === "string" && typeof raw.authorName === "string";
    if (isComment) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    if (!raw.id) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const title = String(raw.title || "");
    const description = String(raw.text ?? raw.description ?? "");
    const raw_text = [title, description].filter(Boolean).join("\n\n");
    const captionTags = extractTags(raw_text);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    for (const t of tags) {
      const norm = ("#" + String(t).trim().toLowerCase()).replace(/^##+/, "#");
      if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
    }
    const channelNative = (String(raw.channelUrl || "").split("/").filter(Boolean).pop() || String(raw.channelName) || String(raw.id));
    const post_url = String(raw.url ?? `https://www.youtube.com/watch?v=${raw.id}`);
    return {
      normalized: {
        post_url,
        post_id: postId(post_url),
        platform: "YOUTUBE",
        native_post_id: String(raw.id),
        author_hash: authorHash("YOUTUBE", channelNative),
        author_display: String(raw.channelName ?? channelNative),
        published_at: raw.publishedAt ? new Date(String(raw.publishedAt)).toISOString() : null,
        raw_text,
        metrics: {
          view_count: safeNum(raw.viewCount),
          like_count: safeNum(raw.likeCount),
          comment_count: safeNum(raw.commentCount),
          share_count: null,
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Apify helper ----------------
async function apify(method, rel, body) {
  const url = String(rel || "").startsWith("http") ? String(rel) : APIFY_BASE + String(rel || "");
  const headers = { Authorization: "Bearer " + APIFY_TOKEN, "Content-Type": "application/json" };
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    throw new Error("Apify HTTP " + res.status + " " + method + " " + rel + ": " + (typeof json === "object" ? JSON.stringify(json) : String(json || text)));
  }
  // Apify v2 API thường trả về dạng { data: { ... } }. Auto unwrap để tránh undefined.
  if (json && typeof json === "object" && "data" in json && json.data !== null && json.data !== undefined) {
    return json.data;
  }
  return json;
}

// ---------------- MAIN ----------------
(async function main() {
  sep("1. Tải default_config của actor ID = " + ACTOR_ID);
  let defaultCfg = {};
  if (supabase) {
    const { data, error } = await supabase
      .from("apify_actors")
      .select("actor_id, platform, actor_name, default_config")
      .eq("actor_id", ACTOR_ID)
      .maybeSingle();
    if (error) {
      console.log("[warn] không đọc được apify_actors DB, dùng default hardcode mẫu: " + error.message);
    } else if (data) {
      console.log("  ✅ Đọc default_config từ bảng apify_actors (cấu hình thật của admin):");
      defaultCfg = data.default_config || {};
    } else {
      console.log("  [warn] actor " + ACTOR_ID + " chưa có trong DB, dùng default mẫu (chạy seed.js trước)");
    }
  } else {
    console.log("  [warn] Supabase ENV chưa cấu hình (NEXT_PUBLIC_SUPABASE_URL + service key), dùng default hardcode mẫu");
  }

  // Dùng hardcode mẫu nếu DB không đọc được hoặc cấu hình rỗng (để test luôn cấu hình đúng chuẩn):
  if (!defaultCfg || Object.keys(defaultCfg).length === 0) {
    console.log("  => Dùng cấu hình mặc định mẫu cho actor " + PLATFORM);
    if (PLATFORM === "TIKTOK") {
      defaultCfg = {
        maxItems: 100,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        maxConcurrency: 5,
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    } else if (PLATFORM === "FACEBOOK_PAGE") {
      defaultCfg = {
        resultsLimit: 50,
        maxComments: 0,
        startUrls: [],
        searchWords: [],
        onlyPostsNewerThan: null,
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    } else if (PLATFORM === "FACEBOOK_HASHTAG") {
      defaultCfg = {
        maxPostCount: 50,
        hashtags: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    } else {
      defaultCfg = {
        maxVideos: 20, maxComments: 200, sortVideosBy: "NEWEST", sortCommentsBy: "NEWEST_FIRST",
        videoUrls: [], channelUrls: [], searchTerms: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      };
    }
  }
  console.log("  default_config (đã tải từ DB/sample):\n" + prettyJson(defaultCfg));

  sep("2. [TEST BUILD INPUT] adapter.buildInput() => payload gửi lên Apify");
  const adapter = adapters[ACTOR_ID];
  if (!adapter) {
    console.error("LỖI: không có adapter cho actor " + ACTOR_ID);
    process.exit(1);
  }
  const cfgRuntime = {
    run_id: 0, researcher_code: "test-user@example.com",
    platform: PLATFORM, actor_id: ACTOR_ID,
    hashtags: DEFAULT_TEST_HASHTAGS.map((t) => ({ hashtag_text: t })),
    max_items_runtime: DEFAULT_MAX_ITEMS,
    default_config: defaultCfg,
  };
  const validation = adapter.validate ? adapter.validate(cfgRuntime) || [] : [];
  const built = adapter.buildInput(cfgRuntime);
  const warnings = Array.from(new Set([...validation, ...(built.warnings || [])]));
  if (warnings.length) {
    console.log("  ⚠️  WARNING (chưa crash, test được tiếp tục nhưng lưu ý sau):");
    for (const w of warnings) console.log("    - " + w);
  }
  console.log("  => Actor Input Payload (send lên Apify /v2/acts/<id>/runs POST):\n" + prettyJson(built.input));

  if (DRY_RUN) {
    sep("[DRY-RUN] KẾT THÚC TEST XÂY DỰNG CẤU HÌNH (không gọi API Apify)");
    console.log(
      "\n✅ OK: Nếu cấu hình payload ở trên trông đúng =>" +
      "\n   Giờ bỏ --dry-run và chạy thật để test POST + Poll + Parse dataset:" +
      "\n   $env:APIFY_TOKEN=\"apify_api_XXXX\"" +
      "\n   node scripts/test-adapter-core.js --tiktok-hashtag --max-items 5    # mới, chuyên hashtag" +
      "\n   node scripts/test-adapter-core.js --facebook-hashtag --max-items 3" +
      "\n" +
      "\n   Options lọc & khử trùng (mặc định on, có thể tắt khi test ngôn ngữ khác):" +
      "\n     --langs vi,en              Whitelist ngôn ngữ (mặc định chỉ VI)" +
      "\n     --keep-all-langs           TẮT bộ lọc ngôn ngữ (giữ toàn bộ bài)" +
      "\n     --no-dedupe                TẮT loại bỏ bài viết trùng (native_post_id + platform)" +
      "\n     --max-items N              Số item scrape (actor input.maxItems)",
    );
    process.exit(0);
  }

  sep("3. POST actor_run (bắt đầu chạy actor trên Apify cloud với maxItems=" + DEFAULT_MAX_ITEMS + ")");
  let apifyRun;
  try {
    apifyRun = await apify("POST", "/v2/acts/" + encodeURIComponent(ACTOR_ID) + "/runs?timeout=60", built.input);
  } catch (err) {
    console.error("LỖI khi POST run (bạn đã subscribe actor trên Apify Console chưa?):");
    console.error("   -> https://console.apify.com/actors -> tìm actor -> click Try actor lần đầu là subscribe OK.");
    console.error("   -> Chi tiết lỗi: " + (err.message || err));
    process.exit(2);
  }
  const runId = apifyRun.id;
  const datasetId = apifyRun.defaultDatasetId || (apifyRun.data && apifyRun.data.defaultDatasetId) || null;
  console.log("  ✅ Apify run_id = " + runId);
  console.log("  ✅ Dataset ID   = " + datasetId);
  console.log("  Link xem trên Apify Console: https://console.apify.com/organization/~/actors/runs/" + runId);

  sep("4. POLL tiến trình run (chờ max 60 giây, interval 3s)");
  let finalStatus = apifyRun.status || "UNKNOWN";
  let waited = 0;
  while (!["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(finalStatus) && waited < 60000) {
    await sleep(3000);
    waited += 3000;
    try {
      const s = await apify("GET", "/v2/actor-runs/" + runId);
      finalStatus = String(s.status || "UNKNOWN");
      console.log("  [t+" + (waited / 1000).toFixed(0) + "s] status = " + finalStatus);
    } catch (e) {
      console.log("  [t+" + (waited / 1000).toFixed(0) + "s] poll lỗi (tạm thời) -> thử lại: " + (e.message || e));
    }
  }
  if (!["SUCCEEDED", "PARTIAL_SUCCESS"].includes(finalStatus)) {
    console.error("  ❌ Kết thúc sớm. Final status = " + finalStatus + ". Xem chi tiết lỗi trên Apify Console: https://console.apify.com/organization/~/actors/runs/" + runId);
    process.exit(3);
  }
  console.log("  ✅ Run xong (" + finalStatus + "), bắt đầu tải dataset.");

  sep("5. TẢI dataset items về (limit tối đa 5 để test parse nhẹ)");
  let items = [];
  if (datasetId) {
    try {
      items = await apify("GET", "/v2/datasets/" + datasetId + "/items?limit=5");
    } catch (e) {
      console.error("  [warn] tải dataset lỗi: " + (e.message || e));
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.log("  ⚠️  Dataset RỖNG (hashtag không phổ biến? maxItems=1? startUrls trống?).");
    console.log("  -> Gợi ý: test lại với hashtag phổ biến hơn / tăng maxItems = 5.");
    process.exit(0);
  }
  console.log("  ✅ Tải được " + items.length + " items từ dataset Apify:");

  sep("6. PARSE TẤT CẢ items => NormalizedPost (sau đó chạy pipeline LỌC NGÔN NGỮ + DEDUPE)");
  const parsedAll = [];
  for (let i = 0; i < items.length; i++) {
    parsedAll.push(adapter.parseOne(items[i], i));
  }
  const parsedList = parsedAll.slice(0, 3); // giữ in 3 đầu để debug như cũ
  for (let i = 0; i < parsedList.length; i++) {
    const p = parsedList[i];
    const raw = items[i];
    console.log("\n--- Item #" + (i + 1) + " / discovery_order = " + p.discovery_order + " ---");
    if (!p.normalized) {
      console.log("  [SKIP] Item này không parse ra post (VD: comment riêng / không url). raw.type = " + (raw && raw.itemType ? raw.itemType : typeof raw));
      continue;
    }
    const n = p.normalized;
    console.log("  post_id (SHA256 URL)     = " + n.post_id);
    console.log("  post_url                  = " + n.post_url);
    console.log("  platform                  = " + n.platform);
    console.log("  native_post_id            = " + n.native_post_id);
    console.log("  author_hash (ẩn danh)     = " + n.author_hash);
    console.log("  author_display (chỉ debug)= " + n.author_display);
    console.log("  published_at              = " + (n.published_at || "null"));
    console.log("  Metrics (diễn tiến theo thời gian):");
    console.log("     like_count    = " + (n.metrics.like_count ?? "null"));
    console.log("     comment_count = " + (n.metrics.comment_count ?? "null"));
    console.log("     view_count    = " + (n.metrics.view_count ?? "null"));
    console.log("     share_count   = " + (n.metrics.share_count ?? "null"));
    console.log("  raw_text (120 ký tự đầu)  = " + (n.raw_text || "").slice(0, 120).replace(/\n/g, " ") + ((n.raw_text || "").length > 120 ? "..." : ""));
    console.log("  hashtags trong Caption    = " + (p.caption_hashtags.length ? p.caption_hashtags.join(", ") : "(không tìm thấy hashtag inline nào trong caption)"));
  }

  sep("7. CHẠY POST PIPELINE (KHÔNG GHI DB) - enrich ids -> filter ngôn ngữ -> dedupe trùng lặp");
  console.log(`  Config pipeline: allowLangs=[${ALLOW_LANGS.join(",")}]  SKIP_LANG_FILTER=${SKIP_LANG_FILTER}  SKIP_DEDUPE=${SKIP_DEDUPE}`);
  const pipeline = runCliPipeline(parsedAll, { allowLangs: ALLOW_LANGS, skipLang: SKIP_LANG_FILTER, skipDedupe: SKIP_DEDUPE });
  printPipelineReport(pipeline, PLATFORM);

  sep("KẾT LUẬN TEST CORE ADAPTER + PIPELINE");
  const ok = parsedList.some((p) => p.normalized) ? "✅ PASS" : "⚠️  CHƯA CÓ POST PARSE ĐƯỢC (dataset item loại khác)";
  console.log("  " + ok);
  console.log("  Tổng items tải về         = " + items.length);
  console.log("  Parse được post (not null)= " + parsedList.filter((p) => p.normalized).length);
  console.log("  -> NẾU OK: HẠNH TRẢ TỚI BƯỚC TÍCH HỢP collection_runs + ingest (sau test này xong, code core chuẩn rồi).");
})().catch((e) => {
  console.error("\n❌ LỖI NGUYÊM TRỌNG TEST SCRIPT:\n", e && e.stack ? e.stack : e);
  process.exit(99);
});
````

## File: scripts/worker.js
````javascript
#!/usr/bin/env node
/*
 * =============================================================
 *  VPHA M&E SCRAPER WORKER (độc lập 1 file - PM2 friendly)
 * =============================================================
 *  Chạy độc lập, không phụ thuộc Next.js lifecycle.
 *  Cách chạy:
 *   - 1 lần test:     node scripts/worker.js --once
 *   - chạy dưới PM2:   pm2 start scripts/worker.js --name vpha-scrape-worker
 * =============================================================
 */

"use strict";

const path = require("node:path");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[worker] Thiếu ENV NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Thoát.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const APIFY_BASE = "https://api.apify.com";

// ==========================================================
// Helpers
// ==========================================================
function sha256hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}
function postId(url) {
  return sha256hex(String(url || "").trim());
}
function authorHash(platform, nativeId) {
  return sha256hex(String(platform || "").toUpperCase() + ":" + String(nativeId || "").trim());
}
// Alias: các adapter Facebook/YouTube bên dưới gọi hashPostId/hashAuthor
const hashPostId = postId;
const hashAuthor = authorHash;
// Pipeline dùng chung: lọc ngôn ngữ + dedupe (giống CLI test-adapter-core.js)
const { runPostPipeline } = require("./lib/post-pipeline.cjs");
// Ngôn ngữ giữ lại mặc định. "other" = caption chỉ toàn hashtag không dấu (vd "#vape #pod"),
// giữ lại để không mất bài Việt gõ không dấu. Ghi đè bằng apify_actors.default_config.allow_langs.
const DEFAULT_ALLOW_LANGS = ["vi", "other"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function safeNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function extractTags(text) {
  const out = [];
  const re = /#([a-z0-9_À-ỹ-]+)/gi;
  let m;
  while ((m = re.exec(String(text || ""))) !== null) out.push(m[0].toLowerCase());
  return Array.from(new Set(out));
}

// ==========================================================
// 3 Adapters (viết JS thuần gọn)
// ==========================================================
const adapters = {};

// ---------------- TikTok ----------------
adapters["clockwork/tiktok-scraper"] = {
  validate(cfg) {
    return cfg.hashtags && cfg.hashtags.length ? [] : ["TikTok cần ít nhất 1 hashtag."];
  },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    const input = {
      hashtags: (cfg.hashtags || []).map((h) => h.hashtag_text),
      maxItems,
      shouldDownloadVideos: d.shouldDownloadVideos ?? false,
      shouldDownloadCovers: d.shouldDownloadCovers ?? false,
      enableCoversOutput: d.enableCoversOutput ?? false,
      enableWatermarkVideo: d.enableWatermarkVideo ?? false,
      maxConcurrency: d.maxConcurrency ?? 5,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings: [] };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    if (!raw.webVideoUrl && !raw.id) return fallback;
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return fallback;
    const caption = String(raw.desc ?? "");
    return {
      normalized: {
        post_url: raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_native_id: String(authorId),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        author_avatar: raw.authorMeta?.avatar ?? null,
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
      caption_hashtags: extractTags(caption),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook Page ----------------
adapters["apify/facebook-pages-scraper"] = {
  // (không dùng hàm validate nữa — gộp cảnh báo vào buildInput 1 lần không lặp)
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const startUrls = d.startUrls || d.pageUrls || [];
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchWords || []), ...userKW]));
    const warnings = [];
    if (startUrls.length === 0) {
      warnings.push(
        "[info] Không cấu hình startUrls[] → Actor sẽ tìm kiếm TOÀN BỘ FACEBOOK theo searchWords (không giới hạn page).",
        "[tip] Tìm kiếm toàn mạng thường ít kết quả hơn & chậm hơn. Sau này có page cụ thể → Vào Công cụ Cào → Edit FB actor điền startUrls[] JSON."
      );
    }
    const input = {
      startUrls,
      resultsLimit: maxItems,
      maxComments: d.maxComments ?? 0,
      searchWords: mergedSearch,
      onlyPostsNewerThan: d.onlyPostsNewerThan ?? null,
      addViewResults: d.addViewResults ?? true,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object" || !raw.url) return fallback;
    const text = String(raw.text ?? "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
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
        author_avatar: null,
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
      caption_hashtags: extractTags(text),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG ----------------
// Flow đúng mục đích: hashtag/từ khóa → tìm kiếm toàn FB → trả post URLs
adapters["alexey/facebook-search-scraper"] = {
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...userKW]));
    const warnings = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    const input = {
      queries,
      resultsLimit: maxItems,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? "");
    if (!url) return fallback;
    const text = String(raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const authorNative = String(raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? url);
    return {
      normalized: {
        post_id: hashPostId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: hashAuthor("FACEBOOK_SEARCH", authorNative),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt ? new Date(raw.time || raw.timestamp || raw.createdAt).toISOString() : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG (OFFICIAL Apify maintained) ----------------
// Actor chính chủ Apify team duy trì → ít bị under maintenance hơn community actor
adapters["apify/facebook-search-scraper"] = {
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...(d.searchTerms || []), ...(d.searchWords || []), ...userKW]));
    const warnings = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH (official) chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    const input = {
      queries,
      resultsLimit: maxItems,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? raw.link ?? "");
    if (!url) return fallback;
    const text = String(raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? raw.description ?? "");
    let likes = safeNum(raw.likes ?? raw.likesCount);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const authorNative = String(raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? url);
    return {
      normalized: {
        post_id: hashPostId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: hashAuthor("FACEBOOK_SEARCH", authorNative),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt || raw.date
          ? new Date(raw.time || raw.timestamp || raw.createdAt || raw.date).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentsCount ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.sharesCount ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook HASHTAG SCRAPER (user đề xuất) 💯 CHUẨN NHẤT ----------------
// Flow đúng mục đích ta từ đầu: hashtag -> tìm mọi post Facebook chứa hashtag đó -> trả URLs
adapters["apify/facebook-hashtag-scraper"] = {
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxItems = Math.min(Math.max(cfg.max_items_runtime ?? d.maxPostCount ?? d.resultsLimit ?? 50, 1), 5000);
    const userTags = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    const warnings = [];
    if (hashtags.length === 0) {
      warnings.push("[warn] FACEBOOK_HASHTAG chưa có hashtag nào => kết quả sẽ rỗng.");
    }
    const input = {
      hashtags,
      maxPostCount: maxItems,
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const url = String(raw.url ?? raw.postUrl ?? "");
    if (!url) return fallback;
    const rawUser = raw.user || raw.owner || raw.profile || {};
    const text = String(raw.text ?? raw.message ?? raw.description ?? "");
    return {
      normalized: {
        post_id: hashPostId(url),
        post_url: url,
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? url),
        author_hash: hashAuthor(
          "FACEBOOK_HASHTAG",
          String(rawUser.id ?? raw.ownerId ?? raw.profileId ?? url)
        ),
        author_display: rawUser.name ?? rawUser.displayName ?? null,
        published_at: raw.date || raw.time || raw.timestamp || raw.createdAt
          ? new Date(raw.date || raw.time || raw.timestamp || raw.createdAt).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(raw.likesCount ?? raw.likes ?? raw.reactionCount),
          comment_count: safeNum(raw.commentsCount ?? raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.sharesCount ?? raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

// ---------------- YouTube ----------------
adapters["streamer/youtube-scraper"] = {
  validate() { return []; },
  buildInput(cfg) {
    const d = cfg.default_config || {};
    const maxVideos = Math.min(Math.max(cfg.max_items_runtime ?? d.maxVideos ?? 20, 1), 500);
    const userKW = (cfg.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchTerms || []), ...userKW]));
    const videoUrls = d.videoUrls || [];
    const channelUrls = d.channelUrls || [];
    const warnings = mergedSearch.length || videoUrls.length || channelUrls.length
      ? []
      : ["Youtube không có searchTerms hay videoUrls, kết quả có thể trống."];
    const input = {
      searchTerms: mergedSearch,
      videoUrls,
      channelUrls,
      maxVideos,
      maxComments: d.maxComments ?? 200,
      sortVideosBy: d.sortVideosBy ?? "NEWEST",
      sortCommentsBy: d.sortCommentsBy ?? "NEWEST_FIRST",
      proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(d.extra || {}),
    };
    return { input, warnings };
  },
  parseOne(raw, idx, cfg) {
    const search_ids = (cfg.hashtags || []).map((h) => h.hashtag_id);
    const fallback = {
      normalized: null,
      caption_hashtags: [],
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
    if (!raw || typeof raw !== "object") return fallback;
    const isCommentItem = typeof raw.videoId === "string" && typeof raw.authorName === "string";
    if (isCommentItem) return fallback;
    if (!raw.id) return fallback;
    const title = String(raw.title ?? "");
    const description = String(raw.text ?? raw.description ?? "");
    const raw_text = [title, description].filter(Boolean).join("\n\n");
    const captionTags = extractTags(raw_text);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    for (const t of tags) {
      const norm = ("#" + String(t).trim().toLowerCase()).replace(/^##+/, "#");
      if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
    }
    const channelNative = (String(raw.channelUrl || "").split("/").filter(Boolean).pop() || String(raw.channelName) || String(raw.id));
    return {
      normalized: {
        post_url: String(raw.url ?? `https://www.youtube.com/watch?v=${raw.id}`),
        platform: "YOUTUBE",
        native_post_id: String(raw.id),
        author_native_id: String(channelNative),
        author_display: String(raw.channelName ?? channelNative),
        author_avatar: null,
        published_at: raw.publishedAt ? new Date(String(raw.publishedAt)).toISOString() : null,
        raw_text,
        raw_payload: raw,
        metrics: {
          view_count: safeNum(raw.viewCount),
          like_count: safeNum(raw.likeCount),
          comment_count: safeNum(raw.commentCount),
          share_count: null,
        },
      },
      caption_hashtags: captionTags,
      search_hashtag_ids: search_ids,
      discovery_order: idx + 1,
    };
  },
};

function getAdapter(actorId) {
  return adapters[String(actorId || "")] || null;
}

// ==========================================================
// Apify token & HTTP helpers
// ==========================================================
async function getSystemApifyToken() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "APIFY_API_TOKEN")
    .maybeSingle();
  if (error) {
    console.error("[worker] đọc APIFY_API_TOKEN lỗi:", error.message);
    return null;
  }
  const token = data?.setting_value;
  if (!token || String(token).length < 8) {
    console.warn("[worker] APIFY_API_TOKEN chưa được admin lưu vào /dashboard/settings. Bỏ qua tick.");
    return null;
  }
  return token;
}

async function apifyRequest(token, method, rel, body) {
  const url = String(rel || "").startsWith("http") ? String(rel) : APIFY_BASE + String(rel || "");
  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    const msg = (typeof json === "object" && json) ? JSON.stringify(json) : String(json || text);
    throw new Error("Apify HTTP " + res.status + " " + method + " " + rel + ": " + msg);
  }
  return json;
}

// ==========================================================
// Hashtag resolver
// ==========================================================
async function fetchHashtagsByText(textList) {
  if (!textList || !textList.length) return [];
  const { data, error } = await supabase
    .from("hashtags")
    .select("hashtag_id,hashtag_text")
    .in("hashtag_text", textList);
  if (error) {
    console.error("[worker] fetch hashtags lỗi:", error.message);
    return [];
  }
  return data || [];
}

// ==========================================================
// Ingest 1 run dataset vào 5 bảng
// ==========================================================
async function ingestRun(run, cfgRuntime, parsedItems) {
  let insertedPosts = 0;
  let insertedSnapshots = 0;
  let insertedFacts = 0;
  let insertedScanEvents = 0;
  let insertedDiscoveries = 0;

  const htTextToId = new Map();
  for (const h of cfgRuntime.hashtags || []) {
    htTextToId.set(String(h.hashtag_text || "").toLowerCase(), Number(h.hashtag_id));
  }

  for (const pitem of parsedItems || []) {
    if (!pitem || !pitem.normalized) continue;
    const n = pitem.normalized;
    if (!n.post_url) continue;
    const pid = postId(n.post_url);
    const ahash = authorHash(n.platform, n.author_native_id);
    const nowPubISO = n.published_at && !Number.isNaN(new Date(n.published_at).getTime())
      ? n.published_at
      : new Date().toISOString();

    // ----- posts -----
    const { error: selErr } = await supabase
      .from("posts")
      .select("post_id")
      .eq("post_id", pid)
      .maybeSingle();
    const exist = (selErr && selErr.code) ? null : null; // select above errors handled via count
    const { count: postCount, error: cntErr } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("post_id", pid);
    if (!cntErr && postCount === 0) {
      const { error: insErr } = await supabase.from("posts").insert({
        post_id: pid,
        platform: n.platform,
        post_url: n.post_url,
        author_hash: ahash,
        published_at: nowPubISO,
        raw_text: n.raw_text,
        raw_payload: n.raw_payload,
        is_flagged: false,
      });
      if (!insErr) {
        insertedPosts += 1;
        const { error: discErr } = await supabase.from("post_discoveries").insert({
          post_id: pid,
          run_id: run.run_id,
          researcher_code: run.researcher_code,
        });
        if (!discErr) insertedDiscoveries += 1;
      }
    }

    // ----- post_snapshots (luôn insert) -----
    const { error: snapErr } = await supabase.from("post_snapshots").insert({
      post_id: pid,
      run_id: run.run_id,
      view_count: n.metrics.view_count,
      like_count: n.metrics.like_count,
      comment_count: n.metrics.comment_count,
      share_count: n.metrics.share_count,
    });
    if (!snapErr) insertedSnapshots += 1;

    // ----- post_hashtag_facts (lần đầu post X hashtag X type) -----
    const factsMap = new Map();
    for (const hid of pitem.search_hashtag_ids || []) {
      const key = hid + "|SEARCH_HIT";
      if (!factsMap.has(key)) factsMap.set(key, { hashtag_id: hid, match_type: "SEARCH_HIT" });
    }
    for (const captionTag of pitem.caption_hashtags || []) {
      const hid = htTextToId.get(String(captionTag || "").toLowerCase());
      if (hid) {
        const key = hid + "|CAPTION";
        if (!factsMap.has(key)) factsMap.set(key, { hashtag_id: hid, match_type: "CAPTION" });
      }
    }
    if (factsMap.size > 0) {
      const rows = Array.from(factsMap.values()).map((r) => ({
        post_id: pid,
        hashtag_id: r.hashtag_id,
        match_type: r.match_type,
        first_seen_run_id: run.run_id,
      }));
      const { error: factErr } = await supabase.from("post_hashtag_facts").insert(rows);
      if (!factErr) insertedFacts += rows.length;
    }

    // ----- hashtag_scan_events (PK 4 trường) -----
    const scanMap = new Map();
    for (const hid of pitem.search_hashtag_ids || []) {
      const k = run.run_id + "|" + pid + "|" + hid + "|SEARCH_HIT";
      if (!scanMap.has(k)) scanMap.set(k, {
        run_id: run.run_id, post_id: pid, hashtag_id: hid, match_type: "SEARCH_HIT",
        discovery_order: pitem.discovery_order, researcher_code: run.researcher_code,
      });
    }
    for (const captionTag of pitem.caption_hashtags || []) {
      const hid = htTextToId.get(String(captionTag || "").toLowerCase());
      if (!hid) continue;
      const k = run.run_id + "|" + pid + "|" + hid + "|CAPTION";
      if (!scanMap.has(k)) scanMap.set(k, {
        run_id: run.run_id, post_id: pid, hashtag_id: hid, match_type: "CAPTION",
        discovery_order: pitem.discovery_order, researcher_code: run.researcher_code,
      });
    }
    if (scanMap.size > 0) {
      const rows = Array.from(scanMap.values());
      const { error: scanErr } = await supabase.from("hashtag_scan_events").insert(rows);
      if (!scanErr) insertedScanEvents += rows.length;
    }
  }

  return { insertedPosts, insertedSnapshots, insertedFacts, insertedScanEvents, insertedDiscoveries };
}

// ==========================================================
// Poll 1 RUNNING -> nếu done -> ingest
// ==========================================================
async function pollAndIngestOne(token, run) {
  if (!run.apify_run_id) return { done: false };
  try {
    const statusResp = await apifyRequest(token, "GET", "/v2/actor-runs/" + run.apify_run_id);
    const apifyStatus = String(statusResp.status || "UNKNOWN");
    const terminal = ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(apifyStatus);
    if (!terminal) return { done: false, apifyStatus };

    let counts = { insertedPosts: 0, insertedSnapshots: 0, insertedFacts: 0, insertedScanEvents: 0, insertedDiscoveries: 0 };
    let finalStatus = apifyStatus === "SUCCEEDED" ? "SUCCESS" : "FAILED";
    let errMsg = statusResp?.errorMessage || null;

    if (apifyStatus === "SUCCEEDED" || (run.apify_dataset_id && apifyStatus === "PARTIAL_SUCCESS")) {
      const adapter = getAdapter(run.actor_id);
      if (!adapter) {
        errMsg = "Không có adapter cho actor_id " + run.actor_id;
        finalStatus = "FAILED";
      } else {
        const qp = run.query_parameters || {};
        const hashtags = await fetchHashtagsByText(qp.hashtags || []);
        const defaultCfg = run.actor_default_config || {};
        const cfgRuntime = {
          run_id: run.run_id,
          researcher_code: run.researcher_code,
          platform: run.platform,
          actor_id: run.actor_id,
          hashtags,
          max_items_runtime: qp.maxItems,
          default_config: defaultCfg,
        };

        const datasetItems = [];
        if (run.apify_dataset_id) {
          let offset = 0;
          while (true) {
            const batch = await apifyRequest(
              token,
              "GET",
              "/v2/datasets/" + run.apify_dataset_id + "/items?offset=" + offset + "&limit=1000",
            );
            if (!Array.isArray(batch) || batch.length === 0) break;
            for (const it of batch) datasetItems.push(it);
            if (batch.length < 1000) break;
            offset += 1000;
            if (offset > 50000) break; // safeguard giai doan thu nghiem
          }
        }

        const parsed = datasetItems.map((it, i) => adapter.parseOne(it, i, cfgRuntime));
        const allowLangs = Array.isArray(defaultCfg.allow_langs) && defaultCfg.allow_langs.length
          ? defaultCfg.allow_langs
          : DEFAULT_ALLOW_LANGS;
        const { finalized, report } = runPostPipeline(parsed, { allowLangs });
        console.log(
          "[worker] run_id=" + run.run_id + " pipeline: raw=" + report.totalRaw +
          " null=" + report.skippedNullNormalized +
          " loại_ngôn_ngữ=" + report.langRemoved.length +
          " gộp_trùng=" + report.dedupeRemoved.reduce((a, d) => a + d.removedCount, 0) +
          " còn=" + report.finalCount + " phân_bố=" + JSON.stringify(report.langDistribution),
        );
        counts = await ingestRun(run, cfgRuntime, finalized);

        if (apifyStatus !== "SUCCEEDED") finalStatus = apifyStatus === "FAILED" ? "FAILED" : "PARTIAL_SUCCESS";
      }
    }

    const { error: runUpdErr } = await supabase
      .from("collection_runs")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message: errMsg,
        items_count: counts.insertedPosts || 0,
      })
      .eq("run_id", run.run_id);
    if (runUpdErr) console.error("[worker] update run lỗi:", runUpdErr.message);

    console.log(
      "[worker] run_id=" + run.run_id + " HOÀN TẤT " + finalStatus +
      " posts=" + counts.insertedPosts +
      " snapshots=" + counts.insertedSnapshots +
      " facts=" + counts.insertedFacts +
      " scans=" + counts.insertedScanEvents +
      " disc=" + counts.insertedDiscoveries,
    );
    return { done: true };
  } catch (err) {
    console.error("[worker] run_id=" + run.run_id + " poll lỗi: " + (err.message || err));
    return { done: false };
  }
}

// ==========================================================
// Dispatch QUEUED / PLANNED -> gọi Apify -> update RUNNING
// ==========================================================
async function dispatchQueued(systemToken) {
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("collection_runs")
    .select(
      "run_id, researcher_code, platform, actor_id, status, priority, scheduled_at, query_parameters," +
      " apify_api_token_override, apify_actors!inner(default_config)",
    )
    .in("status", ["QUEUED", "PLANNED"])
    .or("scheduled_at.is.null,scheduled_at.lte." + nowIso)
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("run_id", { ascending: true })
    .limit(5);
  if (error) {
    console.error("[worker] lấy queue lỗi:", error.message);
    return;
  }
  for (const r of rows || []) {
    // Ưu tiên: dùng token override trên dòng kế hoạch test; nếu không có mới dùng system token
    const token = (r.apify_api_token_override && String(r.apify_api_token_override).length > 8)
      ? String(r.apify_api_token_override)
      : systemToken;
    if (!token) continue;
    try {
      const adapter = getAdapter(r.actor_id);
      if (!adapter) {
        console.warn("[worker] run_id=" + r.run_id + " bỏ qua, không có adapter " + r.actor_id);
        continue;
      }
      const qp = r.query_parameters || {};
      const hashtags = await fetchHashtagsByText(qp.hashtags || []);
      const defaultCfg = (r.apify_actors && r.apify_actors.default_config) || {};
      const cfgRuntime = {
        run_id: r.run_id,
        researcher_code: r.researcher_code,
        platform: r.platform,
        actor_id: r.actor_id,
        hashtags,
        max_items_runtime: qp.maxItems,
        default_config: defaultCfg,
      };
      const built = adapter.buildInput(cfgRuntime);
      const warnings = Array.from(new Set(built.warnings || []));

      const apifyResp = await apifyRequest(
        token,
        "POST",
        "/v2/acts/" + encodeURIComponent(r.actor_id) + "/runs?timeout=60",
        built.input,
      );
      const apifyRunId = apifyResp.id;
      const datasetId = apifyResp.defaultDatasetId || (apifyResp.data && apifyResp.data.defaultDatasetId) || null;
      if (!apifyRunId) throw new Error("Apify không trả về run_id");
      const { error: updErr } = await supabase
        .from("collection_runs")
        .update({
          status: "RUNNING",
          started_at: new Date().toISOString(),
          apify_run_id: apifyRunId,
          apify_dataset_id: datasetId,
          error_message: warnings.length ? warnings.join(" | ") : null,
        })
        .eq("run_id", r.run_id);
      if (updErr) throw updErr;
      console.log(
        "[worker] run_id=" + r.run_id + " DISPATCH actor=" + r.actor_id + " apify=" + apifyRunId,
      );
    } catch (err) {
      console.error("[worker] run_id=" + r.run_id + " dispatch lỗi: " + (err.message || err));
      await supabase
        .from("collection_runs")
        .update({
          status: "FAILED",
          completed_at: new Date().toISOString(),
          error_message: String(err.message || err).slice(0, 500),
        })
        .eq("run_id", r.run_id);
    }
  }
}

async function pollRunning(systemToken) {
  const { data, error } = await supabase
    .from("collection_runs")
    .select("run_id, researcher_code, platform, actor_id, apify_run_id, apify_dataset_id, query_parameters, apify_api_token_override, apify_actors(default_config)")
    .eq("status", "RUNNING")
    .not("apify_run_id", "is", null)
    .order("run_id", { ascending: true })
    .limit(20);
  if (error) {
    console.error("[worker] poll running lỗi:", error.message);
    return;
  }
  for (const r of data || []) {
    const token = (r.apify_api_token_override && String(r.apify_api_token_override).length > 8)
      ? String(r.apify_api_token_override)
      : systemToken;
    if (!token) continue;
    r.actor_default_config = (r.apify_actors && r.apify_actors.default_config) || {};
    await pollAndIngestOne(token, r);
  }
}

// ==========================================================
// MAIN
// ==========================================================
async function tick() {
  const systemToken = await getSystemApifyToken();
  // Test mode: system token chưa lưu vẫn được chạy (miễn là collection_runs dòng nào có apify_api_token_override)
  await pollRunning(systemToken);
  await dispatchQueued(systemToken);
}

const ONCE = process.env.RUN_ONCE === "1" || process.argv.includes("--once");

(async function main() {
  console.log("[worker] Khởi động. ONCE=" + ONCE);
  if (ONCE) {
    await tick();
    console.log("[worker] Chạy 1 lần xong. Thoát.");
    process.exit(0);
  }
  await tick();
  setInterval(tick, 15 * 1000);
})().catch((e) => {
  console.error("[worker] Lỗi main loop nghiêm trọng:", e);
  process.exit(1);
});
````

## File: src/app/actions/test-adapter.ts
````typescript
"use server";

/**
 * Server Actions dùng cho card TEST NHANH ADAPTER CORE (giao diện Scraping Studio)
 * KHÔNG GHI DB, KHÔNG LIÊN QUAN TỚI collection_runs, posts... gì cả.
 * Chỉ test 2 thứ:
 *   A) testBuildInput: adapter.buildInput() => in payload gửi lên Apify
 *   B) testRunApify:  POST actor run thật -> poll -> tải dataset items -> parseOneItem ra NormalizedPost
 */

import { createClient } from "@/utils/supabase/server";
import { createHash } from "node:crypto";

// ========================= Adapter ngắn gọn (copy từ test-adapter-core.js) =========================
type Cfg = {
  default_config: Record<string, any>;
  max_items_runtime?: number;
  hashtags: { hashtag_text: string }[];
};
type BuildOut = { input: Record<string, any>; warnings: string[] };
type Parsed = {
  normalized: null | {
    post_id: string;
    post_url: string;
    platform: string;
    native_post_id: string;
    author_hash: string;
    author_display?: string | null;
    published_at?: string | null;
    metrics: Record<string, number | null>;
    raw_text?: string | null;
  };
  caption_hashtags: string[];
  discovery_order: number;
};
type Adapter = {
  validate?: (c: Cfg) => string[];
  buildInput: (c: Cfg) => BuildOut;
  parseOne: (raw: any, idx: number) => Parsed;
};

const sha256hex = (s: string) => createHash("sha256").update(String(s || ""), "utf8").digest("hex");
const postId = (u: string) => sha256hex(String(u || "").trim());
const authorHash = (p: string, n: string) => sha256hex(String(p || "").toUpperCase() + ":" + String(n || "").trim());
const safeNum = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
};
const extractTags = (text: string) => {
  const out: string[] = [];
  const re = /#([a-z0-9_À-ỹ-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ""))) !== null) out.push(m[0].toLowerCase());
  return Array.from(new Set(out));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const adapters: Record<string, Adapter> = {};

// TikTok (OLD: clockwork/tiktok-scraper - actor đa năng, dùng hashtag là OK)
adapters["clockwork/tiktok-scraper"] = {
  validate: (c) => (c.hashtags?.length ? [] : ["[warn] TikTok cần ít nhất 1 hashtag."]),
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (c.hashtags || []).map((h) => h.hashtag_text),
        maxItems,
        shouldDownloadVideos: d.shouldDownloadVideos ?? false,
        shouldDownloadCovers: d.shouldDownloadCovers ?? false,
        enableCoversOutput: d.enableCoversOutput ?? false,
        enableWatermarkVideo: d.enableWatermarkVideo ?? false,
        maxConcurrency: d.maxConcurrency ?? 5,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings: [],
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id))
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`;
    const authorNative = String(authorId);
    const caption = String(raw.desc || raw.text || "");
    const captionTags = extractTags(caption);
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
        post_id: postId(url),
        post_url: url,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_hash: authorHash("TIKTOK", authorNative),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// ==================== TikTok Hashtag (NEW: clockworks/tiktok-hashtag-scraper) ====================
// Actor CHUYÊN dùng cho hashtag search (xác định qua Apify Console Run ID BIce6jdJ1NnWRt9hk).
// Output gần giống clockwork/tiktok-scraper, có thêm field hay ho: searchHashtag.views (tổng view hashtag).
adapters["clockworks/tiktok-hashtag-scraper"] = {
  validate: (c) => (c.hashtags?.length ? [] : ["[warn] TikTok Hashtag Scraper cần ít nhất 1 hashtag."]),
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.maxItems ?? 50, 1), 1000);
    return {
      input: {
        hashtags: (c.hashtags || []).map((h) => String(h.hashtag_text).replace(/^#+/, "")),
        maxItems,
        shouldDownloadVideos: d.shouldDownloadVideos ?? false,
        shouldDownloadCovers: d.shouldDownloadCovers ?? false,
        enableCoversOutput: d.enableCoversOutput ?? false,
        enableWatermarkVideo: d.enableWatermarkVideo ?? false,
        maxConcurrency: d.maxConcurrency ?? 5,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings: [],
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object" || (!raw.webVideoUrl && !raw.id))
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const authorId = raw.authorMeta?.id ?? raw.authorMeta?.secUid ?? raw.authorMeta?.uniqueId;
    if (!authorId) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = raw.webVideoUrl ?? `https://www.tiktok.com/@${raw.authorMeta?.name ?? "u"}/video/${raw.id}`;
    const caption = String(raw.text ?? raw.desc ?? "");
    const captionTags = extractTags(caption);
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
        post_id: postId(url),
        post_url: url,
        platform: "TIKTOK",
        native_post_id: String(raw.id),
        author_hash: authorHash("TIKTOK", String(authorId)),
        author_display: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? null,
        published_at: raw.createTimeISO
          ? String(raw.createTimeISO)
          : raw.createTime
            ? new Date(Number(raw.createTime) * 1000).toISOString()
            : null,
        raw_text: caption,
        metrics: {
          view_count: safeNum(raw.playCount),
          like_count: safeNum(raw.diggCount),
          comment_count: safeNum(raw.commentCount),
          share_count: safeNum(raw.shareCount),
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// Facebook Page
adapters["apify/facebook-pages-scraper"] = {
  // (Không dùng hàm validate nữa — gộp lỗi vào buildInput warnings 1 lần để KHÔNG BỊ LẶP 2 cảnh báo giống nhau)
  buildInput: (c) => {
    const d = c.default_config || {};
    const startUrls = d.startUrls || d.pageUrls || [];
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchWords || []), ...userKW]));
    const warnings: string[] = [];
    if (startUrls.length === 0) {
      warnings.push(
        "[info] Không cấu hình startUrls[] → Actor sẽ tìm kiếm TOÀN BỘ FACEBOOK theo searchWords (không giới hạn page).",
        "[info] Tìm kiếm toàn mạng thường ít kết quả hơn & chậm hơn so với trỏ thẳng page URLs.",
        "[tip] Sau này có page cụ thể cần theo dõi: Vào Công cụ Cào → Edit Facebook actor → điền startUrls[] JSON trong default_config."
      );
    }
    return {
      input: {
        startUrls,
        resultsLimit: maxItems,
        maxComments: d.maxComments ?? 0,
        searchWords: mergedSearch,
        onlyPostsNewerThan: d.onlyPostsNewerThan ?? null,
        addViewResults: d.addViewResults ?? true,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object" || !raw.url)
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.text || "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const pageNative = String(raw.pageId ?? raw.pageName ?? raw.url);
    const url = String(raw.url);
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_PAGE",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.url),
        author_hash: authorHash("FACEBOOK_PAGE", pageNative),
        author_display: raw.pageName ?? null,
        published_at: raw.time ? new Date(raw.time).toISOString() : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments),
          share_count: safeNum(raw.shares),
          view_count: safeNum(raw.views ?? raw.postViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG ----------------
// Flow đúng mục đích: hashtag/từ khóa → tìm kiếm toàn FB → trả post URLs
adapters["alexey/facebook-search-scraper"] = {
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...userKW]));
    const warnings: string[] = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    return {
      input: {
        queries,
        resultsLimit: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? "");
    let likes = safeNum(raw.likes);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const authorNative = String(raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? url);
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: authorHash("FACEBOOK_SEARCH", authorNative),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt ? new Date(raw.time || raw.timestamp || raw.createdAt).toISOString() : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook SEARCH TOÀN MẠNG (OFFICIAL Apify maintained) ----------------
// Actor do chính Apify team phát triển → ít bị under maintenance hơn community actor.
// Chia sẻ adapter code giống alexey/facebook-search-scraper (queries[] → toàn mạng → post URLs).
adapters["apify/facebook-search-scraper"] = {
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.resultsLimit ?? 50, 1), 5000);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const queries = Array.from(new Set([...(d.queries || []), ...(d.searchTerms || []), ...(d.searchWords || []), ...userKW]));
    const warnings: string[] = [];
    if (queries.length === 0) {
      warnings.push("[warn] FACEBOOK_SEARCH (official) chưa có từ khóa/hashtag nào => kết quả sẽ rỗng.");
    }
    return {
      input: {
        queries,
        resultsLimit: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.facebookUrl ?? raw.postUrl ?? raw.link ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const text = String(raw.postContent ?? raw.text ?? raw.message ?? raw.caption ?? raw.description ?? "");
    let likes = safeNum(raw.likes ?? raw.likesCount);
    if ((likes === null || likes === undefined) && raw.reactions) {
      let total = 0;
      for (const k of Object.keys(raw.reactions || {})) {
        const v = Number(raw.reactions[k]);
        if (isFinite(v)) total += v;
      }
      if (total > 0) likes = total;
    }
    const authorNative = String(raw.pageId ?? raw.ownerId ?? raw.profileId ?? raw.pageName ?? url);
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_SEARCH",
        native_post_id: String(raw.facebookId ?? raw.facebook_post_id ?? raw.postId ?? url),
        author_hash: authorHash("FACEBOOK_SEARCH", authorNative),
        author_display: raw.pageName ?? raw.ownerName ?? null,
        published_at: raw.time || raw.timestamp || raw.createdAt || raw.date
          ? new Date(raw.time || raw.timestamp || raw.createdAt || raw.date).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(likes),
          comment_count: safeNum(raw.comments ?? raw.commentsCount ?? raw.commentCount),
          share_count: safeNum(raw.shares ?? raw.sharesCount ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// ---------------- Facebook HASHTAG SCRAPER (user đề xuất) 💯 CHUẨN NHẤT ----------------
// Flow đúng MỤC ĐÍCH TA TỪ ĐẦU: hashtag → Facebook tìm bất cứ post nào có hashtag đó
//   → trả post URLs + likesCount/sharesCount/commentsCount (fields chuẩn user gửi)
adapters["apify/facebook-hashtag-scraper"] = {
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxItems = Math.min(Math.max(c.max_items_runtime ?? d.maxPostCount ?? d.resultsLimit ?? 50, 1), 5000);
    const userTags = (c.hashtags || []).map((h) => h.hashtag_text);
    const hashtags = Array.from(new Set([...(d.hashtags || []), ...userTags]));
    const warnings: string[] = [];
    if (hashtags.length === 0) {
      warnings.push("[warn] FACEBOOK_HASHTAG chưa có hashtag nào => kết quả sẽ rỗng.");
    }
    return {
      input: {
        hashtags,
        maxPostCount: maxItems,
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const url = String(raw.url ?? raw.postUrl ?? "");
    if (!url) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const rawUser = raw.user || raw.owner || raw.profile || {};
    const text = String(raw.text ?? raw.message ?? raw.description ?? "");
    return {
      normalized: {
        post_id: postId(url),
        post_url: url,
        platform: "FACEBOOK_HASHTAG",
        native_post_id: String(raw.postId ?? raw.id ?? url),
        author_hash: authorHash(
          "FACEBOOK_HASHTAG",
          String(rawUser.id ?? raw.ownerId ?? raw.profileId ?? url)
        ),
        author_display: rawUser.name ?? rawUser.displayName ?? null,
        published_at: raw.date || raw.time || raw.timestamp || raw.createdAt
          ? new Date(raw.date || raw.time || raw.timestamp || raw.createdAt).toISOString()
          : null,
        raw_text: text,
        metrics: {
          like_count: safeNum(raw.likesCount ?? raw.likes ?? raw.reactionCount),
          comment_count: safeNum(raw.commentsCount ?? raw.comments ?? raw.commentCount),
          share_count: safeNum(raw.sharesCount ?? raw.shares ?? raw.shareCount),
          view_count: safeNum(raw.views ?? raw.postViews ?? raw.videoViews),
        },
      },
      caption_hashtags: extractTags(text),
      discovery_order: idx + 1,
    };
  },
};

// YouTube
adapters["streamer/youtube-scraper"] = {
  validate: () => [],
  buildInput: (c) => {
    const d = c.default_config || {};
    const maxVideos = Math.min(Math.max(c.max_items_runtime ?? d.maxVideos ?? 20, 1), 500);
    const userKW = (c.hashtags || []).map((h) => h.hashtag_text);
    const mergedSearch = Array.from(new Set([...(d.searchTerms || []), ...userKW]));
    const videoUrls = d.videoUrls || [];
    const channelUrls = d.channelUrls || [];
    const warnings = mergedSearch.length || videoUrls.length || channelUrls.length
      ? []
      : ["[warn] YouTube chưa có searchTerms/videoUrls => có thể rỗng."];
    return {
      input: {
        searchTerms: mergedSearch,
        videoUrls,
        channelUrls,
        maxVideos,
        maxComments: d.maxComments ?? 200,
        sortVideosBy: d.sortVideosBy ?? "NEWEST",
        sortCommentsBy: d.sortCommentsBy ?? "NEWEST_FIRST",
        proxy: d.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        ...(d.extra || {}),
      },
      warnings,
    };
  },
  parseOne: (raw, idx) => {
    if (!raw || typeof raw !== "object")
      return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const isComment = typeof raw.videoId === "string" && typeof raw.authorName === "string";
    if (isComment) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    if (!raw.id) return { normalized: null, caption_hashtags: [], discovery_order: idx + 1 };
    const title = String(raw.title || "");
    const description = String(raw.text ?? raw.description ?? "");
    const raw_text = [title, description].filter(Boolean).join("\n\n");
    const captionTags = extractTags(raw_text);
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    for (const t of tags) {
      const norm = ("#" + String(t).trim().toLowerCase()).replace(/^##+/, "#");
      if (norm.length > 1 && !captionTags.includes(norm)) captionTags.push(norm);
    }
    const channelNative = (String(raw.channelUrl || "").split("/").filter(Boolean).pop() || String(raw.channelName) || String(raw.id));
    const post_url = String(raw.url ?? `https://www.youtube.com/watch?v=${raw.id}`);
    return {
      normalized: {
        post_id: postId(post_url),
        post_url,
        platform: "YOUTUBE",
        native_post_id: String(raw.id),
        author_hash: authorHash("YOUTUBE", channelNative),
        author_display: String(raw.channelName ?? channelNative),
        published_at: raw.publishedAt ? new Date(String(raw.publishedAt)).toISOString() : null,
        raw_text,
        metrics: {
          view_count: safeNum(raw.viewCount),
          like_count: safeNum(raw.likeCount),
          comment_count: safeNum(raw.commentCount),
          share_count: null,
        },
      },
      caption_hashtags: captionTags,
      discovery_order: idx + 1,
    };
  },
};

// ========================= Helpers Apify call (server-side, không bị CORS) =========================
const APIFY_BASE = "https://api.apify.com";
async function apifyRequest(token: string, method: string, rel: string, body?: any) {
  const url = String(rel || "").startsWith("http") ? String(rel) : APIFY_BASE + String(rel || "");
  const headers: Record<string, string> = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };
  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) {
    const msg = typeof json === "object" && json ? JSON.stringify(json) : String(json || text);
    throw new Error("Apify HTTP " + res.status + " " + method + " " + rel + ": " + msg);
  }
  // Apify v2 API thường trả về dạng { data: {...} }. Auto unwrap envelope nhất quán.
  if (json && typeof json === "object" && "data" in json && json.data !== null && json.data !== undefined) {
    // Trường hợp đặc biệt: dataset /v2/datasets/:id/items trả về data = mảng items
    return json.data;
  }
  return json;
}

// ========================= Public Server Actions =========================

export type BuildInputResult = {
  ok: boolean;
  error?: string;
  actor_id: string;
  platform?: string;
  default_config: Record<string, any>;
  input_payload: Record<string, any>;
  warnings: string[];
};

export async function testAdapterBuildInput(form: FormData): Promise<BuildInputResult> {
  try {
    const actorId = String(form.get("actor_id") || "").trim();
    const hashtagText = String(form.get("hashtag_text") || "").trim();
    const maxItems = Number(form.get("max_items") || 1) || 1;
    if (!actorId) return { ok: false, error: "Vui lòng chọn Actor.", actor_id: actorId, default_config: {}, input_payload: {}, warnings: [] };
    if (!hashtagText) return { ok: false, error: "Vui lòng nhập 1 hashtag (không dấu # ở đầu cũng được).", actor_id: actorId, default_config: {}, input_payload: {}, warnings: [] };

    const supabase = await createClient();
    let platform: string | undefined;
    let default_config: Record<string, any> = {};
    try {
      const { data, error } = await supabase
        .from("apify_actors")
        .select("actor_id, platform, default_config")
        .eq("actor_id", actorId)
        .maybeSingle();
      if (!error && data) {
        platform = data.platform as string;
        default_config = (data.default_config as any) || {};
      }
    } catch {}

    if (Object.keys(default_config).length === 0) {
      // Dùng mẫu nếu DB chưa có
      if (actorId === "clockwork/tiktok-scraper") {
        default_config = { maxItems: 100, proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "clockworks/tiktok-hashtag-scraper") {
        default_config = { maxItems: 100, shouldDownloadVideos: false, shouldDownloadCovers: false, maxConcurrency: 5, proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "apify/facebook-pages-scraper") {
        default_config = { resultsLimit: 50, maxComments: 0, startUrls: [], searchWords: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "alexey/facebook-search-scraper") {
        default_config = { resultsLimit: 50, queries: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "apify/facebook-search-scraper") {
        default_config = { resultsLimit: 50, queries: [], searchTerms: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else if (actorId === "apify/facebook-hashtag-scraper") {
        default_config = { maxPostCount: 50, hashtags: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      } else {
        default_config = { maxVideos: 20, maxComments: 200, sortVideosBy: "NEWEST", searchTerms: [], proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } };
      }
    }

    const adapter = adapters[actorId];
    if (!adapter) return { ok: false, error: "Không có adapter cho actor " + actorId + ". (chỉ hỗ trợ: TikTok / FB Page / FB Search / FB Hashtag / YouTube)", actor_id: actorId, default_config, input_payload: {}, warnings: [] };

    const hashtags: { hashtag_text: string }[] = [{ hashtag_text: hashtagText.replace(/^#+/, "") }];
    const cfg: Cfg = { default_config, max_items_runtime: maxItems, hashtags };
    const built = adapter.buildInput(cfg);
    const warnings = Array.from(new Set(built.warnings || []));
    return { ok: true, actor_id: actorId, platform, default_config, input_payload: built.input, warnings };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err), actor_id: String(form.get("actor_id") || ""), default_config: {}, input_payload: {}, warnings: [] };
  }
}

export type RunApifyResult = BuildInputResult & {
  apify_run_id?: string;
  apify_dataset_id?: string;
  final_status?: string;
  raw_items_count?: number;
  parsed_posts?: Parsed[];
  console_apify_link?: string;
};

export async function testAdapterRunApify(form: FormData): Promise<RunApifyResult> {
  const build = await testAdapterBuildInput(form);
  if (!build.ok) return build as RunApifyResult;

  const token = String(form.get("api_key") || "").trim();
  if (token.length < 8) return { ...build, ok: false, error: "API Key Apify quá ngắn hoặc trống (dạng apify_api_...)." };

  try {
    const runResp = await apifyRequest(
      token,
      "POST",
      "/v2/acts/" + encodeURIComponent(build.actor_id) + "/runs?timeout=60",
      build.input_payload,
    );
    const runId: string = runResp.id;
    const datasetId: string | undefined = runResp.defaultDatasetId || (runResp.data && runResp.data.defaultDatasetId);
    const consoleLink = "https://console.apify.com/organization/~/actors/runs/" + runId;

    // Poll 30s, 3s interval
    let finalStatus = String(runResp.status || "UNKNOWN");
    let waited = 0;
    while (!["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(finalStatus) && waited < 30000) {
      await sleep(3000);
      waited += 3000;
      try {
        const s = await apifyRequest(token, "GET", "/v2/actor-runs/" + runId);
        finalStatus = String(s.status || "UNKNOWN");
      } catch { /* ignore */ }
    }

    let rawItems: any[] = [];
    const parsedPosts: Parsed[] = [];
    if (datasetId && ["SUCCEEDED", "PARTIAL_SUCCESS"].includes(finalStatus)) {
      try {
        rawItems = await apifyRequest(token, "GET", "/v2/datasets/" + datasetId + "/items?limit=5");
        if (!Array.isArray(rawItems)) rawItems = [];
      } catch {}
      const adapter = adapters[build.actor_id];
      if (adapter) {
        for (let i = 0; i < Math.min(rawItems.length, 5); i++) {
          parsedPosts.push(adapter.parseOne(rawItems[i], i));
        }
      }
    }

    return {
      ...build,
      apify_run_id: runId,
      apify_dataset_id: datasetId,
      final_status: finalStatus,
      raw_items_count: rawItems.length,
      parsed_posts: parsedPosts,
      console_apify_link: consoleLink,
    };
  } catch (err: any) {
    return { ...build, ok: false, error: "Lỗi gọi Apify: " + (err?.message || String(err)) };
  }
}
````

## File: src/app/auth/signout/route.ts
````typescript
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/login", req.url), {
    status: 302,
  });
}
````

## File: src/app/dashboard/actors/page.tsx
````typescript
import { Database } from "lucide-react";
import ActorTable from "@/components/ActorTable";

export default function ActorsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <Database className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Quản lý Công cụ (Apify Actors)
            </h1>
            <p className="text-stone-500 mt-1">
              Định nghĩa các công cụ thu thập dữ liệu và cấu hình JSON mặc định (Default Payload) cho từng công cụ.
            </p>
          </div>
        </div>

        <ActorTable />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/hashtag-groups/page.tsx
````typescript
import { Hash, Tags } from "lucide-react";
import HashtagGroupTable from "@/components/HashtagGroupTable";

export default function HashtagGroupsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl shadow-sm">
            <Tags className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Nhóm Từ Khóa
            </h1>
            <p className="text-stone-500 mt-1">
              Quản lý các nhóm từ khóa (Hashtag Groups) để phân loại mục đích theo dõi.
            </p>
          </div>
        </div>

        <HashtagGroupTable />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/hashtags/page.tsx
````typescript
import { Hash } from "lucide-react";
import HashtagTable from "@/components/HashtagTable";

export default function HashtagsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl shadow-sm">
            <Hash className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Quản lý Từ khóa (Hashtags)
            </h1>
            <p className="text-stone-500 mt-1">
              Thêm từ khóa, cấu hình loại tìm kiếm (FIXED/ADAPTIVE) và gắn thẻ vào nhiều nhóm.
            </p>
          </div>
        </div>

        <HashtagTable />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/profile/page.tsx
````typescript
import { UserCircle } from "lucide-react";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <UserCircle className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Tài khoản cá nhân
            </h1>
            <p className="text-stone-500 mt-1">
              Quản lý thông tin tài khoản và cập nhật mật khẩu.
            </p>
          </div>
        </div>

        <ProfileForm userEmail={user.email || ""} />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/scraping/page.tsx
````typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import ScrapingStudio from "@/components/ScrapingStudio";

export default async function ScrapingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch user profile to get assigned scope
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email, assigned_scope")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-8">Error loading profile.</div>;
  }

  // Fallback to empty if nothing assigned
  const scope = profile.assigned_scope || { allowed_actors: [], allowed_hashtag_groups: [] };
  let allowedActorsIds = scope.allowed_actors || [];
  let allowedGroupIds = scope.allowed_hashtag_groups || [];

  // Need admin client if we want to bypass RLS, BUT we don't have RLS on apify_actors and hashtag_groups anymore (they are globally readable). 
  // Let's just use the normal client!
  
  // 2. Fetch allowed Actors
  let actorsQuery = supabase.from("apify_actors").select("*").eq("is_active", true);
  if (!profile.is_admin && allowedActorsIds.length > 0) {
    actorsQuery = actorsQuery.in("actor_id", allowedActorsIds);
  } else if (!profile.is_admin) {
    // Force empty result if no actors assigned
    actorsQuery = actorsQuery.eq("actor_id", "NONE");
  }
  const { data: allowedActors } = await actorsQuery;

  // 3. Fetch allowed Groups
  let groupsQuery = supabase.from("hashtag_groups").select("*");
  if (!profile.is_admin && allowedGroupIds.length > 0) {
    groupsQuery = groupsQuery.in("group_id", allowedGroupIds);
  } else if (!profile.is_admin) {
    groupsQuery = groupsQuery.eq("group_id", "NONE");
  }
  const { data: allowedGroups } = await groupsQuery;

  // 4. Fetch Hashtags belonging to these groups
  const hashtagsByGroup: Record<string, any[]> = {};
  if (allowedGroups && allowedGroups.length > 0) {
    const groupIdsToFetch = allowedGroups.map(g => g.group_id);
    
    // We need to join hashtags with hashtag_group_mapping
    const { data: mappings } = await supabase
      .from("hashtag_group_mapping")
      .select(`
        group_id,
        hashtags (
          hashtag_id,
          hashtag_text,
          keyword_track,
          is_active
        )
      `)
      .in("group_id", groupIdsToFetch);

    if (mappings) {
      mappings.forEach(m => {
        if (!hashtagsByGroup[m.group_id]) hashtagsByGroup[m.group_id] = [];
        if (m.hashtags && (m.hashtags as any).is_active) {
          hashtagsByGroup[m.group_id].push(m.hashtags);
        }
      });
    }
  }

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200 text-white">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Scraping Studio
            </h1>
            <p className="text-stone-500 mt-1">
              Phòng điều khiển chiến dịch cào dữ liệu. Bạn chỉ nhìn thấy các công cụ và từ khóa được Admin cấp quyền.
            </p>
          </div>
        </div>

        <ScrapingStudio 
          user={profile}
          allowedActors={allowedActors || []}
          allowedGroups={allowedGroups || []}
          hashtagsByGroup={hashtagsByGroup}
        />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/settings/page.tsx
````typescript
import { Settings } from "lucide-react";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <Settings className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Cấu hình Hệ thống
            </h1>
            <p className="text-stone-500 mt-1">
              Quản lý các thông số kỹ thuật, API Key và kết nối với các dịch vụ bên thứ 3.
            </p>
          </div>
        </div>

        <SettingsForm />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/users/page.tsx
````typescript
import { fetchUsers } from "@/app/actions/user";
import AdminUserList from "@/components/AdminUserList";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const users = await fetchUsers();

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl shadow-sm">
            <Users className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Quản lý Người dùng
            </h1>
            <p className="text-stone-500 mt-1">
              Thêm tài khoản mới, phân quyền Admin và reset mật khẩu.
            </p>
          </div>
        </div>

        <AdminUserList initialUsers={users} />
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/page.tsx
````typescript
export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Dashboard</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <p className="text-stone-600">
          Chào mừng bạn đến với hệ thống giám sát M&E Thuốc lá điện tử VPHA.
        </p>
      </div>
    </div>
  );
}
````

## File: src/app/login/page.tsx
````typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, KeyRound, Mail, Shield } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const setupSuccess = searchParams.get("setup") === "success";

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Sai email hoặc mật khẩu.");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {setupSuccess && (
        <div className="bg-emerald-50 text-emerald-800 text-sm p-4 rounded-lg border border-emerald-200 font-medium text-center">
          Khởi tạo Admin thành công! Vui lòng đăng nhập.
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100 text-center">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5 ml-1">Email</label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 w-5 h-5 text-stone-400" />
            <input
              type="email"
              required
              className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1.5 ml-1">Mật khẩu</label>
          <div className="relative flex items-center">
            <KeyRound className="absolute left-3.5 w-5 h-5 text-stone-400" />
            <input
              type="password"
              required
              className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-6 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-200 relative overflow-hidden">
        <div className="text-center mb-8 relative z-10">
          <div className="mx-auto w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Đăng nhập</h2>
          <p className="mt-2 text-sm text-stone-500">
            Hệ thống Giám sát M&E Thuốc lá điện tử
          </p>
        </div>

        <Suspense fallback={<div>Đang tải form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
````

## File: src/app/setup/page.tsx
````typescript
"use client";

import { setupFirstAdmin, checkHasUsers } from "@/app/actions/auth";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkHasUsers().then((hasUsers) => {
      if (hasUsers) {
        // Hệ thống đã có user, khóa trang này
        router.replace("/login");
      } else {
        setHasAccess(true);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSettingUp(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await setupFirstAdmin(formData);

    if (result.error) {
      setError(result.error);
      setIsSettingUp(false);
    } else {
      // Thành công, tự động chuyển sang trang đăng nhập
      router.push("/login?setup=success");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">Đang kiểm tra trạng thái hệ thống...</div>;
  }

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="p-8 text-center bg-amber-50 border-b border-stone-200">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Thiết lập Quản trị viên</h2>
          <p className="mt-2 text-sm text-stone-600">
            Hệ thống phát hiện chưa có người dùng nào. Hãy tạo tài khoản Quản trị viên (Admin) đầu tiên.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Email Admin</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="admin@vpha.org"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSettingUp}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isSettingUp ? "Đang khởi tạo..." : (
              <>
                <ShieldCheck className="w-5 h-5" /> Khởi tạo Hệ thống
              </>
            )}
          </Button>

          <p className="text-xs text-stone-500 text-center mt-4">
            Lưu ý: Nút Đăng ký này sẽ biến mất vĩnh viễn sau khi tài khoản đầu tiên được tạo.
          </p>
        </form>
      </div>
    </div>
  );
}
````

## File: src/components/ui/button.tsx
````typescript
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
````

## File: src/components/ActorTable.tsx
````typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Search, Edit2, Save, X, Plus, Trash, Database } from "lucide-react";

export interface ActorRow {
  actor_id: string;
  actor_name: string;
  platform: string;
  default_config: any;
  is_active: boolean;
}

export default function ActorTable() {
  const [actors, setActors] = useState<ActorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<{ [key: string]: any }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newActorForm, setNewActorForm] = useState({
    actor_id: "",
    actor_name: "",
    platform: "Tiktok",
    default_config: "{\n  \"maxItems\": 100\n}",
    is_active: true,
  });
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("apify_actors")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActors(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredActors = actors.filter((a) =>
    a.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.actor_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (actor: ActorRow) => {
    setEditingId(actor.actor_id);
    setEditForms((prev) => ({
      ...prev,
      [actor.actor_id]: {
        actor_id: actor.actor_id,
        actor_name: actor.actor_name,
        platform: actor.platform,
        default_config: JSON.stringify(actor.default_config, null, 2),
        is_active: actor.is_active,
      },
    }));
  };

  const handleSave = async (id: string) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    const form = editForms[id];
    
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(form.default_config);
      } catch (e) {
        throw new Error("JSON Cấu hình mặc định không hợp lệ!");
      }

      const { error: hError } = await supabase
        .from("apify_actors")
        .update({
          actor_id: form.actor_id,
          actor_name: form.actor_name,
          platform: form.platform,
          default_config: parsedConfig,
          is_active: form.is_active,
        })
        .eq("actor_id", id);
        
      if (hError) throw hError;

      setEditingId(null);
      await fetchData(); 
    } catch (error: any) {
      alert("Lỗi khi lưu: " + error.message);
    }
    setSaving((prev) => ({ ...prev, [id]: false }));
  };

  const handleAddNew = async () => {
    if (!newActorForm.actor_id || !newActorForm.actor_name) {
      return alert("ID và Tên công cụ không được để trống!");
    }

    setSavingNew(true);
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(newActorForm.default_config);
      } catch (e) {
        throw new Error("JSON Cấu hình mặc định không hợp lệ!");
      }

      const { error: hError } = await supabase
        .from("apify_actors")
        .insert({
          actor_id: newActorForm.actor_id.trim(),
          actor_name: newActorForm.actor_name.trim(),
          platform: newActorForm.platform,
          default_config: parsedConfig,
          is_active: newActorForm.is_active
        });

      if (hError) throw hError;

      setNewActorForm({ actor_id: "", actor_name: "", platform: "Tiktok", default_config: "{\n  \"maxItems\": 100\n}", is_active: true });
      setIsAddingNew(false);
      await fetchData();
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn công cụ "${name}"?`)) return;
    try {
      const { error } = await supabase.from("apify_actors").delete().eq("actor_id", id);
      if (error) throw error;
      setActors(actors.filter((h) => h.actor_id !== id));
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Đang tải danh sách...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* ToolBar */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm công cụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Công cụ
        </button>
      </div>

      {/* Inline Add Form */}
      {isAddingNew && (
        <div className="p-5 bg-indigo-50/50 border-b border-indigo-100 flex gap-6 items-start">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Actor ID (vd: clockwork/tiktok)</label>
              <input
                type="text"
                value={newActorForm.actor_id}
                onChange={(e) => setNewActorForm({ ...newActorForm, actor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tên hiển thị</label>
              <input
                type="text"
                value={newActorForm.actor_name}
                onChange={(e) => setNewActorForm({ ...newActorForm, actor_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nền tảng (Platform)</label>
              <select
                value={newActorForm.platform}
                onChange={(e) => setNewActorForm({ ...newActorForm, platform: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Tiktok">Tiktok</option>
                <option value="Facebook">Facebook</option>
                <option value="YouTube">YouTube</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-2">
                Cấu hình Mặc định (Default JSON Payload)
                <span className="font-normal text-stone-400">Dùng cho những cấu hình cố định không cho user sửa (vd: limit)</span>
              </label>
              <textarea
                value={newActorForm.default_config}
                onChange={(e) => setNewActorForm({ ...newActorForm, default_config: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[100px]">
            <button onClick={handleAddNew} disabled={savingNew} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              {savingNew ? "Đang lưu..." : "Lưu"}
            </button>
            <button onClick={() => setIsAddingNew(false)} className="px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-6 py-3 w-1/4">Công cụ (Actor)</th>
              <th className="px-6 py-3 w-1/6">Nền tảng</th>
              <th className="px-6 py-3 w-1/3">Cấu hình Mặc định (JSON)</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredActors.map((tag) => {
              const isEditing = editingId === tag.actor_id;
              const form = editForms[tag.actor_id] || {};

              return (
                <tr key={tag.actor_id} className={isEditing ? "bg-indigo-50/30 items-start" : "hover:bg-stone-50 transition-colors"}>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={form.actor_id || ""}
                          onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, actor_id: e.target.value } }))}
                          className="w-full px-2 py-1 text-xs font-mono border border-indigo-300 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={form.actor_name || ""}
                          onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, actor_name: e.target.value } }))}
                          className="w-full px-2 py-1 text-sm font-semibold border border-indigo-300 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-stone-900">{tag.actor_name}</div>
                        <div className="text-xs font-mono text-stone-500">{tag.actor_id}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <select
                        value={form.platform}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, platform: e.target.value } }))}
                        className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded outline-none"
                      >
                        <option value="Tiktok">Tiktok</option>
                        <option value="Facebook">Facebook</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Instagram">Instagram</option>
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded bg-stone-100 text-stone-700">
                        {tag.platform}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <textarea
                        value={form.default_config || ""}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.actor_id]: { ...form, default_config: e.target.value } }))}
                        rows={5}
                        className="w-full px-2 py-1.5 text-xs font-mono border border-indigo-300 rounded outline-none focus:ring-2 focus:ring-indigo-500 bg-stone-50"
                      />
                    ) : (
                      <pre className="text-[10px] font-mono text-stone-600 bg-stone-50 p-2 rounded border border-stone-200 overflow-x-auto max-h-[100px] overflow-y-auto">
                        {JSON.stringify(tag.default_config, null, 2)}
                      </pre>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(tag.actor_id)} disabled={saving[tag.actor_id]} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700" title="Lưu">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditForms(p => { const n={...p}; delete n[tag.actor_id]; return n; }); }} className="p-1.5 text-stone-500 bg-stone-200 hover:bg-stone-300 rounded" title="Hủy">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(tag)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tag.actor_id, tag.actor_name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredActors.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Database className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                  <p>Chưa cấu hình công cụ Apify nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
````

## File: src/components/AdminUserList.tsx
````typescript
"use client";

import { adminCreateUser, changeUserRole, deleteUser, resetUserPassword } from "@/app/actions/user";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, Trash, Plus, Search, UserCircle, X } from "lucide-react";

export default function AdminUserList({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await adminCreateUser(formData);
    if (res.error) alert(res.error);
    else window.location.reload(); // Quick refresh for now
    setLoading(false);
  };

  const handleToggleRole = async (userId: string, currentAdmin: boolean) => {
    if (!confirm(`Bạn muốn ${currentAdmin ? "hủy" : "cấp"} quyền Admin cho user này?`)) return;
    const res = await changeUserRole(userId, !currentAdmin);
    if (res.error) alert(res.error);
    else setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Cảnh báo: Bạn sắp xóa vĩnh viễn user ${email} khỏi hệ thống. Đồng ý?`)) return;
    const res = await deleteUser(userId);
    if (res.error) alert(res.error);
    else setUsers(users.filter(u => u.id !== userId));
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) return alert("Mật khẩu mới phải từ 6 ký tự.");
    const res = await resetUserPassword(userId, newPassword);
    if (res.error) alert(res.error);
    else {
      alert("Đổi mật khẩu thành công!");
      setResetId(null);
      setNewPassword("");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm Email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button 
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Tài Khoản
        </button>
      </div>

      {isAddingNew && (
        <form onSubmit={handleAddUser} className="p-5 bg-amber-50 border-b border-amber-100 flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input type="email" name="email" required className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" placeholder="Email người dùng" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mật khẩu tạm</label>
            <input type="password" name="password" minLength={6} required className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" placeholder="Tối thiểu 6 ký tự" />
          </div>
          <div className="pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_admin" value="true" className="w-4 h-4 text-amber-600 rounded" />
              <span className="text-sm font-medium text-stone-700">Là Quản trị viên (Admin)</span>
            </label>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button disabled={loading} type="submit" className="flex-1 md:flex-none px-6 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">Lưu</button>
            <button type="button" onClick={() => setIsAddingNew(false)} className="flex-1 md:flex-none px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300">Hủy</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-6 py-4">Tài Khoản</th>
              <th className="px-6 py-4">Vai Trò</th>
              <th className="px-6 py-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold uppercase">
                    {user.email.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">{user.email}</div>
                    <div className="text-xs text-stone-500">ID: {user.id.slice(0,8)}...</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.is_admin ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
                      <UserCircle className="w-3.5 h-3.5" /> User
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {resetId === user.id ? (
                    <div className="inline-flex items-center gap-2">
                      <input 
                        type="password" 
                        placeholder="Mật khẩu mới..." 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-32 px-2 py-1 text-xs border border-stone-300 rounded"
                      />
                      <button onClick={() => handleResetPassword(user.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Lưu</button>
                      <button onClick={() => {setResetId(null); setNewPassword("");}} className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-xs">Hủy</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleToggleRole(user.id, user.is_admin)} className="p-2 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors" title="Đổi quyền">
                        {user.is_admin ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setResetId(user.id)} className="p-2 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors" title="Đổi mật khẩu">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id, user.email)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa tài khoản">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
````

## File: src/components/DashboardHeader.tsx
````typescript
import HeaderMenu from "./HeaderMenu";

interface DashboardHeaderProps {
  isAdmin: boolean;
  userEmail?: string;
}

export default function DashboardHeader({ isAdmin, userEmail }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm backdrop-blur-sm transition-all duration-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-end">
        <HeaderMenu isAdmin={isAdmin} userEmail={userEmail} />
      </div>
    </header>
  );
}
````

## File: src/components/HashtagGroupTable.tsx
````typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import {
  Search,
  Edit2,
  Save,
  X,
  Tags,
  Plus,
  Trash
} from "lucide-react";

export interface HashtagGroupRow {
  group_id: string;
  group_name: string;
  description: string | null;
  created_at: string | null;
}

export default function HashtagGroupTable() {
  const [groups, setGroups] = useState<HashtagGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<{ [key: string]: Partial<HashtagGroupRow> }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState<Partial<HashtagGroupRow>>({
    group_id: "",
    group_name: "",
    description: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("hashtag_groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setGroups(data as HashtagGroupRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(
    (group) =>
      group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.group_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (group: HashtagGroupRow) => {
    setEditingId(group.group_id);
    setEditForms((prev) => ({
      ...prev,
      [group.group_id]: {
        group_id: group.group_id,
        group_name: group.group_name,
        description: group.description,
      },
    }));
  };

  const handleSave = async (groupId: string) => {
    setSaving((prev) => ({ ...prev, [groupId]: true }));
    const editForm = editForms[groupId];
    
    const { error } = await supabase
      .from("hashtag_groups")
      .update({
        group_id: editForm.group_id,
        group_name: editForm.group_name,
        description: editForm.description,
      })
      .eq("group_id", groupId);

    if (!error) {
      setGroups(groups.map((g) => (g.group_id === groupId ? { ...g, ...editForm, group_id: editForm.group_id || groupId } : g)));
      setEditingId(null);
      setEditForms((prev) => {
        const newForms = { ...prev };
        delete newForms[groupId];
        return newForms;
      });
    } else {
      alert("Lỗi khi lưu: " + error.message);
    }
    setSaving((prev) => ({ ...prev, [groupId]: false }));
  };

  const handleAddNew = async () => {
    if (!newGroupForm.group_id?.trim() || !newGroupForm.group_name?.trim()) {
      alert("Vui lòng nhập ID và Tên nhóm!");
      return;
    }

    setSavingNew(true);
    try {
      const { data, error } = await supabase
        .from("hashtag_groups")
        .insert({
          group_id: newGroupForm.group_id.trim().toUpperCase(),
          group_name: newGroupForm.group_name.trim(),
          description: newGroupForm.description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setGroups([data as HashtagGroupRow, ...groups]);

      setNewGroupForm({ group_id: "", group_name: "", description: "" });
      setIsAddingNew(false);
    } catch (error: any) {
      alert("Không thể thêm nhóm mới! Lỗi: " + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (groupId: string, groupName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhóm "${groupName}"?`)) return;

    try {
      const { error } = await supabase.from("hashtag_groups").delete().eq("group_id", groupId);
      if (error) throw error;
      setGroups((prev) => prev.filter((g) => g.group_id !== groupId));
    } catch (error: any) {
      alert("Không thể xóa nhóm! Lỗi: " + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-stone-500">Đang tải danh sách...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* ToolBar */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Nhóm
        </button>
      </div>

      {/* Inline Add Form */}
      {isAddingNew && (
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex gap-4 items-start">
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">ID Nhóm (Viết hoa liền không dấu)</label>
              <input
                type="text"
                value={newGroupForm.group_id || ""}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, group_id: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="VD: COMMERCIAL"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tên Nhóm</label>
              <input
                type="text"
                value={newGroupForm.group_name || ""}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, group_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="VD: Thương mại & Bán lẻ"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mô tả chi tiết</label>
              <input
                type="text"
                value={newGroupForm.description || ""}
                onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Tuỳ chọn..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleAddNew}
              disabled={savingNew || !newGroupForm.group_id || !newGroupForm.group_name}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {savingNew ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-6 py-3 w-1/5">ID Nhóm</th>
              <th className="px-6 py-3 w-1/4">Tên Nhóm</th>
              <th className="px-6 py-3 w-2/5">Mô tả</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredGroups.map((group) => {
              const isEditing = editingId === group.group_id;
              const editForm = editForms[group.group_id] || {};

              return (
                <tr key={group.group_id} className={isEditing ? "bg-amber-50/50" : "hover:bg-stone-50 transition-colors"}>
                  <td className="px-6 py-4 font-semibold text-stone-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.group_id || ""}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [group.group_id]: { ...editForm, group_id: e.target.value.toUpperCase() } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none uppercase font-semibold"
                      />
                    ) : (
                      group.group_id
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.group_name || ""}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [group.group_id]: { ...editForm, group_name: e.target.value } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    ) : (
                      <span className="font-medium text-stone-900">{group.group_name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.description || ""}
                        onChange={(e) => setEditForms((prev) => ({ ...prev, [group.group_id]: { ...editForm, description: e.target.value } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    ) : (
                      <span className="text-stone-600">{group.description || "—"}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(group.group_id)}
                            disabled={saving[group.group_id]}
                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            title="Lưu"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForms((p) => { const n = { ...p }; delete n[group.group_id]; return n; });
                            }}
                            className="p-1.5 text-stone-500 bg-stone-200 hover:bg-stone-300 rounded transition-colors"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(group)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.group_id, group.group_name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {filteredGroups.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Tags className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                  <p>Chưa có nhóm từ khóa nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
````

## File: src/components/HashtagTable.tsx
````typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Search, Edit2, Save, X, Hash, Plus, Trash, Check } from "lucide-react";

export interface HashtagRow {
  hashtag_id: number;
  hashtag_text: string;
  keyword_track: string;
  is_active: boolean;
  hashtag_group_mapping: { group_id: string }[];
}

export interface GroupItem {
  group_id: string;
  group_name: string;
}

export default function HashtagTable() {
  const [hashtags, setHashtags] = useState<HashtagRow[]>([]);
  const [availableGroups, setAvailableGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForms, setEditForms] = useState<{ [key: number]: any }>({});
  const [saving, setSaving] = useState<{ [key: number]: boolean }>({});
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newHashtagForm, setNewHashtagForm] = useState({
    hashtag_text: "",
    keyword_track: "ADAPTIVE",
    is_active: true,
    selected_groups: [] as string[]
  });
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    // 1. Fetch available groups
    const { data: groupsData } = await supabase.from("hashtag_groups").select("group_id, group_name").order("group_name");
    if (groupsData) setAvailableGroups(groupsData);

    // 2. Fetch hashtags with mapped groups
    const { data, error } = await supabase
      .from("hashtags")
      .select(`
        hashtag_id, hashtag_text, keyword_track, is_active,
        hashtag_group_mapping ( group_id )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHashtags(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredHashtags = hashtags.filter((h) =>
    h.hashtag_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (hashtag: HashtagRow) => {
    setEditingId(hashtag.hashtag_id);
    setEditForms((prev) => ({
      ...prev,
      [hashtag.hashtag_id]: {
        hashtag_text: hashtag.hashtag_text,
        keyword_track: hashtag.keyword_track,
        is_active: hashtag.is_active,
        selected_groups: hashtag.hashtag_group_mapping.map(m => m.group_id)
      },
    }));
  };

  const handleSave = async (id: number) => {
    setSaving((prev) => ({ ...prev, [id]: true }));
    const form = editForms[id];
    
    try {
      // 1. Update hashtag
      const { error: hError } = await supabase
        .from("hashtags")
        .update({
          hashtag_text: form.hashtag_text,
          keyword_track: form.keyword_track,
          is_active: form.is_active,
        })
        .eq("hashtag_id", id);
      if (hError) throw hError;

      // 2. Update mapping (Delete old, insert new)
      await supabase.from("hashtag_group_mapping").delete().eq("hashtag_id", id);
      if (form.selected_groups.length > 0) {
        const mappings = form.selected_groups.map((g: string) => ({ hashtag_id: id, group_id: g }));
        const { error: mError } = await supabase.from("hashtag_group_mapping").insert(mappings);
        if (mError) throw mError;
      }

      setEditingId(null);
      await fetchData(); // Refresh data to sync
    } catch (error: any) {
      alert("Lỗi khi lưu: " + error.message);
    }
    setSaving((prev) => ({ ...prev, [id]: false }));
  };

  const handleAddNew = async () => {
    let text = newHashtagForm.hashtag_text.trim();
    if (!text) return alert("Vui lòng nhập từ khóa!");
    if (!text.startsWith("#")) text = "#" + text;

    setSavingNew(true);
    try {
      // 1. Insert Hashtag
      const { data, error: hError } = await supabase
        .from("hashtags")
        .insert({
          hashtag_text: text,
          keyword_track: newHashtagForm.keyword_track,
          is_active: newHashtagForm.is_active
        })
        .select()
        .single();

      if (hError) throw hError;
      const newId = data.hashtag_id;

      // 2. Insert mappings
      if (newHashtagForm.selected_groups.length > 0) {
        const mappings = newHashtagForm.selected_groups.map(g => ({ hashtag_id: newId, group_id: g }));
        const { error: mError } = await supabase.from("hashtag_group_mapping").insert(mappings);
        if (mError) throw mError;
      }

      setNewHashtagForm({ hashtag_text: "", keyword_track: "ADAPTIVE", is_active: true, selected_groups: [] });
      setIsAddingNew(false);
      await fetchData();
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (id: number, text: string) => {
    if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn từ khóa "${text}"?`)) return;
    try {
      const { error } = await supabase.from("hashtags").delete().eq("hashtag_id", id);
      if (error) throw error;
      setHashtags(hashtags.filter((h) => h.hashtag_id !== id));
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    }
  };

  const toggleGroupSelection = (formObj: any, setFormFn: any, groupId: string) => {
    const isSelected = formObj.selected_groups.includes(groupId);
    const newGroups = isSelected 
      ? formObj.selected_groups.filter((g: string) => g !== groupId)
      : [...formObj.selected_groups, groupId];
    setFormFn({ ...formObj, selected_groups: newGroups });
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Đang tải danh sách...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* ToolBar */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm từ khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm Từ khóa
        </button>
      </div>

      {/* Inline Add Form */}
      {isAddingNew && (
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex gap-6 items-start">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Từ khóa (Bắt đầu bằng #)</label>
              <input
                type="text"
                value={newHashtagForm.hashtag_text}
                onChange={(e) => setNewHashtagForm({ ...newHashtagForm, hashtag_text: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="#vape"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Chế độ Tracking</label>
              <select
                value={newHashtagForm.keyword_track}
                onChange={(e) => setNewHashtagForm({ ...newHashtagForm, keyword_track: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ADAPTIVE">ADAPTIVE (Mở rộng tự động)</option>
                <option value="FIXED">FIXED (Cố định)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-2">Chọn nhóm (Có thể chọn nhiều)</label>
              <div className="flex flex-wrap gap-2">
                {availableGroups.map(g => (
                  <label key={g.group_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-300 bg-white cursor-pointer hover:bg-stone-50">
                    <input 
                      type="checkbox" 
                      className="text-amber-600 rounded" 
                      checked={newHashtagForm.selected_groups.includes(g.group_id)}
                      onChange={() => toggleGroupSelection(newHashtagForm, setNewHashtagForm, g.group_id)}
                    />
                    <span className="text-xs font-medium text-stone-800">{g.group_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[100px]">
            <button onClick={handleAddNew} disabled={savingNew} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">
              {savingNew ? "Đang lưu..." : "Lưu"}
            </button>
            <button onClick={() => setIsAddingNew(false)} className="px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-300">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-6 py-3 w-1/4">Từ khóa</th>
              <th className="px-6 py-3 w-1/5">Tracking</th>
              <th className="px-6 py-3 w-1/3">Thuộc nhóm</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredHashtags.map((tag) => {
              const isEditing = editingId === tag.hashtag_id;
              const form = editForms[tag.hashtag_id] || {};

              return (
                <tr key={tag.hashtag_id} className={isEditing ? "bg-amber-50/50" : "hover:bg-stone-50 transition-colors"}>
                  <td className="px-6 py-4 font-semibold text-stone-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.hashtag_text || ""}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.hashtag_id]: { ...form, hashtag_text: e.target.value } }))}
                        className="w-full px-2 py-1 text-sm border border-amber-300 rounded outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    ) : (
                      tag.hashtag_text
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select
                        value={form.keyword_track}
                        onChange={(e) => setEditForms(p => ({ ...p, [tag.hashtag_id]: { ...form, keyword_track: e.target.value } }))}
                        className="w-full px-2 py-1.5 text-sm border border-amber-300 rounded outline-none"
                      >
                        <option value="ADAPTIVE">ADAPTIVE</option>
                        <option value="FIXED">FIXED</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${tag.keyword_track === 'ADAPTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-800'}`}>
                        {tag.keyword_track}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableGroups.map(g => (
                          <label key={g.group_id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-amber-200 cursor-pointer hover:bg-amber-100 text-xs">
                            <input 
                              type="checkbox" 
                              className="text-amber-600 rounded" 
                              checked={form.selected_groups.includes(g.group_id)}
                              onChange={() => toggleGroupSelection(form, (newF: any) => setEditForms(p => ({ ...p, [tag.hashtag_id]: newF })), g.group_id)}
                            />
                            {g.group_id}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {tag.hashtag_group_mapping.map((m, i) => (
                          <span key={i} className="px-2 py-1 text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200 rounded">
                            {m.group_id}
                          </span>
                        ))}
                        {tag.hashtag_group_mapping.length === 0 && <span className="text-stone-400 italic text-xs">Chưa gắn nhóm</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(tag.hashtag_id)} disabled={saving[tag.hashtag_id]} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700" title="Lưu">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditForms(p => { const n={...p}; delete n[tag.hashtag_id]; return n; }); }} className="p-1.5 text-stone-500 bg-stone-200 hover:bg-stone-300 rounded" title="Hủy">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(tag)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(tag.hashtag_id, tag.hashtag_text)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredHashtags.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Hash className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                  <p>Chưa có từ khóa nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
````

## File: src/components/ProfileForm.tsx
````typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { KeyRound } from "lucide-react";

export default function ProfileForm({ userEmail }: { userEmail: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return alert("Mật khẩu phải từ 6 ký tự trở lên.");
    if (password !== confirmPassword) return alert("Mật khẩu xác nhận không khớp.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      alert("Lỗi khi cập nhật mật khẩu: " + error.message);
    } else {
      alert("Cập nhật mật khẩu thành công!");
      setPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden p-6 space-y-6">
      
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1">Email đăng nhập</label>
        <input 
          type="text" 
          value={userEmail}
          disabled
          className="w-full px-4 py-2 text-sm border border-stone-200 rounded-lg bg-stone-50 text-stone-500 cursor-not-allowed"
        />
      </div>

      <div className="pt-4 border-t border-stone-100">
        <h2 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-stone-500" /> Đổi mật khẩu
        </h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu mới</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-4 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Xác nhận mật khẩu</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full px-4 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
      
    </div>
  );
}
````

## File: src/components/ScopeConfigForm.tsx
````typescript
"use client";

import { updateAssignedScope } from "@/app/actions/user";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Save, Tags, Database } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ScopeConfigForm({ 
  userId, 
  initialScope 
}: { 
  userId: string, 
  initialScope: { allowed_actors: string[], allowed_hashtag_groups: string[] } 
}) {
  const router = useRouter();
  const [scope, setScope] = useState(initialScope || { allowed_actors: [], allowed_hashtag_groups: [] });
  const [groups, setGroups] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [groupsRes, actorsRes] = await Promise.all([
        supabase.from("hashtag_groups").select("group_id, group_name").order("group_name"),
        supabase.from("apify_actors").select("actor_id, actor_name").order("actor_name")
      ]);
      
      if (groupsRes.data) setGroups(groupsRes.data);
      if (actorsRes.data) setActors(actorsRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const [groupSearch, setGroupSearch] = useState("");

  const unselectedGroups = groups.filter(g => 
    !scope.allowed_hashtag_groups?.includes(g.group_id) && 
    (g.group_name.toLowerCase().includes(groupSearch.toLowerCase()) || g.group_id.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const selectedGroups = groups.filter(g => scope.allowed_hashtag_groups?.includes(g.group_id));

  const handleToggleGroup = (groupId: string) => {
    const isSelected = scope.allowed_hashtag_groups?.includes(groupId);
    const newGroups = isSelected 
      ? scope.allowed_hashtag_groups.filter(id => id !== groupId)
      : [...(scope.allowed_hashtag_groups || []), groupId];
    setScope({ ...scope, allowed_hashtag_groups: newGroups });
  };

  const handleToggleActor = (actorId: string) => {
    const isSelected = scope.allowed_actors?.includes(actorId);
    const newActors = isSelected 
      ? scope.allowed_actors.filter(id => id !== actorId)
      : [...(scope.allowed_actors || []), actorId];
    setScope({ ...scope, allowed_actors: newActors });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateAssignedScope(userId, scope);
    if (res.error) {
      alert(res.error);
      setSaving(false);
    } else {
      router.push("/dashboard/researchers");
    }
  };

  if (loading) return <div className="text-sm text-stone-500 py-4">Đang tải cấu hình...</div>;

  return (
    <div className="space-y-8">
      {/* Hashtag Groups */}
      <div>
        <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Tags className="w-4 h-4 text-amber-600" /> Nhóm Từ khóa được phép theo dõi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => {
            const checked = scope.allowed_hashtag_groups?.includes(g.group_id);
            return (
              <label 
                key={g.group_id} 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
              >
                <input 
                  type="checkbox" 
                  className="mt-0.5 text-amber-600 rounded"
                  checked={checked}
                  onChange={() => handleToggleGroup(g.group_id)}
                />
                <div>
                  <div className="text-sm font-semibold text-stone-900">{g.group_name}</div>
                  <div className="text-xs text-stone-500">{g.group_id}</div>
                </div>
              </label>
            )
          })}
          {groups.length === 0 && <div className="text-xs text-stone-500 italic col-span-full">Chưa có dữ liệu Nhóm từ khóa trong hệ thống.</div>}
        </div>
      </div>

      {/* Actors */}
      <div>
        <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" /> Công cụ thu thập (Apify Actors) được phép dùng
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actors.map(a => {
            const checked = scope.allowed_actors?.includes(a.actor_id);
            return (
              <label 
                key={a.actor_id} 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
              >
                <input 
                  type="checkbox" 
                  className="mt-0.5 text-indigo-600 rounded"
                  checked={checked}
                  onChange={() => handleToggleActor(a.actor_id)}
                />
                <div>
                  <div className="text-sm font-semibold text-stone-900">{a.actor_name}</div>
                  <div className="text-xs text-stone-500">{a.actor_id}</div>
                </div>
              </label>
            )
          })}
          {actors.length === 0 && <div className="text-xs text-stone-500 italic col-span-full">Chưa có cấu hình Actor nào trong hệ thống.</div>}
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white font-medium text-sm rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Phân Công"}
        </button>
      </div>
    </div>
  );
}
````

## File: src/components/SettingsForm.tsx
````typescript
"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Save, Key } from "lucide-react";

export default function SettingsForm() {
  const [apifyKey, setApifyKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_key", "APIFY_API_TOKEN")
        .single();
      
      if (data) {
        setApifyKey(data.setting_value);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({ 
        setting_key: "APIFY_API_TOKEN", 
        setting_value: apifyKey,
        updated_at: new Date().toISOString()
      }, { onConflict: "setting_key" });

    if (error) {
      alert("Lỗi khi lưu: " + error.message);
    } else {
      alert("Lưu cấu hình thành công!");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12 text-stone-500">Đang tải cấu hình...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden p-6 space-y-6">
      
      <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-5">
        <h2 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-600" /> Kết nối Apify (Scraping Provider)
        </h2>
        
        <div className="space-y-3">
          <label className="block text-sm font-medium text-stone-700">
            Apify API Token
          </label>
          <div className="flex gap-3">
            <input 
              type="password" 
              value={apifyKey}
              onChange={(e) => setApifyKey(e.target.value)}
              placeholder="apify_api_..."
              className="flex-1 px-4 py-2 text-sm font-mono border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-stone-500">
            Token này được dùng để khởi tạo các tiến trình cào dữ liệu trên Apify. Bạn có thể thay đổi token này bất cứ lúc nào (ví dụ: khi tài khoản cũ hết quota) mà không cần phải khởi động lại máy chủ.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-stone-100">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

    </div>
  );
}
````

## File: src/lib/scrapers/adapters/clockworks-tiktok-hashtag.adapter.ts
````typescript
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
````

## File: src/lib/scrapers/adapters/facebook-hashtag.adapter.ts
````typescript
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
````

## File: src/lib/scrapers/adapters/facebook-pages.adapter.ts
````typescript
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
````

## File: src/lib/scrapers/adapters/facebook-search.adapter.ts
````typescript
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
````

## File: src/lib/scrapers/adapters/tiktok.adapter.ts
````typescript
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
````

## File: src/lib/scrapers/adapters/youtube-comments.adapter.ts
````typescript
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
````

## File: src/lib/scrapers/languageFilter.ts
````typescript
// ==========================================================
// Language Detection & Filter (HEURISTIC, ZERO dependency)
// ==========================================================
// Mục đích: Loại bỏ bài viết không thuộc ngôn ngữ quan tâm của dự án
// M&E Social Listening Việt Nam (thuốc lá điện tử / e-cig).
//
// Thiết kế theo triết lý TỐI GIẢN - KHÔNG thêm thư viện, KHÔNG gọi LLM
// cho mỗi bài viết (chậm + tốn cost). Dùng Heuristic rule dựa trên:
//   1. Tần suất chữ cái đặc trưng theo từng ngôn ngữ (có weight)
//   2. Các ký tự Unicode block (Hangul = KO, Hanzi/CJK = ZH,
//      Cyrillic = RU, Latin + tonal marks = VI)
//   3. Từ điển stopwords siêu nhỏ cho VI, EN (không bao hàm toàn
//      bộ từ, chỉ đủ để phân biệt nhanh các bài text nhiều chữ).
//
// Output:   { lang: "vi"|"en"|"zh"|"ko"|"ja"|"ru"|"other", score }
// Usage:    filterLangs(items, ["vi"]) -> chỉ giữ tiếng Việt
//           filterLangs(items, ["vi","en"]) -> giữ tiếng Việt + Anh
// ==========================================================

import type { ParsedDatasetItem } from "./types";

// ---------------- Unicode block helpers ----------------
const RE_HANGUL = /[\uAC00-\uD7AF]/;        // Korean Hangul
const RE_KANA = /[\u3040-\u309F\u30A0-\u30FF]/;  // Japanese Hiragana + Katakana
const RE_HANZI = /[\u4E00-\u9FFF]/;         // CJK Unified Ideographs (ZH/JA shared)
const RE_CYRILLIC = /[\u0400-\u04FF]/;      // Russian / Cyrillic
const RE_THAI = /[\u0E00-\u0E7F]/;          // Thai
const RE_ARABIC = /[\u0600-\u06FF]/;        // Arabic
// Tiếng Việt (Latin với dấu sắc huyền hỏi ngã nặng + đ)
const RE_VI_DIACRITIC = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ]/;
const RE_LATIN_LETTER = /[A-Za-z]/;

// ---------------- Tiny VI stopwords (top 50, lowercase không dấu + có dấu) ----------------
const VI_STOPWORDS = new Set([
  "và", "hoặc", "nhưng", "mà", "vì", "của", "trong", "từ", "trên", "dưới",
  "với", "bằng", "là", "đã", "sẽ", "đang", "không", "cũng", "chỉ", "rất",
  "thì", "nên", "một", "nhiều", "các", "đây", "đó", "khi", "nếu", "tôi",
  "bạn", "anh", "em", "chúng", "ta", "họ", "này", "kia", "được", "ở",
  "ngay", "luôn", "quá", "thôi", "cho", "như", "vào", "ra", "lại", "hơn",
  "khoa", "nghien", "cuu", "tam", "vat", "ly", "chat", "luong", "hap",
]);

const EN_STOPWORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her","was",
  "one","our","out","day","get","has","him","his","how","man","new","now","old",
  "see","two","way","who","boy","did","its","let","put","say","she","too","use",
  "this","that","with","from","they","been","have","were","will","your","just",
  "like","very","make","over","such","know","take","than","want","come","life",
  "vape","vaping","smoke","tobacco","e-cig","ecig","ecigarette","ejuice","juul",
  "nord","suorin","pod","cigarette","electronic","smoking","puff","flavor",
]);

// ---------------- Scoring ----------------
export interface LangDetection {
  lang: "vi" | "en" | "zh" | "ko" | "ja" | "ru" | "thai" | "ar" | "other";
  score: number;       // 0-100 confidence
  detail: Record<string, number>;
}

export function detectLanguage(rawText: string): LangDetection {
  const text = String(rawText || "").normalize("NFKC");
  const lowerNoPunct = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = lowerNoPunct.split(/\s+/).filter((t) => t.length > 0);

  // Tính theo % ký tự thuộc từng block (dựa trên toàn bộ ký tự letter)
  const letterOnly = Array.from(text).filter((c) => /\p{L}/u.test(c));
  const total = letterOnly.length;

  const count = (re: RegExp) => letterOnly.filter((c) => re.test(c)).length;
  const viDia = count(RE_VI_DIACRITIC);
  const han = count(RE_HANZI);
  const hangul = count(RE_HANGUL);
  const kana = count(RE_KANA);
  const cyr = count(RE_CYRILLIC);
  const latin = count(RE_LATIN_LETTER);
  const thai = count(RE_THAI);
  const arab = count(RE_ARABIC);

  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  // Rule-based mạnh: ngôn ngữ script độc quyền
  if (total === 0 || tokens.length === 0) {
    return { lang: "other", score: 0, detail: { total: 0 } };
  }
  if (pct(hangul) >= 15) return { lang: "ko", score: Math.round(Math.min(99, pct(hangul) * 2 + 30)), detail: { hangul: pct(hangul) } };
  if (pct(kana) >= 10) return { lang: "ja", score: Math.round(Math.min(99, pct(kana) * 2 + 30)), detail: { kana: pct(kana) } };
  if (pct(cyr) >= 30) return { lang: "ru", score: Math.round(Math.min(99, pct(cyr) * 2)), detail: { cyr: pct(cyr) } };
  if (pct(thai) >= 20) return { lang: "thai", score: Math.round(Math.min(99, pct(thai) * 2 + 10)), detail: { thai: pct(thai) } };
  if (pct(arab) >= 20) return { lang: "ar", score: Math.round(Math.min(99, pct(arab) * 2 + 10)), detail: { arab: pct(arab) } };

  // Hanzi chiếm ưu thế => ZH (JA được rule trên bắt nếu có kana)
  if (pct(han) >= 40) {
    return { lang: "zh", score: Math.round(Math.min(99, pct(han) * 1.5)), detail: { han: pct(han) } };
  }

  // Dấu tiếng Việt (ơ, ư, đ, ă, dấu thanh) gần như không xuất hiện trong tiếng Anh:
  // >= 2 ký tự và >= 5% chữ cái là đủ chắc chắn tiếng Việt (tránh câu ngắn bị nhận nhầm EN).
  if (viDia >= 2 && pct(viDia) >= 5) {
    return { lang: "vi", score: Math.min(99, Math.round(50 + pct(viDia))), detail: { viDiaPct: Math.round(pct(viDia)) } };
  }

  // Latin / Việt: tính điểm stopwords + dấu tiếng Việt
  let viScore = 0;
  let enScore = 0;
  viScore += Math.min(35, pct(viDia) * 2.2);     // dấu VI nặng điểm
  enScore += Math.max(0, pct(latin) - pct(viDia) - 5);

  // Token stopword hit
  let viHits = 0, enHits = 0;
  for (const t of tokens) {
    const tn = t.trim();
    if (tn.length < 2) continue;
    if (VI_STOPWORDS.has(tn)) viHits++;
    if (EN_STOPWORDS.has(tn)) enHits++;
  }
  // Heuristic: "chỉ toàn hashtag, không có dấu tiếng Việt" → đáng nghi là other
  const allTokensStartWithHash = (tokens.length >= 2) && tokens.every((t) => {
    const raw = text.toLowerCase().split(/\s+/).find((x) => x.replace(/^#+/, "") === t);
    return raw && raw.startsWith("#");
  });
  const hashtagOnly = text.startsWith("#") || (tokens.every((t) => t.length <= 8) && viDia === 0 && total < 30);
  const pureHashtags = allTokensStartWithHash || hashtagOnly;
  const hitWeight = tokens.length >= 4 ? Math.min(100, tokens.length * 6) : 15;
  viScore += (viHits / Math.max(1, tokens.length)) * hitWeight;
  enScore += (enHits / Math.max(1, tokens.length)) * hitWeight;

  // Rule đặc biệt: pure hashtags (người Việt gõ caption chỉ toàn hashtag không dấu)
  // → classify "other" thay vì EN, tránh loại nhầm.
  if (pureHashtags && viDia === 0 && pct(latin) >= 70) {
    return {
      lang: "other",
      score: Math.round(Math.min(40, Math.max(5, 30 - tokens.length))),
      detail: {
        viScore: round(viScore),
        enScore: round(enScore),
        viDiaPct: round(pct(viDia)),
        latinPct: round(pct(latin)),
        hanPct: round(pct(han)),
        tokens: tokens.length,
        viHits, enHits,
        pureHashtagsFlag: 1,
        hashtagOnlyFlag: hashtagOnly ? 1 : 0,
      },
    };
  }

  const detail = {
    viScore: round(viScore),
    enScore: round(enScore),
    viDiaPct: round(pct(viDia)),
    latinPct: round(pct(latin)),
    hanPct: round(pct(han)),
    tokens: tokens.length,
    viHits, enHits,
    hashtagOnlyFlag: hashtagOnly ? 1 : 0,
  };

  if (viScore >= enScore && viScore >= 8) {
    return { lang: "vi", score: clamp(round(viScore + (viDia > 0 ? 15 : 0))), detail };
  }
  if (enScore >= 10) {
    return { lang: "en", score: clamp(round(enScore)), detail };
  }
  if (pct(han) >= 10) {
    return { lang: "zh", score: clamp(round(pct(han) * 1.5)), detail };
  }
  if (hashtagOnly) {
    // Không đủ dấu + toàn hashtags ngắn: mặc định "other" để user tự quyết định
    return { lang: "other", score: 10, detail };
  }
  return { lang: "other", score: Math.max(5, Math.round(enScore)), detail };
}

function round(n: number) { return Math.round(n * 100) / 100; }
function clamp(n: number) { return Math.min(99, Math.max(1, n)); }

// ---------------- Filter on ParsedDatasetItem ----------------
export type WhitelistLang = LangDetection["lang"][];

export interface LanguageFilterResult {
  item: ParsedDatasetItem;
  detected: LangDetection;
  passed: boolean;            // true = thuộc whitelist
}

export function filterItemsByLanguage(
  items: ParsedDatasetItem[],
  allowLangs: string[] = ["vi"],
): LanguageFilterResult[] {
  const allow = new Set(allowLangs.map((l) => l.toLowerCase()));
  const out: LanguageFilterResult[] = [];
  for (const it of items) {
    const text = it.normalized?.raw_text ?? "";
    const det = detectLanguage(text);
    const passed = allow.has(det.lang);
    out.push({ item: it, detected: det, passed });
  }
  return out;
}

export default { detectLanguage, filterItemsByLanguage };
````

## File: src/lib/scrapers/postPipeline.ts
````typescript
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
````

## File: src/lib/scrapers/registry.ts
````typescript
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
````

## File: src/lib/scrapers/types.ts
````typescript
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
````

## File: src/lib/utils.ts
````typescript
export { cn } from "cn"
````

## File: src/utils/supabase/client.ts
````typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
````

## File: src/utils/supabase/middleware.ts
````typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabaseResponse;
}
````

## File: src/utils/supabase/server.ts
````typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
````

## File: src/middleware.ts
````typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
````

## File: AGENTS.md
````markdown
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
````

## File: CLAUDE.md
````markdown
@AGENTS.md
````

## File: components.json
````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
````

## File: create_settings.js
````javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow Admin to ALL system_settings" ON system_settings;
    CREATE POLICY "Allow Admin to ALL system_settings" ON system_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
  `;

  // Actually supabase-js does not support raw SQL execution over HTTP without RPC.
  // I will just use the REST API to insert into it if it exists. Wait, it doesn't exist yet!
  console.log("Please run this SQL in Supabase SQL Editor:\\n", sql);
}
run();
````

## File: eslint.config.mjs
````javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
````

## File: next.config.ts
````typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
````

## File: postcss.config.mjs
````javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
````

## File: scraper-framework-research.md
````markdown
# VPHA M&E — Bộ khung thu thập dữ liệu định hướng (Scraper Framework Research)

> Tập tin nghiên cứu / bản phác thảo — KHÔNG PHẢI production code.
> Mục đích: Thiết kế bộ điều phối (Adapter Pattern) để mỗi Apify Actor có cấu hình JSON (trong `apify_actors.default_config`) được dịch thành lệnh gọi Apify API phù hợp; đồng thời thiết kế schema dữ liệu để **like & comment được cập nhật NHƯNG KHÔNG GHI ĐÈ** (lưu lịch sử snapshot).

---

## 1. Actor hiện có (Seed từ seed.js)

| actor_id                       | platform | default_config seed    | Mục đích                                                                                  |
| ------------------------------ | -------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `clockwork/tiktok-scraper`     | Tiktok   | `{ maxItems: 100 }`    | Scrape video (feed hashtag): hashtag → video metadata + metrics (like/comment/share/view) |
| `apify/facebook-pages-scraper` | Facebook | `{ resultsLimit: 50 }` | Scrape page feed: page-id/page-url → bài viết page, ảnh, video, engagement                |
| `streamer/youtube-scraper`     | YouTube  | `{ maxComments: 200 }` | Scrape comments theo từ khóa / video URL → metadata video + comments                      |

---

## 2. Chi tiết cách mỗi Actor quét Hashtag / Comment / Like

Lượt thích / Chấm điểm 2.1 `clockwork/tiktok-scraper\*\*Hashtag → Video feed (CÁCH NHẤT ĐỊNH TRONG seed)

- Scraper phổ biến (dựa trên tài liệu Apify Store & review community):
  - Input field: `hashtags[]` (mảng các hashtag, bỏ dấu # hoặc giữ # được, nên giữ nguyên # để nhất quán UI)
  - Input field: `maxItems` (tổng số video, seed mặc định 100)
  - Input field: `shouldDownloadVideos` (luôn false — không lưu video bin, chỉ lưu text + metrics)
  - Input field: `shouldDownloadCovers` (false — không lưu ảnh bin, giữ URL đến cover thôi)
  - Input field: `proxy` (object Apify proxy, auto-use residential)

Kết quả (dataset item, field phổ biến):

```ts
interface TikTokVideoItem {
  id: string;                 // TikTok video id -> post_native_id (luôn duy nhất)
  webVideoUrl: string;        // https://www.tiktok.com/@user/video/XXXX -> scraped_posts.post_url
  desc: string;               // caption -> content_text
  createTimeISO: string;        // ISO string -> published_at
  diggCount: number;         // like count
  shareCount: number;        // share count
  playCount: number;         // view count
  commentCount: number;      // comment count
  collectCount: number;    // save count (optional)
  authorMeta: {
    id: string;              // author_username, avatar, name, signature ... -> author_username, author_display_name, author_avatar
    name: string;
  };
  hashtags: Array<{ name: string; }>;   // hashtags đã được Apify parse ra từ caption
  musicMeta?: { ... };         // tên nhạc (thường bỏ qua cho mục đích M&E)
}
```

👉 **Ví dụ payload gửi lên Apify khi run `clockwork/tiktok-scraper`:**

```json
{
  "hashtags": ["#vape", "#pod", "#thuocladientu"],
  "maxItems": 150,
  "shouldDownloadVideos": false,
  "shouldDownloadCovers": false,
  "maxConcurrency": 5,
  "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
}
```

---

### 2.2 `apify/facebook-pages-scraper`

⚠️ **Lưu ý quan trọng của Actor này**: Nó scrape **Page feed** (các trang page FB), KHÔNG scrape hashtag theo hashtag keyword (Facebook không public API hashtag công khai ổn định). Để dùng hợp lý trong dự án M&E thuốc lá điện tử (quét định hướng):

- Admin KHÔNG chỉ định hashtag cho FB actor này, mà admin nhập vào trường `startUrls` hoặc `pageUrls` **bên trong `default_config` của từng dòng actor record** (bỏ qua bước hashtags pick).
- Hoặc: sửa một tý UI: nếu platform="Facebook" thì field hashtag trở thành "Danh sách Page URLs (mỗi dòng 1 URL)". **Nhưng để tránh sinh thêm quy trình — ưu tiên để admin edit `default_config` JSON thủ công cho các actor FB page riêng, và trong adapter sẽ merge hashtags (từ UI) vào field `searchWords` hoặc như fallback.**

Phổ biến input của `apify/facebook-pages-scraper`:

```ts
interface FBPageScraperInput {
  startUrls?: string[]; // page URLs (https://www.facebook.com/ABC)
  pageLimit?: number; // resultsLimit -> tổng số page / post
  resultsLimit?: number; // seed đang dùng: 50 (giới hạn số BÀI VIẾT trên mỗi page)
  maxComments?: number; // nếu muốn kéo comments mỗi post (thường bỏ, actor riêng comments chuyên hơn)
  onlyPostsNewerThan?: string; // ISO date (từ khi ra -> filter cũ bỏ qua)
  proxy: { useApifyProxy: true; apifyProxyGroups?: ["RESIDENTIAL"] };
}
```

Output item phổ biến (post):

```ts
interface FBPostItem {
  url: string;                                // -> post_url (LUÔN UNIQUE, dedupe key chính)
  facebookId?: string;                        // native post id -> post_native_id
  pageName: string;                           // page owner
  pageUrl?: string;                           // page url
  text: string;                               // content_text
  time: string;                               // ISO published_at
  likes: number | null;                       // like_count (có thể null nếu private)
  comments: number | null;                    // comment_count
  shares: number | null;                      // share_count
  reactions?: { like?: number; love?: number; haha?: number; ... }; // (thường merge -> like_count tổng)
}
```

👉 **Facebook case: Merge Hashtag UI** — Khi user chọn hashtag thì adapter FB đưa vào field `searchWords` (actor này hỗ trợ keyword filter trên page feed):

```json
{
  "startUrls": [<< từ default_config admin đã điền các page URLs >>],
  "searchWords": ["#vape", "#pod", "thuốc lá điện tử"],
  "resultsLimit": 50,
  "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
}
```

---

### 2.3 `streamer/youtube-scraper`

⚠️ Actor comments chuyên dụng: Scrape comments trên **một list video URLs** (hoặc một channel, hoặc search YouTube search term + keyword trên trang kết quả). Để hợp lý với hashtag UI:

- Actor **KHÔNG dùng trực tiếp "hashtag YouTube" (YouTube hashtags kém phổ biến trên trang có #).** → **cách chuẩn**: adapter map selectedHashtags[] → `searchTerms` actor, field `maxVideos`, lấy top videos, sau đó kéo comments mỗi video theo `maxComments` seed 200.

Input phổ biến:

```ts
interface YTScraperInput {
  searchTerms?: string[]; // keywords / hashtag -> #vape pod ...
  videoUrls?: string[]; // url -> https://www.youtube.com/watch?v=XX
  channelUrls?: string[];
  maxVideos?: number; // số video lấy ra
  maxComments?: number; // seed 200
  sortVideosBy?: string; // "RELEVANCE" / "NEWEST" (luôn "NEWEST" trong M&E)
  sortCommentsBy?: string; // "TOP_COMMENTS" or "NEWEST_FIRST" (nên "NEWEST_FIRST" để lấy mới trước)
  proxy: { useApifyProxy: true; apifyProxyGroups: ["RESIDENTIAL"] };
}
```

Output 2 dạng item (2 dataset chung cùng 1 run - cần phân biệt khi parse):

```ts
// Kiểu 1: metadata Video
interface YTVideoItem {
  id: string; // native YT id -> post_native_id
  url: string; // -> post_url
  title: string; // -> content_text (nếu muốn gộp, hoặc để riêng title + description)
  text: string; // description
  channelName: string; // author_display_name
  channelUrl?: string; // author profile link
  viewCount?: number; // view_count
  likeCount?: number; // like_count
  dislikeCount?: number; // (ít dùng)
  commentCount?: number; // comment_count
  publishedAt?: string; // published_at
  tags?: string[]; // hashtags / tags
  duration?: string; // thời lượng (không quan trọng M&E)
  thumbnails?: any;
}

// Kiểu 2: Comment (nằm dataset cùng dataset, cần filter ra bảng scraped_posts_comments hoặc nếu muốn lưu)
interface YTCommentItem {
  id: string; // native comment id
  videoId: string; // FK đến YT video
  url?: string; // url đến comment
  text: string; // content comment
  authorName: string; // comment author
  authorChannelUrl?: string;
  likeCount?: number; // comment like (thường ít, nhưng có thể lưu)
  publishedAt?: string; // published_at
  replyCount?: number; // số reply
}
```

👉 **Ví dụ run payload `streamer/youtube-scraper` khi user chọn hashtag UI:**

```json
{
  "searchTerms": ["#vape", "pod vape", "thuốc lá điện tử review"],
  "maxVideos": 20,
  "maxComments": 200,
  "sortVideosBy": "NEWEST",
  "sortCommentsBy": "NEWEST_FIRST",
  "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
}
```

---

## 3. Bộ điều phối chung — Scraper Adapter Pattern (Hàm khung)

Tổ chức code: Tạo thư mục `src/lib/scrapers/` (tương lai):

```
src/
  lib/
    scrapers/
      types.ts              // Interface ScraperAdapter
      registry.ts          // Map actor_id => Adapter instance (register)
      index.ts                // dispatcher: buildRunInput(), parseResults()
      adapters/
        tiktok.adapter.ts
        facebook-pages.adapter.ts
        youtube-comments.adapter.ts
```

### 3.1 Interface chung (types.ts):

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

// Input runtime từ UI / DB collection_runs
export interface RuntimeScrapeRunConfig {
  run_id: string; // collection_runs.run_id
  apify_run_id?: string; // set sau khi gọi Apify
  apify_dataset_id?: string; // set sau khi Apify trả về
  researcher_email: string; // collection_runs.researcher_code
  actor_id: string;
  platform: string;
  hashtags: string[]; // query_parameters.hashtags (từ UI)
  maxItems_runtime?: number; // maxItems user điền (override max config)
  group_id?: string; // hashtag group
  default_config: Record<string, any>; // từ apify_actors.default_config
}

// Output chuẩn (platform-agnostic) được ghi vào DB scraped_posts
export interface NormalizedPost {
  platform: "Tiktok" | "Facebook" | "YouTube" | string;
  post_native_id: string; // dedupe KEY platform
  post_url: string; // dedupe KEY platform
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  content_text: string;
  media_urls: string[]; // (không download file)
  hashtags: string[]; // normalized to lowercase + keep " #"
  published_at: string | null;
  // metrics lấy LẦN đầu -> scraped_posts.like_count ... những lần sau KHÔNG UPDATE vào đây
  _raw_item: unknown; // record jsonb gốc để tra cứu
}

// Interface mỗi Adapter cần implement
export interface ScraperAdapter {
  /**
   * Gộp default_config (JSON từ apify_actors) + runtime (hashtags, maxItems user chọn)
   * -> trả về payload GỬI LÊN Apify API (POST /v2/acts/{actorId}/runs)
   */
  buildActorInput(cfg: RuntimeScrapeRunConfig): Record<string, any>;

  /**
   * Parse dataset Apify trả về (dataset.items) -> NormalizedPost[]
   * Đồng thời phân biệt (FB/TikTok/YT và skip / comment riêng)
   */
  normalizeDatasetItems(items: unknown[]): NormalizedPost[];

  /**
   * (Tùy chọn) Extra validate trước khi chạy: ví dụ FB cần pageUrls phải có thì mới chạy, không thì báo lỗi
   */
  validateConfig?(cfg: RuntimeScrapeRunConfig): string[]; // trả về mảng lỗi (rỗng -> OK)
}
```

### 3.2 Dispatcher chung (index.ts dispatcher):

```ts
// import tiktokAdapter from "./adapters/tiktok.adapter";
// import fbAdapter from "./adapters/facebook-pages.adapter";
// import ytAdapter from "./adapters/youtube-comments.adapter";
import type { RuntimeScrapeRunConfig, ScraperAdapter } from "./types";

const REGISTRY: Record<string, ScraperAdapter> = {
  "clockwork/tiktok-scraper": tiktokAdapter,
  "apify/facebook-pages-scraper": fbAdapter,
  "streamer/youtube-scraper": ytAdapter,
};

export function getAdapter(actorId: string): ScraperAdapter | null {
  return REGISTRY[actorId] ?? null;
}

/**
 * Build payload gửi Apify start run
 */
export function buildApifyActorInput(
  cfg: RuntimeScrapeRunConfig,
): Record<string, any> {
  const adapter = getAdapter(cfg.actor_id);
  if (!adapter) {
    throw new Error(
      `No scraper adapter registered for actor_id: ${cfg.actor_id}`,
    );
  }
  if (adapter.validateConfig) {
    const errs = adapter.validateConfig(cfg);
    if (errs.length > 0) {
      throw new Error(`Adapter config invalid: ${errs.join(" | ")}`);
    }
  }
  return adapter.buildActorInput(cfg);
}

/**
 * Sau khi Apify trả dataset items -> parse chuẩn
 */
export function normalizeScrapedItems(actorId: string, items: unknown[]) {
  const adapter = getAdapter(actorId);
  if (!adapter) throw new Error(`No adapter: ${actorId}`);
  return adapter.normalizeDatasetItems(items);
}
```

### 3.3 Adapter mẫu 1: tiktok.adapter.ts (hàm khung):

```ts
import type { NormalizedPost, RuntimeScrapeRunConfig, ScraperAdapter } from "../types";

const tiktokAdapter: ScraperAdapter = {
  buildActorInput(cfg) {
    const defaults = cfg.default_config ?? {};
    const maxItems = cfg.maxItems_runtime ?? defaults.maxItems ?? 100;
    const hashtags = cfg.hashtags.length > 0 ? cfg.hashtags : (defaults.hashtags ?? []);
    return {
      hashtags,
      maxItems,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      maxConcurrency: defaults.maxConcurrency ?? 5,
      enableCoversOutput: false,
      enableWatermarkVideo: false,
      proxy: defaults.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(defaults.extra || {}),
    };
  },

  normalizeDatasetItems(items) {
    const out: NormalizedPost[] = [];
    for (const raw of items as any[]) {
      if (!raw || typeof raw !== "object") continue;
      if (!raw.id || !raw.webVideoUrl) continue;
      out.push({
        platform: "Tiktok",
        post_native_id: String(raw.id),
        post_url: raw.webVideoUrl,
        author_username: raw.authorMeta?.name ?? "",
        author_display_name: raw.authorMeta?.nickName ?? raw.authorMeta?.name ?? "",
        author_avatar_url: raw.authorMeta?.avatar ?? null,
        content_text: String(raw.desc ?? ""),
        media_urls: raw.musicMeta?.coverMediumUrl ? [raw.musicMeta.coverMediumUrl] : [],
        hashtags: Array.isArray(raw.hashtags)
          ? raw.hashtags.map((h: any) => (h?.name ? `#${h.name}`.toLowerCase() : "").filter(Boolean)
          : [],
        published_at: raw.createTimeISO ?? (raw.createTime ? new Date(raw.createTime * 1000).toISOString() : null),
        _raw_item: raw,
      });
    }
    return out;
  },
};

export default tiktokAdapter;
```

### 3.4 Adapter mẫu 2: facebook-pages.adapter.ts (hàm khung):

```ts
import type {
  NormalizedPost,
  RuntimeScrapeRunConfig,
  ScraperAdapter,
} from "../types";

const fbAdapter: ScraperAdapter = {
  validateConfig(cfg) {
    const errs: string[] = [];
    const defaults = cfg.default_config ?? {};
    const urls: string[] = defaults.startUrls ?? defaults.pageUrls ?? [];
    if (urls.length === 0 && !defaults.searchPages?.length) {
      errs.push(
        "Actor Facebook phải có startUrls[] trong default_config (danh sách page URLs)",
      );
    }
    return errs;
  },

  buildActorInput(cfg) {
    const defaults = cfg.default_config ?? {};
    const resultsLimit = cfg.maxItems_runtime ?? defaults.resultsLimit ?? 50;
    return {
      startUrls: defaults.startUrls ?? defaults.pageUrls ?? [],
      searchWords:
        cfg.hashtags.length > 0
          ? [...cfg.hashtags]
          : (defaults.searchWords ?? []),
      resultsLimit,
      maxComments: defaults.maxComments ?? 0, // default 0 để không kéo comments (tiết kiệm cost)
      onlyPostsNewerThan: defaults.onlyPostsNewerThan,
      proxy: defaults.proxy ?? {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
      ...(defaults.extra || {}),
    };
  },

  normalizeDatasetItems(items) {
    const out: NormalizedPost[] = [];
    for (const raw of items as any[]) {
      if (!raw?.url) continue;
      out.push({
        platform: "Facebook",
        post_native_id: String(raw.facebookId ?? raw.url),
        post_url: raw.url,
        author_username: raw.pageName ?? "",
        author_display_name: raw.pageName ?? "",
        author_avatar_url: null,
        content_text: String(raw.text ?? ""),
        media_urls: Array.isArray(raw.images) ? raw.images.slice(0, 10) : [],
        hashtags: extractFbHashtags(raw.text ?? ""),
        published_at: raw.time ?? null,
        _raw_item: raw,
      });
    }
    return out;
  },
};

function extractFbHashtags(text: string): string[] {
  const re = /#([a-z0-9_]+)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ""))) !== null) {
    out.push(m[0].toLowerCase());
  }
  return [...new Set(out)];
}

export default fbAdapter;
```

### 3.5 Adapter mẫu 3: youtube-comments.adapter.ts (hàm khung):

```ts
import type { NormalizedPost, RuntimeScrapeRunConfig, ScraperAdapter } from "../types";

const ytAdapter: ScraperAdapter = {
  buildActorInput(cfg) {
    const defaults = cfg.default_config ?? {};
    const maxVideos = Math.min(cfg.maxItems_runtime ?? defaults.maxVideos ?? 20, 100);
    const maxComments = defaults.maxComments ?? 200;
    const videoUrls = defaults.videoUrls ?? [];
    const channelUrls = defaults.channelUrls ?? [];
    return {
      searchTerms: cfg.hashtags.length > 0 ? [...cfg.hashtags] : (defaults.searchTerms ?? []),
      videoUrls,
      channelUrls,
      maxVideos,
      maxComments,
      sortVideosBy: defaults.sortVideosBy ?? "NEWEST",
      sortCommentsBy: defaults.sortCommentsBy ?? "NEWEST_FIRST",
      proxy: defaults.proxy ?? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      ...(defaults.extra || {}),
    };
  },

  normalizeDatasetItems(items) {
    // LƯU Ý: chỉ lấy item kiểu VIDEO (bỏ kiểu comment riêng trong dataset)
    const out: NormalizedPost[] = [];
    for (const raw of items as any[]) {
      if (!raw || !raw.url) continue;
      // Heuristic: comment item luôn có field "videoId" và không có "sortVideosBy"...
      // dùng cách đơn giản: nếu có field "videoId" -> item comment, bỏ qua
      const isCommentItem = typeof raw.videoId === "string" && typeof raw.authorName === "string";
      if (isCommentItem) continue;
      // Nếu có title + viewCount / channelName -> VIDEO metadata
      const looksLikeVideo = typeof raw.title === "string" || typeof raw.channelName === "string";
      if (!looksLikeVideo && !raw.publishedAt) continue;
        out.push({
          platform: "YouTube",
          post_native_id: String(raw.id),
          post_url: raw.url,
          author_username: raw.channelUrl?.split("/").filter(Boolean).pop() ?? "",
          author_display_name: raw.channelName ?? "",
          author_avatar_url: null,
          content_text: [String(raw.title ?? ""), String(raw.text ?? "")].filter(Boolean).join("\n\n"),
          media_urls: raw.thumbnails?.medium?.url ? [raw.thumbnails.medium.url] : [],
          hashtags: normalizeTags(raw.tags ?? []),
          published_at: raw.publishedAt ?? null,
          _raw_item: raw,
        });
      }
      // NOTE: comments items (có videoId) -> bỏ qua bảng scraped_posts_comments nếu cần, hiện tại cho vào bảng riêng (chưa cần)
    }
    return out;
  },
};

function normalizeTags(tags: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => {
    const s = String(t).trim().toLowerCase();
    return s.startsWith("#") ? s : `#${s}`;
  })];
}

export default ytAdapter;
```

---

## 4. Schema Bảo đảm "Like & Comment được cập nhật NHƯNG KHÔNG GHI ĐÈ — Metrics Snapshot

Đây là bảng cốt lõi yêu cầu: \*\*cùng một post (post_url), nhiều lần quét / follow up không được làm mất dữ liệu lịch sử.

### 4.1 Bảng `scraped_posts` (bản gốc — cache "chỉ INSERT 1 lần mỗi post mới, nếu đã tồn tại -> KHÔNG UPDATE metrics):

```sql
CREATE TABLE IF NOT EXISTS public.scraped_posts (
    post_id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL,
    post_native_id TEXT,
    post_url TEXT NOT NULL,
    author_username TEXT,
    author_display_name TEXT,
    author_avatar_url TEXT,
    content_text TEXT,
    media_urls TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    hashtags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    published_at TIMESTAMPTZ,
    matched_group_id TEXT,             -- (từ hashtags group (COMMERCIAL/YOUTH...)
    source_run_id TEXT NOT NULL REFERENCES public.collection_runs(run_id) ON DELETE SET NULL,
    researcher_code TEXT,
    raw_item JSONB,                -- Apify item gốc lần đầu lấy (có thể NULL lần sau parse khác nhẹ)
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scraped_posts_uq UNIQUE (platform, post_url)   -- dedupe KEY (2 platform)
);
CREATE INDEX IF NOT EXISTS idx_scraped_posts_platform_hashtags ON public.scraped_posts USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_scraped_posts_group ON public.scraped_posts(matched_group_id);
```

👉 **QUY TẮC KHÔNG UPDATE metrics vào scraped_posts** khi re-scrape cùng post_url:

- `first_seen_at`, `content_text`, `author_*` → nếu đã có thì KHÔNG ĐỘNG (nếu muốn update content mới hơn thì để decision sau.)

### 4.2 Bảng `post_metrics_snapshot` (LƯU TẤT CẢ các lần đo — KHÔNG BAO GIỜ GHI ĐÈ, luôn INSERT):

```sql
CREATE TABLE IF NOT EXISTS public.post_metrics_snapshot (
    snapshot_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES public.scraped_posts(post_id) ON DELETE CASCADE,
    source_run_id TEXT REFERENCES public.collection_runs(run_id) ON DELETE SET NULL,
    snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    like_count BIGINT,
    comment_count BIGINT,
    share_count BIGINT,
    view_count BIGINT,
    collect_count BIGINT,              -- TikTok bookmark/save

    engagement_score NUMERIC(18,4) GENERATED ALWAYS AS (
        COALESCE(like_count, 0)
      + COALESCE(comment_count, 0) * 5
      + COALESCE(share_count, 0) * 3
      + COALESCE(view_count, 0) * 0.01
    ) STORED,

    extra JSONB DEFAULT '{}'::JSONB        // reactions break-down
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_post_time
  ON public.post_metrics_snapshot(post_id, snapshotted_at DESC NULLS LAST;
CREATE INDEX IF NOT EXISTS idx_post_metrics_run
  ON public.post_metrics_snapshot(source_run_id);
```

### 4.3 (Tùy chọn tiện ích) View `scraped_posts_with_latest_metrics`:

Để lấy metrics mới nhất join nhanh (lọc dashboard):

```sql
CREATE OR REPLACE VIEW public.scraped_posts_latest AS
SELECT
    p.*,
    m.like_count AS latest_likes,
    m.comment_count AS latest_comments,
    m.share_count AS latest_shares,
    m.view_count AS latest_views,
    m.collect_count AS latest_collects,
    m.engagement_score AS latest_engagement,
    m.snapshotted_at AS metrics_updated_at
FROM public.scraped_posts p
LEFT JOIN LATERAL (
  SELECT * FROM public.post_metrics_snapshot m2
    WHERE m2.post_id = p.post_id
    ORDER BY m2.snapshotted_at DESC
    LIMIT 1
) m ON TRUE;
```

### 4.4 Quy tắc Upsert khi ingest dữ liệu mới về:

Pseudo code khi có 1 lô NormalizedPost[] + raw metrics:

```ts
for (const post of normalizedPosts) {
  // 1) scraped_posts: INSERT nếu post_url+platform chưa có; nếu có thì BỎ QUA (KHÔNG UPDATE)
  const { data: existing, error: selErr } = await supabase
    .from("scraped_posts")
    .select("post_id")
    .eq("platform", post.platform)
    .eq("post_url", post.post_url)
    .maybeSingle();

  let post_id: number;
  if (!existing) {
    const { data: ins, error: iErr } = await supabase.from("scraped_posts").insert({
      platform: post.platform,
      post_native_id: post.post_native_id,
      post_url: post.post_url,
      author_username: post.author_username,
      author_display_name: post.author_display_name,
      author_avatar_url: post.author_avatar_url,
      content_text: post.content_text,
      media_urls: post.media_urls,
      hashtags: post.hashtags,
      published_at: post.published_at,
      matched_group_id: groupId,
      source_run_id: runId,
      researcher_code: researcher_email,
      raw_item: post._raw_item
    }).select("post_id").single();
    post_id = ins!.post_id;
  } else {
    post_id = existing.post_id;
    // ❌ KHÔNG UPDATE scraped_posts
  }

  // 2) post_metrics_snapshot: LUÔN INSERT (dù post cũ hay mới) — KHÔNG GHI ĐÈ
  await supabase.from("post_metrics_snapshot").insert({
    post_id,
    source_run_id: runId,
    // snapshotted_at default now()
    like_count: extractRaw.get(post) // từ _raw_item -> từ TikTok: diggCount / FB: likes / YT: likeCount
    // (tương tự comment_count, share_count, view_count, collect_count,
    extra: rawBreakdown
  });
}
```

---

## 5. Flow hoàn chỉnh từ collection_runs lifecycle (8 bước)

```
  User tạo plan (UI ScrapingStudio)
       │
       ▼
1. [INSERT collection_runs.status=RUNNING or QUEUED (P0 vừa làm)
       │
       ▼
2. Worker / Cron / onClick "Run": gọi dispatcher.buildApifyActorInput(cfg)
      👉 đọc apify_actors.default_config + run.query_parameters hashtags/maxItems
       │
       ▼
3. POST https://api.apify.com/v2/acts/<actorId>/runs?token=<APIFY_API_TOKEN>
       Header: Content-Type: application/json
       Body: payload từ bước 2
       Response.id -> lưu vào collection_runs.apify_run_id
       Response.defaultDatasetId -> lưu collection_runs.apify_dataset_id
       │
       ▼
4. UPDATE collection_runs.status=RUNNING, started_at=now
       │
       ▼
5. Poll GET /v2/actor-runs/<apify_run_id> mỗi 10s (retry backoff)
       SUCCEEDED / FAILED / TIMED-OUT
       │
       ▼
6 (nếu FAILED):
       UPDATE status=FAILED, error_message=...
       (nếu SUCCEEDED):
       ▼
7. GET /v2/datasets/<datasetId>/items?offset=0&limit=1000 (loop tất cả page)
       items[] -> dispatcher.normalizeScrapedItems(actor_id, items)
       -> batch INSERT/ignore scraped_posts (dedup)
       -> INSERT ALL vào post_metrics_snapshot (KHÔNG GHI ĐÈ)
       │
       ▼
8. UPDATE collection_runs.status=SUCCESS,
       completed_at=now(),
       items_count=số post NORMALIZED lưu thành công
```

Lưu ý Apify: có thể dùng `waitForFinish` query param ?=60 trên request start run để đợi kết quả 1 lần, thay vì poll vòng lặp thủ công.

---

## 6. ALTER collection_runs bổ sung (append SQL) — cần chạy migration trước khi tích hợp Apify thật

```sql
ALTER TABLE public.collection_runs
  ADD COLUMN IF NOT EXISTS apify_run_id TEXT,           -- id của lệnh chạy trên Apify
  ADD COLUMN IF NOT EXISTS apify_dataset_id TEXT,       -- dataset id kết quả
  ADD COLUMN IF NOT EXISTS apify_build TEXT,              -- (optional) log url Apify (link xem log)
  ADD COLUMN IF NOT EXISTS error_message TEXT,            -- nếu FAILED -> lý do
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;   -- lúc Apify trả SUCCEEDED/FAILED
```

---

## 7. Những lưu ý cần xác nhận (sau này code thật)

1. **Facebook** — Actor `apify/facebook-pages-scraper` yêu cầu **page URLs** → Admin phải có trước (quy trình giấy tờ). KHÔNG hỗ trợ hashtag feed ổn định như TikTok/YT. Hiện adapter merge hashtags thành `searchWords` để chỉ lấy bài chứa keyword trên trang.
2. **YouTube** — nếu run có comments (thường nặng/cost cao), bảng `scraped_posts_comments` (chưa design) nên dùng tách riêng comments ra khỏi post (comments nhiều lên đến hàng ngàn). Hiện tại adapter chỉ parse VIDEO (không lưu comments text).
3. **Cost/Proxy**: mặc dù Apify auto proxy RESIDENTIAL group dùng actor nào có cost. KHuyến nghị field `maxItems_runtime` mặc định nhỏ (20 - 50) với user mới test.
4. **Dedupe 2 tầng**:
   - tầng scraped_posts UNIQUE (platform, post_url)
   - tầng post_metrics_snapshot LUÔN INSERT -> không cần unique (mỗi mỗi collection_runs có thể tạo 1 dòng)
5. **Hashtag** parse từ caption / raw, còn matched_group_id scraped_posts: join bảng hashtag_group_mapping sau khi parse hashtags[] không nên cache.
````

## File: setup.mjs
````javascript
import fs from 'fs';
fs.mkdirSync('utils/supabase', { recursive: true });
fs.writeFileSync('utils/supabase/client.ts', \import { createBrowserClient } from '@supabase/ssr';\n\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  );\n}\n\);
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
````

## File: src/app/actions/auth.ts
````typescript
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkHasUsers() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return false;
  
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { count, error } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true });
    
  if (error) {
    console.error("Error checking users:", error);
    return false;
  }
  
  return (count || 0) > 0;
}

export async function setupFirstAdmin(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email và mật khẩu là bắt buộc." };
  }

  // 1. Kiểm tra lại lần cuối xem bảng có trống không
  const hasUsers = await checkHasUsers();
  if (hasUsers) {
    return { error: "Hệ thống đã được thiết lập. Không thể tạo thêm Admin từ trang này." };
  }

  // 2. Sử dụng Service Role Key để tạo Admin
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: "Lỗi cấu hình hệ thống (Thiếu Service Role Key)." };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // 3. Tạo tài khoản trong auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Bỏ qua email verification cho Admin nội bộ
  });

  if (authError) {
    return { error: authError.message };
  }

  const userId = authData.user.id;

  // 4. Chèn thông tin vào bảng profiles
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: userId,
      email: email,
      is_admin: true,
      assigned_scope: { allowed_actors: [], allowed_hashtag_groups: [] }
    });

  if (profileError) {
    // Rollback auth user if profile creation fails
    await adminClient.auth.admin.deleteUser(userId);
    return { error: "Lỗi tạo hồ sơ Admin: " + profileError.message };
  }

  revalidatePath("/");
  return { success: true };
}
````

## File: src/app/actions/user.ts
````typescript
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Missing Service Role Key");

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function adminCreateUser(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const isAdminStr = formData.get("is_admin")?.toString();
  const isAdmin = isAdminStr === "true";

  if (!email || !password) return { error: "Email và mật khẩu là bắt buộc." };

  try {
    const adminClient = await getAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return { error: authError.message };

    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: email,
        is_admin: isAdmin,
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function changeUserRole(userId: string, isAdmin: boolean) {
  try {
    const adminClient = await getAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .update({ is_admin: isAdmin })
      .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteUser(userId: string) {
  try {
    const adminClient = await getAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    const adminClient = await getAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(userId, { 
      password: newPassword 
    });

    if (error) return { error: error.message };
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function fetchUsers() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) return [];

    const adminClient = await getAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateAssignedScope(userId: string, assignedScope: any) {
  try {
    const adminClient = await getAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .update({ assigned_scope: assignedScope })
      .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/researchers/${userId}`);
    revalidatePath("/dashboard/researchers");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
````

## File: src/app/dashboard/researchers/[id]/page.tsx
````typescript
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCircle, ShieldCheck, Activity } from "lucide-react";
import ScopeConfigForm from "@/components/ScopeConfigForm";

export default async function ResearcherDetailPage(props: any) {
  const params = await props.params;
  const id = params.id;

  const supabase = await createClient();
  
  // Need to use admin key to bypass RLS for viewing other profiles if caller is admin
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!);

  const { data: user, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !user) {
    return <div className="p-8 text-red-500">Error fetching user: {error?.message || "User not found"}</div>;
  }

  // Fetch runs history (Mocking for now until we have real data)
  const { data: runs } = await adminClient
    .from("collection_runs")
    .select("*")
    .eq("researcher_code", user.email) // Wait, researcher_code is email or ID? Let's assume ID or email based on how we insert later.
    .order("started_at", { ascending: false });

  const isOpsAdmin = user.is_admin;

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="max-w-5xl mx-auto">
        <Link 
          href="/dashboard/researchers" 
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-wrap gap-6 items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl uppercase">
              {user.email.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                {user.email}
                {isOpsAdmin && <ShieldCheck className="w-5 h-5 text-amber-600" />}
              </h1>
              <div className="text-sm text-stone-500 mt-1">ID: <span className="font-mono bg-stone-100 px-1.5 rounded">{user.id}</span></div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-stone-50 px-5 py-3 rounded-xl border border-stone-100 text-center">
              <div className="text-2xl font-bold text-stone-900">{runs?.length || 0}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Tổng chầu cào</div>
            </div>
            <div className="bg-stone-50 px-5 py-3 rounded-xl border border-stone-100 text-center">
              <div className="text-2xl font-bold text-stone-900">
                {runs?.reduce((sum: number, run: any) => sum + (run.items_count || 0), 0) || 0}
              </div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Bài viết thu về</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lớp 2 - Tab 1: Phân công (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-stone-400" /> Phạm vi Phân công (Assigned Scope)
              </h2>
              
              {isOpsAdmin ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm font-medium flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5" /> 
                  Tài khoản này là Admin, có toàn quyền truy cập tất cả Công cụ và Nhóm từ khóa.
                </div>
              ) : (
                <ScopeConfigForm userId={user.id} initialScope={user.assigned_scope || { allowed_actors: [], allowed_hashtag_groups: [] }} />
              )}
            </div>
          </div>

          {/* Lớp 2 - Tab 2: Lịch sử cào (1/3 width sidebar) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-stone-400" /> Lịch sử Hoạt động
              </h2>
              
              <div className="space-y-3">
                {runs && runs.length > 0 ? runs.slice(0, 5).map((run: any) => (
                  <div key={run.run_id} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold text-stone-700">{run.platform}</div>
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${run.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : run.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {run.status}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-500 mb-2">{new Date(run.started_at).toLocaleString('vi-VN')}</div>
                    <div className="text-sm font-medium text-stone-900">{run.items_count || 0} bài viết</div>
                  </div>
                )) : (
                  <div className="text-sm text-stone-500 italic text-center py-4">Chưa có lịch sử chạy công cụ.</div>
                )}
                {runs && runs.length > 5 && (
                  <button className="w-full py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    Xem tất cả lịch sử
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
````

## File: src/app/dashboard/researchers/page.tsx
````typescript
import { fetchUsers } from "@/app/actions/user";
import Link from "next/link";
import { UserCircle, Eye, ShieldCheck, Activity } from "lucide-react";

export default async function ResearchersPage() {
  const users = await fetchUsers();

  return (
    <div className="p-8 bg-stone-50 min-h-full">
      <div className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl shadow-sm">
            <Activity className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
              Giám sát & Phân công
            </h1>
            <p className="text-stone-500 mt-1">
              Phân công phạm vi công việc và theo dõi lịch sử thu thập dữ liệu của từng Nghiên cứu viên.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Tài Khoản</th>
                  <th className="px-6 py-4">Phạm vi Nhóm Từ khóa</th>
                  <th className="px-6 py-4">Công cụ cào (Actors)</th>
                  <th className="px-6 py-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map(user => {
                  const scope = user.assigned_scope || { allowed_actors: [], allowed_hashtag_groups: [] };
                  const groupCount = scope.allowed_hashtag_groups?.length || 0;
                  const actorCount = scope.allowed_actors?.length || 0;

                  return (
                    <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold uppercase">
                          {user?.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-2">
                            {user?.email || 'Unknown'}
                            {user?.is_admin && <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
                          </div>
                          <div className="text-xs text-stone-500">ID: {user?.id?.slice(0,8)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">Tất cả (Admin)</span>
                        ) : groupCount > 0 ? (
                          <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-1 rounded">{groupCount} Nhóm</span>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">Tất cả (Admin)</span>
                        ) : actorCount > 0 ? (
                          <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-1 rounded">{actorCount} Công cụ</span>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/researchers/${user.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Theo dõi
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
````

## File: src/app/dashboard/layout.tsx
````typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Database,
  LayoutDashboard,
  Users,
  Activity,
  Tags,
  Hash,
  Settings,
  UserCircle,
  ChevronRight,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-white font-bold text-xl tracking-tight">
            VPHA M&E
          </h1>
          <p className="text-xs text-stone-500 mt-1">Social Listening System</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Nghiên cứu viên
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-5 h-5 text-stone-400" /> Tổng quan
            </Link>
            <Link
              href="/dashboard/scraping"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <Database className="w-5 h-5 text-indigo-400" /> Cào dữ liệu
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
            >
              <UserCircle className="w-5 h-5 text-stone-400" /> Tài khoản cá
              nhân
            </Link>
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-500/80">
                Quản trị hệ thống
              </p>
              <Link
                href="/dashboard/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Users className="w-5 h-5 text-amber-400" />
                <span className="flex-1">Quản lý Người dùng</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/researchers"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Activity className="w-5 h-5 text-indigo-400" />
                <span className="flex-1">Giám sát &amp; Phân công</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/hashtag-groups"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Tags className="w-5 h-5 text-amber-400" />
                <span className="flex-1">Nhóm Từ khóa</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/hashtags"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Hash className="w-5 h-5 text-amber-400" />
                <span className="flex-1">Từ khóa (Hashtags)</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/actors"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Database className="w-5 h-5 text-indigo-400" />
                <span className="flex-1">Công cụ Cào</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5 text-stone-400" />
                <span className="flex-1">Cấu hình</span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <p className="text-[10px] text-stone-600 text-center">
            Thu thập dữ liệu có định hướng &copy; VPHA
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader isAdmin={isAdmin} userEmail={user?.email} />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
````

## File: src/app/globals.css
````css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
````

## File: src/app/layout.tsx
````typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
````

## File: src/app/page.tsx
````typescript
import { checkHasUsers } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const hasUsers = await checkHasUsers();
  
  if (!hasUsers) {
    redirect("/setup");
  } else {
    redirect("/login");
  }
}
````

## File: src/components/HeaderMenu.tsx
````typescript
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  KeyRound,
  LogOut,
  UserCircle,
  Users,
  Tags,
  Database,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface HeaderMenuProps {
  isAdmin: boolean;
  userEmail?: string;
}

export default function HeaderMenu({ isAdmin, userEmail }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full hover:bg-stone-100 transition-all duration-200 border border-transparent hover:border-stone-200"
      >
        <div className="size-8 rounded-full bg-linear-to-br from-stone-800 to-stone-600 text-white flex items-center justify-center font-bold shadow-sm">
          {userEmail ? (
            userEmail.charAt(0).toUpperCase()
          ) : (
            <UserCircle className="size-5" />
          )}
        </div>
        <ChevronDown
          className={`size-4 text-stone-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                Tài khoản {isAdmin && "(Admin)"}
              </p>
              <p className="text-sm font-medium text-stone-900 truncate">
                {userEmail || "Khách"}
              </p>
            </div>

            <div className="py-1">
              {isAdmin && (
                <>
                  <Link
                    href="/dashboard/users"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Users className="size-4" />
                    Quản trị Hệ thống (IT)
                  </Link>
                  <Link
                    href="/dashboard/researchers"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <UserCircle className="size-4" />
                    Giám sát & Phân công
                  </Link>
                  <Link
                    href="/dashboard/hashtag-groups"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Tags className="size-4" />
                    Nhóm Từ khóa (Groups)
                  </Link>
                  <Link
                    href="/dashboard/hashtags"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Tags className="size-4" />
                    Từ khóa (Hashtags)
                  </Link>
                  <Link
                    href="/dashboard/actors"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                  >
                    <Database className="size-4" />
                    Công cụ Cào (Actors)
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <Settings className="size-4" />
                    Cấu hình Hệ thống
                  </Link>
                </>
              )}
              
              <Link
                href="/dashboard/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <UserCircle className="size-4" />
                Tài khoản cá nhân
              </Link>

              <form action="/auth/signout" method="post" className="w-full">
                <button
                  type="submit"
                  className="flex flex-row items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
````

## File: src/components/ScrapingStudio.tsx
````typescript
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Play,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ListTodo,
  Zap,
  SignalHigh,
  FlaskConical,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  testAdapterBuildInput,
  testAdapterRunApify,
  type BuildInputResult,
  type RunApifyResult,
} from "@/app/actions/test-adapter";

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "LÊN KẾ HOẠCH",
  QUEUED: "TRONG HÀNG ĐỢI",
  RUNNING: "ĐANG THU THẬP",
  SUCCESS: "HOÀN THÀNH",
  FAILED: "THẤT BẠI",
  PARTIAL_SUCCESS: "THÀNH CÔNG MỘT PHẦN",
};

type ScheduleMode = "IMMEDIATE" | "QUEUE";

export default function ScrapingStudio({
  user,
  allowedActors,
  allowedGroups,
  hashtagsByGroup,
}: {
  user: any;
  allowedActors: any[];
  allowedGroups: any[];
  hashtagsByGroup: Record<string, any[]>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedActor, setSelectedActor] = useState(
    allowedActors[0]?.actor_id || "",
  );
  const [selectedGroup, setSelectedGroup] = useState(
    allowedGroups[0]?.group_id || "",
  );
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [maxItems, setMaxItems] = useState<number>(100);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("IMMEDIATE");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [priority, setPriority] = useState<number>(1);
  const [apifyTokenOverride, setApifyTokenOverride] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Card Test nhanh Adapter Core (không insert DB, không liên quan collection)
  const [testActorId, setTestActorId] = useState<string>(
    allowedActors[0]?.actor_id || "",
  );
  const [testHashtag, setTestHashtag] = useState<string>("");
  const [testApiKey, setTestApiKey] = useState<string>("");
  const [testMaxItems, setTestMaxItems] = useState<number>(1);
  const [testBusy, setTestBusy] = useState<"build" | "run" | null>(null);
  const [testResult, setTestResult] = useState<
    BuildInputResult | RunApifyResult | null
  >(null);

  const isRunResult = (
    r: BuildInputResult | RunApifyResult | null,
  ): r is RunApifyResult => !!r && typeof r === "object" && "apify_run_id" in r;

  useEffect(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const defaultQueue = new Date(Date.now() + 10 * 60 * 1000 - tzOffset)
      .toISOString()
      .slice(0, 16);
    setScheduledAt(defaultQueue);
  }, []);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const tags = hashtagsByGroup[groupId] || [];
    setSelectedHashtags(tags.map((t) => t.hashtag_text));
  };

  const handleToggleHashtag = (tag: string) => {
    if (selectedHashtags.includes(tag)) {
      setSelectedHashtags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedHashtags((prev) => [...prev, tag]);
    }
  };

  const currentActor = allowedActors.find((a) => a.actor_id === selectedActor);
  const availableHashtags = selectedGroup
    ? hashtagsByGroup[selectedGroup] || []
    : [];

  const findOverlappingSuccessRuns = (
    history: any[],
    hashtags: string[],
    actorId: string,
  ) => {
    return history.filter((run) => {
      if (run.status !== "SUCCESS") return false;
      if (run.actor_id !== actorId) return false;
      const qp = run.query_parameters;
      if (!qp?.hashtags) return false;
      return hashtags.some((h) => (qp.hashtags as string[]).includes(h));
    });
  };

  const handleStartRun = async () => {
    if (!selectedActor) return alert("Vui lòng chọn Công cụ (Actor).");
    if (selectedHashtags.length === 0)
      return alert("Vui lòng chọn ít nhất 1 từ khóa để cào.");
    if (maxItems < 1) return alert("Giới hạn bài viết không hợp lệ.");
    if (scheduleMode === "QUEUE" && !scheduledAt)
      return alert("Vui lòng chọn thời gian đưa vào hàng đợi.");

    setLoading(true);

    try {
      const { data: historyData, error: histError } = await supabase
        .from("collection_runs")
        .select(
          "run_id, actor_id, status, query_parameters, started_at, items_count",
        )
        .eq("researcher_code", user.email)
        .eq("status", "SUCCESS")
        .eq("actor_id", selectedActor)
        .order("started_at", { ascending: false });

      if (!histError && historyData && historyData.length > 0) {
        const overlap = findOverlappingSuccessRuns(
          historyData,
          selectedHashtags,
          selectedActor,
        );
        if (overlap.length > 0) {
          const lastRun = overlap[0];
          const tagOverlap = selectedHashtags
            .filter((h) =>
              (lastRun.query_parameters?.hashtags as string[])?.includes(h),
            )
            .join(", ");
          const when = lastRun.started_at
            ? new Date(lastRun.started_at).toLocaleString("vi-VN")
            : "trước đó";
          const confirmed = confirm(
            `⚠️ Cảnh báo trùng lặp:\n` +
              `Bạn đã thu thập THÀNH CÔNG các từ khóa [${tagOverlap}] bằng Công cụ ${selectedActor} lúc ${when}.\n` +
              `Số bài đã thu: ${lastRun.items_count ?? 0}.\n\n` +
              `Dữ liệu đã có định hướng, lặp lại sẽ sinh chi phí không cần thiết.\n` +
              `Bạn vẫn muốn tạo kế hoạch mới?`,
          );
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }

      const nowIso = new Date().toISOString();
      const isImmediate = scheduleMode === "IMMEDIATE";
      // Luôn QUEUED: worker chỉ dispatch QUEUED/PLANNED. "Chạy ngay" = scheduled_at = now,
      // worker sẽ gửi lên Apify ở tick kế tiếp (≤15s) và tự chuyển sang RUNNING.
      const targetStatus = "QUEUED";

      const insertPayload: any = {
        actor_id: selectedActor,
        platform: currentActor?.platform || "Unknown",
        researcher_code: user.email,
        status: targetStatus,
        items_count: 0,
        priority: priority,
        scheduled_at: isImmediate
          ? nowIso
          : new Date(scheduledAt).toISOString(),
        started_at: null,
        query_parameters: {
          hashtags: selectedHashtags,
          maxItems: maxItems,
          group_id: selectedGroup,
          schedule_mode: scheduleMode,
          note: apifyTokenOverride
            ? "[test] token tạm thời được đính kèm trên dòng kế hoạch."
            : null,
        },
      };
      if (apifyTokenOverride && apifyTokenOverride.trim().length > 6) {
        insertPayload.apify_api_token_override = apifyTokenOverride.trim();
      }

      const { data, error } = await supabase
        .from("collection_runs")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      alert(
        isImmediate
          ? "✅ Đã gửi lệnh thu thập NGAY LẬP TỨC thành công!\n" +
              (apifyTokenOverride.trim()
                ? "(Kèm API Key tạm thời cho kế hoạch này.)\n"
                : "(Chưa kèm API Key. Bạn cần điền trên màn hình này hoặc vào Cấu hình lưu token chung.)\n") +
              "Tiếp theo: chạy Worker (node scripts/worker.js --once) trên terminal để pick kế hoạch → gọi Apify → lưu kết quả."
          : `⏱️ Đưa vào HÀNG ĐỢI thành công!\n` +
              `Chạy lúc: ${new Date(scheduledAt).toLocaleString("vi-VN")}\n` +
              (apifyTokenOverride.trim()
                ? "(Kèm API Key tạm thời.)"
                : "(Chưa có API Key.)"),
      );

      setSelectedHashtags([]);
      setMaxItems(100);

      router.refresh();
    } catch (err: any) {
      alert("Lỗi khởi tạo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Lên Kế Hoạch Thu Thập
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                1. Chọn Nền tảng (Công cụ)
              </label>
              {allowedActors.length === 0 ? (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                  Bạn chưa được phân công Công cụ nào.
                </div>
              ) : (
                <select
                  value={selectedActor}
                  onChange={(e) => setSelectedActor(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {allowedActors.map((a) => (
                    <option key={a.actor_id} value={a.actor_id}>
                      {a.platform} - {a.actor_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                2. Chọn Nhóm Từ khóa
              </label>
              {allowedGroups.length === 0 ? (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                  Bạn chưa được phân công Nhóm nào.
                </div>
              ) : (
                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="" disabled>
                    -- Chọn một nhóm --
                  </option>
                  {allowedGroups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedGroup && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  3. Từ khóa cụ thể ({selectedHashtags.length}/
                  {availableHashtags.length})
                </label>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableHashtags.length === 0 ? (
                    <div className="text-xs text-stone-500 italic text-center">
                      Không có từ khóa nào trong nhóm này.
                    </div>
                  ) : (
                    availableHashtags.map((tag) => (
                      <label
                        key={tag.hashtag_id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-stone-100 p-1.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedHashtags.includes(tag.hashtag_text)}
                          onChange={() => handleToggleHashtag(tag.hashtag_text)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-stone-800">
                          {tag.hashtag_text}
                        </span>
                        {tag.keyword_track === "FIXED" && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded">
                            FIXED
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                4. Giới hạn bài viết tối đa (Max Items)
              </label>
              <input
                type="number"
                value={maxItems}
                onChange={(e) => setMaxItems(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="text-xs text-stone-500 mt-1">
                Nên đặt giới hạn để kiểm soát chi phí Apify.
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <p className="block text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                🔑 5. API Key TEST nhanh (Lưu tạm trên kế hoạch này)
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="apify_api_XXXXXXXX (để trống → dùng token chung từ Cấu hình)"
                  value={apifyTokenOverride}
                  onChange={(e) => setApifyTokenOverride(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                />
                <div className="text-[11px] text-stone-500 leading-relaxed">
                  ✅ <b>TEST NHANH</b>: Token chỉ lưu tạm trên dòng kế hoạch
                  này. <br />
                  📌 <b>CHUẨN SAU NÀY</b>: Admin → Cấu hình hệ thống → lưu
                  APIFY_API_TOKEN dùng chung.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100">
              <p className="block text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-500" /> 6. Lên lịch
                thực hiện
              </p>

              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${scheduleMode === "IMMEDIATE" ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-stone-50 border-stone-200 hover:bg-stone-100"}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="mt-0.5 text-emerald-600"
                    checked={scheduleMode === "IMMEDIATE"}
                    onChange={() => setScheduleMode("IMMEDIATE")}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" /> Chạy NGAY LẬP
                      TỨC
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Gửi lệnh cho Apify ngay sau khi nhấn nút (mock).
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${scheduleMode === "QUEUE" ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-stone-50 border-stone-200 hover:bg-stone-100"}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="mt-0.5 text-indigo-600"
                    checked={scheduleMode === "QUEUE"}
                    onChange={() => setScheduleMode("QUEUE")}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" /> Đưa vào Hàng
                      đợi (Queue)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          Thời gian chạy
                        </label>
                        <input
                          type="datetime-local"
                          disabled={scheduleMode !== "QUEUE"}
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded-lg bg-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
                          <SignalHigh className="w-3 h-3" /> Ưu tiên
                        </label>
                        <select
                          disabled={scheduleMode !== "QUEUE"}
                          value={priority}
                          onChange={(e) =>
                            setPriority(parseInt(e.target.value))
                          }
                          className="w-full px-2 py-1.5 text-xs border border-stone-300 rounded-lg bg-white disabled:opacity-60"
                        >
                          <option value={0}>0 - Thấp</option>
                          <option value={1}>1 - Bình thường</option>
                          <option value={2}>2 - Cao</option>
                          <option value={3}>3 - Khẩn cấp</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleStartRun}
              disabled={
                loading ||
                allowedActors.length === 0 ||
                allowedGroups.length === 0
              }
              className={`w-full flex items-center justify-center gap-2 py-3 ${scheduleMode === "IMMEDIATE" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-indigo-700 hover:bg-indigo-800"} disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-95`}
            >
              {scheduleMode === "IMMEDIATE" ? (
                <>
                  <Zap className="w-5 h-5" />{" "}
                  {loading ? "Đang gửi..." : "Chạy Thu thập NGAY"}
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />{" "}
                  {loading ? "Đang lên lịch..." : "Thêm vào Hàng đợi"}
                </>
              )}
            </button>

            <p className="text-[11px] text-stone-500 text-center">
              💡 Hệ thống sẽ cảnh báo nếu từ khóa &amp; công cụ này đã được bạn
              thu thập thành công trước đó.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 min-h-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Bảng Theo dõi
              Tiến trình
            </h2>
            <div className="flex flex-wrap gap-2">
              <LegendBadge
                color="bg-amber-100 text-amber-700"
                icon={<Clock className="w-3 h-3" />}
                label="Kế hoạch"
              />
              <LegendBadge
                color="bg-indigo-100 text-indigo-700"
                icon={<ListTodo className="w-3 h-3" />}
                label="Queue"
              />
              <LegendBadge
                color="bg-blue-100 text-blue-700"
                icon={<Activity className="w-3 h-3 animate-pulse" />}
                label="Đang chạy"
              />
              <LegendBadge
                color="bg-green-100 text-green-700"
                icon={<CheckCircle2 className="w-3 h-3" />}
                label="Thành công"
              />
              <LegendBadge
                color="bg-red-100 text-red-700"
                icon={<XCircle className="w-3 h-3" />}
                label="Thất bại"
              />
            </div>
          </div>

          {/* ===================== CARD TEST NHANH ADAPTER CORE ===================== */}
          <div className="mt-6 border-2 border-dashed border-amber-300 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-sm p-5">
            <h2 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-600" /> TEST NHANH
              ADAPTER CỐT LÕI
              <span className="ml-auto text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                Không ghi DB • Không dùng collection
              </span>
            </h2>

            <form
              action={async (fd) => {
                fd.set("actor_id", testActorId);
                fd.set("hashtag_text", testHashtag.replace(/^#+/, ""));
                fd.set("api_key", testApiKey);
                fd.set("max_items", String(testMaxItems || 1));
                setTestBusy("build");
                setTestResult(null);
                const r = await testAdapterBuildInput(fd);
                setTestResult(r);
                setTestBusy(null);
              }}
              className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start"
            >
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  1. Actor (Công cụ)
                </label>
                <select
                  value={testActorId}
                  onChange={(e) => setTestActorId(e.target.value)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  required
                >
                  {allowedActors.length > 0
                    ? allowedActors.map((a) => (
                        <option key={a.actor_id} value={a.actor_id}>
                          {a.platform} · {a.actor_name}
                        </option>
                      ))
                    : [
                        {
                          actor_id: "clockworks/tiktok-hashtag-scraper",
                          platform: "TIKTOK",
                          actor_name: "TikTok Hashtag Scraper (💯 chuyên hashtag, bạn vừa dùng trên Apify)",
                        },
                        {
                          actor_id: "clockwork/tiktok-scraper",
                          platform: "TIKTOK",
                          actor_name: "TikTok Data Extractor (OLD - đa năng)",
                        },
                        {
                          actor_id: "apify/facebook-hashtag-scraper",
                          platform: "FACEBOOK_HASHTAG",
                          actor_name:
                            "Facebook Hashtag Scraper (💯 chuẩn theo hashtag)",
                        },
                        {
                          actor_id: "apify/facebook-pages-scraper",
                          platform: "FACEBOOK_PAGE",
                          actor_name: "Facebook Pages Scraper (cần startUrls)",
                        },
                        {
                          actor_id: "apify/facebook-search-scraper",
                          platform: "FACEBOOK_SEARCH",
                          actor_name:
                            "Facebook Search (Official Apify · ✅ maintained)",
                        },
                        {
                          actor_id: "alexey/facebook-search-scraper",
                          platform: "FACEBOOK_SEARCH",
                          actor_name:
                            "Facebook Search (Alexey community · Toàn mạng)",
                        },
                        {
                          actor_id: "easyapi/facebook-hashtag-search-scraper",
                          platform: "FACEBOOK_HASHTAG",
                          actor_name: "Facebook Hashtag Search (easyapi)",
                        },
                        {
                          actor_id: "streamer/youtube-scraper",
                          platform: "YOUTUBE",
                          actor_name: "YouTube Scraper",
                        },
                      ].map((a) => (
                        <option key={a.actor_id} value={a.actor_id}>
                          {a.platform} · {a.actor_name}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  2. Hashtag (không #)
                </label>
                <input
                  type="text"
                  placeholder="pod  hoặc vape  hoặc thuocladientu..."
                  value={testHashtag}
                  onChange={(e) => setTestHashtag(e.target.value)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  3. API Key Apify
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="apify_api_XXXXXX (bỏ trống nếu chỉ test build)"
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-xs font-semibold text-amber-900 mb-1 opacity-0">
                  &nbsp;
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="submit"
                    disabled={testBusy !== null}
                    className="flex-1 px-3 py-2 text-xs font-bold rounded-lg bg-white border-2 border-amber-400 text-amber-800 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🧪 Dry-Run Build
                  </button>
                  <button
                    formAction={async (fd) => {
                      if (!testApiKey || testApiKey.trim().length < 8) {
                        alert(
                          "Vui lòng điền API Key Apify (bắt đầu apify_api_...) để chạy thật.",
                        );
                        return;
                      }
                      fd.set("actor_id", testActorId);
                      fd.set("hashtag_text", testHashtag.replace(/^#+/, ""));
                      fd.set("api_key", testApiKey);
                      fd.set("max_items", String(testMaxItems || 1));
                      setTestBusy("run");
                      setTestResult(null);
                      const r = await testAdapterRunApify(fd);
                      setTestResult(r);
                      setTestBusy(null);
                    }}
                    type="submit"
                    disabled={testBusy !== null}
                    className="flex-1 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testBusy === "run"
                      ? "⏳ Đang chạy Apify..."
                      : "🚀 Run Thật"}
                  </button>
                  <label className="flex items-center gap-1 text-[10px] text-amber-800 px-1">
                    Max
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={testMaxItems}
                      onChange={(e) =>
                        setTestMaxItems(
                          Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                        )
                      }
                      className="w-14 p-1.5 bg-white border border-amber-300 rounded text-xs font-bold text-center"
                    />
                  </label>
                </div>
              </div>
            </form>

            {/* Kết quả Test */}
            {testResult && (
              <div className="mt-4 bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                {/* Header trạng thái */}
                <div
                  className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${
                    testResult.ok
                      ? "bg-green-50 text-green-800 border-b border-green-100"
                      : "bg-red-50 text-red-800 border-b border-red-100"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="mr-auto">
                    {testResult.ok
                      ? isRunResult(testResult)
                        ? "RUN thành công (" +
                          (testResult.final_status || "?") +
                          ")"
                        : "BUILD cấu hình OK"
                      : "LỖI: " + (testResult.error || "Unknown")}
                  </span>
                  {isRunResult(testResult) && testResult.console_apify_link && (
                    <a
                      href={testResult.console_apify_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-amber-300"
                    >
                      Xem trên Apify Console{" "}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* Warnings */}
                  {testResult.warnings?.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-xs font-bold text-yellow-900 mb-1">
                        ⚠️ Cảnh báo cấu hình:
                      </div>
                      <ul className="text-[11px] text-yellow-800 list-disc list-inside space-y-0.5">
                        {testResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Input Payload */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-stone-700">
                        📤 1. INPUT PAYLOAD (gửi lên Apify /v2/acts/X/runs POST)
                      </span>
                    </div>
                    <pre className="text-[11px] leading-relaxed font-mono bg-stone-50 text-stone-800 border border-stone-200 rounded-lg p-3 max-h-56 overflow-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(testResult.input_payload, null, 2)}
                    </pre>
                  </div>

                  {/* Nếu Run thật thì hiển thị dòng run info + parse posts */}
                  {isRunResult(testResult) && testResult.ok && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                          <div className="font-bold text-indigo-900 mb-0.5">
                            Run ID
                          </div>
                          <div className="font-mono break-all text-indigo-700">
                            {testResult.apify_run_id || "null"}
                          </div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                          <div className="font-bold text-indigo-900 mb-0.5">
                            Dataset ID
                          </div>
                          <div className="font-mono break-all text-indigo-700">
                            {testResult.apify_dataset_id || "null"}
                          </div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                          <div className="font-bold text-indigo-900 mb-0.5">
                            Dataset items (tải tối đa 5)
                          </div>
                          <div className="text-2xl font-black text-indigo-700">
                            {testResult.raw_items_count ?? 0}
                          </div>
                        </div>
                      </div>

                      {/* Parse bài viết */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-bold text-stone-700">
                            🧩 2. PARSER (parse dataset → NormalizedPost. không
                            ghi posts/post_snapshots DB)
                          </span>
                        </div>
                        {(testResult.parsed_posts?.filter((p) => p.normalized)
                          .length ?? 0) === 0 ? (
                          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-xs text-stone-600">
                            Không có post parse được. Kiểm tra: <br />
                            - Hashtag có phổ biến không? (thay đổi hashtag phổ
                            biến hơn) <br />
                            - FB startUrls có cấu hình không? <br />- YT comment
                            item được auto bỏ qua (chỉ parse video metadata)
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {(testResult.parsed_posts || [])
                              .filter((p) => p.normalized)
                              .map((p, i) => {
                                const n = p.normalized!;
                                return (
                                  <div
                                    key={i}
                                    className="border border-emerald-200 rounded-xl bg-emerald-50/40 overflow-hidden"
                                  >
                                    <div className="px-3 py-2 bg-emerald-100 text-[11px] font-bold text-emerald-900 flex items-center gap-3">
                                      <span>#{i + 1}</span>
                                      <span className="inline-block px-2 py-0.5 rounded-full bg-white text-emerald-800">
                                        {n.platform}
                                      </span>
                                      <span>
                                        Discovery Order = {p.discovery_order}
                                      </span>
                                    </div>
                                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-stone-800">
                                      <div>
                                        <b className="text-stone-500 mr-1">
                                          post_id (SHA256 URL):
                                        </b>
                                        <span className="font-mono break-all text-stone-900">
                                          {n.post_id}
                                        </span>
                                      </div>
                                      <div>
                                        <b className="text-stone-500 mr-1">
                                          post_url:
                                        </b>
                                        <a
                                          href={n.post_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-semibold text-blue-700 hover:underline break-all inline-flex items-center gap-1"
                                        >
                                          {n.post_url}{" "}
                                          <ExternalLink className="w-3 h-3 opacity-50" />
                                        </a>
                                      </div>
                                      <div>
                                        <b className="text-stone-500 mr-1">
                                          author_hash (ẩn danh):
                                        </b>
                                        <span className="font-mono break-all">
                                          {n.author_hash}
                                        </span>
                                      </div>
                                      <div>
                                        <b className="text-stone-500 mr-1">
                                          published_at:
                                        </b>
                                        {n.published_at || "null"}
                                      </div>
                                      <div className="md:col-span-2 grid grid-cols-4 gap-2 pt-1">
                                        <div className="bg-white rounded border border-emerald-200 p-2 text-center">
                                          <div className="text-[9px] uppercase tracking-wide text-stone-500 font-bold">
                                            view
                                          </div>
                                          <div className="text-lg font-black text-indigo-600">
                                            {n.metrics.view_count ?? "—"}
                                          </div>
                                        </div>
                                        <div className="bg-white rounded border border-emerald-200 p-2 text-center">
                                          <div className="text-[9px] uppercase tracking-wide text-stone-500 font-bold">
                                            like
                                          </div>
                                          <div className="text-lg font-black text-rose-500">
                                            {n.metrics.like_count ?? "—"}
                                          </div>
                                        </div>
                                        <div className="bg-white rounded border border-emerald-200 p-2 text-center">
                                          <div className="text-[9px] uppercase tracking-wide text-stone-500 font-bold">
                                            cmt
                                          </div>
                                          <div className="text-lg font-black text-amber-600">
                                            {n.metrics.comment_count ?? "—"}
                                          </div>
                                        </div>
                                        <div className="bg-white rounded border border-emerald-200 p-2 text-center">
                                          <div className="text-[9px] uppercase tracking-wide text-stone-500 font-bold">
                                            share
                                          </div>
                                          <div className="text-lg font-black text-emerald-600">
                                            {n.metrics.share_count ?? "—"}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="md:col-span-2 pt-1">
                                        <b className="text-stone-500 text-[10px]">
                                          hashtags extracted từ caption:
                                        </b>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                          {p.caption_hashtags.length === 0 ? (
                                            <span className="text-[10px] text-stone-400 italic">
                                              không tìm thấy hashtag inline nào
                                              trong raw_text
                                            </span>
                                          ) : (
                                            p.caption_hashtags.map((h) => (
                                              <span
                                                key={h}
                                                className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200"
                                              >
                                                {h}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                      <div className="md:col-span-2 pt-1">
                                        <b className="text-stone-500 text-[10px]">
                                          raw_text (180 ký tự đầu):
                                        </b>
                                        <div className="text-[11px] text-stone-700 bg-white border border-stone-200 rounded-md px-2 py-1.5 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                                          {(n.raw_text || "").slice(0, 180)}
                                          {(n.raw_text || "").length > 180
                                            ? "..."
                                            : ""}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* default_config (debug) */}
                  <details className="text-[10px]">
                    <summary className="cursor-pointer select-none text-stone-500 hover:text-stone-700">
                      📄 Xem default_config gốc của actor "{testResult.actor_id}
                      " được tải từ DB:
                    </summary>
                    <pre className="mt-2 font-mono text-[10px] leading-relaxed bg-stone-100 border border-stone-200 rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap break-words text-stone-700">
                      {JSON.stringify(testResult.default_config, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
          {/* ===================== HẾT CARD TEST NHANH ===================== */}

          <RunHistoryTable userEmail={user.email} />
        </div>
      </div>
    </div>
  );
}

function LegendBadge({
  color,
  icon,
  label,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${color} border-white/40`}
    >
      {icon} {label}
    </span>
  );
}

function RunHistoryTable({ userEmail }: { userEmail: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("collection_runs")
        .select("*")
        .eq("researcher_code", userEmail)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

      if (data) setRuns(data);
      setLoading(false);
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const handleRunNow = async (runId: string) => {
    setRuns(
      runs.map((r) =>
        r.run_id === runId
          ? { ...r, status: "RUNNING", started_at: new Date().toISOString() }
          : r,
      ),
    );

    const { error } = await supabase
      .from("collection_runs")
      .update({
        status: "RUNNING",
        started_at: new Date().toISOString(),
      })
      .eq("run_id", runId);

    if (error) {
      alert("Lỗi khi chạy: " + error.message);
    } else {
      alert("Đã bắn lệnh thu thập lên hệ thống (Mockup)!");
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm("Bạn có chắc muốn xóa Kế hoạch này?")) return;
    setRuns(runs.filter((r) => r.run_id !== runId));
    const { error } = await supabase
      .from("collection_runs")
      .delete()
      .eq("run_id", runId);
    if (error) alert("Lỗi khi xóa: " + error.message);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PLANNED: "bg-amber-100 text-amber-700",
      QUEUED: "bg-indigo-100 text-indigo-700",
      RUNNING: "bg-blue-100 text-blue-700",
      SUCCESS: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    const icons: Record<string, React.ReactNode> = {
      PLANNED: <Clock className="w-3 h-3" />,
      QUEUED: <ListTodo className="w-3 h-3" />,
      RUNNING: <Activity className="w-3 h-3 animate-pulse" />,
      SUCCESS: <CheckCircle2 className="w-3 h-3" />,
      FAILED: <XCircle className="w-3 h-3" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${styles[status] ?? "bg-stone-100 text-stone-700"}`}
      >
        {icons[status] ?? <AlertCircle className="w-3 h-3" />}
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  };

  if (loading)
    return (
      <div className="text-sm text-stone-500 text-center py-10">
        Đang tải lịch sử...
      </div>
    );
  if (runs.length === 0)
    return (
      <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50">
        <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-stone-500">
          Chưa có kế hoạch thu thập nào.
        </p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium text-xs uppercase">
          <tr>
            <th className="px-4 py-3">Công cụ &amp; Cấu hình</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Thời gian</th>
            <th className="px-4 py-3 w-20">Ưu tiên</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {runs.map((run) => {
            const isSuccess = run.status === "SUCCESS";
            const isLocked = isSuccess || run.status === "RUNNING";
            const scheduledTs = run.scheduled_at
              ? new Date(run.scheduled_at)
              : null;
            const startedTs = run.started_at ? new Date(run.started_at) : null;
            return (
              <tr
                key={run.run_id}
                className={`transition-all ${isSuccess ? "opacity-40 grayscale cursor-not-allowed select-none" : "hover:bg-stone-50"} ${run.status === "QUEUED" ? "bg-indigo-50/30" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-900 mb-1">
                    {run.platform}{" "}
                    <span className="font-normal text-stone-500 text-[10px]">
                      ({run.actor_id})
                    </span>
                  </div>
                  {run.query_parameters && run.query_parameters.hashtags ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {run.query_parameters.hashtags.map((h: string) => (
                        <span
                          key={h}
                          className="bg-stone-100 border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          {h}
                        </span>
                      ))}
                      <span className="text-[10px] text-stone-400 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                        Max: {run.query_parameters.maxItems}
                      </span>
                      {run.query_parameters.group_id && (
                        <span className="text-[10px] text-stone-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Nhóm: {run.query_parameters.group_id}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-stone-400 text-xs">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3">{statusBadge(run.status)}</td>
                <td className="px-4 py-3 text-[11px] text-stone-600 font-mono space-y-0.5">
                  {scheduledTs && (
                    <div className="flex items-center gap-1">
                      <ListTodo className="w-3 h-3 text-indigo-400" /> Dự kiến:{" "}
                      {scheduledTs.toLocaleString("vi-VN")}
                    </div>
                  )}
                  {startedTs &&
                    run.status !== "PLANNED" &&
                    run.status !== "QUEUED" && (
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-blue-400" /> Bắt đầu:{" "}
                        {startedTs.toLocaleString("vi-VN")}
                      </div>
                    )}
                </td>
                <td className="px-4 py-3">
                  {run.priority === 3 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      3-Cao
                    </span>
                  ) : run.priority === 2 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                      2-Bình+
                    </span>
                  ) : run.priority === 1 ? (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                      1-Bình
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-50 text-stone-500 border border-stone-200">
                      0-Thấp
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isSuccess ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                      {run.items_count ?? 0} BĐ
                    </span>
                  ) : run.status === "RUNNING" ? (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 inline-flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 animate-spin" /> Đang
                      chạy
                    </span>
                  ) : run.status === "FAILED" ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-semibold text-red-600 mr-1">
                        Thất bại
                      </span>
                      <button
                        onClick={() => handleRunNow(run.run_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" fill="currentColor" />{" "}
                        Chạy lại
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {run.status === "QUEUED" || run.status === "PLANNED" ? (
                        <button
                          onClick={() => handleRunNow(run.run_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" fill="currentColor" />{" "}
                          Chạy
                        </button>
                      ) : null}
                      {!isLocked && (
                        <button
                          onClick={() => handleDeleteRun(run.run_id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Xóa Kế hoạch"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
````

## File: .gitignore
````
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# secrets / credential files (never commit tokens / private keys)
docs/key.txt
key.txt
apify*.txt
apify*.key
*.private


# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
````

## File: package.json
````json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@base-ui/react": "^1.8.0",
    "@supabase/ssr": "^0.12.7",
    "@supabase/supabase-js": "^2.116.0",
    "class-variance-authority": "^0.7.1",
    "cn": "^0.3.0",
    "framer-motion": "^13.3.0",
    "lucide-react": "^1.46.0",
    "next": "16.3.5",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "shadcn": "^4.21.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.5",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
````

## File: seed.js
````javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log("Seeding apify_actors...");
  await supabase.from('apify_actors').upsert([
    {
      actor_id: 'clockwork/tiktok-scraper',
      actor_name: 'TikTok Data Extractor',
      platform: 'TIKTOK',
      default_config: {
        maxItems: 100,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        maxConcurrency: 5,
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
      }
    },
    {
      actor_id: 'apify/facebook-pages-scraper',
      actor_name: 'Facebook Pages Scraper',
      platform: 'FACEBOOK_PAGE',
      default_config: {
        resultsLimit: 50,
        maxComments: 0,
        startUrls: [],
        searchWords: [],
        onlyPostsNewerThan: null,
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
      }
    },
    {
      actor_id: 'alexey/facebook-search-scraper',
      actor_name: 'Facebook Search (Alexey community · Toàn mạng)',
      platform: 'FACEBOOK_SEARCH',
      default_config: {
        resultsLimit: 50,
        queries: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
      }
    },
    {
      actor_id: 'apify/facebook-search-scraper',
      actor_name: 'Facebook Search (Official Apify · ✅ maintained)',
      platform: 'FACEBOOK_SEARCH',
      default_config: {
        resultsLimit: 50,
        queries: [],
        searchTerms: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
      }
    },
    {
      actor_id: 'apify/facebook-hashtag-scraper',
      actor_name: 'Facebook Hashtag Scraper (💯 chuẩn theo hashtag)',
      platform: 'FACEBOOK_HASHTAG',
      default_config: {
        maxPostCount: 50,
        hashtags: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
      }
    },
    {
      actor_id: 'streamer/youtube-scraper',
      actor_name: 'YouTube Comments Extractor',
      platform: 'YOUTUBE',
      default_config: {
        maxVideos: 20,
        maxComments: 200,
        sortVideosBy: 'NEWEST',
        sortCommentsBy: 'NEWEST_FIRST',
        videoUrls: [],
        channelUrls: [],
        searchTerms: [],
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
      }
    }
  ], { onConflict: 'actor_id' });

  console.log("Seeding hashtag_groups...");
  await supabase.from('hashtag_groups').upsert([
    { group_id: 'COMMERCIAL', group_name: 'Nhóm Thương mại', description: 'Các bài viết mang tính mua bán, quảng cáo' },
    { group_id: 'YOUTH', group_name: 'Nhóm Hành vi giới trẻ', description: 'Các trào lưu, chia sẻ lối sống' },
    { group_id: 'HEALTH', group_name: 'Nhóm Cảnh báo Y tế', description: 'Cảnh báo tác hại sức khỏe' }
  ], { onConflict: 'group_id' });

  console.log("Seeding hashtags...");
  const hashtagsToSeed = [
    { text: '#vape', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'YOUTH'] },
    { text: '#pod', track: 'ADAPTIVE', groups: ['COMMERCIAL', 'YOUTH'] },
    { text: '#vapetricks', track: 'FIXED', groups: ['YOUTH'] },
    { text: '#vapegiare', track: 'FIXED', groups: ['COMMERCIAL'] },
    { text: '#ungthu', track: 'FIXED', groups: ['HEALTH'] },
    { text: '#thuocladientu', track: 'ADAPTIVE', groups: ['HEALTH', 'COMMERCIAL'] }
  ];

  for (const h of hashtagsToSeed) {
    const { data: insertedHashtag, error: hError } = await supabase
      .from('hashtags')
      .upsert({ hashtag_text: h.text, keyword_track: h.track, is_active: true }, { onConflict: 'hashtag_text' })
      .select('hashtag_id')
      .single();

    if (hError) {
      console.error("Error inserting hashtag", h.text, hError);
      continue;
    }

    const hashtag_id = insertedHashtag.hashtag_id;

    // Delete existing mappings just to be safe
    await supabase.from('hashtag_group_mapping').delete().eq('hashtag_id', hashtag_id);

    // Insert new mappings
    const mappings = h.groups.map(g => ({ hashtag_id, group_id: g }));
    await supabase.from('hashtag_group_mapping').insert(mappings);
  }

  console.log("Seeding complete!");
}

seed();
````

## File: README.md
````markdown
# VPHA Social Listening M&E (Web)

Hệ thống **Monitory & Evaluation (M&E)** giám sát thông tin về thuốc lá điện tử (e-cig / vape) trên mạng xã hội theo phương pháp **Interrupted Time Series (ITS)** quanh ngày Nghị định 13/2023/NĐ-CP cấm có hiệu lực.

> **Triết lý dự án (đã thống nhất):**
>
> - **Chỉ quét theo HASHTAG (keyword track)**. Không quét theo user/fanpage cố định, không quét bình luận chi tiết (DEC-001).
> - **Tối giản & không lặp công việc** — dùng Apify actors có sẵn, Adapters chuyển đổi output về chuẩn `NormalizedPost`, Pipeline chạy ngôn ngữ + dedupe, Worker ingest xuống Supabase.
> - **Hạ tầng 1 file binary**: Worker = 1 file JS độc lập chạy dưới PM2. Không cần deploy nhiều micro-service.

---

## 1. Stack công nghệ

| Lớp                | Công nghệ                                                                         |
| ------------------ | --------------------------------------------------------------------------------- |
| **Frontend**       | Next.js 16.3 (App Router), React 19, Tailwind v4, shadcn/ui, lucide-react         |
| **DB & Auth**      | Supabase (Postgres + Auth via email)                                              |
| **Scraping**       | Apify Platform (6 actors, proxy Residential), kiến trúc **Adapter Pattern**       |
| **Runtime Worker** | Node.js `scripts/worker.js` chạy dưới **PM2**, dùng `@supabase/supabase-js` thuần |
| **CLI Test**       | Node.js `scripts/test-adapter-core.js` (không ghi DB, độc lập Next.js)            |

---

## 2. Scope HASHTAG-ONLY (Quan trọng)

**KHÔNG** có cơ chế crawl theo user profile, group, fanpage cố định hay theo dõi author. Toàn bộ luồng bắt đầu từ **hashtag**:

```
[hashtag (hashtags table)] → user chọn trong Scraping Studio
    → Adapter.buildInput() thêm hashtag vào Apify Actor
    → Apify chạy với input hashtag → trả dataset
    → Adapter.parseOneItem() → NormalizedPost
    → Post Pipeline (enrich SHA-256 id → filter tiếng VI → dedupe trùng)
    → Worker Ingest: posts + post_snapshots + post_hashtag_facts
                  + post_discoveries + hashtag_scan_events
```

### Các actor Apify đang đăng ký (Registry ở `src/lib/scrapers/registry.ts`)

| actor_id                            | Platform (column)    | Input field chứa hashtag | Ưu tiên sử dụng                                   |
| ----------------------------------- | -------------------- | ------------------------ | ------------------------------------------------- |
| `clockworks/tiktok-hashtag-scraper` | **TIKTOK**           | `hashtags: []`           | 💯 **Mặc định TikTok** (chuyên hashtag)           |
| `clockwork/tiktok-scraper`          | TIKTOK               | `hashtags: []`           | Actor cũ, fallback                                |
| `apify/facebook-hashtag-scraper`    | **FACEBOOK_HASHTAG** | `hashtags: []`           | 💯 **Mặc định FB** (chuyên hashtag)               |
| `apify/facebook-pages-scraper`      | FACEBOOK_PAGE        | `searchWords: []`        | Thứ 3, cần `startUrls[]` hoặc search theo keyword |
| `alexey/facebook-search-scraper`    | FACEBOOK_SEARCH      | `queries: []`            | Community — toàn mạng                             |
| `apify/facebook-search-scraper`     | FACEBOOK_SEARCH      | `queries: []`            | Official Apify — maintained hơn                   |
| `streamer/youtube-scraper`          | YOUTUBE              | `searchTerms: []`        | Search theo keyword/hashtag                       |

---

## 3. Cấu trúc thư mục chính

```
web/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── scraping/page.tsx           ← Scraping Studio Server Page (fetch data)
│   │   │   ├── actors/, hashtags/, hashtag-groups/, researchers/, users/, settings/, profile/
│   │   ├── login/page.tsx
│   │   ├── setup/page.tsx                  ← First-run setup (tạo admin)
│   │   └── actions/
│   │       ├── test-adapter.ts             ← Server Action: card TEST NHANH trên Scraping Studio
│   │       ├── auth.ts, user.ts
│   ├── components/
│   │   ├── ScrapingStudio.tsx              ← 💻 UI: lên kế hoạch run + Test nhanh adapter
│   │   ├── ActorTable.tsx, HashtagTable.tsx, HashtagGroupTable.tsx, ...
│   ├── lib/
│   │   └── scrapers/
│   │       ├── types.ts                    ← RuntimeRunConfig, NormalizedPost, ParsedDatasetItem
│   │       ├── registry.ts                 ← actor_id → ScraperAdapter + hash helpers
│   │       ├── adapters/*.adapter.ts       ← 6 adapters (buildInput + parseOneItem + validate)
│   │       ├── postPipeline.ts             ← Enrich → VI filter → Dedup → Report (0 ghi DB)
│   │       └── languageFilter.ts           ← Heuristic zero-dep detect VI/EN/other
│   └── utils/supabase/ (client, server, middleware)
├── scripts/
│   ├── test-adapter-core.js                ← 🧪 CLI test ADAPTER CỐT LÕI (có --dry-run)
│   └── worker.js                           ← ⚙️ PM2 worker: dispatch QUEUED + poll RUNNING + ingest
├── docs/
│   ├── 01_architecture_and_decisions.md    ← Bảng ADR (DEC-00x) + Bounded Context
│   ├── 02_data_dictionary.md               ← Từ điển 8 bảng chính
│   ├── 03_handover.md                      ← Sổ tay bàn giao + Giai đoạn hiện tại
│   ├── 04_gap_analysis.md                   ← Danh sách rủi ro / mục cần hoàn thiện
│   └── schema.sql                          ← DDL tham chiếu (chỉ đọc, không chạy trực tiếp)
├── seed.js                                 ← Upsert 6 actors mặc định + 6 hashtag mẫu + 3 group
├── .env.local                              ← NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / APIFY_TOKEN
├── next.config.ts, tsconfig.json, package.json
```

---

## 4. Quick Start

### 4.1. Cài đặt

```powershell
cd D:\vpha-social-listening-mne\web
npm install
```

Copy file `.env.local` mẫu:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
# (tùy chọn test nhanh)
APIFY_TOKEN=apify_api_XXXXXXXX
```

### 4.2. Seed dữ liệu ban đầu (actors + hashtags + groups)

```powershell
node seed.js
```

### 4.3. Chạy UI (đăng nhập → Scraping Studio)

```powershell
npm run dev
# → http://localhost:3000
```

### 4.4. 🧪 Test nhanh adapter (không ghi DB, khuyến nghị)

```powershell
# 4.4.1 Chỉ XÂY DỰNG cấu hình payload (không gọi Apify → free)
node scripts/test-adapter-core.js --tiktok-hashtag --dry-run
node scripts/test-adapter-core.js --facebook-hashtag --dry-run
node scripts/test-adapter-core.js --youtube --dry-run

# 4.4.2 Chạy thật trên Apify (cần token)
$env:APIFY_TOKEN="apify_api_XXXX"
node scripts/test-adapter-core.js --tiktok-hashtag --max-items 5
node scripts/test-adapter-core.js --facebook-hashtag --max-items 3
```

Các cờ bổ sung cho pipeline:
| Cờ | Ý nghĩa |
|---|---|
| `--dry-run` | chỉ test buildInput (không tốn cost) |
| `--max-items N` | số item scrape tối đa (override default_config) |
| `--langs vi,en` | whitelist ngôn ngữ (mặc định `vi` thôi) |
| `--keep-all-langs` | tắt filter ngôn ngữ |
| `--no-dedupe` | tắt dedupe theo (platform, native_post_id) |

### 4.5. ⚙️ Chạy Worker (tích hợp end-to-end)

```powershell
# 1 lần test (pick tất cả QUEUED + poll các RUNNING hiện có)
node scripts/worker.js --once

# Hoặc chạy dài hạn dưới PM2
npm install -g pm2
pm2 start scripts/worker.js --name vpha-scrape-worker
pm2 save
```

**Flow worker (1 tick mỗi 15s):**

1. `pollRunning()` → kiểm tra run nào `status=RUNNING`, gọi Apify check status → nếu done thì parse dataset + ingest 5 bảng.
2. `dispatchQueued()` → lấy 5 dòng QUEUED/PLANNED ưu tiên cao nhất → buildInput → gọi Apify POST run → update dòng thành RUNNING + gắn `apify_run_id`, `apify_dataset_id`.

---

## 5. Scraping Studio (UI chính cho Researcher)

Truy cập `/dashboard/scraping` sau khi login. Gồm 2 phần lớn:

### Phải — Card **"TEST NHANH ADAPTER CỐT LÕI"** (dashed amber)

> Đây là giai đoạn **đang hoạt động chính (giai đoạn 3)**. Không ghi DB, không dùng collection.
>
> - 🧪 **Dry-Run Build**: chỉ gọi `adapter.buildInput()`, xem payload chuẩn chưa.
> - 🚀 **Run Thật**: POST actor → poll 30s → tải dataset 5 items → parse ra NormalizedPost → in ra UI.
> - Không cần seed xong cũng chạy được (có fallback default_config mẫu).

### Trái — "Lên Kế Hoạch Thu Thập"

> Để chạy **worker ingest**, cần Admin phân công scope (`assigned_scope.allowed_actors[]` + `allowed_hashtag_groups[]`) qua màn hình Researchers.
>
> 1. Chọn actor (công cụ Apify)
> 2. Chọn nhóm hashtag → auto tick tất cả hashtag trong nhóm
> 3. Nhập Max items
> 4. (optional) Đính kèm token tạm thời trên kế hoạch này `apify_api_token_override`
> 5. Chạy NGAY hoặc đưa vào Queue → Worker pick → Apify → ingest DB

---

## 6. Bảng Quyết định Thiết kế (ADR tóm tắt)

| ID                        | Quyết định                                                                                                             | Lý do                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| DEC-001                   | **Không lưu bảng comments** chi tiết                                                                                   | Bảo vệ vị thành niên (Nghị định 13), tiết kiệm cost        |
| DEC-002                   | `post_snapshots` chỉ INSERT, không UPDATE                                                                              | Bảo toàn chuỗi thời gian → tính engagement_growth_rate     |
| DEC-003                   | `study_phase`, `days_from_intervention` = SQL VIEW                                                                     | Tránh hardcode trong app, dễ thay đổi ngày can thiệp       |
| DEC-004                   | **Không xóa** nội dung trùng (similarity > 0.9)                                                                        | Gán `content_cluster_id` để nhận diện mạng bot/seeding     |
| DEC-005                   | `hashtag_groups` BẤT BIẾN (4 nhóm cố định: COMMERCIAL / LIFESTYLE / EVASION / WARNING); `hashtags` sống có thể bật/tắt | Đảm bảo so sánh dọc ITS 18 tháng                           |
| DEC-006                   | **Không có workflow đề xuất hashtag online**                                                                           | Hội đồng duyệt giấy bên ngoài; Admin nhập trực tiếp        |
| DEC-013                   | `post_id` = **SHA-256(post_url)**                                                                                      | URL chuẩn toàn nền tảng, không đổi theo native id thay đổi |
| **DEC-H1** (hashtag-only) | **Mọi adapter đều nhận hashtag làm input chính**; không có actor theo dõi author cố định                               | Rõ ràng scope ITS, dễ đối soát ngang qua 4 nhóm hashtag    |
| **DEC-H2**                | Language filter = **heuristic zero-dep**, không gọi LLM per item                                                       | Tốc độ, cost, worker chạy được offline partial             |

---

## 7. Env vars bắt buộc

| Key                                    | Nơi dùng                                                                                | Ví dụ                      |
| -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Next.js SSR + CSRC (browser) Supabase client                                            | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Browser client (RLS đã bật)                                                             | `eyJhbGciOi...`            |
| `SUPABASE_SERVICE_ROLE_KEY`            | `scripts/worker.js`, `test-adapter-core.js` (bypass RLS)                                | `eyJhbGciOi...`            |
| `APIFY_TOKEN` (hoặc `APIFY_API_TOKEN`) | `test-adapter-core.js` nếu không set qua CLI; worker LUÔN lấy từ `system_settings` bảng | `apify_api_...`            |

> 💡 **Lưu ý token cho Worker:** Worker **không** đọc `APIFY_TOKEN` từ env. Worker đọc từ `system_settings.setting_key = 'APIFY_API_TOKEN'` (Admin → `/dashboard/settings` nhập). Ngoài ra, từng dòng kế hoạch riêng lẻ có thể override bằng `apify_api_token_override` (dành cho test nhanh).

---

## 8. Liên kết nhanh

- [Kiến trúc & ADR chi tiết](file:///D:/vpha-social-listening-mne/web/docs/01_architecture_and_decisions.md)
- [Từ điển Dữ liệu (8 bảng)](file:///D:/vpha-social-listening-mne/web/docs/02_data_dictionary.md)
- [Sổ tay bàn giao & Giai đoạn hiện tại](file:///D:/vpha-social-listening-mne/web/docs/03_handover.md)
- [Danh sách Gap / Mục cần hoàn thiện](file:///D:/vpha-social-listening-mne/web/docs/04_gap_analysis.md)
- [Scraping Studio UI](file:///D:/vpha-social-listening-mne/web/src/components/ScrapingStudio.tsx)
- [Adapter Registry + hash helpers](file:///D:/vpha-social-listening-mne/web/src/lib/scrapers/registry.ts)
- [6 adapters folder](file:///D:/vpha-social-listening-mne/web/src/lib/scrapers/adapters)
- [Post Pipeline (enrich / lang filter / dedupe)](file:///D:/vpha-social-listening-mne/web/src/lib/scrapers/postPipeline.ts)
- [Test Adapter CLI](file:///D:/vpha-social-listening-mne/web/scripts/test-adapter-core.js)
- [PM2 Worker](file:///D:/vpha-social-listening-mne/web/scripts/worker.js)
````

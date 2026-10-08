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

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

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

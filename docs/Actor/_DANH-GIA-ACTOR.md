# Đánh giá các actor Apify (cập nhật 31/10/2026)

Đánh giá theo mục tiêu dự án: chỉ quét theo hashtag/từ khóa (DEC-H1), chỉ TikTok + Facebook
(YouTube nếu đủ nguồn lực), mỗi đêm chụp lại số liệu tương tác của từng bài.
Số liệu "đủ trường" đo bằng chính bộ đọc của hệ thống (`src/lib/scrapers/catalog.ts`) trên `result.json` mẫu.

## Tiêu chí

| # | Tiêu chí | Vì sao cần |
|---|---|---|
| 1 | Đầu vào là hashtag/từ khóa | DEC-H1 |
| 2 | Mỗi bài có: link, ngày đăng, nội dung, mã tác giả, like, bình luận, chia sẻ (TikTok thêm lượt xem) | bảng `posts` + `post_snapshots` |
| 3 | Giới hạn được số bài mỗi lần chạy | khóa trần chi phí (requirement.txt) |
| 4 | Giới hạn được theo thời gian đăng | requirement.txt — nếu actor không có thì lọc sau khi tải về |
| 5 | Ra được bài tiếng Việt | đối tượng nghiên cứu |
| 6 | Đo lại được theo link bài | chụp số liệu mỗi đêm, tốc độ tăng tương tác |

## Kết luận: chỉ cần 2 actor chính + 1 actor đo lại

| Vai trò | TikTok | Facebook |
|---|---|---|
| **Quét chính** | `clockworks/tiktok-hashtag-scraper` (thư mục `TikTok Hashtag Scraper`) | `scraper_one/facebook-posts-search` (thư mục `Facebook Posts Search`) |
| **Đo lại theo link bài** | `clockworks/tiktok-scraper` (thư mục `clockworkstiktok-scraper`) — cần xác nhận | `clappi/facebook-posts-reels-scraper` (thư mục `clappi-facebook-posts-reels-scraper`) — cần chạy thử |
| Dự phòng (không bắt buộc) | `api-ninja/tiktok-hashtag-scraper` (rẻ hơn ~10 lần) | `scrapeforge/facebook-search-posts` |

Các actor chính cho cùng loại dữ liệu nên không cần nhiều. Actor dự phòng chỉ dùng khi actor chính hỏng hoặc tăng giá.

## Bảng chi tiết

Ký hiệu: ✅ đạt · ⚠️ đạt một phần · ❌ không đạt · ? chưa có mẫu để kiểm.

| Actor | Vai trò | Đủ trường (mẫu) | Số bài | Thời gian | Tiếng Việt | Đo lại theo link | Giá |
|---|---|---|---|---|---|---|---|
| clockworks/tiktok-hashtag-scraper | **Chính** | ✅ ngày/link/tác giả/tương tác 100%, có sẵn ngôn ngữ | ✅ `resultsPerPage` | ❌ lấy cả bài từ 2020 → lọc sau | ? mẫu "vape": 0/100 | ❌ | ~0,005 USD/bài |
| clockworks/tiktok-scraper | **Đo lại** | ✅ như trên (cùng định dạng) | ✅ | ❌ | ? mẫu "vap": 0/100 | ? nhận được link video — chưa có mẫu | ~0,005 USD/bài |
| api-ninja/tiktok-hashtag-scraper | Dự phòng | ✅ 100%, không có ngôn ngữ (hệ thống tự nhận) | ⚠️ tối thiểu 100 bài/hashtag | ❌ | ? mẫu "dance": 0/100 (đặt khu vực VN được) | ❌ | ~0,0005 USD/bài |
| scraper_one/facebook-posts-search | **Chính** | ✅ (Facebook không có lượt xem) | ✅ `resultsCount` (gói free ≤100) | ✅ `startDate`/`endDate` | ? 5 bài, toàn tin Mỹ | ❌ | ~0,002 USD/bài |
| clappi/facebook-posts-reels-scraper | **Đo lại (FB)** | ⚠️ mẫu ví dụ Apify 2/2 chạy được, có `realId`; chưa chạy link của dự án. Theo trang Apify: like (tổng reaction), bình luận, chia sẻ, xem (chỉ reel), ngày đăng, mã tác giả, `status` available/unavailable | — (số bài = số link gửi) | — | — | ✅ `postUrls[]` | từ 2,2 USD/1.000 bài |
| insiteco/social-insight-scraper | Dự phòng đo lại (TikTok/YouTube) | ✅ mẫu 2/2, trả lại `inputId` (ghép chắc chắn); không có Facebook | — | — | — | ✅ `input[{url,inputId}]` | 0,1 USD/lần start — chưa rõ theo lần hay theo link |
| scrapeforge/facebook-search-posts | Dự phòng | ✅ (lượt xem chỉ có ở video) | ✅ `max_results` | ⚠️ chỉ "bài mới nhất", không lọc ngày | ? 5 bài tiếng Pháp | ❌ | chưa rõ |
| parseforge/tiktok-hashtag-analytics-scraper | **LOẠI** | ⚠️ chỉ ~30 video nổi bật/hashtag; 2/3 hashtag mẫu không có video | ❌ | ⚠️ kỳ 7/30/120 ngày | ? | ❌ | thuê 10 USD/tháng + phí chạy |
| apify/instagram-hashtag-analytics-scraper | **LOẠI** | ❌ không có bài (gói free) — chỉ số bài + hashtag liên quan | ❌ | ❌ | ? | ❌ | chưa rõ |
| apify/facebook-hashtag-scraper | **LOẠI** | ❌ không có mẫu | — | — | — | — | Apify đánh dấu đang bảo trì |
| easyapi/facebook-hashtag-search-scraper | **LOẠI** | ❌ chạy không ra kết quả | — | — | — | — | — |

## Lý do loại

- **parseforge TikTok analytics**: đo độ phổ biến hashtag, không phải công cụ thu thập bài; số video do TikTok
  chọn (tối đa ~30) nên không đủ cho chuỗi thời gian; phải thuê theo tháng.
- **Instagram analytics**: Instagram ngoài phạm vi dự án; gói free không trả về bài.
  (Danh sách hashtag liên quan có thể dùng cho trinh sát, nhưng không cần thiết.)
- **apify/facebook-hashtag-scraper**: đang bảo trì. Lưu ý: code quét chính thức (`scripts/worker.js`) vẫn còn adapter cho actor này.
- **easyapi/facebook-hashtag-search-scraper**: chạy không ra kết quả.

Hai actor parseforge và Instagram vẫn đang có trong danh sách công cụ của trang Quét thử — xóa khỏi
`SCAN_ACTORS` trong `catalog.ts` nếu chốt loại.

## Mẫu đầu ra cần bổ sung

Việc chung cho cả 5 actor còn giữ: **chưa mẫu nào có bài tiếng Việt** → chưa kiểm được tiêu chí 5.
Mỗi actor nên chạy lại với 2–3 hashtag tiếng Việt thật của dự án (ví dụ `podgiare`, `vapegiare`), lưu:
- `result.json` — kết quả;
- `run.json` — thông tin lần chạy trên Apify (tab *Run* → JSON), để có `usageTotalUsd` (chi phí thật) và thời gian chạy;
- `name.txt` — tên actor dạng `username/actor-name` (2 thư mục cũ chưa có).

Riêng từng actor:

| Thư mục | Cần bổ sung |
|---|---|
| `TikTok Hashtag Scraper` | Mẫu hashtag tiếng Việt; `name.txt`. Còn lại đủ. |
| `clockworkstiktok-scraper` | **Mẫu chạy theo danh sách link video** (`postURLs`) để xác nhận dùng được cho đo lại; mẫu hashtag tiếng Việt. |
| `Facebook Posts Search` | Mẫu ≥50 bài tiếng Việt; một lần chạy có `startDate`/`endDate` + `searchType: "latest"` để kiểm lọc thời gian; `name.txt`. |
| `api-ninjatiktok-hashtag-scraper` | `api.txt` đang trống → dán input mẫu; mẫu chạy với `region: "VN"` và hashtag tiếng Việt. |
| `scrapeforgefacebook-search-posts` | Mẫu chỉ 5 bài tiếng Pháp → cần ≥50 bài tiếng Việt, một lần chạy `recent_posts: true`; giá mỗi bài (`run.json`). |
| `clappi-facebook-posts-reels-scraper` | Chưa có `result.json`. Chạy thử theo 4 bước trong `GHI-CHU.txt` của thư mục (đủ dạng link, bài đã xóa, chạy lại sau 1–2 ngày, so số với scraper_one). |

## Actor đo lại theo link — đã xét (31/10/2026)

| Actor | Kết luận | Lý do |
|---|---|---|
| `clappi/facebook-posts-reels-scraper` | **Chọn, chờ chạy thử** | Nhận đúng danh sách link bài; có `status` để biết bài đã biến mất. |
| `apify/facebook-posts-scraper` | Không dùng cho đo lại | Đầu vào là link trang/hồ sơ → quét theo trang, trái DEC-H1; đo lại một bài phải tải cả dòng thời gian của trang. |
| `insiteco/social-insight-scraper` | Dự phòng cho TikTok (và YouTube nếu thêm) | Trả lại `inputId` rất tiện, nhưng không có Facebook, 1 người dùng/tháng, 8 tháng không cập nhật, giá chưa rõ. Chọn chính nếu giá tính theo lần chạy và clockworks không đo được theo link. |
| `thedoor/facebook-page-scraper` | Không dùng | Cũng quét theo trang (kèm bình luận — DEC-001 không lưu bình luận). |

Lưu ý khi đưa vào hệ thống:
- Danh sách link mỗi lần đo **do hệ thống sinh từ DB** (bài đến mốc tuổi 0/3/7/14/30 ngày), không dùng lịch Apify với danh sách cố định — danh sách thay đổi mỗi ngày khi có bài mới.
- Không đo lại mọi bài mỗi đêm: bài tích lũy dần (500–800 bài/tháng), sau 18 tháng ~10.000–14.000 bài → đo hết mỗi đêm tốn hàng trăm USD/tháng. Đo theo mốc tuổi: ~5 lần/bài → khoảng 2.500–4.000 lần đo/tháng ≈ 6–18 USD/tháng.
- `views` của bài thường trả 0 → ghi rỗng (null), không ghi 0, để không tạo số giả trong `post_snapshots`.
- `status = "unavailable"` → ghi nhận bài biến mất (application có nêu chỉ số này), không ghi dòng snapshot số 0.

## Quyết định 31/10/2026: đo tương tác dùng nhà cung cấp riêng (Bright Data)

CuongPV chốt "việc nào ra việc đó":
**Apify tìm bài (+ ghi snapshot đầu) → sàng lọc (quy tắc + AI + nghiên cứu viên) → Bright Data đo tương tác theo lịch.**

- Bright Data (Web Scraper API, theo link bài, TikTok + Facebook): ~1,5 USD/1.000 bản ghi, gói miễn phí ~5.000 bản ghi/tháng (theo trang so sánh 07–09/2026 — cần kiểm lại trên trang Bright Data), không tính lần giao lỗi, một lần gọi tới 5.000 link, do công ty duy trì. Lượng đo dự kiến ~4.900 lượt/tháng → gần như nằm trong gói miễn phí.
- Không chọn: Data365 (báo giá riêng, khởi điểm ~300 EUR/tháng), Oxylabs (không có bộ đọc sẵn cho TikTok/Facebook, chỉ YouTube và TikTok Shop).
- Actor đo lại trên Apify (`clappi/facebook-posts-reels-scraper`, `clockworks/tiktok-scraper`, `insiteco/social-insight-scraper`) chuyển thành **dự phòng**.
- Cần chạy thử Bright Data (gói miễn phí): ~20 link TikTok + ~20 link Facebook lấy từ các `result.json` (đủ các dạng link) + 1–2 bài đã xóa; kiểm: dạng link, bài xóa trả gì, có trả lại link/mã đã gửi, lệch số so với actor quét < 10%, điều kiện gói miễn phí và thanh toán. Lưu vào thư mục `brightdata-...`.
- Ghi chú dữ liệu: `collection_runs.actor_id` tham chiếu bảng `apify_actors` → thêm một dòng cho nguồn Bright Data (ví dụ `brightdata/tiktok-posts-by-url`, `brightdata/facebook-posts-by-url`) — bảng này hiểu là "danh mục nguồn thu thập".

### Cập nhật tối 31/10/2026: đo tương tác dùng **Social Fetch** thay Bright Data
CuongPV: thủ tục Bright Data lằng nhằng; nếu Social Fetch đổi thì quay về Bright Data; dự án không cần quá chính xác.
- Social Fetch (socialfetch.dev): REST đồng bộ (~3,2 giây), 1 lượt/lần gọi, lượt lỗi không tính; 100 lượt miễn phí không cần thẻ; gói không hết hạn: Starter 14 USD/1.000, Growth 59 USD/25.000, Scale 379 USD/230.000 (1,64 USD/1.000). ~4.900 lượt/tháng → ~12 USD/tháng.
- Lệnh: TikTok `GET /v1/tiktok/videos` (theo link video), Facebook `GET /v1/facebook/posts` (theo link bài/reel); không gửi theo lô (mỗi bài một lần gọi).
- Xu hướng từ khóa: TikTok `GET /v1/tiktok/search` (query, region=VN, datePosted=this-week…, sortBy=date-posted, cursor) → "nhiệt kế" tương đối hằng tuần. Facebook không có tìm bài theo từ khóa.
- Rủi ro: startup nhỏ (Anh, 2024) → mua gói nhỏ dần, adapter tách nhà cung cấp; dự phòng: Bright Data, rồi actor Apify.
- Chạy thử: `scripts/socialfetch-test.mjs` (30 TikTok xen kẽ 3 nguồn + 12 Facebook + bài đã xóa trong `socialfetch/deleted-urls.txt` + xu hướng) → kết quả vào `docs/Actor/socialfetch/`.

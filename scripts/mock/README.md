# Dữ liệu giả để dựng dashboard

Sinh dữ liệu 18 tháng theo đúng thiết kế đo lường (`claude/thiet-ke-do-luong-2026-10-31.md` trong Project).
**Chỉ dùng để dựng và trình diễn giao diện — không đưa số liệu giả vào báo cáo như số thật.**

## Chạy (trong thư mục `web`)

1. Chạy các migration ngày 31/10 trên Supabase: `2026-10-31_do-lai-theo-link.sql`, `2026-10-31_bo-sung-sang-loc-do-luong.sql`, `2026-10-31_loai-run.sql`.
2. Xem trước, không ghi gì: `node scripts/mock/seed-mock.mjs --dry`
3. Ghi vào Supabase: `node scripts/mock/seed-mock.mjs` (đọc `.env.local`; mất vài phút)
4. Xóa sạch: `node scripts/mock/seed-mock.mjs --clean`

Tùy chọn: `MOCK_START=2025-05-01` `MOCK_MONTHS=18` `MOCK_INTERVENTION=2025-11-01` `MOCK_SEED=173`
(cùng hạt giống → cùng dữ liệu; không đặt `MOCK_INTERVENTION` thì lấy `project_config.intervention_date`, nằm ngoài khoảng thì lấy START + 6 tháng).

## Dữ liệu sinh ra (hạt giống mặc định)

- ~14.600 bài (60% TikTok), ~800 bài mới/tháng; ~96.000 snapshot; ~12.300 lần quét (phát hiện + đo lại).
- 4 nhóm hashtag cố định, 20 hashtag gốc + 8 hashtag thích ứng xuất hiện dần sau mốc chính sách.
- Tại mốc: tiếp thị trực tiếp giảm ~1/3 rồi hồi dần; từ lóng lách luật tăng từ ~13 lên ~60 bài/tuần; cai thuốc–cảnh báo tăng vọt rồi giảm.
- Lần chạy có loại: `DISCOVERY` (Apify tìm bài, ghi lần đo đầu) và `MEASURE` (Social Fetch đo lại, `socialfetch/...`). TikTok có lượt lưu.
- Sàng lọc: ~25–40% bài đúng hashtag nhưng không liên quan (nội dung kiểu podcast, cà phê…) — AI loại thì không đo lại; ~7% "chưa rõ" được đo trong lúc chờ người kết luận; ~20% kết luận của AI được người xem lại (`relevance_source = HUMAN`).
- Lịch đo: ngày 0 (lần quét) → 3/7/14/30; kiểm kê tháng bài còn nóng; kiểm kê toàn bộ trước 4 đợt phân tích và sau mốc.
- ~27% bài biến mất (`posts.unavailable_at`), nguy cơ tăng 2,5 lần trong 90 ngày sau mốc.
- Người bán đăng lặp lại nhiều (phân phối lệch), ~6% bài bán hàng nằm trong cụm nội dung trùng.
- 4% bài có đợt tăng tương tác muộn (để thử phát hiện bài "tăng bất thường").

## Nhận diện dữ liệu giả

`posts.raw_payload.mock = true`, tài khoản trong link dạng `mock_...`, `collection_runs.researcher_code = 'MOCK'`,
danh sách hashtag do script tạo nằm trong `system_settings.MOCK_SEED_INFO`. Script từ chối sinh lần hai khi chưa `--clean`.

Chưa sinh (làm khi dựng màn hình tương ứng): phiếu đề xuất hashtag theo tỉnh (Q6), nhãn AI và nhãn người (Q5) — cần tài khoản người dùng giả.

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

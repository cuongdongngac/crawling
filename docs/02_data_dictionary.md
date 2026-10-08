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

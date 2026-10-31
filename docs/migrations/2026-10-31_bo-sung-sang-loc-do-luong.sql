-- =====================================================================
-- 31/10/2026 — Bổ sung DB cho chuỗi: Apify tìm bài → sàng lọc → Social Fetch đo tương tác
-- Thiết kế: claude/quyet-dinh-2026-10-31.md, help/thiet-ke/*
-- Chạy một lần trên Supabase (SQL Editor). Chạy lại nhiều lần không lỗi.
-- ĐÃ GỒM nội dung file 2026-10-31_save-count.sql (không cần chạy file đó riêng).
-- Cần chạy trước: 2026-10-29_cong-tac-vien-va-lich-quet.sql (hàm is_admin), 2026-10-31_do-lai-theo-link.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. Lượt lưu trong mỗi lần đo (TikTok collectCount). "Thừa còn hơn thiếu".
-- ---------------------------------------------------------------------
alter table public.post_snapshots
  add column if not exists save_count bigint;
comment on column public.post_snapshots.save_count is
  'Lượt lưu tích lũy tại thời điểm đo (TikTok collectCount). NULL nếu nền tảng/công cụ không cung cấp.';

-- ---------------------------------------------------------------------
-- B. Trạng thái sàng lọc HIỆN HÀNH của bài (đúng hashtag nhưng có liên quan thuốc lá điện tử không?)
--    Lịch sử nhãn (AI và người, có phiên bản) vẫn nằm ở ai_labels / human_labels.
--    Ba cột dưới chỉ là "kết luận hiện tại" để worker chọn bài cần đo và dashboard lọc nhanh.
--    Quy tắc: nhãn người thắng nhãn AI; AI thắng quy tắc.
-- ---------------------------------------------------------------------
alter table public.posts
  add column if not exists relevance varchar(12) not null default 'PENDING',
  add column if not exists relevance_source varchar(8),
  add column if not exists relevance_at timestamptz;

do $$ begin
  alter table public.posts add constraint posts_relevance_check
    check (relevance in ('PENDING', 'RELATED', 'UNCLEAR', 'UNRELATED'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.posts add constraint posts_relevance_source_check
    check (relevance_source is null or relevance_source in ('RULE', 'AI', 'HUMAN'));
exception when duplicate_object then null; end $$;

comment on column public.posts.relevance is
  'Kết luận sàng lọc hiện tại: PENDING (chưa sàng lọc), RELATED (liên quan), UNCLEAR (chưa rõ, chờ người), UNRELATED (không liên quan — không đo lại, không tính khi phân tích). Bài không bao giờ bị xóa.';
comment on column public.posts.relevance_source is 'Ai đưa ra kết luận hiện tại: RULE (quy tắc), AI, HUMAN (nghiên cứu viên).';
comment on column public.posts.relevance_at is 'Thời điểm có kết luận hiện tại.';

create index if not exists posts_relevance_idx on public.posts (relevance);

-- ---------------------------------------------------------------------
-- C. "Nhiệt kế" xu hướng từ khóa — đặt CẠNH dữ liệu bài, không nối vào posts/post_snapshots.
--    Mỗi tuần × từ khóa × nền tảng × khu vực × nguồn một dòng. Chỉ số tương đối (tăng/giảm).
-- ---------------------------------------------------------------------
create table if not exists public.keyword_trend_weekly (
  trend_id       bigint generated always as identity primary key,
  keyword        text        not null,                    -- từ khóa/hashtag đã tra, không có dấu #
  platform       varchar(20) not null default 'TIKTOK',
  region         varchar(8)  not null default 'VN',
  week_start     date        not null,                    -- thứ Hai của tuần được tra
  source         varchar(40) not null default 'socialfetch',
  observed_at    timestamptz not null default now(),      -- lúc tra
  videos_found   integer     not null default 0,          -- số video (không trùng) đăng trong tuần tìm được
  pages_fetched  integer     not null default 0,          -- số trang đã lấy (nỗ lực tra — giữ cố định)
  has_more       boolean,                                 -- còn trang nữa không (true = con số bị chặn trên)
  views_sum      bigint,
  likes_sum      bigint,
  query_params   jsonb,                                   -- tham số đã gửi (để tái lập)
  constraint keyword_trend_weekly_uniq unique (platform, region, keyword, week_start, source)
);
comment on table public.keyword_trend_weekly is
  'Nhiệt kế xu hướng từ khóa hằng tuần (TikTok qua Social Fetch). Độc lập với mẫu bài đã thu; dùng để đặt cạnh số bài liên quan/tuần trong báo cáo. Chỉ số tương đối, không phải tổng số thật.';
create index if not exists keyword_trend_weekly_week_idx on public.keyword_trend_weekly (week_start);

alter table public.keyword_trend_weekly enable row level security;
drop policy if exists keyword_trend_weekly_read on public.keyword_trend_weekly;
create policy keyword_trend_weekly_read on public.keyword_trend_weekly
  for select using (auth.uid() is not null);
-- Không có policy ghi: chỉ server (service role) được ghi.

-- ---------------------------------------------------------------------
-- D. Danh mục nguồn thu thập: thêm nguồn đo của Social Fetch
--    (collection_runs.actor_id tham chiếu bảng apify_actors — coi đây là "danh mục nguồn").
--    is_active = false để KHÔNG hiện trong danh sách chọn công cụ tìm bài.
-- ---------------------------------------------------------------------
insert into public.apify_actors (actor_id, actor_name, platform, default_config, is_active) values
  ('socialfetch/tiktok-videos',  'Social Fetch – TikTok: đo tương tác theo link',   'TIKTOK',   '{"role":"MEASURE","endpoint":"/v1/tiktok/videos"}',  false),
  ('socialfetch/facebook-posts', 'Social Fetch – Facebook: đo tương tác theo link', 'FACEBOOK', '{"role":"MEASURE","endpoint":"/v1/facebook/posts"}', false),
  ('socialfetch/tiktok-search',  'Social Fetch – TikTok: nhiệt kế từ khóa',          'TIKTOK',   '{"role":"TREND","endpoint":"/v1/tiktok/search"}',    false)
on conflict (actor_id) do nothing;

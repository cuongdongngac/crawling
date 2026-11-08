-- =====================================================================
-- 04/11/2026 — ĐO TƯƠNG TÁC THEO LỊCH (Social Fetch)
-- Phương châm: Apify phát hiện link -> sàng lọc bớt link không liên quan -> Social Fetch đo theo mốc thời gian.
-- Thiết kế lịch đo: claude/thiet-ke-do-luong-2026-10-31.md (mốc 3/7/14/30 ngày kể từ lúc phát hiện;
-- bài phát hiện khi đã > 60 ngày tuổi chỉ đo mốc 30; sau 30 ngày chỉ đo lại bài "còn nóng" mỗi tháng).
--
-- Cần chạy trước: 2026-10-31_do-lai-theo-link.sql, 2026-10-31_bo-sung-sang-loc-do-luong.sql, 2026-10-31_loai-run.sql.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần không lỗi.
-- =====================================================================

-- 1. Lần đầu đo mà không thấy bài: ghi lại thời điểm. Chỉ khi lần đo sau (cách >= 24 giờ) vẫn không thấy
--    mới ghi posts.unavailable_at (tránh kết luận "biến mất" vì lỗi tạm thời). Thấy lại bài -> xóa về NULL.
alter table public.posts
  add column if not exists missing_since timestamptz;
comment on column public.posts.missing_since is
  'Lần đo gần nhất không thấy bài (chưa xác nhận biến mất). NULL = lần đo gần nhất vẫn thấy hoặc chưa đo.';

create index if not exists post_snapshots_post_time_idx on public.post_snapshots (post_id, observed_at);

-- 2. Ứng viên đo lại: bài còn tồn tại, KHÔNG bị kết luận "không liên quan", kèm lần đo gần nhất và lần trước đó.
--    Việc "đến hạn chưa" do code quyết định (src/lib/measure/schedule.ts) để dễ đổi lịch và dễ kiểm thử.
drop view if exists public.v_measure_candidates;
create view public.v_measure_candidates
with (security_invoker = true) as
with ranked as (
  select s.post_id, s.observed_at,
         coalesce(s.like_count, 0) + coalesce(s.comment_count, 0) + coalesce(s.share_count, 0) as eng,
         row_number() over (partition by s.post_id order by s.observed_at desc) as rn
  from public.post_snapshots s
)
select p.post_id,
       p.platform,
       p.post_url,
       p.created_at,
       p.published_at,
       p.relevance,
       p.missing_since,
       coalesce(p.raw_payload->>'mock', 'false') = 'true' as is_mock,
       l.observed_at as last_at,
       l.eng         as last_eng,
       pr.observed_at as prev_at,
       pr.eng         as prev_eng
from public.posts p
left join ranked l  on l.post_id  = p.post_id and l.rn = 1
left join ranked pr on pr.post_id = p.post_id and pr.rn = 2
where p.unavailable_at is null
  and p.relevance <> 'UNRELATED';

comment on view public.v_measure_candidates is
  'Bài có thể cần đo lại (còn tồn tại, không bị loại). Dùng bởi bộ chọn bài đến hạn của luồng đo Social Fetch.';

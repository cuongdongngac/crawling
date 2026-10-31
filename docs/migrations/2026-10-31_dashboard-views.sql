-- =====================================================================
-- 31/10/2026 — View cho dashboard Tổng quan (chỉ đọc, tính sẵn)
--   v_post_primary_group  : mỗi bài thuộc nhóm hashtag nào (theo hashtag tìm ra bài sớm nhất)
--   v_weekly_new_posts    : Q1 — bài mới mỗi tuần × nền tảng × nhóm, tách theo kết luận sàng lọc
--   v_stage_runs_weekly   : điều hành theo khâu — lần chạy, lỗi, số mục, chi phí theo run_type
--   v_post_growth         : Q3 — mức tăng tương tác của mỗi bài trong ~7 ngày gần nhất có đo
-- Tuần tính theo giờ Việt Nam, bắt đầu thứ Hai. security_invoker: tôn trọng quyền của người gọi.
-- Chạy lại nhiều lần không lỗi.
-- =====================================================================
drop view if exists public.v_post_growth;

create or replace view public.v_post_primary_group with (security_invoker = true) as
select distinct on (f.post_id)
  f.post_id, f.hashtag_id, m.group_id
from public.post_hashtag_facts f
join public.hashtag_group_mapping m on m.hashtag_id = f.hashtag_id
where f.match_type = 'SEARCH_HIT'
order by f.post_id, f.first_seen_at, f.hashtag_id, m.group_id;

create or replace view public.v_weekly_new_posts with (security_invoker = true) as
select
  date_trunc('week', p.created_at at time zone 'Asia/Ho_Chi_Minh')::date as week_start,
  p.platform,
  coalesce(g.group_id, 'UNGROUPED') as group_id,
  count(*)                                                     as total,
  count(*) filter (where p.relevance = 'RELATED')              as related,
  count(*) filter (where p.relevance = 'UNCLEAR')              as unclear,
  count(*) filter (where p.relevance = 'UNRELATED')            as unrelated,
  count(*) filter (where p.relevance = 'PENDING')              as pending,
  count(*) filter (where (p.raw_payload->>'mock') = 'true')    as mock
from public.posts p
left join public.v_post_primary_group g on g.post_id = p.post_id
group by 1, 2, 3;

create or replace view public.v_stage_runs_weekly with (security_invoker = true) as
select
  date_trunc('week', r.started_at at time zone 'Asia/Ho_Chi_Minh')::date as week_start,
  r.run_type,
  r.platform,
  count(*)                                              as runs,
  count(*) filter (where r.status = 'FAILED')           as failed,
  count(*) filter (where r.status in ('PLANNED', 'QUEUED', 'RUNNING')) as pending,
  coalesce(sum(r.items_count), 0)                       as items,
  sum(r.cost_usd)                                       as cost_usd,
  count(r.cost_usd)                                     as runs_with_cost,
  max(r.started_at)                                     as last_run_at
from public.collection_runs r
group by 1, 2, 3;

-- Chỉ mục giúp các view đọc nhanh (bảng lần đo lớn dần theo thời gian)
create index if not exists post_snapshots_post_observed_idx on public.post_snapshots (post_id, observed_at);
create index if not exists post_hashtag_facts_search_idx on public.post_hashtag_facts (post_id, first_seen_at) where match_type = 'SEARCH_HIT';

create or replace view public.v_post_growth with (security_invoker = true) as
with s as (
  select post_id, observed_at, view_count,
         coalesce(like_count, 0) + coalesce(comment_count, 0) + coalesce(share_count, 0) as eng,
         count(*)          over (partition by post_id) as n_snapshots,
         max(observed_at)  over (partition by post_id) as last_at,
         row_number()      over (partition by post_id order by observed_at desc) as rn_desc
  from public.post_snapshots
),
last as (
  select post_id, last_at, eng as last_eng, view_count as last_views, n_snapshots from s where rn_desc = 1
),
base as (
  -- lần đo gần nhất cách lần đo cuối ít nhất 6 ngày (để so "khoảng một tuần")
  select distinct on (post_id) post_id, observed_at as base_at, eng as base_eng
  from s
  where observed_at <= last_at - interval '6 days'
  order by post_id, observed_at desc
)
select
  p.post_id, p.platform, p.post_url, p.published_at, p.created_at, p.relevance, p.unavailable_at,
  g.group_id,
  left(p.raw_text, 200) as text_preview,
  l.last_at, l.last_eng, l.last_views, l.n_snapshots,
  b.base_at, b.base_eng,
  (l.last_eng - b.base_eng) as gain,
  round((l.last_eng - b.base_eng)::numeric
        / greatest(extract(epoch from (l.last_at - b.base_at)) / 86400.0, 1), 1) as gain_per_day
from public.posts p
join last l on l.post_id = p.post_id
left join base b on b.post_id = p.post_id
left join public.v_post_primary_group g on g.post_id = p.post_id;

comment on view public.v_weekly_new_posts is 'Q1: bài mới mỗi tuần (giờ VN) theo nền tảng và nhóm hashtag, tách theo kết luận sàng lọc. Phân tích dùng related (+ unclear nếu muốn).';
comment on view public.v_stage_runs_weekly is 'Điều hành theo khâu: số lần chạy, lỗi, số mục, chi phí theo run_type mỗi tuần.';
comment on view public.v_post_growth is 'Q3: mức tăng tương tác (like+bình luận+chia sẻ) của mỗi bài giữa lần đo cuối và lần đo cách đó >= 6 ngày.';

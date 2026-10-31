-- =====================================================================
-- 31/10/2026 — Tách LOẠI LẦN CHẠY trong collection_runs cho tường minh
--   DISCOVERY : Phát hiện bài — Apify quét theo từ khóa đã duyệt, ghi bài mới + lần đo đầu
--   MEASURE   : Đo biến động — Social Fetch (dự phòng Bright Data/Apify) đo lại bài đã có theo link
--   TREND     : Nhiệt kế từ khóa — Social Fetch tra mức nóng từ khóa TikTok hằng tuần
--               (kết quả nằm ở keyword_trend_weekly; dòng run để ghi nhật ký + chi phí)
-- Quét thử của cộng tác viên KHÔNG nằm ở đây (ghi ở test_scan_logs).
-- Thêm chi phí thật của mỗi lần chạy → tách được chi phí từng khâu.
-- Chạy lại nhiều lần không lỗi.
-- =====================================================================
alter table public.collection_runs
  add column if not exists run_type varchar(12) not null default 'DISCOVERY',
  add column if not exists cost_usd numeric(10, 4);

do $$ begin
  alter table public.collection_runs add constraint collection_runs_run_type_check
    check (run_type in ('DISCOVERY', 'MEASURE', 'TREND'));
exception when duplicate_object then null; end $$;

comment on column public.collection_runs.run_type is
  'DISCOVERY = phát hiện bài theo từ khóa (Apify); MEASURE = đo biến động theo link bài (Social Fetch…); TREND = nhiệt kế từ khóa (Social Fetch).';
comment on column public.collection_runs.cost_usd is 'Chi phí thật của lần chạy (USD) do nhà cung cấp báo; NULL nếu chưa biết.';

-- Gán lại loại cho dữ liệu đã có: lần chạy đo lại (dữ liệu giả ghi mode REMEASURE; nguồn có vai trò MEASURE/TREND)
update public.collection_runs r set run_type = 'MEASURE'
where r.run_type = 'DISCOVERY'
  and (r.query_parameters->>'mode' = 'REMEASURE'
       or exists (select 1 from public.apify_actors a where a.actor_id = r.actor_id and a.default_config->>'role' = 'MEASURE'));
update public.collection_runs r set run_type = 'TREND'
where r.run_type = 'DISCOVERY'
  and exists (select 1 from public.apify_actors a where a.actor_id = r.actor_id and a.default_config->>'role' = 'TREND');

create index if not exists collection_runs_type_started_idx on public.collection_runs (run_type, started_at);

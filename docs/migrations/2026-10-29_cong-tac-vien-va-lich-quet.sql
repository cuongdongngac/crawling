-- =====================================================================
-- Bổ sung schema — 29/10/2026
--   A. Theo dõi hoạt động cộng tác viên (quét thử + phiếu đề xuất hashtag)
--      -> căn cứ khen thưởng theo CHẤT LƯỢNG đề xuất
--   B. Lịch quét chính thức chạy ngầm trên Vercel (cron + webhook)
--
-- Nguyên tắc:
--   - KHÔNG lưu nội dung bài của quét thử; chỉ lưu nhật ký (ai, khi nào, từ khóa, số liệu tổng).
--   - Nhật ký quét do SERVER ghi bằng service role -> cộng tác viên không tự sửa số liệu được.
--   - Phiếu đề xuất: cộng tác viên tự tạo; chỉ admin duyệt; mọi quyết định có lý do.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần không lỗi (if not exists).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Hàm kiểm tra admin (dùng trong RLS, tránh vòng lặp RLS trên profiles)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- A1. Thông tin người dùng: tỉnh + họ tên (phục vụ so sánh hai tỉnh và khen thưởng)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists province varchar(20);

do $$ begin
  alter table public.profiles
    add constraint profiles_province_check
    check (province is null or province in ('CENTRAL', 'HUNG_YEN', 'DONG_THAP'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- A2. Nhật ký quét thử (mỗi lần bấm "Bắt đầu quét" = 1 dòng)
-- ---------------------------------------------------------------------
create table if not exists public.test_scan_logs (
  log_id            bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  actor_id          varchar(100) not null,
  platform          varchar(20)  not null,
  keywords          text[]       not null default '{}',
  per_keyword       integer,
  apify_run_ids     text[]       not null default '{}',
  started_at        timestamptz  not null default now(),
  results_loaded_at timestamptz,                       -- lúc tải kết quả xong
  posts_total       integer,                           -- số bài (đã gộp trùng)
  posts_vi          integer,                           -- số bài tiếng Việt
  new_hashtags      text[]       not null default '{}',-- hashtag chưa có trong danh mục, tìm thấy trong lần quét
  cost_usd          numeric(10,4),                     -- chi phí Apify thực tế (tài khoản cá nhân)
  export_count      integer      not null default 0    -- số lần xuất Excel
);
create index if not exists test_scan_logs_user_time_idx on public.test_scan_logs (user_id, started_at desc);

alter table public.test_scan_logs enable row level security;
drop policy if exists test_scan_logs_select on public.test_scan_logs;
create policy test_scan_logs_select on public.test_scan_logs
  for select using (user_id = auth.uid() or public.is_admin());
-- Không có policy insert/update/delete: chỉ server (service role) được ghi.

-- ---------------------------------------------------------------------
-- A3. Phiếu đề xuất hashtag (Trinh sát -> Phê duyệt)
--     "ba tiêu chí": nhìn hình / nhìn chữ / nhìn giao dịch
-- ---------------------------------------------------------------------
create table if not exists public.hashtag_proposals (
  proposal_id         bigint generated always as identity primary key,
  proposed_by         uuid not null references public.profiles(id),
  province            varchar(20),                    -- tỉnh của người đề xuất (lấy từ profiles lúc tạo)
  hashtag_text        varchar(100) not null,          -- viết thường, không dấu #
  platform            varchar(20)  not null,          -- TIKTOK | FACEBOOK | ...
  meaning             text,                           -- nghĩa / cách dùng của từ
  evidence_urls       text[]       not null default '{}', -- đường dẫn bài công khai làm minh chứng
  evidence_post_count integer,                        -- số bài dùng từ này trong lần quét thử
  crit_image          boolean not null default false, -- có hình sản phẩm/thiết bị/khói
  crit_text           boolean not null default false, -- có từ lách/từ lóng gắn với sản phẩm
  crit_transaction    boolean not null default false, -- có giá/cách liên hệ/giao hàng
  source_log_id       bigint references public.test_scan_logs(log_id) on delete set null,
  status              varchar(20) not null default 'SUBMITTED',
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  review_note         text,                           -- lý do duyệt/từ chối (bắt buộc khi duyệt/từ chối, kiểm ở ứng dụng)
  approved_hashtag_id bigint references public.hashtags(hashtag_id),
  created_at          timestamptz not null default now(),
  constraint hashtag_proposals_status_check
    check (status in ('SUBMITTED', 'NEED_INFO', 'APPROVED', 'REJECTED', 'DUPLICATE')),
  constraint hashtag_proposals_province_check
    check (province is null or province in ('CENTRAL', 'HUNG_YEN', 'DONG_THAP'))
);
create index if not exists hashtag_proposals_user_idx on public.hashtag_proposals (proposed_by, created_at desc);
create index if not exists hashtag_proposals_tag_idx  on public.hashtag_proposals (lower(hashtag_text));
create index if not exists hashtag_proposals_status_idx on public.hashtag_proposals (status);

alter table public.hashtag_proposals enable row level security;
drop policy if exists hashtag_proposals_select on public.hashtag_proposals;
create policy hashtag_proposals_select on public.hashtag_proposals
  for select using (proposed_by = auth.uid() or public.is_admin());
drop policy if exists hashtag_proposals_insert on public.hashtag_proposals;
create policy hashtag_proposals_insert on public.hashtag_proposals
  for insert with check (
    proposed_by = auth.uid() and status = 'SUBMITTED'
    and reviewed_by is null and approved_hashtag_id is null
  );
drop policy if exists hashtag_proposals_admin_update on public.hashtag_proposals;
create policy hashtag_proposals_admin_update on public.hashtag_proposals
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- A4. Bảng tổng hợp theo tháng cho từng cộng tác viên (căn cứ khen thưởng)
--     approved_first = được duyệt VÀ là người đề xuất từ đó SỚM NHẤT
-- ---------------------------------------------------------------------
create or replace view public.v_collaborator_monthly
with (security_invoker = true) as
with scans as (
  select user_id,
         date_trunc('month', started_at) as month,
         count(*)                        as scans,
         coalesce(sum(posts_total), 0)   as posts_scanned,
         coalesce(sum(posts_vi), 0)      as posts_vi,
         coalesce(sum(cardinality(new_hashtags)), 0) as new_hashtags_seen,
         coalesce(sum(cost_usd), 0)      as cost_usd
  from public.test_scan_logs
  group by 1, 2
),
ranked as (
  select p.*,
         row_number() over (partition by lower(p.hashtag_text) order by p.created_at) = 1 as first_for_tag,
         (p.crit_image::int + p.crit_text::int + p.crit_transaction::int) as crit_score
  from public.hashtag_proposals p
),
props as (
  select proposed_by as user_id,
         date_trunc('month', created_at) as month,
         count(*)                                                         as proposals,
         count(*) filter (where status = 'APPROVED')                      as approved,
         count(*) filter (where status = 'APPROVED' and first_for_tag)    as approved_first,
         count(*) filter (where status in ('REJECTED', 'DUPLICATE'))      as rejected,
         round(avg(crit_score)::numeric, 2)                               as avg_crit_score
  from ranked
  group by 1, 2
)
select coalesce(s.user_id, p.user_id) as user_id,
       coalesce(s.month, p.month)     as month,
       pr.email, pr.full_name, pr.province,
       coalesce(s.scans, 0)             as scans,
       coalesce(s.posts_scanned, 0)     as posts_scanned,
       coalesce(s.posts_vi, 0)          as posts_vi,
       coalesce(s.new_hashtags_seen, 0) as new_hashtags_seen,
       coalesce(s.cost_usd, 0)          as cost_usd,
       coalesce(p.proposals, 0)         as proposals,
       coalesce(p.approved, 0)          as approved,
       coalesce(p.approved_first, 0)    as approved_first,
       coalesce(p.rejected, 0)          as rejected,
       p.avg_crit_score
from scans s
full join props p on p.user_id = s.user_id and p.month = s.month
join public.profiles pr on pr.id = coalesce(s.user_id, p.user_id);

-- ---------------------------------------------------------------------
-- B1. Lịch quét chính thức (Vercel Cron đọc bảng này, tạo collection_runs khi đến hạn)
-- ---------------------------------------------------------------------
create table if not exists public.scan_schedules (
  schedule_id  bigint generated always as identity primary key,
  name         text not null,
  actor_id     varchar not null references public.apify_actors(actor_id),
  group_id     varchar references public.hashtag_groups(group_id), -- quét mọi hashtag đang bật của nhóm
  per_keyword  integer not null default 50 check (per_keyword between 1 and 1000),
  every_hours  integer not null default 24 check (every_hours >= 1), -- 24 = mỗi ngày, 168 = mỗi tuần
  next_run_at  timestamptz not null,                                -- lần chạy kế tiếp
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists scan_schedules_due_idx on public.scan_schedules (next_run_at) where is_active;

alter table public.scan_schedules enable row level security;
drop policy if exists scan_schedules_admin_all on public.scan_schedules;
create policy scan_schedules_admin_all on public.scan_schedules
  for all using (public.is_admin()) with check (public.is_admin());

-- Mỗi lần quét chính thức biết nó sinh ra từ lịch nào (null = quét tay)
alter table public.collection_runs
  add column if not exists schedule_id bigint references public.scan_schedules(schedule_id);

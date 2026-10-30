-- =====================================================================
-- Bổ sung schema — 30/10/2026: KHUNG AI GẮN NHÃN (chờ sẵn, chưa bật)
--
-- Vòng lặp: AI gắn nhãn bài quét chính thức -> người xác minh một phần -> đo AI so với người.
-- Đồng thời tích luỹ bộ dữ liệu có nhãn cho giai đoạn ML sau.
--
-- Nguyên tắc:
--   - Nhãn AI và nhãn người ở HAI bảng riêng, không ghi đè: đổi model/prompt/bảng mã -> thêm dòng mới.
--   - Mọi nhãn ghi kèm phiên bản bảng mã hoá (codebook), phiên bản prompt, model -> so sánh được theo thời gian.
--   - AI chỉ ghi bằng service role (server). AI không sửa dữ liệu bài, không tự duyệt gì.
--   - Tập chuẩn (bài mô phỏng có đáp án) tách bảng riêng, không lẫn vào posts.
-- Cần hàm public.is_admin() (đã tạo ở migration 2026-10-29).
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần không lỗi.
-- =====================================================================

-- 1. Bảng mã hoá có phiên bản (nội dung do code ghi vào khi chạy lần đầu)
create table if not exists public.label_codebooks (
  version     varchar(20) primary key,          -- 'v1', 'v2'…
  title       text not null,
  definition  jsonb not null,                   -- danh sách trường, giá trị cho phép, định nghĩa
  created_at  timestamptz not null default now()
);

-- 2. Tập chuẩn: bài mô phỏng / bài thật đã ẩn danh có đáp án — dùng đo người và đo AI
create table if not exists public.eval_items (
  item_id          bigint generated always as identity primary key,
  eval_set         varchar(50) not null,        -- ví dụ 'MO_PHONG_50', 'THAT_AN_DANH_2027Q2'
  item_code        varchar(50) not null,        -- mã bài trong bộ (B01…B50)
  platform         varchar(20),
  text             text not null,               -- caption đã che thông tin cá nhân
  expected         jsonb,                       -- đáp án chuẩn theo codebook_version
  codebook_version varchar(20) references public.label_codebooks(version),
  note             text,
  created_at       timestamptz not null default now(),
  unique (eval_set, item_code)
);

-- 3. Mỗi lượt chạy AI (một lô bài) = 1 dòng: nhật ký + chi phí + trạng thái
create table if not exists public.ai_runs (
  run_id           bigint generated always as identity primary key,
  task             varchar(50) not null,        -- 'POST_LABEL'…
  codebook_version varchar(20),
  prompt_version   varchar(50) not null,
  model            varchar(150) not null,
  trigger          varchar(20) not null default 'MANUAL'
                   check (trigger in ('CRON', 'MANUAL', 'EVAL')),
  triggered_by     uuid references public.profiles(id) on delete set null,
  status           varchar(20) not null default 'RUNNING'
                   check (status in ('RUNNING', 'DONE', 'FAILED', 'BUDGET_STOPPED')),
  items_total      integer not null default 0,
  items_ok         integer not null default 0,
  items_failed     integer not null default 0,
  input_tokens     bigint  not null default 0,
  output_tokens    bigint  not null default 0,
  cost_usd         numeric(12,6) not null default 0,
  error            text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz
);
create index if not exists ai_runs_time_idx on public.ai_runs (started_at desc);

-- 4. Nhãn do AI gán: cho 1 bài (post_id) HOẶC 1 bài tập chuẩn (eval_item_id)
create table if not exists public.ai_labels (
  label_id         bigint generated always as identity primary key,
  run_id           bigint references public.ai_runs(run_id) on delete set null,
  task             varchar(50) not null,
  post_id          varchar references public.posts(post_id) on delete cascade,
  eval_item_id     bigint  references public.eval_items(item_id) on delete cascade,
  codebook_version varchar(20) references public.label_codebooks(version),
  prompt_version   varchar(50) not null,
  model            varchar(150) not null,
  output           jsonb,                       -- nhãn đã kiểm tra hợp lệ theo codebook (null nếu lỗi)
  raw_output       text,                        -- nguyên văn model trả (để soát lỗi)
  confidence       numeric(4,3),
  input_tokens     integer,
  output_tokens    integer,
  cost_usd         numeric(12,6),
  latency_ms       integer,
  error            text,
  created_at       timestamptz not null default now(),
  constraint ai_labels_one_target check ((post_id is null) <> (eval_item_id is null))
);
-- Một bài chỉ có một nhãn THÀNH CÔNG cho mỗi bộ (tác vụ, bảng mã, prompt, model) -> chạy lại không trùng
create unique index if not exists ai_labels_post_uniq
  on public.ai_labels (post_id, task, codebook_version, prompt_version, model)
  where post_id is not null and error is null;
create unique index if not exists ai_labels_eval_uniq
  on public.ai_labels (eval_item_id, task, codebook_version, prompt_version, model)
  where eval_item_id is not null and error is null;
create index if not exists ai_labels_run_idx on public.ai_labels (run_id);

-- 5. Nhãn do NGƯỜI gán (xác minh, hiệu chuẩn, tập chuẩn)
create table if not exists public.human_labels (
  label_id          bigint generated always as identity primary key,
  post_id           varchar references public.posts(post_id) on delete cascade,
  eval_item_id      bigint  references public.eval_items(item_id) on delete cascade,
  labeler_id        uuid not null references public.profiles(id) on delete cascade,
  source            varchar(20) not null default 'REVIEW'
                    check (source in ('REVIEW', 'CALIBRATION', 'GOLD')),
  codebook_version  varchar(20) not null references public.label_codebooks(version),
  labels            jsonb not null,
  shown_ai_label_id bigint references public.ai_labels(label_id) on delete set null, -- người có thấy gợi ý AI không (đo thiên lệch theo AI)
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint human_labels_one_target check ((post_id is null) <> (eval_item_id is null))
);
create unique index if not exists human_labels_post_uniq
  on public.human_labels (post_id, labeler_id, source, codebook_version) where post_id is not null;
create unique index if not exists human_labels_eval_uniq
  on public.human_labels (eval_item_id, labeler_id, source, codebook_version) where eval_item_id is not null;

-- 6. Cặp nhãn AI – người trên cùng bài, cùng bảng mã (để tính độ chính xác, độ nhạy, kappa)
create or replace view public.v_ai_human_pairs
with (security_invoker = true) as
select
  h.label_id            as human_label_id,
  a.label_id            as ai_label_id,
  h.post_id,
  h.eval_item_id,
  h.codebook_version,
  h.source,
  h.labeler_id,
  (h.shown_ai_label_id is not null) as human_saw_ai,
  a.model,
  a.prompt_version,
  h.labels  as human,
  a.output  as ai,
  h.created_at as human_at,
  a.created_at as ai_at
from public.human_labels h
join public.ai_labels a
  on a.error is null
 and a.codebook_version = h.codebook_version
 and ((h.post_id is not null and a.post_id = h.post_id)
   or (h.eval_item_id is not null and a.eval_item_id = h.eval_item_id));

-- 7. Quyền
alter table public.label_codebooks enable row level security;
drop policy if exists label_codebooks_read on public.label_codebooks;
create policy label_codebooks_read on public.label_codebooks for select using (auth.uid() is not null);

alter table public.eval_items enable row level security;      -- đáp án chuẩn: chỉ admin
drop policy if exists eval_items_admin on public.eval_items;
create policy eval_items_admin on public.eval_items for select using (public.is_admin());

alter table public.ai_runs enable row level security;
drop policy if exists ai_runs_admin on public.ai_runs;
create policy ai_runs_admin on public.ai_runs for select using (public.is_admin());

alter table public.ai_labels enable row level security;
drop policy if exists ai_labels_admin on public.ai_labels;
create policy ai_labels_admin on public.ai_labels for select using (public.is_admin());

alter table public.human_labels enable row level security;
drop policy if exists human_labels_select on public.human_labels;
create policy human_labels_select on public.human_labels
  for select using (labeler_id = auth.uid() or public.is_admin());
drop policy if exists human_labels_insert on public.human_labels;
create policy human_labels_insert on public.human_labels
  for insert with check (labeler_id = auth.uid());
drop policy if exists human_labels_update on public.human_labels;
create policy human_labels_update on public.human_labels
  for update using (labeler_id = auth.uid()) with check (labeler_id = auth.uid());
-- Ghi AI (ai_runs, ai_labels, label_codebooks, eval_items) chỉ qua service role -> không có policy ghi.

-- =====================================================================
-- 02/11/2026 — VAI NGHIÊN CỨU VIÊN (tách khỏi quản trị)
--
--   Quản trị (is_admin)          = vận hành hệ thống: tài khoản, khóa API, cấu hình, công cụ quét, chi phí, lịch chạy.
--   Nghiên cứu viên (is_researcher) = dữ liệu và kết luận: duyệt phiếu đề xuất, danh mục hashtag,
--                                     gắn nhãn / xác minh, danh sách bài kèm link, chuyển tuyến.
--   Hai vai độc lập, một người có thể giữ cả hai. Quản trị KHÔNG tự động xem nội dung bài:
--   muốn xem thì tự cấp vai nghiên cứu viên cho mình (ít người xem dữ liệu thô hơn — NĐ 13/2023).
--
-- Cần chạy trước: 2026-10-29_cong-tac-vien-va-lich-quet.sql, 2026-10-30_ai-gan-nhan.sql.
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần không lỗi.
-- =====================================================================

-- 1. Cột vai trò. Lần đầu chạy: mọi quản trị viên hiện có được bật sẵn vai nghiên cứu viên
--    (để không ai mất quyền đang dùng); sau đó gỡ bớt ở trang Quản lý người dùng nếu cần.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_researcher') then
    alter table public.profiles add column is_researcher boolean not null default false;
    update public.profiles set is_researcher = true where is_admin = true;
  end if;
end $$;

comment on column public.profiles.is_researcher is
  'Vai nghiên cứu viên: duyệt hashtag, gắn nhãn/xác minh, xem danh sách bài kèm link, chuyển tuyến. Độc lập với is_admin (vận hành).';

-- 2. Hàm kiểm tra vai trong RLS (security definer: tránh vòng lặp RLS trên profiles)
create or replace function public.is_researcher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_researcher from public.profiles where id = auth.uid()), false);
$$;

-- 3. Phiếu đề xuất hashtag: cộng tác viên xem phiếu của mình; nghiên cứu viên (và quản trị, để theo dõi
--    hoạt động) xem tất cả; CHỈ nghiên cứu viên duyệt.
drop policy if exists hashtag_proposals_select on public.hashtag_proposals;
create policy hashtag_proposals_select on public.hashtag_proposals
  for select using (proposed_by = auth.uid() or public.is_researcher() or public.is_admin());
drop policy if exists hashtag_proposals_admin_update on public.hashtag_proposals;
drop policy if exists hashtag_proposals_review on public.hashtag_proposals;
create policy hashtag_proposals_review on public.hashtag_proposals
  for update using (public.is_researcher()) with check (public.is_researcher());

-- 4. Nhãn AI, nhãn người, tập chuẩn: nghiên cứu viên đọc. Quản trị vẫn xem được chi phí AI (ai_runs).
drop policy if exists eval_items_admin on public.eval_items;
drop policy if exists eval_items_researcher on public.eval_items;
create policy eval_items_researcher on public.eval_items for select using (public.is_researcher());

drop policy if exists ai_runs_admin on public.ai_runs;
drop policy if exists ai_runs_read on public.ai_runs;
create policy ai_runs_read on public.ai_runs for select using (public.is_researcher() or public.is_admin());

drop policy if exists ai_labels_admin on public.ai_labels;
drop policy if exists ai_labels_researcher on public.ai_labels;
create policy ai_labels_researcher on public.ai_labels for select using (public.is_researcher());

drop policy if exists human_labels_select on public.human_labels;
create policy human_labels_select on public.human_labels
  for select using (labeler_id = auth.uid() or public.is_researcher());

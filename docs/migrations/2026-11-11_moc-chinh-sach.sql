-- Migration: trục thời gian mốc chính sách (thuyết minh 26.10, hoạt động 1.2.2)
-- Chạy 1 lần trên Supabase SQL Editor.
-- Lý do: thuyết minh dùng NHIỀU mốc cấm (NQ 173, NĐ 371, NĐ 90, Luật sửa đổi),
-- không phải một ngày duy nhất. Nghị định 13/2023 là về BẢO VỆ DỮ LIỆU CÁ NHÂN,
-- không phải lệnh cấm (tài liệu cũ ghi nhầm).
-- Ngày tháng dưới đây là TẠM (is_provisional=true), chốt sau khi có dữ liệu.

create table if not exists public.policy_milestones (
  code text primary key,
  title text not null,
  milestone_date date null,
  source_note text null,
  is_provisional boolean not null default true,
  created_at timestamptz default now()
);

insert into public.policy_milestones (code, title, milestone_date, source_note, is_provisional) values
  ('NQ173_2024', 'Nghị quyết 173/2024/QH15 — cấm TLĐT/TLNN', '2025-01-01',
   'Cấm từ năm 2025; cần chốt ngày chính xác', true),
  ('ND371_2025', 'Nghị định 371/2025/NĐ-CP — mức phạt hành chính', null,
   'Chờ chốt ngày hiệu lực', true),
  ('ND90_2026', 'Nghị định 90/2026/NĐ-CP — mức phạt hành chính', null,
   'Chờ chốt ngày hiệu lực', true),
  ('LUAT_SUA_DOI_2027', 'Luật PCTHTL sửa đổi', '2027-07-01',
   'Dự kiến hiệu lực 01/07/2027 (thuyết minh 26.10)', true)
on conflict (code) do nothing;
